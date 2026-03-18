function parseGPX(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "text/xml");

  const trkpts = [...xml.getElementsByTagName("trkpt")];
  const coords = trkpts.map(pt => [
    parseFloat(pt.getAttribute("lon")),
    parseFloat(pt.getAttribute("lat"))
  ]);

  return coords;
}

function drawTrack(coords, map) {
  if (map.getSource("gpx")) {
    map.getSource("gpx").setData({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords }
    });
  } else {
    map.addSource("gpx", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords }
      }
    });

    map.addLayer({
      id: "gpx-line",
      type: "line",
      source: "gpx",
      paint: { "line-color": "#1E90FF", "line-width": 4 }
    });
  }

  const bounds = coords.reduce(
    (b, c) => b.extend(c),
    new maplibregl.LngLatBounds(coords[0], coords[0])
  );

  map.fitBounds(bounds, { padding: 40 });
}
