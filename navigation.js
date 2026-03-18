// ===============================
//  NAVIGAZIONE TURN-BY-TURN
// ===============================

// 1. Calcolo percorso con GraphHopper
async function calculateRoute(gpxCoords) {
  if (!gpxCoords || gpxCoords.length === 0) {
    console.error("Nessuna coordinata GPX trovata");
    return null;
  }

  const apiKey = "554f1638-d277-4945-94ab-10d6fac55139";

  const start = gpxCoords[0];
  const end = gpxCoords[gpxCoords.length - 1];

  const url = `https://graphhopper.com/api/1/route?key=${apiKey}`;

  const body = {
    profile: "motorcycle",
    points: [
      [start.lon, start.lat],
      [end.lon, end.lat]
    ],
    instructions: true,
    calc_points: true
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!data.paths || data.paths.length === 0) {
    console.error("Nessun percorso trovato");
    return null;
  }

  const path = data.paths[0];

  return {
    distance: path.distance,
    time: path.time,
    points: path.points.coordinates,
    instructions: path.instructions
  };
}



// ===============================
// 2. Riepilogo percorso (km, tempo, arrivo)
// ===============================
function updateSummary(route) {
  const km = (route.distance / 1000).toFixed(1);
  const minutes = Math.round(route.time / 60000);

  const arrival = new Date(Date.now() + route.time);
  const hh = arrival.getHours().toString().padStart(2, "0");
  const mm = arrival.getMinutes().toString().padStart(2, "0");

  const el = document.getElementById("summary");
  if (el) {
    el.textContent = `${km} km — ${minutes} min — Arrivo ${hh}:${mm}`;
  }
}



// ===============================
// 3. Mostrare la prossima istruzione
// ===============================
function updateInstructionUI(instr) {
  const text = instr.text;
  const dist = Math.round(instr.distance);

  const el = document.getElementById("instruction");
  if (el) {
    el.textContent = `${text} (${dist} m)`;
  }
}



// ===============================
// 4. Navigazione reale (GPS + istruzioni)
// ===============================
function startNavigation(route, map) {
  let currentInstructionIndex = 0;

  navigator.geolocation.watchPosition(pos => {
    const user = [pos.coords.longitude, pos.coords.latitude];

    // Marker utente
    if (!window.userMarker) {
      window.userMarker = new maplibregl.Marker({ color: "red" })
        .setLngLat(user)
        .addTo(map);
    } else {
      window.userMarker.setLngLat(user);
    }

    // Prossima istruzione
    const instr = route.instructions[currentInstructionIndex];
    updateInstructionUI(instr);

    // Distanza dalla svolta
    const dist = turf.distance(
      turf.point(user),
      turf.point([instr.point.lon, instr.point.lat]),
      { units: "meters" }
    );

    // Passa alla prossima istruzione
    if (dist < 30 && currentInstructionIndex < route.instructions.length - 1) {
      currentInstructionIndex++;
    }

  }, err => console.error(err), {
    enableHighAccuracy: true
  });
}
