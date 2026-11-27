"""Parkly local API proxy for TDX parking data.

Secrets are read from process environment or entered interactively with hidden input.
They are never returned to the browser or written to disk.
"""

from __future__ import annotations

import json
import math
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen


def load_project_env() -> None:
    """Load local development values from the repository .env file.

    Existing process variables always win, so Cloud Run values injected from
    Secret Manager are never replaced by a file.
    """
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.is_file():
        return
    for raw_line in env_path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        os.environ.setdefault(key, value)


load_project_env()


IS_CLOUD_RUN = bool(os.getenv("K_SERVICE"))
HOST = os.getenv("PARKLY_API_HOST", "0.0.0.0" if IS_CLOUD_RUN else "127.0.0.1")
PORT = int(os.getenv("PORT", os.getenv("PARKLY_API_PORT", "8000")))
TDX_BASE = "https://tdx.transportdata.tw/api/basic/v1/Parking"
TDX_TOKEN_URL = "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token"
USER_AGENT = "Parkly-Taiwan-Parking/1.0 (local development)"


CITY_INFO = {
    "Taipei": ("臺北市", 25.0375, 121.5637),
    "NewTaipei": ("新北市", 25.0169, 121.4628),
    "Taoyuan": ("桃園市", 24.9937, 121.3010),
    "Taichung": ("臺中市", 24.1477, 120.6736),
    "Tainan": ("臺南市", 22.9997, 120.2270),
    "Kaohsiung": ("高雄市", 22.6273, 120.3014),
    "Keelung": ("基隆市", 25.1276, 121.7392),
    "Hsinchu": ("新竹市", 24.8138, 120.9675),
    "HsinchuCounty": ("新竹縣", 24.8390, 121.0177),
    "MiaoliCounty": ("苗栗縣", 24.5602, 120.8214),
    "ChanghuaCounty": ("彰化縣", 24.0756, 120.5440),
    "NantouCounty": ("南投縣", 23.9609, 120.9719),
    "YunlinCounty": ("雲林縣", 23.7092, 120.4313),
    "Chiayi": ("嘉義市", 23.4801, 120.4491),
    "ChiayiCounty": ("嘉義縣", 23.4518, 120.2555),
    "PingtungCounty": ("屏東縣", 22.5519, 120.5488),
    "YilanCounty": ("宜蘭縣", 24.7021, 121.7378),
    "HualienCounty": ("花蓮縣", 23.9872, 121.6015),
    "TaitungCounty": ("臺東縣", 22.7554, 121.1500),
    "PenghuCounty": ("澎湖縣", 23.5712, 119.5793),
    "KinmenCounty": ("金門縣", 24.4494, 118.3767),
    "LienchiangCounty": ("連江縣", 26.1605, 119.9517),
}

CITY_ALIASES = {
    "台北市": "Taipei", "臺北市": "Taipei", "新北市": "NewTaipei", "桃園市": "Taoyuan",
    "台中市": "Taichung", "臺中市": "Taichung", "台南市": "Tainan", "臺南市": "Tainan",
    "高雄市": "Kaohsiung", "基隆市": "Keelung", "新竹市": "Hsinchu", "新竹縣": "HsinchuCounty",
    "苗栗縣": "MiaoliCounty", "彰化縣": "ChanghuaCounty", "南投縣": "NantouCounty",
    "雲林縣": "YunlinCounty", "嘉義市": "Chiayi", "嘉義縣": "ChiayiCounty",
    "屏東縣": "PingtungCounty", "宜蘭縣": "YilanCounty", "花蓮縣": "HualienCounty",
    "台東縣": "TaitungCounty", "臺東縣": "TaitungCounty", "澎湖縣": "PenghuCounty",
    "金門縣": "KinmenCounty", "連江縣": "LienchiangCounty",
}


class TDXError(RuntimeError):
    pass


