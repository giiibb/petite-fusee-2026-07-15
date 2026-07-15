/**
 * Petits Animaux — jeu d'action = conséquence pour enfants dès 3 ans.
 * Chaque animal a une zone naturelle et une conséquence douce.
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
let demoMessage = 'Regarde : le chat joue avec la souris';
let demoMessageTimer = 0;
let demoAnimalOrder = ['cat', 'dog', 'rabbit', 'bird'];

const ANIMALS = {
  cat: {
    name: 'chat',
    label: 'Le chat suit la petite souris',
    emoji: '🐱',
    color: '#f4a261',
    action: 'barn',
    sound: 'Miaou',
  },
  dog: {
    name: 'chien',
    label: 'Le chien rapporte l’os',
    emoji: '🐶',
    color: '#e76f51',
    action: 'garden',
    sound: 'Wouf',
  },
  rabbit: {
    name: 'lapin',
    label: 'Le lapin mange une carotte',
    emoji: '🐰',
    color: '#a8dadc',
    action: 'vegetable',
    sound: 'Couic',
  },
  bird: {
    name: 'oiseau',
    label: 'L’oiseau pond un œuf dans le nid',
    emoji: '🐦',
    color: '#e9c46a',
    action: 'tree',
    sound: 'Cui-cui',
  },
};

let currentType = 'cat';
let animal = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, hop: 0 };

let zones = [];
let items = []; // souris, os, carotte, œuf
let eggs = [];
let carrots = [];
let bones = [];
let mice = [];
let clouds = [];
let butterflies = [];
let trees = [];
let flowers = [];

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
    { type: 'barn', x: width * 0.15, y: height * 0.32, w: width * 0.24, h: height * 0.24, label: 'grange', color: '#d4a373' },
    { type: 'garden', x: width * 0.85, y: height * 0.32, w: width * 0.24, h: height * 0.24, label: 'jardin', color: '#81b29a' },
    { type: 'vegetable', x: width * 0.15, y: height * 0.72, w: width * 0.24, h: height * 0.2, label: 'potager', color: '#e9c46a' },
    { type: 'tree', x: width * 0.85, y: height * 0.72, w: width * 0.24, h: height * 0.2, label: 'arbre', color: '#a8dadc' },
  ];

  items = [];
  eggs = [];
  carrots = [];
  bones = [];
  mice = [];

  // Objets initiaux dans chaque zone
  for (const z of zones) {
    if (z.type === 'barn') {
      mice.push({ x: z.x, y: z.y, r: 0, visible: true, active: true });
    } else if (z.type === 'garden') {
      bones.push({ x: z.x, y: z.y, r: 0, visible: true });
    } else if (z.type === 'vegetable') {
      carrots.push({ x: z.x, y: z.y, r: 0, visible: true });
    } else if (z.type === 'tree') {
      eggs.push({ x: z.x, y: z.y - 30, r: 0, visible: false });
    }
  }

  clouds = [];
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.25 + height * 0.05,
      r: Math.random() * 35 + 25,
      speed: Math.random() * 0.18 + 0.05,
      circles: Array.from({ length: 4 }, () => ({
        dx: (Math.random() - 0.5) * 60,
        dy: (Math.random() - 0.5) * 20,
        r: Math.random() * 20 + 14,
      })),
    });
  }

  butterflies = [];
  for (let i = 0; i < 6; i++) {
    butterflies.push({
      x: Math.random() * width,
      y: Math.random() * height,
      offset: Math.random() * Math.PI * 2,
      color: ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f'][i % 4],
    });
  }

  trees = [
    { x: width * 0.08, y: height * 0.62, r: 35 },
    { x: width * 0.92, y: height * 0.62, r: 40 },
  ];

  flowers = [];
  for (let i = 0; i < 12; i++) {
    flowers.push({
      x: Math.random() * width,
      y: height * 0.55 + Math.random() * height * 0.35,
      color: ['#e76f51', '#f4a261', '#e9c46a', '#cdb4db', '#a8dadc'][i % 5],
      r: Math.random() * 4 + 3,
    });
  }

  if (!mouse.active) {
    mouse.x = width * 0.5;
    mouse.y = height * 0.5;
  }
  animal.x = mouse.x;
  animal.y = mouse.y;
}

function update() {
  frame++;

  if (demoMode) {
    runDemo();
  } else if (!mouse.active) {
    const zone = zones.find(z => ANIMALS[currentType].action === z.type);
    if (zone) {
      mouse.x = zone.x + Math.sin(frame * 0.01) * zone.w * 0.3;
      mouse.y = zone.y + Math.cos(frame * 0.012) * zone.h * 0.3;
    }
  }

  const spec = ANIMALS[currentType];
  const dx = mouse.x - animal.x;
  const dy = mouse.y - animal.y;
  const targetAngle = Math.atan2(dy, dx);
  const speed = currentType === 'bird' ? 0.075 : 0.055;
  animal.vx += dx * speed * 0.015;
  animal.vy += dy * speed * 0.015;
  animal.vx *= 0.88;
  animal.vy *= 0.88;
  animal.x += animal.vx;
  animal.y += animal.vy;

  let angleDiff = targetAngle - animal.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  animal.angle += angleDiff * 0.06;

  animal.x = Math.max(40, Math.min(width - 40, animal.x));
  animal.y = Math.max(40, Math.min(height - 120, animal.y));

  // Saut du lapin
  animal.hop = currentType === 'rabbit' ? Math.abs(Math.sin(frame * 0.15)) * 12 : 0;

  // Détection zone
  const inside = zones.find(z => {
    return Math.abs(animal.x - z.x) < z.w / 2 + 30 && Math.abs(animal.y - z.y) < z.h / 2 + 30;
  });

  if (inside && inside.type === spec.action) {
    doAction(spec.action);
  } else if (!demoMode) {
    if (inside) {
      say('Cette zone est pour un autre animal…');
    } else if (agentTimer <= 0) {
      say('Amène le ' + spec.name + ' vers sa zone colorée');
    }
  }

  if (agentTimer > 0) agentTimer--;

  // Animation environnement
  for (const c of clouds) {
    c.x += c.speed;
    if (c.x - c.r > width) c.x = -c.r;
  }
  for (const b of butterflies) {
    b.x += Math.sin(frame * 0.02 + b.offset) * 1.5;
    b.y += Math.cos(frame * 0.03 + b.offset) * 1;
  }
}

function doAction(action) {
  const spec = ANIMALS[currentType];
  if (action === 'barn') {
    const mouse = mice.find(m => m.visible);
    if (mouse) {
      mouse.x = animal.x + Math.cos(frame * 0.1) * 50;
      mouse.y = animal.y + Math.sin(frame * 0.1) * 30;
      if (agentTimer <= 0) say(spec.label + ' !');
    }
  } else if (action === 'garden') {
    const bone = bones.find(b => b.visible);
    if (bone) {
      bone.x += (animal.x - bone.x) * 0.03;
      bone.y += (animal.y - bone.y) * 0.03;
      if (agentTimer <= 0) say(spec.label + ' !');
    }
  } else if (action === 'vegetable') {
    const carrot = carrots.find(c => c.visible);
    if (carrot && frame % 40 === 0) {
      carrot.visible = false;
      say(spec.label + ' !');
      setTimeout(() => { carrot.visible = true; }, 3000);
    }
  } else if (action === 'tree') {
    const egg = eggs.find(e => !e.visible);
    if (egg && frame % 60 === 0) {
      egg.visible = true;
      egg.r = 0;
      say(spec.label + ' !');
    }
  }

  for (const e of eggs) {
    if (e.visible && e.r < 12) e.r += 0.5;
  }
  for (const m of mice) {
    if (m.visible && m.r < 9) m.r += 0.3;
  }
  for (const b of bones) {
    if (b.visible && b.r < 14) b.r += 0.4;
  }
  for (const c of carrots) {
    if (c.visible && c.r < 16) c.r += 0.4;
  }
}

function runDemo() {
  demoTimer++;
  const t = demoTimer / 60;
  const phaseDuration = 10;

  demoPhaseIndex = Math.min(Math.floor(t / phaseDuration), demoAnimalOrder.length - 1);
  const type = demoAnimalOrder[demoPhaseIndex];

  if (currentType !== type) {
    buttons.forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`[data-type="${type}"]`);
    if (btn) btn.classList.add('active');
    currentType = type;
  }

  const spec = ANIMALS[type];
  const zone = zones.find(z => z.type === spec.action);
  if (zone) {
    mouse.x = zone.x + Math.sin(frame * 0.01) * zone.w * 0.25;
    mouse.y = zone.y + Math.cos(frame * 0.012) * zone.h * 0.25;
  }

  const messages = [
    'Regarde : le chat joue avec la souris',
    'Le chien rapporte l’os au jardin',
    'Le lapin mange une carotte au potager',
    'L’oiseau pond un œuf dans le nid',
  ];
  demoMessage = messages[demoPhaseIndex];

  if (demoMessageTimer <= 0) {
    say(demoMessage + ' — à toi ensuite !');
    demoMessageTimer = 150;
  } else {
    demoMessageTimer--;
  }

  if (t >= 42) {
    demoMode = false;
    demoTimer = 0;
    say('À toi ! Choisis un animal et amène-le dans sa zone');
  }
}

function endDemo() {
  demoMode = false;
  demoTimer = 0;
  say('À toi ! Choisis un animal et amène-le dans sa zone');
}

function draw() {
  drawSky();
  drawZones();
  drawTrees();
  drawFlowers();
  drawItems();
  drawAnimal();
  drawClouds();
  drawButterflies();
}

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#f0f4e8');
  grad.addColorStop(1, '#d4e6d8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Soleil
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#fff3e0';
  ctx.shadowColor = '#fff3e0';
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(width * 0.88, height * 0.1, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawZones() {
  for (const z of zones) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.roundRect(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h, 24);
    ctx.fillStyle = z.color;
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = z.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}

function drawTrees() {
  for (const t of trees) {
    ctx.save();
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.roundRect(t.x - 8, t.y, 16, height - t.y, 8);
    ctx.fill();
    ctx.fillStyle = '#81b29a';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(t.x - 20, t.y + 10, t.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(t.x + 20, t.y + 10, t.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFlowers() {
  for (const f of flowers) {
    ctx.save();
    ctx.fillStyle = f.color;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * f.r, f.y + Math.sin(a) * f.r, f.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawItems() {
  for (const m of mice) {
    if (!m.visible) continue;
    ctx.save();
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, m.r * 1.2, m.r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(m.x + m.r, m.y - m.r * 0.3, m.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const b of bones) {
    if (!b.visible) continue;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.roundRect(-b.r * 0.5, -b.r * 0.2, b.r, b.r * 0.4, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-b.r * 0.5, -b.r * 0.3, b.r * 0.35, 0, Math.PI * 2);
    ctx.arc(-b.r * 0.5, b.r * 0.3, b.r * 0.35, 0, Math.PI * 2);
    ctx.arc(b.r * 0.5, -b.r * 0.3, b.r * 0.35, 0, Math.PI * 2);
    ctx.arc(b.r * 0.5, b.r * 0.3, b.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const c of carrots) {
    if (!c.visible) continue;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = '#e76f51';
    ctx.beginPath();
    ctx.moveTo(0, c.r);
    ctx.lineTo(-c.r * 0.4, -c.r * 0.6);
    ctx.lineTo(c.r * 0.4, -c.r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#81b29a';
    ctx.beginPath();
    ctx.moveTo(0, -c.r * 0.6);
    ctx.lineTo(-c.r * 0.3, -c.r * 1.2);
    ctx.lineTo(0, -c.r * 0.8);
    ctx.lineTo(c.r * 0.3, -c.r * 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  for (const e of eggs) {
    if (!e.visible) continue;
    ctx.save();
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, e.r * 0.75, e.r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e.x - e.r * 0.2, e.y - e.r * 0.2, e.r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
    ctx.restore();
  }
}

function drawAnimal() {
  const spec = ANIMALS[currentType];
  ctx.save();
  ctx.translate(animal.x, animal.y - animal.hop);
  ctx.rotate(animal.angle);

  // Halo doux quand dans une zone
  const inside = zones.find(z => {
    return Math.abs(animal.x - z.x) < z.w / 2 + 30 && Math.abs(animal.y - z.y) < z.h / 2 + 30;
  });
  if (inside) {
    ctx.beginPath();
    ctx.arc(0, 0, 55 + Math.sin(frame * 0.15) * 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
  }

  if (currentType === 'bird') {
    // Corps oiseau
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.arc(14, -4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d3430';
    ctx.beginPath();
    ctx.arc(16, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e76f51';
    ctx.beginPath();
    ctx.moveTo(20, -2);
    ctx.lineTo(30, 2);
    ctx.lineTo(20, 6);
    ctx.closePath();
    ctx.fill();
    // Ailes
    ctx.fillStyle = '#f4a261';
    ctx.beginPath();
    ctx.ellipse(-6, -4, 14, 8, Math.sin(frame * 0.3) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (currentType === 'rabbit') {
    // Corps lapin
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Oreilles
    ctx.beginPath();
    ctx.ellipse(-8, -22, 5, 14, -0.2, 0, Math.PI * 2);
    ctx.ellipse(8, -22, 5, 14, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.arc(-8, -22, 2, 0, Math.PI * 2);
    ctx.arc(8, -22, 2, 0, Math.PI * 2);
    ctx.fill();
    // Queue
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.arc(-22, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Chat / chien générique
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    // Oreilles
    const earColor = currentType === 'cat' ? '#e9c46a' : '#cdb4db';
    ctx.fillStyle = earColor;
    ctx.beginPath();
    ctx.moveTo(-16, -12);
    ctx.lineTo(-22, -28);
    ctx.lineTo(-6, -18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16, -12);
    ctx.lineTo(22, -28);
    ctx.lineTo(6, -18);
    ctx.closePath();
    ctx.fill();
    // Yeux
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.arc(-8, -4, 4, 0, Math.PI * 2);
    ctx.arc(8, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d3430';
    ctx.beginPath();
    ctx.arc(-8, -4, 2, 0, Math.PI * 2);
    ctx.arc(8, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    // Museau
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.arc(0, 4, 5, 0, Math.PI * 2);
    ctx.fill();
    // Queue
    ctx.strokeStyle = spec.color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-22, 6);
    ctx.quadraticCurveTo(-38, 10 + Math.sin(frame * 0.1) * 8, -30, -4);
    ctx.stroke();
  }

  ctx.restore();
}

function drawClouds() {
  for (const c of clouds) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffffff';
    for (const cir of c.circles) {
      ctx.beginPath();
      ctx.arc(c.x + cir.dx, c.y + cir.dy, cir.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawButterflies() {
  for (const b of butterflies) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.7;
    const flap = Math.sin(frame * 0.2 + b.offset) * 0.5 + 0.5;
    ctx.beginPath();
    ctx.ellipse(-6 * flap, 0, 8, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(6 * flap, 0, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

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
    say('Amène le ' + ANIMALS[currentType].name + ' dans sa zone');
  });
});

window.addEventListener('resize', resize);
resize();
buttons[0].classList.add('active');
loop();
