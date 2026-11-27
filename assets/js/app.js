/* global L, jQuery */
(function ($) {
  'use strict';

  const APP_CONFIG = {
    // 正式上線時，請將後端 Proxy 實作成此端點。不要把 TDX Client Secret 放在瀏覽器端。
    apiEndpoint: '/api/parking',
    useLiveApi: true,
    defaultCenter: { lat: 22.6273, lng: 120.3014, label: '高雄市中心' },
    defaultZoom: 14
  };

  const places = {
    '台北': [25.0478, 121.5170], '台北車站': [25.0478, 121.5170], '臺北': [25.0478, 121.5170],
    '新北': [25.0120, 121.4657], '桃園': [24.9537, 121.2258], '新竹': [24.8016, 120.9717],
    '台中': [24.1372, 120.6869], '臺中': [24.1372, 120.6869], '彰化': [24.0756, 120.5440],
    '嘉義': [23.4793, 120.4410], '台南': [22.9971, 120.2123], '臺南': [22.9971, 120.2123],
    '高雄': [22.6273, 120.3014], '高雄車站': [22.6382, 120.3020], '中央公園': [22.6245, 120.3012],
    '左營': [22.6877, 120.2946], '屏東': [22.6697, 120.4862], '宜蘭': [24.7570, 121.7533],
    '花蓮': [23.9911, 121.6112], '台東': [22.7554, 121.1500], '臺東': [22.7554, 121.1500]
  };

  const cityCenters = [
    { code: 'Taipei', name: '臺北市', lat: 25.0375, lng: 121.5637 },
    { code: 'NewTaipei', name: '新北市', lat: 25.0169, lng: 121.4628 },
    { code: 'Taoyuan', name: '桃園市', lat: 24.9937, lng: 121.3010 },
    { code: 'Taichung', name: '臺中市', lat: 24.1477, lng: 120.6736 },
    { code: 'Tainan', name: '臺南市', lat: 22.9997, lng: 120.2270 },
    { code: 'Kaohsiung', name: '高雄市', lat: 22.6273, lng: 120.3014 },
    { code: 'Keelung', name: '基隆市', lat: 25.1276, lng: 121.7392 },
    { code: 'Hsinchu', name: '新竹市', lat: 24.8138, lng: 120.9675 },
    { code: 'HsinchuCounty', name: '新竹縣', lat: 24.8390, lng: 121.0177 },
    { code: 'MiaoliCounty', name: '苗栗縣', lat: 24.5602, lng: 120.8214 },
    { code: 'ChanghuaCounty', name: '彰化縣', lat: 24.0756, lng: 120.5440 },
    { code: 'NantouCounty', name: '南投縣', lat: 23.9609, lng: 120.9719 },
    { code: 'YunlinCounty', name: '雲林縣', lat: 23.7092, lng: 120.4313 },
    { code: 'Chiayi', name: '嘉義市', lat: 23.4801, lng: 120.4491 },
    { code: 'ChiayiCounty', name: '嘉義縣', lat: 23.4518, lng: 120.2555 },
    { code: 'PingtungCounty', name: '屏東縣', lat: 22.5519, lng: 120.5488 },
    { code: 'YilanCounty', name: '宜蘭縣', lat: 24.7021, lng: 121.7378 },
    { code: 'HualienCounty', name: '花蓮縣', lat: 23.9872, lng: 121.6015 },
    { code: 'TaitungCounty', name: '臺東縣', lat: 22.7554, lng: 121.1500 },
    { code: 'PenghuCounty', name: '澎湖縣', lat: 23.5712, lng: 119.5793 },
    { code: 'KinmenCounty', name: '金門縣', lat: 24.4494, lng: 118.3767 },
    { code: 'LienchiangCounty', name: '連江縣', lat: 26.1605, lng: 119.9517 }
  ];

  const placeDirectory = [
    { label: '高雄火車站', detail: '高雄市三民區', lat: 22.6382, lng: 120.3020, city: 'Kaohsiung' },
    { label: '高雄中央公園', detail: '高雄市前金區', lat: 22.6245, lng: 120.3012, city: 'Kaohsiung' },
    { label: '台北車站', detail: '臺北市中正區', lat: 25.0478, lng: 121.5170, city: 'Taipei' },
    { label: '台中市政府', detail: '臺中市西屯區', lat: 24.1618, lng: 120.6466, city: 'Taichung' },
    { label: '台南火車站', detail: '臺南市東區', lat: 22.9971, lng: 120.2123, city: 'Tainan' },
    { label: '桃園火車站', detail: '桃園市桃園區', lat: 24.9892, lng: 121.3140, city: 'Taoyuan' },
    { label: '新竹火車站', detail: '新竹市東區', lat: 24.8016, lng: 120.9717, city: 'Hsinchu' },
    { label: '嘉義火車站', detail: '嘉義市西區', lat: 23.4793, lng: 120.4410, city: 'Chiayi' },
    { label: '屏東火車站', detail: '屏東縣屏東市', lat: 22.6697, lng: 120.4862, city: 'PingtungCounty' },
    { label: '花蓮火車站', detail: '花蓮縣花蓮市', lat: 23.9938, lng: 121.6015, city: 'HualienCounty' }
  ];

  const seedParking = [
    { id: 'KHH001', name: '中央公園地下停車場', type: 'offstreet', address: '高雄市前金區中山一路 11 號', lat: 22.6243, lng: 120.3017, available: 42, total: 320, price: 30, fare: '每小時 30 元', open: '24 小時營業', source: 'TDX 示範資料' },
    { id: 'KHH002', name: '大同醫院停車場', type: 'offstreet', address: '高雄市前金區中華三路 68 號', lat: 22.6268, lng: 120.2968, available: 18, total: 116, price: 30, fare: '每小時 30 元', open: '24 小時營業', source: 'TDX 示範資料' },
    { id: 'KHH003', name: '中正一路路邊停車格', type: 'curb', address: '高雄市新興區中正三路', lat: 22.6302, lng: 120.3073, available: 7, total: 28, price: 20, fare: '每半小時 10 元', open: '08:00–22:00', source: 'TDX 示範資料' },
    { id: 'KHH004', name: '新堀江商圈停車場', type: 'offstreet', address: '高雄市新興區五福二路 198 號', lat: 22.6234, lng: 120.3050, available: 3, total: 85, price: 40, fare: '每小時 40 元', open: '10:00–02:00', source: 'TDX 示範資料' },
    { id: 'KHH005', name: '民生二路路邊停車格', type: 'curb', address: '高雄市前金區民生二路', lat: 22.6248, lng: 120.2948, available: 0, total: 19, price: 20, fare: '每半小時 10 元', open: '08:00–20:00', source: 'TDX 示範資料' },
    { id: 'KHH006', name: '高雄文學館停車場', type: 'offstreet', address: '高雄市前金區民生二路 39 號', lat: 22.6259, lng: 120.2992, available: null, total: 48, price: 25, fare: '每小時 25 元', open: '07:00–23:00', source: 'TDX 示範資料' },
    { id: 'KHH007', name: '六合夜市公有停車場', type: 'offstreet', address: '高雄市新興區六合二路', lat: 22.6321, lng: 120.3004, available: 29, total: 132, price: 30, fare: '每小時 30 元', open: '24 小時營業', source: 'TDX 示範資料' },
    { id: 'KHH008', name: '青年一路路邊停車格', type: 'curb', address: '高雄市苓雅區青年一路', lat: 22.6201, lng: 120.3094, available: 12, total: 35, price: 20, fare: '每半小時 10 元', open: '08:00–22:00', source: 'TDX 示範資料' }
  ];

  let currentCenter = { ...APP_CONFIG.defaultCenter };
  let recenterTarget = { ...APP_CONFIG.defaultCenter };
  let currentData = [];
  let filteredData = [];
  let map = null;
  let homeDemoMap = null;
  let homeDemoMarkers = [];
  let userMarker = null;
  let radiusCircle = null;
  let markers = [];
  let selectedId = null;
  let currentType = 'all';
  let toastTimer = null;
  let parkingAbortController = null;
  let requestSequence = 0;
  let mapFetchTimer = null;
  let ignoreMapZoomUntil = 0;
  let suggestionTimer = null;
  let activeSuggestionIndex = -1;
  let visibleSuggestions = [];
  const parkingResponseCache = new Map();
  const citySnapshotCache = new Map();

  const escapeHtml = (text) => $('<div>').text(text == null ? '' : String(text)).html();

  function hasDetailedAddress(address) {
    const value = String(address || '').trim();
    if (!value || value === '地址資料未提供' || value === '路邊停車路段') return false;
    return !/^[A-Za-z\s]+(?:City|County)?$/i.test(value);
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const rad = (v) => v * Math.PI / 180;
    const earth = 6371;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function inferCityCode(lat, lng) {
    return cityCenters.reduce((nearest, city) => {
      const distance = distanceKm(lat, lng, city.lat, city.lng);
      return !nearest || distance < nearest.distance ? { ...city, distance } : nearest;
    }, null);
  }

  function normalizeSearchText(value) {
    return String(value || '').trim().toLocaleLowerCase('zh-Hant-TW').replace(/臺/g, '台').replace(/[\s　-]/g, '');
  }

  function parkingCacheKey() {
    const city = inferCityCode(currentCenter.lat, currentCenter.lng)?.code || 'Kaohsiung';
    return [city, Number(currentCenter.lat).toFixed(1), Number(currentCenter.lng).toFixed(1)].join('|');
  }

  function formatDistance(km) {
    return km < 1 ? `${Math.round(km * 1000)} 公尺` : `${km.toFixed(1)} 公里`;
  }

  function showToast(message, kind = 'success') {
    clearTimeout(toastTimer);
    $('#toast-message').text(message);
    $('#toast-icon').text(kind === 'error' ? '!' : '✓');
    $('#toast').addClass('is-showing');
    toastTimer = setTimeout(() => $('#toast').removeClass('is-showing'), 2800);
  }

  function setLoading(isLoading) {
    const $btn = $('#locate-btn');
    $btn.prop('disabled', isLoading).toggleClass('is-loading', isLoading);
    $btn.find('span').text(isLoading ? '定位中…' : '取得目前位置');
  }

  function setMapFetchStatus(isLoading, message = '正在更新此區域…') {
    $('#map-fetch-text').text(message);
    $('#map-fetch-status').prop('hidden', !isLoading);
    $('#results-panel').attr('aria-busy', String(isLoading));
  }

  function closeCustomSelects(exceptMenu = null) {
    $('.custom-select__menu.is-open').each(function () {
      if (exceptMenu && this === exceptMenu) return;
      $(this).removeClass('is-open').prop('hidden', true);
    });
    $('.custom-select__trigger[aria-expanded="true"]').attr('aria-expanded', 'false');
  }

  function positionCustomMenu($trigger, $menu) {
    const rect = $trigger[0].getBoundingClientRect();
    const width = Math.max(rect.width, 148);
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10));
    $menu.css({ top: `${rect.bottom + 8}px`, left: `${left}px`, width: `${width}px` });
  }

  function enhanceSelect($select) {
    if ($select.data('enhanced')) return;
    const $wrap = $select.closest('.select-wrap').addClass('is-enhanced');
    const menuId = `${$select.attr('id')}-menu`;
    const $trigger = $(`<button class="custom-select__trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${menuId}"><span></span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg></button>`);
    const $menu = $(`<div class="custom-select__menu" id="${menuId}" role="listbox" tabindex="-1" hidden></div>`).appendTo('body');

    $select.find('option').each(function () {
      $('<button class="custom-select__option" type="button" role="option"></button>')
        .attr('data-value', this.value)
        .text($(this).text())
        .append('<span aria-hidden="true">✓</span>')
        .appendTo($menu);
    });

    const update = () => {
      const value = $select.val();
      const label = $select.find('option:selected').text();
      $trigger.find('span:first').text(label);
      $menu.find('.custom-select__option').each(function () {
        const selected = $(this).data('value') === value;
        $(this).toggleClass('is-selected', selected).attr('aria-selected', String(selected));
      });
    };

    const open = () => {
      closeCustomSelects($menu[0]);
      positionCustomMenu($trigger, $menu);
      $menu.prop('hidden', false).addClass('is-open');
      $trigger.attr('aria-expanded', 'true');
    };

    const close = () => {
      $menu.removeClass('is-open').prop('hidden', true);
      $trigger.attr('aria-expanded', 'false');
    };

    $trigger.on('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      $menu.hasClass('is-open') ? close() : open();
    }).on('keydown', function (event) {
      if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        open();
        ($menu.find('.is-selected')[0] || $menu.find('.custom-select__option')[0])?.focus();
      }
    });

    $menu.on('click', '.custom-select__option', function () {
      $select.val($(this).data('value')).trigger('change');
      update();
      close();
      $trigger.trigger('focus');
    }).on('keydown', '.custom-select__option', function (event) {
      const $options = $menu.find('.custom-select__option');
      const index = $options.index(this);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        $options.eq((index + (event.key === 'ArrowDown' ? 1 : -1) + $options.length) % $options.length).trigger('focus');
      } else if (event.key === 'Escape') {
        close();
        $trigger.trigger('focus');
      }
    });

    $select.data('enhanced', true).attr('tabindex', '-1').attr('aria-hidden', 'true').after($trigger).on('change', update);
    $wrap.on('click', (event) => event.stopPropagation());
    update();
  }

  function enhanceSelects() {
    $('.select-wrap select').each(function () { enhanceSelect($(this)); });
    $(document).on('click', () => closeCustomSelects());
    $(window).on('resize scroll', () => closeCustomSelects());
  }

  async function addSimplifiedBasemap(targetMap = map) {
    if (!targetMap) return;
    try {
      const response = await fetch('https://tiles.openfreemap.org/styles/liberty');
      if (!response.ok) throw new Error(`底圖樣式回應 ${response.status}`);
      const style = await response.json();
      style.layers = (style.layers || []).filter((layer) => (
        layer.type !== 'fill-extrusion'
        && !/(house.?number|address|poi|shop|amenity)/i.test(layer.id || '')
      ));
      style.layers.forEach((layer) => {
        const textField = layer.layout?.['text-field'];
        if (layer.type === 'symbol' && textField && JSON.stringify(textField).includes('name:')) {
          layer.layout['text-field'] = ['coalesce', ['get', 'name:nonlatin'], ''];
        }
      });
      const maplibreGL = await window.loadMaplibreLayer();
      maplibreGL({
        style,
        attribution: '<a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        interactive: false
      }).addTo(targetMap);
    } catch (error) {
      console.warn('向量底圖載入失敗，改用簡化備援底圖。', error);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        className: 'simplified-road-tiles',
        maxNativeZoom: 20,
        maxZoom: 20
      }).addTo(targetMap);
    }
  }

  function selectedRadiusKm() {
    return Math.max(0.2, Number($('#radius-select').val()) || 3);
  }

  function updateRadiusCircle({ fit = false } = {}) {
    if (!map || typeof L === 'undefined') return;
    const center = [currentCenter.lat, currentCenter.lng];
    const radiusMeters = selectedRadiusKm() * 1000;
    if (!radiusCircle) {
      radiusCircle = L.circle(center, {
        radius: radiusMeters,
        color: '#168d78',
        weight: 2,
        opacity: 0.78,
        fillColor: '#31c6a4',
        fillOpacity: 0.08,
        dashArray: '7 7',
        interactive: false
      }).addTo(map);
    } else {
      radiusCircle.setLatLng(center).setRadius(radiusMeters);
    }
    const mapElement = document.querySelector('#map');
    if (mapElement) {
      mapElement.dataset.radiusKm = String(selectedRadiusKm());
      mapElement.dataset.centerLat = Number(currentCenter.lat).toFixed(6);
      mapElement.dataset.centerLng = Number(currentCenter.lng).toFixed(6);
      mapElement.setAttribute('aria-label', `停車位置地圖，以目前中心顯示 ${selectedRadiusKm()} 公里範圍`);
    }
    if (fit) {
      ignoreMapZoomUntil = Date.now() + 1800;
      map.fitBounds(radiusCircle.getBounds(), { animate: true, padding: [42, 42], maxZoom: 20 });
    }
  }

  function ensureMap() {
    if (map || typeof L === 'undefined') return;
    map = L.map('map', { zoomControl: true, scrollWheelZoom: true, minZoom: 1, maxZoom: 22 }).setView([currentCenter.lat, currentCenter.lng], APP_CONFIG.defaultZoom);
    addSimplifiedBasemap();
    updateRadiusCircle();
    map.zoomControl.setPosition('bottomright');
    map.on('dragend', scheduleMapAreaRefresh);
    map.on('zoomend', () => {
      document.querySelector('#map')?.setAttribute('data-zoom', String(map.getZoom()));
      if (filteredData.length) renderMarkers(filteredData);
      if (Date.now() >= ignoreMapZoomUntil) scheduleMapAreaRefresh();
    });
  }

  function scheduleMapAreaRefresh() {
    if (!map) return;
    clearTimeout(mapFetchTimer);
    setMapFetchStatus(true, '移動完成，正在更新此區域…');
    mapFetchTimer = setTimeout(() => {
      const center = map.getCenter();
      currentCenter = { lat: center.lat, lng: center.lng, label: '地圖目前區域' };
      updateRadiusCircle();
      selectedId = null;
      refreshParking({ reason: 'map' });
    }, 220);
  }

  function setCenter(lat, lng, label, zoom = APP_CONFIG.defaultZoom) {
    currentCenter = { lat: Number(lat), lng: Number(lng), label: label || '搜尋位置' };
    recenterTarget = { ...currentCenter };
    ensureMap();
    if (map) {
      ignoreMapZoomUntil = Date.now() + 900;
      map.setView([currentCenter.lat, currentCenter.lng], zoom, { animate: true });
      updateRadiusCircle({ fit: true });
      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.marker([currentCenter.lat, currentCenter.lng], {
        icon: L.divIcon({ className: 'user-marker', iconSize: [18, 18], iconAnchor: [9, 9] })
      }).addTo(map).bindTooltip(escapeHtml(currentCenter.label), { direction: 'top', offset: [0, -10] });
    }
    refreshParking({ reason: 'location' });
  }

  async function fetchLiveParking({ signal } = {}) {
    const cacheKey = parkingCacheKey();
    const cached = parkingResponseCache.get(cacheKey);
    if (cached && Date.now() - cached.savedAt < 300000) return { ...cached.payload, fromCache: true };
    const city = inferCityCode(currentCenter.lat, currentCenter.lng);
    const url = new URL(APP_CONFIG.apiEndpoint, window.location.origin);
    // 將同一約 10 公里網格的查詢合併，讓瀏覽器與 Firebase CDN 共用回應。
    url.searchParams.set('lat', Number(currentCenter.lat).toFixed(1));
    url.searchParams.set('lon', Number(currentCenter.lng).toFixed(1));
    url.searchParams.set('radius', '25');
    url.searchParams.set('type', 'all');
    if (city) url.searchParams.set('city', city.code);
    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `API ${response.status}`);
    const result = {
      data: Array.isArray(payload) ? payload : (payload.data || []),
      meta: Array.isArray(payload) ? {} : (payload.meta || {})
    };
    parkingResponseCache.set(cacheKey, { savedAt: Date.now(), payload: result });
    if (parkingResponseCache.size > 24) parkingResponseCache.delete(parkingResponseCache.keys().next().value);
    return result;
  }

  async function fetchCitySnapshot(cityCode) {
    if (citySnapshotCache.has(cityCode)) return citySnapshotCache.get(cityCode);
    const response = await fetch(`/data/parking/${encodeURIComponent(cityCode)}.json`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`快取資料 ${response.status}`);
    const payload = await response.json();
    const result = {
      data: Array.isArray(payload.data) ? payload.data : [],
      meta: payload.meta || {}
    };
    citySnapshotCache.set(cityCode, result);
    return result;
  }

  function mergeParkingData(snapshotData, liveData) {
    const merged = new Map((snapshotData || []).map((item) => [item.id, item]));
    (liveData || []).forEach((item) => {
      const cached = merged.get(item.id);
      merged.set(item.id, cached ? { ...cached, ...item } : item);
    });
    return [...merged.values()];
  }

  function createDemoData() {
    // 將高雄示範點依目前搜尋中心平移，讓全台任一搜尋位置都可預覽完整互動。
    const latShift = currentCenter.lat - APP_CONFIG.defaultCenter.lat;
    const lngShift = currentCenter.lng - APP_CONFIG.defaultCenter.lng;
    return seedParking.map((item, index) => {
      const lat = item.lat + latShift + (index % 2 ? 0.00035 : 0);
      const lng = item.lng + lngShift + (index % 3 ? 0 : -0.0003);
      return { ...item, id: `${item.id}-${currentCenter.lat.toFixed(3)}`, lat, lng, distance: distanceKm(currentCenter.lat, currentCenter.lng, lat, lng) };
    });
  }

  async function refreshParking({ reason = 'manual' } = {}) {
    const sequence = ++requestSequence;
    if (parkingAbortController) parkingAbortController.abort();
    parkingAbortController = new AbortController();
    setMapFetchStatus(true, reason === 'map' ? '正在更新此區域…' : '正在載入停車資訊…');
    let data;
    let snapshotData = [];
    try {
      const city = inferCityCode(currentCenter.lat, currentCenter.lng);
      if (city) {
        const snapshot = await fetchCitySnapshot(city.code);
        if (sequence !== requestSequence) return;
        snapshotData = snapshot.data;
        data = snapshotData;
        currentData = snapshotData.map((item) => ({
          ...item,
          distance: distanceKm(currentCenter.lat, currentCenter.lng, item.lat, item.lng)
        }));
        applyFilters();
        $('#data-status').attr('title', `${city.name} Firebase 快取已載入，背景更新即時車位`).find('span:last').text(`${city.name}快取`);
      }
      if (APP_CONFIG.useLiveApi) {
        const live = await fetchLiveParking({ signal: parkingAbortController.signal });
        if (sequence !== requestSequence) return;
        data = mergeParkingData(snapshotData, live.data);
        const cityName = live.meta.cityName || '全台';
        const sourceLabel = live.meta.source?.includes('政府') ? `${cityName}政府＋TDX` : `TDX ${cityName}`;
        $('#data-status').attr('title', `${sourceLabel}資料已連線｜全台 22 縣市`).find('span:last').text(sourceLabel);
      } else {
        data = createDemoData();
        $('#data-status').attr('title', '目前使用展示資料').find('span:last').text('展示資料');
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.warn('Parking API unavailable, using cached data.', error);
      data = snapshotData.length ? snapshotData : createDemoData();
      const hasSnapshot = snapshotData.length > 0;
      $('#data-status').attr('title', hasSnapshot ? '即時資料暫時無法更新，目前使用全台快取' : 'TDX 與快取皆無法連線，目前使用展示資料').find('span:last').text(hasSnapshot ? '快取資料' : '展示資料');
      if (!hasSnapshot) showToast(`停車資料暫時無法連線：${error.message}`, 'error');
    } finally {
      if (sequence === requestSequence) setMapFetchStatus(false);
    }
    if (sequence !== requestSequence) return;
    currentData = (data || []).map((item) => ({
      ...item,
      distance: distanceKm(currentCenter.lat, currentCenter.lng, item.lat, item.lng)
    }));
    applyFilters();
  }

  function applyFilters() {
    const radius = Number($('#radius-select').val());
    const onlyAvailable = $('#available-only').is(':checked');
    const sort = $('#sort-select').val();
    let result = currentData.filter((item) => (currentType === 'all' || item.type === currentType) && item.distance <= radius && (!onlyAvailable || Number(item.available) > 0));
    result.sort((a, b) => {
      if (sort === 'available') return (b.available ?? -1) - (a.available ?? -1);
      if (sort === 'price') return (a.price ?? 9999) - (b.price ?? 9999);
      return a.distance - b.distance;
    });
    filteredData = result;
    renderList(result);
    renderMarkers(result);
    $('#result-count').text(`${result.length} 筆`);
    $('#search-summary').html(`${escapeHtml(currentCenter.label)}附近，共找到 <strong>${result.length}</strong> 個停車選擇`);
    $('#empty-state').prop('hidden', result.length > 0);
  }

  function availabilityState(item) {
    if (item.type === 'curb' && item.spotLevel) {
      if (item.available == null) return { cls: 'full', text: '即時狀態未知', number: '未知' };
      if (Number(item.available) > 0) return { cls: '', text: '目前沒有車輛', number: '可停' };
      return { cls: 'full', text: '目前車格有車', number: '已占用' };
    }
    if (item.available == null) return { cls: 'full', text: '無資料', number: '—' };
    if (item.available <= 0) return { cls: 'full', text: '目前已滿', number: '已滿' };
    if (item.available <= 5) return { cls: 'low', text: `共 ${item.total || '—'} 格`, number: item.available };
    return { cls: '', text: `共 ${item.total || '—'} 格`, number: item.available };
  }

  function curbOccupancyClass(item) {
    if (item.type !== 'curb' || item.available == null) return 'status-unknown';
    return Number(item.available) > 0 ? 'status-available' : 'status-occupied';
  }

  function renderList(data) {
    const cards = data.map((item) => {
      const state = availabilityState(item);
      const addressMarkup = hasDetailedAddress(item.address) ? `<p class="parking-address">${escapeHtml(item.address)}</p>` : '';
      return `<article class="parking-card${selectedId === item.id ? ' is-selected' : ''}" data-id="${escapeHtml(item.id)}" tabindex="0" aria-label="${escapeHtml(item.name)}，${escapeHtml(state.number)}">
        <div class="parking-top">
          <div><span class="parking-kind ${item.type === 'curb' ? 'curb' : ''}">${item.type === 'curb' ? '路邊停車' : '停車場'}</span><h3>${escapeHtml(item.name)}</h3>${addressMarkup}</div>
          <div class="availability ${state.cls}"><b>${escapeHtml(state.number)}</b><span>${escapeHtml(state.text)}</span></div>
        </div>
        <div class="parking-meta">
          <div class="meta-item"><span>距離</span><strong>${formatDistance(item.distance)}</strong></div>
          <div class="meta-item meta-item--fare"><span>費率</span><strong>${escapeHtml(item.fare || '依現場公告')}</strong></div>
          <button class="nav-button" type="button" data-nav-id="${escapeHtml(item.id)}" aria-label="導航到 ${escapeHtml(item.name)}"><svg viewBox="0 0 24 24"><path d="m3 11 18-8-8 18-2-8-8-2Z"/></svg></button>
        </div>
      </article>`;
    }).join('');
    $('#parking-list').html(cards);
  }

  function popupHtml(item) {
    const state = availabilityState(item);
    const isCurb = item.type === 'curb';
    const addressMarkup = hasDetailedAddress(item.address) ? `<p class="map-popup__address">${escapeHtml(item.address)}</p>` : '';
    return `<article class="map-popup">
      <header class="map-popup__header">
        <span class="map-popup__kind ${isCurb ? 'is-curb' : 'is-offstreet'}"><i>${isCurb ? '' : 'P'}</i>${isCurb ? '路邊停車' : '停車場'}</span>
        <h4>${escapeHtml(item.name)}</h4>
        ${addressMarkup}
      </header>
      <div class="map-popup__availability ${state.cls}">
        <div><strong>${escapeHtml(state.number)}</strong><span>${isCurb && item.spotLevel ? '車格狀態' : (item.available == null ? '空位資料' : '剩餘車格')}</span></div>
        <div><strong>${escapeHtml(item.total ?? '—')}</strong><span>總車格數</span></div>
        <div><strong>${escapeHtml(formatDistance(item.distance))}</strong><span>距離</span></div>
      </div>
      <section class="map-popup__fare"><span>收費方式</span><p>${escapeHtml(item.fare || '依現場公告')}</p></section>
      <div class="map-popup__foot"><span>${escapeHtml(item.open || '營業時間依現場公告')}</span><button class="map-popup-nav" type="button" data-nav-id="${escapeHtml(item.id)}">開始導航</button></div>
    </article>`;
  }

  function groupMarkers(data, zoom) {
    if (zoom >= 15) return data.map((item) => ({ items: [item], lat: item.lat, lng: item.lng }));
    const cellSize = zoom <= 11 ? 110 : zoom === 12 ? 90 : zoom === 13 ? 72 : 58;
    const buckets = new Map();
    data.forEach((item) => {
      const point = map.project([item.lat, item.lng], zoom);
      const key = `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
      const bucket = buckets.get(key) || { items: [], latTotal: 0, lngTotal: 0 };
      bucket.items.push(item);
      bucket.latTotal += Number(item.lat);
      bucket.lngTotal += Number(item.lng);
      buckets.set(key, bucket);
    });
    return [...buckets.values()].map((bucket) => ({
      items: bucket.items,
      lat: bucket.latTotal / bucket.items.length,
      lng: bucket.lngTotal / bucket.items.length
    }));
  }

  function createParkingMarker(item) {
    const state = availabilityState(item);
    const isCurb = item.type === 'curb';
    const occupancyClass = isCurb ? curbOccupancyClass(item) : '';
    const icon = L.divIcon({
      className: `parking-marker parking-marker--${isCurb ? 'curb' : 'offstreet'} ${state.cls} ${occupancyClass}`,
      html: isCurb ? '<span aria-hidden="true"></span>' : '<span aria-hidden="true">P</span>',
      iconSize: isCurb ? [18, 18] : [38, 38],
      iconAnchor: isCurb ? [9, 9] : [19, 19],
      popupAnchor: isCurb ? [0, -12] : [0, -21]
    });
    const marker = L.marker([item.lat, item.lng], { icon, zIndexOffset: isCurb ? 0 : 200 }).addTo(map);
    marker.bindPopup(popupHtml(item), {
      className: 'parking-detail-popup',
      maxWidth: 380,
      minWidth: 300,
      autoPanPadding: [32, 32]
    });
    marker.on('click', () => selectParking(item.id, false));
    marker.parkingId = item.id;
    return marker;
  }

  function createClusterMarker(group) {
    const count = group.items.length;
    const size = count >= 100 ? 58 : count >= 10 ? 52 : 46;
    const icon = L.divIcon({
      className: 'parking-cluster',
      html: `<span>${count}</span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
    const marker = L.marker([group.lat, group.lng], { icon, zIndexOffset: 400 }).addTo(map);
    marker.bindTooltip(`此區域共 ${count} 個停車資訊`, { direction: 'top', offset: [0, -size / 2] });
    marker.on('click', () => {
      const nextZoom = Math.min(20, Math.max(15, map.getZoom() + 2));
      const bounds = L.latLngBounds(group.items.map((item) => [item.lat, item.lng]));
      ignoreMapZoomUntil = Date.now() + 1200;
      if (bounds.isValid() && !bounds.getNorthEast().equals(bounds.getSouthWest())) {
        map.fitBounds(bounds, { animate: true, padding: [70, 70], maxZoom: nextZoom });
      } else {
        map.setView([group.lat, group.lng], nextZoom, { animate: true });
      }
    });
    return marker;
  }

  function renderMarkers(data) {
    ensureMap();
    if (!map) return;
    markers.forEach((marker) => map.removeLayer(marker));
    markers = groupMarkers(data, map.getZoom()).map((group) => (
      group.items.length > 1 ? createClusterMarker(group) : createParkingMarker(group.items[0])
    ));
  }

  function selectParking(id, pan = true) {
    selectedId = id;
    $('.parking-card').removeClass('is-selected').filter(`[data-id="${CSS.escape(id)}"]`).addClass('is-selected');
    const item = currentData.find((entry) => entry.id === id);
    if (item && map && pan) {
      ignoreMapZoomUntil = Date.now() + 900;
      let opened = false;
      const openSelectedPopup = () => {
        if (opened) return;
        const marker = markers.find((entry) => entry.parkingId === id);
        if (marker) {
          opened = true;
          marker.openPopup();
        }
      };
      map.once('moveend', openSelectedPopup);
      map.setView([item.lat, item.lng], Math.max(map.getZoom(), 16), { animate: true });
      setTimeout(openSelectedPopup, 450);
    }
  }

  function navigateTo(id) {
    const item = currentData.find((entry) => entry.id === id);
    if (!item) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}&travelmode=driving`, '_blank', 'noopener');
  }

  function locateUser() {
    if (!navigator.geolocation) {
      showToast('此瀏覽器不支援定位，請改用地址搜尋', 'error');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition((position) => {
      setLoading(false);
      $('#location-input').val('目前位置').trigger('input');
      setCenter(position.coords.latitude, position.coords.longitude, '目前位置', 16);
      showToast('已取得目前位置並更新附近車位');
    }, (error) => {
      setLoading(false);
      const message = error.code === 1 ? '定位權限未開啟，請允許定位或手動輸入地址' : '暫時無法取得位置，請改用地址搜尋';
      showToast(message, 'error');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  function localSearchSuggestions(query) {
    const normalized = normalizeSearchText(query);
    if (!normalized) return [];
    const directory = [
      ...placeDirectory.map((item) => ({ ...item, kind: '地標' })),
      ...cityCenters.map((item) => ({ label: item.name, detail: '縣市中心', lat: item.lat, lng: item.lng, city: item.code, kind: '行政區' })),
      ...currentData.map((item) => ({ label: item.name, detail: item.address || '停車資訊', lat: item.lat, lng: item.lng, kind: item.type === 'curb' ? '路邊停車' : '停車場', parkingId: item.id }))
    ];
    const seen = new Set();
    return directory.filter((item) => {
      const matched = normalizeSearchText(`${item.label}${item.detail}`).includes(normalized);
      const key = `${normalizeSearchText(item.label)}|${Number(item.lat).toFixed(4)}|${Number(item.lng).toFixed(4)}`;
      if (!matched || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }

  function hideSuggestions() {
    activeSuggestionIndex = -1;
    visibleSuggestions = [];
    $('#location-suggestions').prop('hidden', true).empty();
    $('#location-input').attr('aria-expanded', 'false').removeAttr('aria-activedescendant');
  }

  function renderSuggestions(items) {
    visibleSuggestions = items;
    if (!items.length) {
      hideSuggestions();
      return;
    }
    const markup = items.map((item, index) => `<button class="search-suggestion" id="location-suggestion-${index}" type="button" role="option" data-suggestion-index="${index}" aria-selected="false"><span class="search-suggestion__icon ${item.kind === '停車場' ? 'is-parking' : ''}">${item.kind === '停車場' ? 'P' : '⌖'}</span><span class="search-suggestion__copy"><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail || item.kind)}</small></span><em>${escapeHtml(item.kind)}</em></button>`).join('');
    $('#location-suggestions').html(markup).prop('hidden', false);
    $('#location-input').attr('aria-expanded', 'true');
  }

  function setActiveSuggestion(index) {
    if (!visibleSuggestions.length) return;
    activeSuggestionIndex = (index + visibleSuggestions.length) % visibleSuggestions.length;
    const $options = $('.search-suggestion');
    $options.removeClass('is-active').attr('aria-selected', 'false');
    const $active = $options.eq(activeSuggestionIndex).addClass('is-active').attr('aria-selected', 'true');
    $('#location-input').attr('aria-activedescendant', $active.attr('id'));
    $active.get(0)?.scrollIntoView({ block: 'nearest' });
  }

  function chooseSuggestion(index) {
    const item = visibleSuggestions[index];
    if (!item) return;
    $('#location-input').val(item.label);
    $('#clear-search').prop('hidden', false);
    hideSuggestions();
    setCenter(item.lat, item.lng, item.label, 15);
    showToast(`已移動到「${item.label}」附近`);
  }

  function queueSuggestions(query) {
    clearTimeout(suggestionTimer);
    const normalized = String(query || '').trim();
    if (normalized.length < 2) {
      hideSuggestions();
      return;
    }
    suggestionTimer = setTimeout(() => renderSuggestions(localSearchSuggestions(normalized)), 80);
  }

  async function geocode(query) {
    const local = localSearchSuggestions(query)[0];
    if (local) return { lat: local.lat, lng: local.lng, label: local.label };
    const matchedKey = Object.keys(places).find((key) => query.includes(key));
    if (matchedKey) return { lat: places[matchedKey][0], lng: places[matchedKey][1], label: query };
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tw&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { 'Accept-Language': 'zh-TW' } });
    if (!response.ok) throw new Error('Geocoding failed');
    const result = await response.json();
    if (!result.length) throw new Error('No result');
    return { lat: Number(result[0].lat), lng: Number(result[0].lon), label: result[0].display_name.split(',').slice(0, 2).join('，') };
  }

  async function searchLocation(query) {
    const normalized = String(query || '').trim();
    if (!normalized) {
      $('#location-input').trigger('focus');
      showToast('請輸入地址、地標或行政區', 'error');
      return;
    }
    $('.search-submit').prop('disabled', true).text('搜尋中…');
    hideSuggestions();
    try {
      const result = await geocode(normalized);
      setCenter(result.lat, result.lng, result.label, 15);
      showToast(`已移動到「${normalized}」附近`);
    } catch (error) {
      showToast('找不到這個地點，請輸入更完整的台灣地址', 'error');
    } finally {
      $('.search-submit').prop('disabled', false).text('搜尋');
    }
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function updateHomeDemoMap(example) {
    const canvas = document.querySelector('#feature-demo-map-canvas');
    if (!canvas || typeof L === 'undefined') return;
    if (!homeDemoMap) {
      homeDemoMap = L.map(canvas, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false
      }).setView(example.center, example.zoom);
      addSimplifiedBasemap(homeDemoMap);
      document.querySelector('#feature-search-demo')?.classList.add('has-live-map');
    }
    homeDemoMap.invalidateSize({ pan: false });
    homeDemoMap.flyTo(example.center, example.zoom, { animate: true, duration: .7 });
    homeDemoMarkers.forEach((marker) => homeDemoMap.removeLayer(marker));
    homeDemoMarkers = example.parkings.map((position, index) => L.marker(position, {
      interactive: false,
      icon: L.divIcon({ className: `demo-live-pin demo-live-pin--${index + 1}`, html: '<span>P</span>', iconSize: [30, 30], iconAnchor: [15, 15] })
    }).addTo(homeDemoMap));
    homeDemoMarkers.push(L.marker(example.user, {
      interactive: false,
      icon: L.divIcon({ className: 'demo-live-user', iconSize: [14, 14], iconAnchor: [7, 7] })
    }).addTo(homeDemoMap));
  }

  async function startHomeFeatureDemo() {
    const demo = document.querySelector('#feature-search-demo');
    if (!demo || demo.dataset.started === 'true') return;
    demo.dataset.started = 'true';
    const query = demo.querySelector('#feature-demo-query');
    const name = demo.querySelector('#feature-demo-result-name');
    const spaces = demo.querySelector('#feature-demo-result-spaces');
    const distance = demo.querySelector('#feature-demo-result-distance');
    const district = demo.querySelector('#feature-demo-district');
    const roadA = demo.querySelector('#feature-demo-road-a');
    const roadB = demo.querySelector('#feature-demo-road-b');
    const roadC = demo.querySelector('#feature-demo-road-c');
    const examples = [
      { scene: 'taipei', query: '台北車站', name: '台北車站地下停車場', spaces: '28', distance: '180m', district: '台北車站周邊', roads: ['忠孝西路', '館前路', '市民大道'], center: [25.0478, 121.5170], user: [25.0473, 121.5165], zoom: 15, parkings: [[25.0483, 121.5156], [25.0465, 121.5148], [25.0480, 121.5190]] },
      { scene: 'kaohsiung', query: '高雄中央公園', name: '中央公園地下停車場', spaces: '42', distance: '260m', district: '中央公園周邊', roads: ['中山一路', '五福二路', '民生一路'], center: [22.6245, 120.3012], user: [22.6248, 120.3010], zoom: 15, parkings: [[22.6243, 120.3017], [22.6262, 120.2991], [22.6229, 120.3038]] },
      { scene: 'taichung', query: '台中市政府', name: '市政公園停車場', spaces: '16', distance: '320m', district: '市政府周邊', roads: ['臺灣大道', '惠中路', '市政北一路'], center: [24.1618, 120.6466], user: [24.1613, 120.6461], zoom: 15, parkings: [[24.1602, 120.6461], [24.1632, 120.6432], [24.1590, 120.6494]] }
    ];

    const applyExample = (example) => {
      demo.dataset.scene = example.scene;
      name.textContent = example.name;
      spaces.textContent = example.spaces;
      distance.textContent = example.distance;
      district.textContent = example.district;
      [roadA, roadB, roadC].forEach((label, labelIndex) => { label.textContent = example.roads[labelIndex]; });
      updateHomeDemoMap(example);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const example = examples[0];
      query.textContent = example.query;
      applyExample(example);
      demo.classList.add('is-results');
      return;
    }

    let index = 0;
    while (document.documentElement.contains(demo)) {
      const example = examples[index % examples.length];
      demo.classList.remove('is-results', 'is-searching');
      query.textContent = '';
      await wait(550);
      for (const character of example.query) {
        query.textContent += character;
        await wait(115);
      }
      await wait(420);
      demo.classList.add('is-searching');
      await wait(360);
      applyExample(example);
      demo.classList.add('is-results');
      demo.classList.remove('is-searching');
      await wait(2700);
      demo.classList.remove('is-results');
      await wait(650);
      index += 1;
    }
  }

  function showPage(pageName, options = {}) {
    const name = pageName === 'search' ? 'search' : 'home';
    $('.page').prop('hidden', true).removeClass('is-active');
    $(`[data-page="${name}"]`).prop('hidden', false).addClass('is-active');
    $('[data-page-link]').removeClass('is-active').filter(`[data-page-link="${name}"]`).addClass('is-active');
    $('#mobile-nav').prop('hidden', true);
    $('#menu-toggle').attr('aria-expanded', 'false');
    if (!options.keepScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'search') {
      setTimeout(() => {
        ensureMap();
        if (map) map.invalidateSize();
        if (!currentData.length) refreshParking({ reason: 'initial' });
      }, 80);
    }
    $('.site-footer').toggle(name === 'home');
  }

  $(function () {
    enhanceSelects();
    startHomeFeatureDemo();
    $(document).on('click', '[data-page-link]', function (event) {
      const page = $(this).data('page-link');
      if (page) {
        event.preventDefault();
        history.pushState(null, '', `#${page}`);
        showPage(page);
      }
    });

    window.addEventListener('popstate', () => showPage(location.hash.replace('#', ''), { keepScroll: true }));
    showPage(location.hash === '#search' ? 'search' : 'home', { keepScroll: true });

    $('#menu-toggle').on('click', function () {
      const expanded = $(this).attr('aria-expanded') === 'true';
      $(this).attr('aria-expanded', String(!expanded));
      $('#mobile-nav').prop('hidden', expanded);
    });

    $('#hero-locate').on('click', function () {
      history.pushState(null, '', '#search');
      showPage('search');
      setTimeout(locateUser, 150);
    });
    $('#locate-btn').on('click', locateUser);
    $('#map-recenter').on('click', () => setCenter(recenterTarget.lat, recenterTarget.lng, recenterTarget.label, 15));

    $('#location-input').on('input', function () {
      $('#clear-search').prop('hidden', !this.value);
      queueSuggestions(this.value);
    }).on('focus', function () {
      if (this.value.trim().length >= 2) renderSuggestions(localSearchSuggestions(this.value));
    }).on('keydown', function (event) {
      if (event.key === 'ArrowDown' && visibleSuggestions.length) {
        event.preventDefault();
        setActiveSuggestion(activeSuggestionIndex + 1);
      } else if (event.key === 'ArrowUp' && visibleSuggestions.length) {
        event.preventDefault();
        setActiveSuggestion(activeSuggestionIndex - 1);
      } else if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
        event.preventDefault();
        chooseSuggestion(activeSuggestionIndex);
      } else if (event.key === 'Escape') {
        hideSuggestions();
      }
    });
    $('#clear-search').on('click', function () { hideSuggestions(); $('#location-input').val('').trigger('input').trigger('focus'); });
    $('#location-form').on('submit', function (event) { event.preventDefault(); searchLocation($('#location-input').val()); });
    $(document).on('click', '[data-suggestion-index]', function (event) {
      event.stopPropagation();
      chooseSuggestion(Number($(this).data('suggestion-index')));
    });
    $(document).on('click', function (event) {
      if (!$(event.target).closest('.search-combobox').length) hideSuggestions();
    });

    $(document).on('click', '.filter-chip', function () {
      $('.filter-chip[data-filter="type"]').removeClass('is-active');
      $(this).addClass('is-active');
      currentType = $(this).data('value');
      applyFilters();
    });
    $('#radius-select').on('change', () => {
      ensureMap();
      if (map) {
        const center = map.getCenter();
        currentCenter = { lat: center.lat, lng: center.lng, label: '地圖目前區域' };
        selectedId = null;
        updateRadiusCircle({ fit: true });
      }
      applyFilters();
      refreshParking({ reason: 'radius' });
    });
    $('#available-only, #sort-select').on('change', applyFilters);

    $(document).on('click', '.parking-card', function (event) {
      if ($(event.target).closest('.nav-button').length) return;
      selectParking($(this).data('id'));
    });
    $(document).on('keydown', '.parking-card', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectParking($(this).data('id')); }
    });
    $(document).on('click', '.nav-button', function (event) { event.stopPropagation(); navigateTo($(this).data('nav-id')); });
    $(document).on('click', '.map-popup-nav', function (event) { event.stopPropagation(); navigateTo($(this).data('nav-id')); });

    $('[data-mobile-view]').on('click', function () {
      $('[data-mobile-view]').removeClass('is-active');
      $(this).addClass('is-active');
      const showMap = $(this).data('mobile-view') === 'map';
      $('.search-content').toggleClass('show-map', showMap);
      if (showMap) {
        requestAnimationFrame(() => {
          if (!map) return;
          map.invalidateSize({ pan: false });
          if (filteredData.length) renderMarkers(filteredData);
        });
        setTimeout(() => map && map.invalidateSize({ pan: false }), 260);
      }
    });
  });
})(jQuery);
