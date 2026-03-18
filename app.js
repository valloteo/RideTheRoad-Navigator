let map;
let gpxCoords = [];
let routeData = null;

window.onload = () => {
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.stadiamaps.com/styles/osm_bright.json',
    center: [12.4964, 41.9028],
    zoom: 12
  });

  document.getElementById("zoom-in").onclick = () => map.zoomIn();
  document.getElementById("zoom-out").onclick = () => map.zoomOut();
  document.getElementById("compass").onclick = () => map.resetNorth();

  document.getElementById("import-gpx").onclick = () =>
    document.getElementById("gpx-file").click();

  document.getElementById("gpx-file").addEventListener("change", e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      gpxCoords = parseGPX(ev.target.result);
      drawTrack(gpxCoords, map);
      // reset UI riepilogo e istruzioni
      const summaryEl = document.getElementById("summary");
      const instrEl = document.getElementById("instruction");
      if (summaryEl) summaryEl.textContent = "-- km — -- min — Arrivo --:--";
      if (instrEl) instrEl.textContent = "Pronto a partire";
    };
    reader.readAsText(file);
  });

  document.getElementById("start-nav").onclick = async () => {
    if (!gpxCoords || gpxCoords.length === 0) {
      console.error("Nessuna traccia GPX caricata");
      return;
    }

    routeData = await calculateRoute(gpxCoords);
    if (!routeData) {
      console.error("Impossibile calcolare il percorso");
      return;
    }

    updateSummary(routeData);
    startNavigation(routeData, map);
  };
};