class TDXClient:
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self._token = ""
        self._token_expires_at = 0.0
        self._token_lock = threading.Lock()
        self._cache: dict[str, tuple[float, object]] = {}
        self._cache_lock = threading.Lock()
        self._request_lock = threading.Lock()
        self._last_request_at = 0.0
        self._min_request_interval = max(0.35, number(os.getenv("TDX_MIN_REQUEST_INTERVAL"), 0.35))

    @staticmethod
    def _request_json(request: Request, timeout: int = 30):
        for attempt in range(4):
            try:
                with urlopen(request, timeout=timeout) as response:
                    return json.loads(response.read().decode("utf-8-sig"))
            except HTTPError as error:
                body = error.read().decode("utf-8", errors="replace")[:500]
                if error.code == 429 and attempt < 3:
                    retry_after = number(error.headers.get("Retry-After"), 0.7 * (2 ** attempt))
                    time.sleep(max(0.5, min(float(retry_after), 4.0)))
                    continue
                raise TDXError(f"TDX 回應 {error.code}: {body}") from error
            except (URLError, TimeoutError) as error:
                if attempt < 2:
                    time.sleep(0.5 * (attempt + 1))
                    continue
                raise TDXError(f"TDX 連線失敗: {error}") from error
        raise TDXError("TDX 連線重試失敗")

    def token(self) -> str:
        with self._token_lock:
            if self._token and time.time() < self._token_expires_at:
                return self._token

            body = urlencode({
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            }).encode("utf-8")
            request = Request(
                TDX_TOKEN_URL,
                data=body,
                headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT},
                method="POST",
            )
            payload = self._request_json(request)
            access_token = payload.get("access_token") if isinstance(payload, dict) else None
            if not access_token:
                raise TDXError("TDX Token 回應缺少 access_token，請確認金鑰及訂閱權限")
            self._token = access_token
            self._token_expires_at = time.time() + max(60, int(payload.get("expires_in", 1200)) - 60)
            return self._token

    def get(self, path: str, preferred_key: str, *, ttl: int, top: int = 10000):
        cache_key = f"{path}|{preferred_key}|{top}"
        with self._cache_lock:
            cached = self._cache.get(cache_key)
            if cached and time.time() < cached[0]:
                return cached[1]

        query = urlencode({"$top": top, "$format": "JSON"})
        request = Request(
            f"{TDX_BASE}/{path}?{query}",
            headers={"Authorization": f"Bearer {self.token()}", "Accept": "application/json", "User-Agent": USER_AGENT},
        )
        # TDX 免費額度對瞬間併發敏感；實際送出的請求保持串行並輕量節流，避免 429。
        with self._request_lock:
            delay = self._min_request_interval - (time.monotonic() - self._last_request_at)
            if delay > 0:
                time.sleep(delay)
            payload = self._request_json(request, timeout=45)
            self._last_request_at = time.monotonic()
        items = extract_items(payload, preferred_key)
        with self._cache_lock:
            self._cache[cache_key] = (time.time() + ttl, items)
        return items


def extract_items(payload, preferred_key: str):
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return []
    preferred = payload.get(preferred_key)
    if isinstance(preferred, list):
        return preferred
    for value in payload.values():
        if isinstance(value, list):
            return value
    return []


def localized(value, fallback: str = "") -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        return str(value.get("Zh_tw") or value.get("En") or fallback).strip()
    return fallback


CONTACT_MARKER_RE = re.compile(r"(?:停車場)?聯絡人|聯絡電話|業務經理|客服電話", re.I)
PHONE_RE = re.compile(r"(?<!\d)(?:\+?886[-\s]?)?(?:0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{3,4}|09\d{2}[-\s]?\d{3}[-\s]?\d{3})(?!\d)")
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)


def sanitize_public_text(value: str, fallback: str = "依現場公告") -> str:
    """Remove contact details accidentally embedded in public fare text."""
    text = str(value or "").strip()
    if not text:
        return fallback
    if CONTACT_MARKER_RE.search(text):
        return fallback
    sanitized = EMAIL_RE.sub("", text)
    sanitized = PHONE_RE.sub("", sanitized)
    if sanitized == text:
        return text
    sanitized = re.sub(r"\s{2,}", " ", sanitized).strip(" ，,；;。")
    return sanitized or fallback


def number(value, default=None):
    try:
        result = float(value)
        return result if math.isfinite(result) else default
    except (TypeError, ValueError):
        return default


def available_number(value):
    parsed = number(value)
    if parsed is None or parsed < 0:
        return None
    return int(parsed)


def first_price(text: str):
    match = re.search(r"(?:每小時|小時|時)[^0-9]{0,8}(\d+)|(?:NT\$|\$|元)[^0-9]{0,4}(\d+)", text or "", re.I)
    if not match:
        match = re.search(r"\d+", text or "")
    return int(next(group for group in match.groups() if group)) if match and match.groups() else (int(match.group()) if match else None)


def haversine_km(lat1, lon1, lat2, lon2):
    radius = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def nearest_city(lat: float, lon: float) -> str:
    return min(CITY_INFO, key=lambda code: haversine_km(lat, lon, CITY_INFO[code][1], CITY_INFO[code][2]))


_location_cache: dict[tuple[float, float], str] = {}


