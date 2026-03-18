let map;
let gpxData = null;
let routeData = null;

window.onload = () => {
  map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.stadiamaps.com/styles/osm_bright.json",
    center: [12.4964, 41.9028],
    zoom: 12
  });

  // Offline tile cache
  map.on("load", () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js");
    }
  });

  // Geolocalizzazione iniziale
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        map.setCenter([lng, lat]);
        map.setZoom(15);
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }

  // Controlli mappa
  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");
  const compassBtn = document.getElementById("compass");

  if (zoomInBtn) zoomInBtn.onclick = () => map.zoomIn();
  if (zoomOutBtn) zoomOutBtn.onclick = () => map.zoomOut();
  if (compassBtn) compassBtn.onclick = () => map.resetNorth();

  // Import GPX
  const importBtn = document.getElementById("import-gpx");
  const fileInput = document.getElementById("gpx-file");

  if (importBtn && fileInput) {
    importBtn.onclick = () => fileInput.click();

    fileInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = ev => {
        gpxData = parseGPX(ev.target.result);
        drawTrack(gpxData.track, map);

        const summaryEl = document.getElementById("summary");
        const instrEl = document.getElementById("instruction");
        if (summaryEl) summaryEl.textContent = "-- km — -- min — Arrivo --:--";
        if (instrEl) instrEl.textContent = "Pronto a partire";
      };
      reader.readAsText(file);
    });
  }

  // DA → A
  const fromInput = document.getElementById("from-input");
  const toInput = document.getElementById("to-input");
  const searchBtn = document.getElementById("search-route");

  if (searchBtn && fromInput && toInput) {
    searchBtn.onclick = async () => {
      const fromText = fromInput.value.trim();
      const toText = toInput.value.trim();
      if (!fromText || !toText) return;

      const fromCoord = await geocodePlace(fromText);
      const toCoord = await geocodePlace(toText);
      if (!fromCoord || !toCoord) return;

      gpxData = {
        waypoints: [
          { lat: fromCoord.lat, lon: fromCoord.lon, name: "Partenza" },
          { lat: toCoord.lat, lon: toCoord.lon, name: "Arrivo" }
        ],
        track: [
          { lat: fromCoord.lat, lon: fromCoord.lon },
          { lat: toCoord.lat, lon: toCoord.lon }
        ]
      };

      drawTrack(gpxData.track, map);

      const summaryEl = document.getElementById("summary");
      const instrEl = document.getElementById("instruction");
      if (summaryEl) summaryEl.textContent = "-- km — -- min — Arrivo --:--";
      if (instrEl) instrEl.textContent = "Pronto a partire";
    };
  }

  // Start navigazione
  const startBtn = document.getElementById("start-nav");
  if (startBtn) {
    startBtn.onclick = async () => {
      if (!gpxData || !gpxData.waypoints || gpxData.waypoints.length === 0) return;

      routeData = prepareRouteFromGPX(gpxData);
      updateSummary(routeData);
      startNavigation(routeData, map);
    };
  }

  // Stop navigazione
  const stopBtn = document.getElementById("stop-nav");
  if (stopBtn) stopBtn.onclick = () => stopNavigation();
};

// Geocoding
async function geocodePlace(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data || data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon)
  };
}

// Disegna traccia
function drawTrack(coords, map) {
  if (!coords || coords.length === 0) return;

  const line = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: coords.map(p => [p.lon, p.lat])
    }
  };

  if (map.getSource("gpx-track")) {
    map.getSource("gpx-track").setData(line);
  } else {
    map.addSource("gpx-track", { type: "geojson", data: line });

    map.addLayer({
      id: "gpx-track-line",
      type: "line",
      source: "gpx-track",
      paint: { "line-color": "#ff0000", "line-width": 4 }
    });
  }

  const bounds = new maplibregl.LngLatBounds();
  coords.forEach(p => bounds.extend([p.lon, p.lat]));
  map.fitBounds(bounds, { padding: 40 });
}
