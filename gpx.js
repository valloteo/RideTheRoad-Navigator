// ===============================
// GPX PARSER + SEMPLIFICAZIONE
// ===============================

// Legge tutti i punti della traccia (migliaia di punti)
function parseTrack(xml) {
  const trkpts = [...xml.getElementsByTagName("trkpt")];
  return trkpts.map(p => ({
    lat: parseFloat(p.getAttribute("lat")),
    lon: parseFloat(p.getAttribute("lon"))
  }));
}

// Semplifica la traccia per GraphHopper (40–60 punti)
function simplifyTrack(coords, tolerance = 0.0008) {
  if (!coords || coords.length === 0) return [];

  const line = turf.lineString(coords.map(p => [p.lon, p.lat]));

  const simplified = turf.simplify(line, {
    tolerance,
    highQuality: false
  });

  return simplified.geometry.coordinates.map(c => ({
    lon: c[0],
    lat: c[1]
  }));
}

// Parser principale GPX
// ⚠️ IMPORTANTE: questa versione accetta XML già parsato
function parseGPX(xml) {
  // Traccia completa (per disegnare la linea)
  const fullTrack = parseTrack(xml);

  // Traccia semplificata (per GraphHopper)
  const simplified = simplifyTrack(fullTrack);

  return {
    fullTrack,   // migliaia di punti → per la mappa
    simplified   // 40–60 punti → per GraphHopper
  };
}

// Esportiamo la funzione
window.parseGPX = parseGPX;
