/**
 * Petites Machines — jeu simple d'action = conséquence pour enfants dès 3 ans.
 * Initiation douce à l'idée d'agent : le petit robot en haut observe et raconte.
 */

const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
const agentEl = document.getElementById('agent');
const buttons = document.querySelectorAll('.vehicle-btn');

let width, height, dpr;
let mouse = { x: 0, y: 0, active: false };
let frame = 0;
let demoMode = true;
let demoTimer = 0;
let demoPhaseIndex = 0;
let demoMessage = 'Regarde : la voiture roule toute seule';
let demoMessageTimer = 0;
let demoVehicleOrder = ['car', 'truck', 'tractor', 'excavator'];

const VEHICLES = {
  car: {
    name: 'voiture',
    label: 'La voiture roule sur la route',
    color: '#e76f51',
    width: 64,
    height: 36,
    wheelR: 9,
    action: 'road',
  },
  truck: {
    name: 'camion',
    label: 'Le camion transporte du foin',
    color: '#2a9d8f',
    width: 92,
    height: 44,
    wheelR: 11,
    action: 'farm',
  },
  tractor: {
    name: 'tracteur',
    label: 'Le tracteur laboure le champ',
    color: '#e9c46a',
    width: 74,
    height: 46,
    wheelR: 12,
    action: 'field',
  },
  excavator: {
    name: 'pelleteuse',
    label: 'La pelleteuse creuse la terre',
    color: '#cdb4db',
    width: 86,
    height: 42,
    wheelR: 10,
    action: 'dirt',
  },
};

let currentType = 'car';
let vehicle = {
  x: 0, y: 0, angle: 0, vx: 0, vy: 0,
  state: 'idle', // idle, working
  workTimer: 0,
};

let zones = [];
let tracks = []; // traces de voiture
let furrows = []; // sillons de tracteur
let carriedHay = []; // foin transporté
let dirtPiles = []; // tas de terre / cailloux
let stones = [];
let clouds = [];
let birds = [];
let stars = [];

let lastAgentMessage = '';
let agentTimer = 0;

function say(text) {
  if (text === lastAgentMessage) return;
  lastAgentMessage = text;
  agentEl.textContent = text;
  agentTimer = 180;
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  initWorld();
}

function initWorld() {
  zones = [
    { type: 'road', x: width * 0.5, y: height * 0.72, w: width * 0.85, h: height * 0.18, label: 'route' },
    { type: 'farm', x: width * 0.15, y: height * 0.28, w: width * 0.25, h: height * 0.22, label: 'ferme' },
    { type: 'field', x: width * 0.72, y: height * 0.28, w: width * 0.32, h: height * 0.22, label: 'champ' },
    { type: 'dirt', x: width * 0.45, y: height * 0.48, w: width * 0.18, h: height * 0.14, label: 'tas de terre' },
  ];

  tracks = [];
  furrows = [];
  carriedHay = [];
  dirtPiles = [
    { x: width * 0.45, y: height * 0.48, r: 0.85, stones: 6 },
  ];
  stones = [];
  for (let i = 0; i < 8; i++) {
    stones.push({
      x: zones[3].x + (Math.random() - 0.5) * zones[3].w * 0.6,
      y: zones[3].y + (Math.random() - 0.5) * zones[3].h * 0.4,
      r: 0,
      visible: false,
    });
  }

  clouds = [];
  const count = Math.floor(width / 220) + 2;
  for (let i = 0; i < count; i++) {
    clouds.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.35 + height * 0.05,
      r: Math.random() * 40 + 30,
      speed: Math.random() * 0.2 + 0.05,
      circles: Array.from({ length: 4 }, () => ({
        dx: (Math.random() - 0.5) * 70,
        dy: (Math.random() - 0.5) * 25,
        r: Math.random() * 25 + 18,
      })),
    });
  }

  birds = [];
  for (let i = 0; i < 4; i++) {
    birds.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.25,
      speed: 0.4 + Math.random() * 0.4,
      offset: Math.random() * Math.PI * 2,
    });
  }

  stars = [];
  for (let i = 0; i < 40; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.45,
      r: Math.random() * 1.5 + 0.5,
      twinkle: Math.random() * Math.PI * 2,
    });
  }

  if (!mouse.active) {
    mouse.x = width * 0.5;
    mouse.y = height * 0.72;
  }
  vehicle.x = mouse.x;
  vehicle.y = mouse.y;
}

