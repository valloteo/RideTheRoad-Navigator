let route = [];
let currentStep = 0;

async function calculateRoute(coords) {
  const start = coords[0];
  const end = coords[coords.length - 1];

  const url = `https://graphhopper.com/api/1/route?point=${start[1]},${start[0]}&point=${end[1]},${end[0]}&profile=car&locale=it&instructions=true&key=554f1638-d277-4945-94ab-10d6fac55139;

  const res = await fetch(url);
  const data = await res.json();

  route = data.paths[0].instructions;
  return data.paths[0];
}

function updateInstruction() {
  if (!route.length) return;

  const step = route[currentStep];
  document.getElementById("nav-text").innerText = step.text;
  document.getElementById("nav-icon").innerText = getIcon(step.sign);
}

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

function startNavigation() {
  navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;

    const user = [longitude, latitude];

    const step = route[currentStep];
    const dist = distance(user, step.points[0]);

    if (dist < 20 && currentStep < route.length - 1) {
      currentStep++;
      updateInstruction();
    }
  });
}

function distance(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx*dx + dy*dy) * 111000;
}
