// ===============================
// NAVIGAZIONE TURN-BY-TURN
// ===============================

// SIMULAZIONE GPS SU PC
function getSimulatedPosition() {
  return {
    coords: {
      latitude: 45.4642,   // Milano centro
      longitude: 9.19
    }
  };
}

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

let route = null;
let currentInstructionIndex = 0;
let userMarker = null;

// ===============================
// CALCOLO DEL PERCORSO (GraphHopper)
// ===============================
async function calculateRoute(gpxCoords) {
  if (!gpxCoords || gpxCoords.length === 0) {
    console.error("Nessuna coordinata GPX trovata");
    return null;
  }

  const apiKey = "554f1638-d277-4945-94ab-10d6fac55139";

  // Passiamo TUTTI i punti del GPX
  const points = gpxCoords.map(p => [p.lon, p.lat]);

  const url = `https://graphhopper.com/api/1/route?key=${apiKey}`;

  const body = {
    profile: "motorcycle",
    points: points,
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
// AVVIO NAVIGAZIONE
// ===============================
function startNavigation() {
  if (!route) {
    console.error("Nessun percorso caricato");
    return;
  }

  currentInstructionIndex = 0;

  // GPS reale su smartphone
  if (isMobile()) {
    navigator.geolocation.watchPosition(
      pos => handlePosition(pos),
      err => console.error(err),
      { enableHighAccuracy: true }
    );
  } else {
    // SIMULAZIONE SU PC
    setInterval(() => {
      const pos = getSimulatedPosition();
      handlePosition(pos);
    }, 2000);
  }
}

// ===============================
// GESTIONE POSIZIONE UTENTE
// ===============================
function handlePosition(pos) {
  const user = [pos.coords.longitude, pos.coords.latitude];

  // Marker utente
  if (!userMarker) {
    userMarker = new maplibregl.Marker({ color: "red" })
      .setLngLat(user)
      .addTo(map);
  } else {
    userMarker.setLngLat(user);
  }

  // Istruzione corrente
  const instr = route.instructions[currentInstructionIndex];
  updateInstructionUI(instr);

  // Distanza dalla prossima svolta
  const dist = turf.distance(
    turf.point(user),
    turf.point([instr.point.lon, instr.point.lat]),
    { units: "meters" }
  );

  // Passa alla prossima istruzione
  if (dist < 30 && currentInstructionIndex < route.instructions.length - 1) {
    currentInstructionIndex++;
  }
}

// ===============================
// UI ISTRUZIONI
// ===============================
function updateInstructionUI(instr) {
  const box = document.getElementById("instruction");
  if (!instr) {
    box.innerText = "Prosegui";
    return;
  }

  box.innerText = instr.text || "Prosegui";
}

// ===============================
// UI RIEPILOGO
// ===============================
function updateSummaryUI(route) {
  const box = document.getElementById("summary");

  const km = (route.distance / 1000).toFixed(1);
  const min = Math.round(route.time / 60000);

  const arrival = new Date(Date.now() + route.time);
  const hh = arrival.getHours().toString().padStart(2, "0");
  const mm = arrival.getMinutes().toString().padStart(2, "0");

  box.innerText = `${km} km — ${min} min — Arrivo ${hh}:${mm}`;
}

// ===============================
// ESPORTIAMO LE FUNZIONI
// ===============================
window.calculateRoute = calculateRoute;
window.startNavigation = startNavigation;
window.updateSummaryUI = updateSummaryUI;