function update() {
  frame++;

  if (demoMode) {
    runDemo();
  } else if (!mouse.active) {
    // Mouvement auto de démonstration si l'enfant n'interagit pas encore
    const zone = zones.find(z => VEHICLES[currentType].action === z.type);
    if (zone) {
      mouse.x = zone.x + Math.sin(frame * 0.01) * zone.w * 0.3;
      mouse.y = zone.y + Math.cos(frame * 0.012) * zone.h * 0.3;
    }
  }

  const spec = VEHICLES[currentType];
  const dx = mouse.x - vehicle.x;
  const dy = mouse.y - vehicle.y;
  const targetAngle = Math.atan2(dy, dx);
  const speed = 0.055;
  vehicle.vx += dx * speed * 0.015;
  vehicle.vy += dy * speed * 0.015;
  vehicle.vx *= 0.88;
  vehicle.vy *= 0.88;
  vehicle.x += vehicle.vx;
  vehicle.y += vehicle.vy;

  let angleDiff = targetAngle - vehicle.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  vehicle.angle += angleDiff * 0.06;

  // Garde dans l'écran
  vehicle.x = Math.max(40, Math.min(width - 40, vehicle.x));
  vehicle.y = Math.max(40, Math.min(height - 120, vehicle.y));

  // Détection zone
  const inside = zones.find(z => {
    return Math.abs(vehicle.x - z.x) < z.w / 2 + 20 && Math.abs(vehicle.y - z.y) < z.h / 2 + 20;
  });

  if (inside && inside.type === spec.action) {
    if (vehicle.state !== 'working') {
      vehicle.state = 'working';
      vehicle.workTimer = 0;
      if (!demoMode) say(spec.label + ' !');
    }
    vehicle.workTimer++;
    doAction(spec.action);
  } else {
    vehicle.state = 'idle';
    vehicle.workTimer = 0;
    if (!demoMode) {
      if (inside) {
        say('Cette zone est pour un autre véhicule…');
      } else if (agentTimer <= 0) {
        say('Conduis la ' + spec.name + ' vers sa zone colorée');
      }
    }
  }

  if (agentTimer > 0) agentTimer--;

  // Animation environnement
  for (const c of clouds) {
    c.x += c.speed;
    if (c.x - c.r > width) c.x = -c.r;
  }
  for (const b of birds) {
    b.x += b.speed;
    if (b.x > width + 20) b.x = -20;
  }
}

function runDemo() {
  demoTimer++;
  const t = demoTimer / 60;
  const phaseDuration = 10; // secondes par véhicule

  demoPhaseIndex = Math.min(Math.floor(t / phaseDuration), demoVehicleOrder.length - 1);
  const type = demoVehicleOrder[demoPhaseIndex];

  if (currentType !== type) {
    buttons.forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`[data-type="${type}"]`);
    if (btn) btn.classList.add('active');
    currentType = type;
    vehicle.state = 'idle';
    vehicle.workTimer = 0;
  }

  const spec = VEHICLES[type];
  const zone = zones.find(z => z.type === spec.action);

  if (zone) {
    mouse.x = zone.x + Math.sin(frame * 0.01) * zone.w * 0.25;
    mouse.y = zone.y + Math.cos(frame * 0.012) * zone.h * 0.25;
  }

  // Messages explicatifs
  const messages = [
    'Regarde : la voiture roule sur la route',
    'Le camion charge du foin à la ferme',
    'Le tracteur laboure le champ',
    'La pelleteuse creuse et trouve des cailloux',
  ];
  demoMessage = messages[demoPhaseIndex];

  if (demoMessageTimer <= 0) {
    say(demoMessage + ' — à toi ensuite !');
    demoMessageTimer = 150;
  } else {
    demoMessageTimer--;
  }

  // Après 40 secondes, on demande à l'enfant de prendre le relais
  if (t >= 42) {
    demoMode = false;
    demoTimer = 0;
    say('À toi ! Choisis un véhicule et conduis-le');
  }
}

function endDemo() {
  demoMode = false;
  demoTimer = 0;
  say('À toi ! Choisis un véhicule et conduis-le');
}

