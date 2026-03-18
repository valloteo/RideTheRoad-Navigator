function parseGPX(gpxText) {
  const xml = new DOMParser().parseFromString(gpxText, "application/xml");

  const wpts = [...xml.getElementsByTagName("wpt")].map(w => ({
    lat: parseFloat(w.getAttribute("lat")),
    lon: parseFloat(w.getAttribute("lon")),
    name: w.getElementsByTagName("name")[0]?.textContent?.trim() || ""
  }));

  const track = wpts.map(w => ({ lat: w.lat, lon: w.lon }));

  return {
    waypoints: wpts,
    track
  };
}

window.parseGPX = parseGPX;