def resolve_city(lat: float, lon: float, explicit: str = "") -> str:
    if explicit in CITY_INFO:
        return explicit
    if explicit in CITY_ALIASES:
        return CITY_ALIASES[explicit]

    # 約 0.1 度的區塊共用一次反向地理編碼，拖曳地圖時可避免反覆等待外部服務。
    key = (round(lat, 1), round(lon, 1))
    if key in _location_cache:
        return _location_cache[key]

    try:
        query = urlencode({"format": "jsonv2", "lat": lat, "lon": lon, "zoom": 10, "addressdetails": 1})
        request = Request(
            f"https://nominatim.openstreetmap.org/reverse?{query}",
            headers={"Accept-Language": "zh-TW", "User-Agent": USER_AGENT},
        )
        with urlopen(request, timeout=8) as response:
            address = json.loads(response.read().decode("utf-8")).get("address", {})
        candidates = [address.get(field, "") for field in ("city", "county", "state", "municipality", "town")]
        for candidate in candidates:
            if candidate in CITY_ALIASES:
                _location_cache[key] = CITY_ALIASES[candidate]
                return _location_cache[key]
    except Exception:
        pass

    _location_cache[key] = nearest_city(lat, lon)
    return _location_cache[key]


def local_data_source(city):
    return f"{CITY_INFO[city][0]}政府資料／TDX"


def normalize_offstreet(static_rows, live_rows, city, lat, lon, radius):
    live_by_id = {str(row.get("CarParkID", "")): row for row in live_rows}
    results = []
    for row in static_rows:
        position = row.get("CarParkPosition") or row.get("Position") or {}
        item_lat = number(position.get("PositionLat"))
        item_lon = number(position.get("PositionLon"))
        if item_lat is None or item_lon is None:
            continue
        distance = haversine_km(lat, lon, item_lat, item_lon)
        if distance > radius:
            continue
        carpark_id = str(row.get("CarParkID", ""))
        live = live_by_id.get(carpark_id, {})
        fare = sanitize_public_text(localized(row.get("FareDescription"), "依現場公告"))
        results.append({
            "id": f"offstreet-{carpark_id}",
            "name": localized(row.get("CarParkName"), "未命名停車場"),
            "type": "offstreet",
            "address": localized(row.get("Address"), localized(row.get("TownName"), "地址未提供")),
            "lat": item_lat,
            "lng": item_lon,
            "available": available_number(live.get("AvailableSpaces")),
            "total": available_number(live.get("TotalSpaces")),
            "price": first_price(fare),
            "fare": fare,
            "open": "依現場公告",
            "distance": round(distance, 4),
            "source": local_data_source(city),
            "updatedAt": live.get("DataCollectTime"),
        })
    return results


def road_address(row):
    road = row.get("RoadSection") or {}
    if isinstance(road, str):
        return road
    road_name = localized(road.get("RoadName")) if isinstance(road, dict) else ""
    return " ".join(part for part in (localized(row.get("City")), localized(row.get("TownName")), road_name) if part) or "路邊停車路段"


def normalize_curb(static_rows, live_rows, city, lat, lon, radius):
    live_by_id = {str(row.get("ParkingSegmentID", "")): row for row in live_rows}
    results = []
    for row in static_rows:
        position = row.get("ParkingSegmentPosition") or row.get("Position") or {}
        item_lat = number(position.get("PositionLat"))
        item_lon = number(position.get("PositionLon"))
        if item_lat is None or item_lon is None:
            continue
        distance = haversine_km(lat, lon, item_lat, item_lon)
        if distance > radius:
            continue
        segment_id = str(row.get("ParkingSegmentID", ""))
        live = live_by_id.get(segment_id, {})
        fare = sanitize_public_text(localized(row.get("FareDescription"), "依現場公告"))
        results.append({
            "id": f"curb-{segment_id}",
            "name": localized(row.get("ParkingSegmentName"), "路邊停車路段"),
            "type": "curb",
            "address": road_address(row),
            "lat": item_lat,
            "lng": item_lon,
            "available": available_number(live.get("AvailableSpaces")),
            "total": available_number(live.get("TotalSpaces")),
            "price": first_price(fare),
            "fare": fare,
            "open": "依現場公告",
            "distance": round(distance, 4),
            "source": local_data_source(city),
            "updatedAt": live.get("DataCollectTime"),
        })
    return results


def _spot_children(row, *keys):
    for key in keys:
        value = row.get(key)
        if isinstance(value, list):
            return value
    return [row] if row.get("ParkingSpotID") else []