function doAction(action) {
  const v = vehicle;
  if (action === 'road') {
    // Trace de pneus sur la route
    if (vehicle.workTimer % 8 === 0) {
      tracks.push({ x: v.x, y: v.y, r: 4, life: 1 });
      if (tracks.length > 60) tracks.shift();
    }
  } else if (action === 'field') {
    // Sillons dans le champ
    if (vehicle.workTimer % 10 === 0) {
      furrows.push({ x: v.x, y: v.y, r: 5, life: 1 });
      if (furrows.length > 80) furrows.shift();
    }
  } else if (action === 'farm') {
    // Le camion récupère du foin
    if (vehicle.workTimer % 25 === 0 && carriedHay.length < 5) {
      carriedHay.push({
        x: v.x + (Math.random() - 0.5) * 20,
        y: v.y - 20 + (Math.random() - 0.5) * 10,
        r: 12,
      });
      say('Le camion prend du foin');
    }
  } else if (action === 'dirt') {
    // La pelleteuse creuse et fait apparaître des cailloux
    if (vehicle.workTimer % 20 === 0) {
      const pile = dirtPiles[0];
      pile.r = Math.max(0.35, pile.r - 0.06);
      // Révéler un caillou
      const hidden = stones.find(s => !s.visible);
      if (hidden) {
        hidden.visible = true;
        hidden.r = 0;
      }
      if (pile.r <= 0.4) {
        say('La pelleteuse a trouvé des cailloux !');
      } else {
        say('La pelleteuse creuse la terre');
      }
    }
  }

  // Les cailloux grandissent doucement
  for (const s of stones) {
    if (s.visible && s.r < 10) s.r += 0.3;
  }
}

function draw() {
  drawSky();
  drawZones();
  drawTracks();
  drawFurrows();
  drawDirt();
  drawStones();
  drawHay();
  drawVehicle();
  drawClouds();
  drawBirds();
}

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#e6f0e8');
  grad.addColorStop(1, '#d4e6d8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  for (const s of stars) {
    const alpha = 0.25 + 0.25 * Math.sin(frame * 0.02 + s.twinkle);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }

  // Soleil doux
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#fff3e0';
  ctx.shadowColor = '#fff3e0';
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(width * 0.88, height * 0.12, 45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawZones() {
  for (const z of zones) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.roundRect(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h, 24);
    ctx.fillStyle = zoneColor(z.type);
    ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = zoneColor(z.type);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Pictogramme
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.font = '48px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(zoneEmoji(z.type), z.x, z.y);
    ctx.restore();
  }
}

function zoneColor(type) {
  return { road: '#9ca3af', farm: '#f4a261', field: '#81b29a', dirt: '#a67c52' }[type] || '#999';
}

function zoneEmoji(type) {
  return { road: '🛣️', farm: '🏠', field: '🌾', dirt: '🪨' }[type] || '?';
}

function drawTracks() {
  for (const t of tracks) {
    ctx.globalAlpha = t.life * 0.6;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fillStyle = '#7b7b7b';
    ctx.fill();
    t.life = Math.max(0, t.life - 0.003);
  }
  ctx.globalAlpha = 1;
  tracks = tracks.filter(t => t.life > 0);
}

function drawFurrows() {
  for (const f of furrows) {
    ctx.globalAlpha = f.life * 0.55;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fillStyle = '#6a8d6f';
    ctx.fill();
    f.life = Math.max(0, f.life - 0.001);
  }
  ctx.globalAlpha = 1;
  furrows = furrows.filter(f => f.life > 0);
}

function drawDirt() {
  for (const p of dirtPiles) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(zones[3].x, zones[3].y, zones[3].w * 0.3 * p.r, 0, Math.PI * 2);
    ctx.fillStyle = '#a67c52';
    ctx.fill();
    ctx.restore();
  }
}

function drawStones() {
  for (const s of stones) {
    if (!s.visible) continue;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = '#8d8d8d';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
  }
}

function drawHay() {
  for (const h of carriedHay) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.fillStyle = '#e9c46a';
    ctx.beginPath();
    ctx.roundRect(-h.r, -h.r * 0.7, h.r * 2, h.r * 1.4, 6);
    ctx.fill();
    ctx.strokeStyle = '#d4a373';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-h.r * 0.5, -h.r * 0.6);
    ctx.lineTo(-h.r * 0.5, h.r * 0.6);
    ctx.moveTo(0, -h.r * 0.6);
    ctx.lineTo(0, h.r * 0.6);
    ctx.moveTo(h.r * 0.5, -h.r * 0.6);
    ctx.lineTo(h.r * 0.5, h.r * 0.6);
    ctx.stroke();
    ctx.restore();
  }
}

