import $ from 'jquery';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../assets/scss/style.scss';

window.$ = window.jQuery = $;
window.L = L;
window.loadMaplibreLayer = async () => {
  if (!window.__parklyMaplibrePromise) {
    window.__parklyMaplibrePromise = Promise.all([
      import('maplibre-gl'),
      import('@maplibre/maplibre-gl-leaflet'),
      import('maplibre-gl/dist/maplibre-gl.css'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    ]).then(([maplibre, adapter, , worker]) => {
      maplibre.setWorkerUrl(worker.default);
      return adapter.maplibreGL;
    });
  }
  return window.__parklyMaplibrePromise;
};

await import('../assets/js/app.js');

requestAnimationFrame(() => {
  document.documentElement.classList.add('app-ready');
  window.setTimeout(() => document.querySelector('#app-shell-loader')?.remove(), 320);
});