def _spot_is_available(row):
    status = row.get("SpotStatus", row.get("ParkingSpotStatus", row.get("Status")))
    if isinstance(status, str):
        normalized = status.strip().lower()
        if normalized in {"1", "available", "vacant", "free", "true"}:
            return 1
        if normalized in {"2", "occupied", "full", "false"}:
            return 0
        return None
    parsed = available_number(status)
    if parsed == 1:
        return 1
    if parsed == 2:
        return 0
    return None


def normalize_curb_spots(static_rows, live_rows, segment_rows, city, lat, lon, radius):
    segment_by_id = {str(row.get("ParkingSegmentID", "")): row for row in segment_rows}
    live_by_id = {}
    for container in live_rows:
        for live in _spot_children(
            container,
            "ParkingSpotAvailabilities",
            "CurbSpotParkingAvailabilities",
            "ParkingSpots",
        ):
            spot_id = str(live.get("ParkingSpotID", ""))
            if spot_id:
                live_by_id[spot_id] = live

    results = []
    for segment in static_rows:
        segment_id = str(segment.get("ParkingSegmentID", ""))
        details = segment_by_id.get(segment_id, segment)
        segment_name = localized(details.get("ParkingSegmentName"), "路邊停車格")
        segment_address = road_address(details)
        segment_fare = sanitize_public_text(localized(details.get("FareDescription"), "依現場公告"))
        for spot in _spot_children(segment, "ParkingSpots", "CurbParkingSpots", "Spots"):
            position = (
                spot.get("ParkingSpotPosition")
                or spot.get("Position")
                or spot.get("ParkingSegmentPosition")
                or {}
            )
            item_lat = number(position.get("PositionLat"))
            item_lon = number(position.get("PositionLon"))
            if item_lat is None or item_lon is None:
                continue
            distance = haversine_km(lat, lon, item_lat, item_lon)
            if distance > radius:
                continue
            spot_id = str(spot.get("ParkingSpotID", ""))
            live = live_by_id.get(spot_id, {})
            fare = sanitize_public_text(localized(spot.get("FareDescription"), segment_fare), segment_fare)
            address = localized(spot.get("Address"), segment_address) or segment_address
            results.append({
                "id": f"curb-spot-{spot_id or len(results)}",
                "name": localized(spot.get("ParkingSpotName"), segment_name) or segment_name,
                "type": "curb",
                "address": address,
                "lat": item_lat,
                "lng": item_lon,
                "available": _spot_is_available(live),
                "total": 1,
                "price": first_price(fare),
                "fare": fare,
                "open": "依現場公告",
                "distance": round(distance, 4),
                "source": local_data_source(city),
                "updatedAt": live.get("DataCollectTime"),
                "spotLevel": True,
            })
    return results


def _dedupe_text(value):
    return "".join(character.lower() for character in str(value or "") if character.isalnum())


def _record_quality(item):
    score = 0
    if item.get("available") is not None:
        score += 4
    if item.get("total") is not None:
        score += 2
    if item.get("fare") not in (None, "", "依現場公告"):
        score += 2
    if item.get("address") not in (None, "", "地址未提供", "路邊停車路段"):
        score += 1
    if "政府" in str(item.get("source", "")):
        score += 1
    return score


def dedupe_parking(records):
    """合併地方政府與 TDX 的重複點，保留資訊較完整且有即時空位的版本。"""
    grouped = {}
    order = []
    for item in records:
        lat = number(item.get("lat"))
        lng = number(item.get("lng"))
        if lat is None or lng is None:
            continue
        if item.get("spotLevel"):
            key = ("spot", round(lat, 5), round(lng, 5))
        else:
            key = (
                item.get("type", ""),
                _dedupe_text(item.get("name")),
                round(lat, 4),
                round(lng, 4),
            )
        existing = grouped.get(key)
        if existing is None:
            grouped[key] = item
            order.append(key)
            continue
        if _record_quality(item) > _record_quality(existing):
            primary, secondary = item, existing
        else:
            primary, secondary = existing, item
        for field in ("available", "total", "fare", "price", "address", "updatedAt"):
            if primary.get(field) in (None, "", "依現場公告", "地址未提供") and secondary.get(field) not in (None, ""):
                primary[field] = secondary[field]
        grouped[key] = primary
    return [grouped[key] for key in order]


