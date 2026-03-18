let route = [];
let currentStep = 0;

// Calcola il percorso usando GraphHopper
async function calculateRoute(coords) {
  if (!coords || coords.length < 2) {
    console.error("GPX non valido");
    return;
  }

  const start = coords[0];
  const end = coords[coords.length - 1];

  const url =
    `https://graphhopper.com/api/1/route?` +
    `point=${start[1]},${start[0]}` +
    `&point=${end[1]},${end[0]}` +
    `&profile=car&locale=it&instructions=true&points_encoded=false&key=YOUR_FREE_KEY`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.paths || !data.paths.length) {
    console.error("Errore nel routing:", data);
    return;
  }

  route = data.paths[0].instructions;
  return data.paths[0];
}

// Aggiorna il pannello delle istruzioni
function updateInstruction() {
  if (!route.length) return;

  const step = route[currentStep];

  document.getElementById("nav-text").innerText = step.text;
  document.getElementById("nav-icon").innerText = getIcon(step.sign);

  // Aggiorna ETA
  document.getElementById("nav-distance").innerText =
    (step.distance / 1000).toFixed(1) + " km";

  document.getElementById("nav-time").innerText =
    Math.round(step.time / 60000) + " min";

  const arrival = new Date(Date.now() + step.time);
  document.getElementById("nav-arrival").innerText =
    "Arrivo " + arrival.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Icone direzionali
function getIcon(sign) {
  const icons = {
    0: "⬆️",
    1: "↗️",
    2: "➡️",
    3: "↘️",
    4: "⬇️",
    5: "↙️",
    6: "⬅️",
    7: "↖️"
  };
  return icons[sign] || "➡️";
}

// Distanza tra due coordinate
function distance(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy) * 111000;
}

// Avvia la navigazione
function startNavigation() {
  if (!route.length) {
    console.error("Nessun percorso calcolato");
    return;
  }

  navigator.geolocation.watchPosition(
    pos => {
      const user = [pos.coords.longitude, pos.coords.latitude];

      const step = route[currentStep];
      const nextPoint = step.points[0];
      const dist = distance(user, nextPoint);

      if (dist < 20 && currentStep < route.length - 1) {
        currentStep++;
        updateInstruction();
      }
    },
    err => console.error("GPS error:", err),
    { enableHighAccuracy: true }
  );
}
