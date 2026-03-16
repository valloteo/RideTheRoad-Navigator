// RideTheRoad - versione base

let map;
let routeCoords = [];

async function loadGPX(url) {
    const res = await fetch(url);
    const text = await res.text();
    const gpx = new DOMParser().parseFromString(text, "text/xml");
    const geojson = toGeoJSON.gpx(gpx);

    // estraiamo le coordinate
    routeCoords = geojson.features[0].geometry.coordinates;

    return geojson;
}

function initMap() {
    map = new maplibregl.Map({
        container: "map",
        style: "https://demotiles.maplibre.org/style.json",
        center: [12.5, 41.9], // Roma default
        zoom: 10
    });
}

function drawRoute(geojson) {
    map.on("load", () => {
        map.addSource("route", {
            type: "geojson",
            data: geojson
        });

        map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            paint: {
                "line-color": "#ff6600",
                "line-width": 4
            }
        });

        // centra la mappa sul percorso
        const bounds = new maplibregl.LngLatBounds();
        routeCoords.forEach(c => bounds.extend(c));
        map.fitBounds(bounds, { padding: 40 });
    });
}

function startGPS() {
    if (!navigator.geolocation) {
        document.getElementById("info").innerText = "GPS non disponibile";
        return;
    }

    navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude } = pos.coords;

        document.getElementById("info").innerText =
            `Posizione: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    });
}

// MAIN
(async () => {
    initMap();

    // URL GPX passato dal bot, esempio:
    const gpxUrl = new URLSearchParams(window.location.search).get("gpx");

    if (!gpxUrl) {
        document.getElementById("info").innerText = "Nessun GPX ricevuto";
        return;
    }

    const geojson = await loadGPX(gpxUrl);
    drawRoute(geojson);
    startGPS();
})();