def load_parking(client: TDXClient, city: str, parking_type: str, lat: float, lon: float, radius: float, limit: int = 750):
    primary_specs = []
    if parking_type in ("all", "offstreet"):
        primary_specs.extend([
            ("off_static", f"OffStreet/CarPark/City/{city}", "CarParks", 900),
            ("off_live", f"OffStreet/ParkingAvailability/City/{city}", "ParkingAvailabilities", 180),
        ])
    if parking_type in ("all", "curb"):
        primary_specs.extend([
            ("spot_static", f"OnStreet/ParkingSpot/City/{city}", "ParkingSegmentSpots", 900),
            ("spot_live", f"OnStreet/ParkingSpotAvailability/City/{city}", "CurbSpotParkingAvailabilities", 180),
            ("curb_static", f"OnStreet/ParkingSegment/City/{city}", "ParkingSegments", 900),
        ])

    loaded, warnings = {}, []

    def fetch_specs(specs):
        if not specs:
            return
        with ThreadPoolExecutor(max_workers=min(3, len(specs))) as executor:
            futures = {executor.submit(client.get, path, key, ttl=ttl): name for name, path, key, ttl in specs}
            for future in as_completed(futures):
                name = futures[future]
                try:
                    loaded[name] = future.result()
                except TDXError as error:
                    loaded[name] = []
                    warnings.append(f"{name}: {error}")

    fetch_specs(primary_specs)

    results = []
    if parking_type in ("all", "offstreet"):
        results.extend(normalize_offstreet(loaded.get("off_static", []), loaded.get("off_live", []), city, lat, lon, radius))
    if parking_type in ("all", "curb"):
        spot_results = normalize_curb_spots(
            loaded.get("spot_static", []), loaded.get("spot_live", []), loaded.get("curb_static", []), city, lat, lon, radius
        )
        if spot_results:
            results.extend(spot_results)
        else:
            fetch_specs([
                ("curb_live", f"OnStreet/ParkingSegmentAvailability/City/{city}", "ParkingSegmentAvailabilities", 180),
            ])
            results.extend(normalize_curb(
                loaded.get("curb_static", []), loaded.get("curb_live", []), city, lat, lon, radius
            ))
    results = dedupe_parking(results)
    results.sort(key=lambda item: item["distance"])
    return (results[:limit] if limit > 0 else results), warnings


class ParklyHandler(BaseHTTPRequestHandler):
    server_version = "ParklyAPI/1.0"

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def send_json(self, status, payload, cache_control="no-store"):
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", cache_control)
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            # 前端移動地圖時會取消過期請求；連線已關閉不代表 API 失敗。
            return

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json(HTTPStatus.OK, {"ok": True, "service": "Parkly TDX Proxy", "tdxConfigured": True})
            return
        if parsed.path != "/api/parking":
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "找不到此 API"})
            return

        query = parse_qs(parsed.query)
        try:
            lat = float(query.get("lat", [""])[0])
            lon = float(query.get("lon", [""])[0])
            radius = max(0.2, min(25.0, float(query.get("radius", ["3"])[0])))
            parking_type = query.get("type", ["all"])[0]
            if parking_type not in ("all", "offstreet", "curb"):
                raise ValueError("type 必須是 all、offstreet 或 curb")
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                raise ValueError("座標超出範圍")
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": f"查詢參數錯誤：{error}"})
            return

        try:
            city = resolve_city(lat, lon, query.get("city", [""])[0])
            data, warnings = load_parking(self.server.tdx_client, city, parking_type, lat, lon, radius)
            self.send_json(HTTPStatus.OK, {
                "data": data,
                "meta": {
                    "source": local_data_source(city),
                    "city": city,
                    "cityName": CITY_INFO[city][0],
                    "coverage": "全台 22 縣市",
                    "radiusKm": radius,
                    "count": len(data),
                    "warnings": warnings,
                    "generatedAt": datetime.now(timezone.utc).isoformat(),
                },
            }, "public, max-age=60, s-maxage=300, stale-while-revalidate=600")
        except TDXError as error:
            self.send_json(HTTPStatus.BAD_GATEWAY, {"error": str(error)})
        except Exception as error:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": f"伺服器處理失敗：{error}"})


def read_credentials():
    client_id = os.getenv("TDX_CLIENT_ID", "").strip()
    client_secret = os.getenv("TDX_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise SystemExit(
            "缺少 TDX_CLIENT_ID 或 TDX_CLIENT_SECRET。"
            "請將專案根目錄的 .env.example 複製為 .env，填入自己的 TDX 變數後重新啟動。"
        )
    return client_id, client_secret


def main():
    client_id, client_secret = read_credentials()
    server = ThreadingHTTPServer((HOST, PORT), ParklyHandler)
    server.tdx_client = TDXClient(client_id, client_secret)
    print(f"Parkly TDX API ready: http://{HOST}:{PORT}/api/health")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
