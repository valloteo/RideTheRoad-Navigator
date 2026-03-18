let map;
let gpxCoords = [];

window.onload = () => {
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.stadiamaps.com/styles/osm_bright.json?api_key=LA_TUA_KEY',
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
    };
    reader.readAsText(file);
  });

  document.getElementById("start-nav").onclick = async () => {
    const routeData = await calculateRoute(gpxCoords);
    updateInstruction();
    startNavigation();
  };
};
