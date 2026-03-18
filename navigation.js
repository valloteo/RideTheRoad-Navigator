let currentIndex = 0;
let userMarker = null;
let watchId = null;
let activeRoute = null;
let lastPos = null;
let bearing = 0;
let compassHeading = null;
let recalcLineId = "recalc-route";
const OFF_ROUTE_THRESHOLD_METERS = 80;
const GRAPHOPPER_KEY = "554f1638-d277-4945-94ab-10d6fac55139";

// Permesso bussola iPhone
if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
  DeviceOrientationEvent.requestPermission().catch(() => {});
}

window.addEventListener("deviceorientation", e => {
  if (e.webkitCompassHeading) compassHeading = e.webkitCompassHeading;
  else if (e.alpha) compassHeading = 360 - e.alpha;
});

// Bearing da movimento
function computeBearing(prev, curr) {
  const y = Math.sin((curr[0] - prev[0]) * Math.PI / 180) * Math.cos(curr[1] * Math.PI / 180);
  const x =
    Math.cos(prev[1] * Math.PI / 180) * Math.sin(curr[1] * Math.PI / 180) -
    Math.sin(prev[1] * Math.PI / 180) *
      Math.cos(curr[1] * Math.PI / 180) *
      Math.cos((curr[0] - prev[0]) * Math.PI / 180);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

// Prepara route
function prepareRouteFromGPX(gpxData) {
  const wpts = gpxData.waypoints;
  let totalDist = 0;

  for (let i = 0; i < wpts.length - 1; i++) {
    totalDist += turf.distance(
      turf.point([wpts[i].lon, wpts[i].lat]),
      turf.point([wpts[i + 1].lon, wpts[i + 1].lat]),
      { units: "kilometers" }
    );
  }

  const totalMeters = totalDist * 1000;
  const totalMinutes = (totalDist / 60) * 60;
  const totalMs = totalMinutes * 60 * 1000;

  return {
    waypoints: wpts,
    distance: totalMeters,
    time: totalMs
  };
}

function updateSummary(route) {
  const box = document.getElementById("summary");
  if (!box || !route) return;

  const km = (route.distance / 1000).toFixed(1);
  const min = Math.round(route.time / 60000);
  const arrival = new Date(Date.now() + route.time);
  const hh = arrival.getHours().toString().padStart(2, "0");
  const mm = arrival.getMinutes().toString().padStart(2, "0");

  box.textContent = `${km} km — ${min} min — Arrivo ${hh}:${mm}`;
}

function startNavigation(route, map) {
  activeRoute = route;
  currentIndex = 0;
  lastPos = null;

  updateInstructionUI(route.waypoints[currentIndex].name);

  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      pos => handlePosition(pos, map),
      err => console.error(err),
      { enableHighAccuracy: true }
    );
  }
}

function stopNavigation() {
  if (watchId) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  activeRoute = null;
  currentIndex = 0;
  lastPos = null;

  if (userMarker) {
    userMarker.remove();
    userMarker = null;
  }
}

function handlePosition(pos, map) {
  if (!activeRoute) return;

  const user = [pos.coords.longitude, pos.coords.latitude];

  if (!userMarker) {
    userMarker = new maplibregl.Marker({ color: "blue" }).setLngLat(user).addTo(map);
  } else {
    userMarker.setLngLat(user);
  }

  // Bearing
  if (lastPos) bearing = computeBearing(lastPos, user);
  lastPos = user;

  // Bussola se fermo
  const finalBearing = pos.coords.speed < 1 && compassHeading !== null ? compassHeading : bearing;

  map.easeTo({
    center: user,
    zoom: Math.max(map.getZoom(), 15),
    bearing: finalBearing,
    duration: 500
  });

  const wpts = activeRoute.waypoints;
  const next = getClosestWaypoint(user, wpts);

  currentIndex = next.index;
  updateInstructionUI(next.wpt.name);

  const dist = next.distance;

  if (dist < 30 && currentIndex < wpts.length - 1) {
    currentIndex++;
    updateInstructionUI(wpts[currentIndex].name);
    clearRecalcLine(map);
    return;
  }

  if (dist > OFF_ROUTE_THRESHOLD_METERS) {
    recalcToWaypoint(user, next.wpt, map);
  }
}

function getClosestWaypoint(user, wpts) {
  let best = { index: 0, distance: Infinity, wpt: null };

  wpts.forEach((w, i) => {
    const d = turf.distance(turf.point(user), turf.point([w.lon, w.lat]), { units: "meters" });
    if (d < best.distance) best = { index: i, distance: d, wpt: w };
  });

  return best;
}

function updateInstructionUI(text) {
  const box = document.getElementById("instruction");
  if (!box) return;

  if (text && text.length > 0) box.textContent = text;
  else box.textContent = "Prosegui";
}

async function recalcToWaypoint(userLngLat, targetWpt, map) {
  try {
    const url = `https://graphhopper.com/api/1/route?key=${GRAPHOPPER_KEY}`;
    const body = {
      profile: "motorcycle",
      points: [userLngLat, [targetWpt.lon, targetWpt.lat]],
      instructions: false,
      calc_points: true
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!data.paths || data.paths.length === 0) return;

    const coords = data.paths[0].points.coordinates;

    const line = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords }
    };

    if (map.getSource(recalcLineId)) {
      map.getSource(recalcLineId).setData(line);
    } else {
      map.addSource(recalcLineId, { type: "geojson", data: line });

      map.addLayer({
        id: `${recalcLineId}-line`,
        type: "line",
        source: recalcLineId,
        paint: {
          "line-color": "#0000ff",
          "line-width": 3,
          "line-dasharray": [2, 2]
        }
      });
    }
  } catch (e) {
    console.error("Errore ricalcolo GraphHopper", e);
  }
}

function clearRecalcLine(map) {
  if (map.getLayer(`${recalcLineId}-line`)) map.removeLayer(`${recalcLineId}-line`);
  if (map.getSource(recalcLineId)) map.removeSource(recalcLineId);
}

window.prepareRouteFromGPX = prepareRouteFromGPX;
window.updateSummary = updateSummary;
window.startNavigation = startNavigation;
window.stopNavigation = stopNavigation;