function drawVehicle() {
  const spec = VEHICLES[currentType];
  ctx.save();
  ctx.translate(vehicle.x, vehicle.y);
  ctx.rotate(vehicle.angle);

  // Halos quand travaille
  if (vehicle.state === 'working') {
    const halo = 60 + Math.sin(frame * 0.2) * 10;
    ctx.beginPath();
    ctx.arc(0, 0, halo, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fill();
  }

  // Corps
  ctx.fillStyle = spec.color;
  ctx.beginPath();
  ctx.roundRect(-spec.width / 2, -spec.height / 2, spec.width, spec.height, 12);
  ctx.fill();

  // Cabine
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.roundRect(-spec.width / 4, -spec.height / 2 - 8, spec.width / 2, 18, 6);
  ctx.fill();

  // Roues
  ctx.fillStyle = '#3d3430';
  const wheelOffset = spec.width / 2 - spec.wheelR - 8;
  ctx.beginPath();
  ctx.arc(-wheelOffset, spec.height / 2 - 2, spec.wheelR, 0, Math.PI * 2);
  ctx.arc(wheelOffset, spec.height / 2 - 2, spec.wheelR, 0, Math.PI * 2);
  ctx.fill();

  // Petit visage / phares
  ctx.fillStyle = '#fff3e0';
  ctx.beginPath();
  ctx.arc(-spec.width / 4, -2, 5, 0, Math.PI * 2);
  ctx.arc(spec.width / 4, -2, 5, 0, Math.PI * 2);
  ctx.fill();

  // Accessoires spécifiques
  if (currentType === 'excavator') {
    ctx.strokeStyle = '#7d5a8c';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(spec.width / 2 - 6, 0);
    ctx.lineTo(spec.width / 2 + 26, -18);
    ctx.lineTo(spec.width / 2 + 36, 8);
    ctx.stroke();
    ctx.fillStyle = '#7d5a8c';
    ctx.beginPath();
    ctx.arc(spec.width / 2 + 36, 8, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (currentType === 'tractor') {
    ctx.fillStyle = '#3d3430';
    ctx.beginPath();
    ctx.arc(-spec.width / 2 + 12, spec.height / 2 + 8, 16, 0, Math.PI * 2);
    ctx.fill();
  } else if (currentType === 'truck') {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.roundRect(-spec.width / 2 + 6, -spec.height / 2 + 4, spec.width - 12, spec.height - 12, 6);
    ctx.fill();
  }

  ctx.restore();
}

function drawClouds() {
  for (const c of clouds) {
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#ffffff';
    for (const cir of c.circles) {
      ctx.beginPath();
      ctx.arc(c.x + cir.dx, c.y + cir.dy, cir.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawBirds() {
  ctx.strokeStyle = 'rgba(61, 52, 48, 0.5)';
  ctx.lineWidth = 2;
  for (const b of birds) {
    const y = b.y + Math.sin(frame * 0.05 + b.offset) * 8;
    ctx.beginPath();
    ctx.moveTo(b.x - 7, y);
    ctx.quadraticCurveTo(b.x, y - 5, b.x + 7, y);
    ctx.stroke();
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// Événements
window.addEventListener('pointermove', (e) => {
  if (demoMode) endDemo();
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
});

window.addEventListener('pointerdown', () => {
  if (demoMode) endDemo();
});

window.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (demoMode) endDemo();
  const t = e.touches[0];
  mouse.x = t.clientX;
  mouse.y = t.clientY;
  mouse.active = true;
}, { passive: false });

window.addEventListener('touchstart', (e) => {
  if (demoMode) endDemo();
}, { passive: false });

buttons.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (demoMode) endDemo();
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentType = btn.dataset.type;
    vehicle.state = 'idle';
    vehicle.workTimer = 0;
    say('Conduis la ' + VEHICLES[currentType].name + ' vers sa zone');
  });
});

window.addEventListener('resize', resize);
resize();
buttons[0].classList.add('active');
loop();
