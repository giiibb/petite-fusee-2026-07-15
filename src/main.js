/**
 * Petite Fusée — jeu apaisant pour jeunes enfants.
 * Interaction : souris/trackpad (suivi) + barre espace (boost lumineux doux).
 * Événements cosmiques amicaux qui transforment la fusée.
 */

const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d');
const instruction = document.getElementById('instruction');
const musicBtn = document.getElementById('musicBtn');
const musicLabel = document.getElementById('musicLabel');

let width, height, dpr;
let mouse = { x: 0, y: 0, active: false };
let rocket = { x: 0, y: 0, angle: 0, vx: 0, vy: 0 };
let stars = [];
let clouds = [];
let planets = [];
let particles = [];
let boost = 0;
let spaceHeld = false;
let frame = 0;
let musicStarted = false;
let musicMuted = false;
let audioCtx = null;
let musicNodes = [];
let musicGain = null;

// Événements cosmiques et état de la fusée
const EVENT_KINDS = ['comet', 'cloud', 'bubble', 'rainbow', 'stardust'];
let events = [];
let rocketState = {
  mode: 'classic', // classic, bubble, rainbow, star, sleepy
  timer: 0,
  pulse: 0,
  colorShift: 0,
};
let lastEventTime = 0;
let eventMessage = '';
let eventMessageTimer = 0;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!mouse.active) {
    mouse.x = width / 2;
    mouse.y = height * 0.6;
    rocket.x = mouse.x;
    rocket.y = mouse.y;
  }
  initStars();
  initClouds();
  initPlanets();
}

function initStars() {
  stars = [];
  const count = Math.floor((width * height) / 6000);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.5 + 0.5,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.05 + 0.01,
    });
  }
}

function initClouds() {
  clouds = [];
  const count = Math.floor(width / 180) + 2;
  for (let i = 0; i < count; i++) {
    clouds.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.7 + height * 0.15,
      r: Math.random() * 40 + 30,
      speed: Math.random() * 0.2 + 0.05,
      opacity: Math.random() * 0.15 + 0.05,
      circles: Array.from({ length: 4 }, () => ({
        dx: (Math.random() - 0.5) * 60,
        dy: (Math.random() - 0.5) * 20,
        r: Math.random() * 25 + 15,
      })),
    });
  }
}

function initPlanets() {
  planets = [];
  const palette = ['#e9c46a', '#f4a261', '#e76f51', '#2a9d8f', '#a8dadc'];
  for (let i = 0; i < 3; i++) {
    planets.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.5,
      r: Math.random() * 18 + 10,
      color: palette[i % palette.length],
      speed: Math.random() * 0.04 + 0.01,
      ring: Math.random() > 0.5,
    });
  }
}

function spawnEvent() {
  const kind = EVENT_KINDS[Math.floor(Math.random() * EVENT_KINDS.length)];
  const x = Math.random() * (width - 80) + 40;
  const y = -80;
  const r = 22 + Math.random() * 18;
  events.push({ kind, x, y, r, speed: 1 + Math.random() * 1.2, phase: Math.random() * Math.PI * 2 });
}

function setRocketMode(mode, label) {
  rocketState.mode = mode;
  rocketState.timer = 240; // 4 secondes à 60 fps
  rocketState.pulse = 0;
  eventMessage = label;
  eventMessageTimer = 180;
}

function showInstruction(text) {
  instruction.textContent = text;
}

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#3d3430');
  grad.addColorStop(1, '#5c4d46');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  for (const s of stars) {
    const alpha = 0.4 + 0.4 * Math.sin(frame * 0.03 + s.twinkle);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 236, 214, ${alpha})`;
    ctx.fill();
  }

  for (const p of planets) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    if (p.ring) {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * 2.2, p.r * 0.55, Math.PI / 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,243,224,0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const c of clouds) {
    ctx.save();
    ctx.globalAlpha = c.opacity;
    ctx.fillStyle = '#fff3e0';
    for (const cir of c.circles) {
      ctx.beginPath();
      ctx.arc(c.x + cir.dx, c.y + cir.dy, cir.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawEvent(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const pulse = 1 + Math.sin(frame * 0.08 + e.phase) * 0.12;

  if (e.kind === 'comet') {
    const tail = ctx.createLinearGradient(0, -60, 0, 40);
    tail.addColorStop(0, 'rgba(244, 162, 97, 0)');
    tail.addColorStop(0.5, 'rgba(244, 162, 97, 0.55)');
    tail.addColorStop(1, 'rgba(231, 111, 81, 0.85)');
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(0, -70 * pulse);
    ctx.lineTo(6, 0);
    ctx.closePath();
    ctx.fillStyle = tail;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd166';
    ctx.fill();
  } else if (e.kind === 'cloud') {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 14, Math.sin(a) * 8, e.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (e.kind === 'bubble') {
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, e.r * pulse * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(168, 218, 220, 0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-e.r * 0.2, -e.r * 0.2, e.r * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
  } else if (e.kind === 'rainbow') {
    const colors = ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#a8dadc'];
    ctx.globalAlpha = 0.7;
    colors.forEach((color, i) => {
      ctx.beginPath();
      ctx.arc(0, 10, e.r * 0.8 + i * 6, Math.PI, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.stroke();
    });
  } else if (e.kind === 'stardust') {
    for (let i = 0; i < 6; i++) {
      const a = (frame * 0.04 + i * 1.05) % (Math.PI * 2);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * e.r * 0.6, Math.sin(a) * e.r * 0.6, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd166';
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawEvents() {
  for (const e of events) drawEvent(e);
}

function rocketColors() {
  switch (rocketState.mode) {
    case 'bubble':
      return { body: '#a8dadc', dome: '#2a9d8f', wing: '#81b29a', window: '#fff3e0' };
    case 'rainbow':
      return { body: `hsl(${(frame * 2 + rocketState.colorShift) % 360}, 75%, 68%)`, dome: `hsl(${(frame * 2 + 40 + rocketState.colorShift) % 360}, 70%, 60%)`, wing: `hsl(${(frame * 2 + 80 + rocketState.colorShift) % 360}, 70%, 60%)`, window: '#fff3e0' };
    case 'star':
      return { body: '#ffd166', dome: '#e9c46a', wing: '#f4a261', window: '#2a9d8f' };
    case 'sleepy':
      return { body: '#cdb4db', dome: '#9c89b8', wing: '#b5838d', window: '#6d6875' };
    default:
      return { body: '#f7b267', dome: '#e76f51', wing: '#e76f51', window: '#2a9d8f' };
  }
}

function drawRocket() {
  ctx.save();
  ctx.translate(rocket.x, rocket.y);
  ctx.rotate(rocket.angle);

  const baseScale = 0.7 + boost * 0.15;
  const extraScale = rocketState.mode === 'bubble' ? 1 + Math.sin(frame * 0.08) * 0.08 : 1;
  ctx.scale(baseScale * extraScale, baseScale * extraScale);

  const c = rocketColors();

  // Flamme / traînée selon le mode
  const flameLen = 38 + boost * 45 + Math.sin(frame * 0.5) * 4;
  if (rocketState.mode === 'star') {
    // Étoiles dorées derrière la fusée
    for (let i = 0; i < 5; i++) {
      const y = 30 + i * 14 + (frame * 2) % 14;
      ctx.beginPath();
      ctx.arc((i % 2 === 0 ? -4 : 4), y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 209, 102, ${1 - i * 0.18})`;
      ctx.fill();
    }
  } else if (rocketState.mode === 'rainbow') {
    const rainbowColors = ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#a8dadc'];
    rainbowColors.forEach((color, i) => {
      ctx.beginPath();
      ctx.moveTo(-8 + i * 3, 22);
      ctx.lineTo(0, 22 + flameLen + i * 10);
      ctx.lineTo(8 - i * 3, 22);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    });
  } else if (rocketState.mode === 'sleepy') {
    // Traînée douce violette
    const grad = ctx.createLinearGradient(0, 20, 0, 20 + flameLen * 1.4);
    grad.addColorStop(0, 'rgba(205, 180, 219, 0.8)');
    grad.addColorStop(1, 'rgba(205, 180, 219, 0)');
    ctx.beginPath();
    ctx.moveTo(-10, 22);
    ctx.lineTo(0, 22 + flameLen * 1.4);
    ctx.lineTo(10, 22);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  } else {
    const grad = ctx.createLinearGradient(0, 20, 0, 20 + flameLen);
    grad.addColorStop(0, 'rgba(255, 209, 102, 0.95)');
    grad.addColorStop(0.6, 'rgba(231, 111, 81, 0.7)');
    grad.addColorStop(1, 'rgba(231, 111, 81, 0)');
    ctx.beginPath();
    ctx.moveTo(-10, 22);
    ctx.lineTo(0, 22 + flameLen);
    ctx.lineTo(10, 22);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Halo autour de la fusée
  if (rocketState.mode !== 'classic' || boost > 0.1) {
    const haloColor = rocketState.mode === 'bubble' ? '168, 218, 220' : rocketState.mode === 'rainbow' ? '255, 209, 102' : rocketState.mode === 'star' ? '255, 209, 102' : rocketState.mode === 'sleepy' ? '205, 180, 219' : '168, 218, 220';
    const haloSize = 55 + (boost + rocketState.pulse) * 30;
    ctx.beginPath();
    ctx.arc(0, 5, haloSize, 0, Math.PI * 2);
    const halo = ctx.createRadialGradient(0, 5, 8, 0, 5, haloSize + 15);
    halo.addColorStop(0, `rgba(${haloColor}, ${0.35 + (boost + rocketState.pulse) * 0.2})`);
    halo.addColorStop(1, `rgba(${haloColor}, 0)`);
    ctx.fillStyle = halo;
    ctx.fill();
  }

  // Ailerons
  ctx.fillStyle = c.wing;
  ctx.beginPath();
  ctx.moveTo(-22, 14);
  ctx.lineTo(-34, 34);
  ctx.lineTo(-12, 26);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(22, 14);
  ctx.lineTo(34, 34);
  ctx.lineTo(12, 26);
  ctx.closePath();
  ctx.fill();

  // Corps
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 42, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.body;
  ctx.fill();

  // Dôme
  ctx.beginPath();
  ctx.arc(0, -18, 18, Math.PI, 0);
  ctx.lineTo(-12, -12);
  ctx.closePath();
  ctx.fillStyle = c.dome;
  ctx.fill();

  // Hublot
  ctx.beginPath();
  ctx.arc(0, -8, 10, 0, Math.PI * 2);
  ctx.fillStyle = c.window;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-3, -11, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();

  // Petit détail mode
  if (rocketState.mode === 'bubble') {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(8, 8, 4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (rocketState.mode === 'star') {
    ctx.fillStyle = '#fff3e0';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * 14, 18, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function spawnParticles() {
  const count = spaceHeld ? 3 : 1;
  for (let i = 0; i < count; i++) {
    const angle = rocket.angle + Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    const speed = Math.random() * 2 + 1 + boost * 2;
    let color = '#ffd166';
    if (rocketState.mode === 'bubble') color = '#a8dadc';
    if (rocketState.mode === 'rainbow') {
      const colors = ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#a8dadc'];
      color = colors[Math.floor(Math.random() * colors.length)];
    }
    if (rocketState.mode === 'star') color = '#ffd166';
    if (rocketState.mode === 'sleepy') color = '#cdb4db';
    particles.push({
      x: rocket.x - Math.sin(rocket.angle) * 28,
      y: rocket.y + Math.cos(rocket.angle) * 28,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.01 + Math.random() * 0.015,
      color,
      size: Math.random() * 3 + 1,
    });
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = p.life * 0.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function updateEvents() {
  // Spawn un événement toutes les 4–7 secondes
  if (frame - lastEventTime > 240 + Math.random() * 180) {
    spawnEvent();
    lastEventTime = frame;
  }

  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    e.y += e.speed + boost * 0.8;
    e.x += Math.sin(frame * 0.02 + e.phase) * 0.5;

    if (e.y - e.r > height) {
      events.splice(i, 1);
      continue;
    }

    // Collision douce avec la fusée
    const dx = rocket.x - e.x;
    const dy = rocket.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < e.r + 30) {
      // Déclenche un changement d'état
      if (e.kind === 'comet') setRocketMode('star', 'Fusée étoile !');
      else if (e.kind === 'cloud') setRocketMode('sleepy', 'Fusée tout doux…');
      else if (e.kind === 'bubble') setRocketMode('bubble', 'Fusée bulle !');
      else if (e.kind === 'rainbow') setRocketMode('rainbow', 'Fusée arc-en-ciel !');
      else if (e.kind === 'stardust') setRocketMode('star', 'Poussière d’étoiles !');
      events.splice(i, 1);
    }
  }

  if (rocketState.timer > 0) {
    rocketState.timer--;
    rocketState.pulse = Math.sin(frame * 0.1) * 0.3 + 0.3;
  } else {
    rocketState.pulse = Math.max(rocketState.pulse - 0.02, 0);
    if (rocketState.mode !== 'classic' && rocketState.pulse === 0) {
      rocketState.mode = 'classic';
      rocketState.colorShift = 0;
    }
  }
  rocketState.colorShift += 2;

  if (eventMessageTimer > 0) {
    eventMessageTimer--;
    showInstruction(eventMessage);
  }
}

function update() {
  frame++;

  if (!mouse.active) {
    mouse.x = width / 2 + Math.sin(frame * 0.008) * width * 0.25;
    mouse.y = height * 0.55 + Math.cos(frame * 0.012) * height * 0.15;
  }

  const dx = mouse.x - rocket.x;
  const dy = mouse.y - rocket.y;
  const targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
  const speed = 0.045 + boost * 0.03;
  rocket.vx += dx * speed * 0.02;
  rocket.vy += dy * speed * 0.02;
  rocket.vx *= 0.92;
  rocket.vy *= 0.92;
  rocket.x += rocket.vx;
  rocket.y += rocket.vy;

  // Téléportation douce aux bords opposés
  if (rocket.x < -50) {
    rocket.x = width + 50;
    mouse.x = rocket.x;
  } else if (rocket.x > width + 50) {
    rocket.x = -50;
    mouse.x = rocket.x;
  }
  if (rocket.y < -50) {
    rocket.y = height + 50;
    mouse.y = rocket.y;
  } else if (rocket.y > height + 50) {
    rocket.y = -50;
    mouse.y = rocket.y;
  }

  // Angle doux
  let angleDiff = targetAngle - rocket.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  rocket.angle += angleDiff * 0.08;

  if (spaceHeld) {
    boost = Math.min(boost + 0.04, 1);
  } else {
    boost = Math.max(boost - 0.06, 0);
  }

  for (const s of stars) {
    s.y += s.speed + boost * 0.3;
    if (s.y > height) {
      s.y = 0;
      s.x = Math.random() * width;
    }
  }
  for (const c of clouds) {
    c.y += c.speed + boost * 0.5;
    if (c.y - c.r > height) {
      c.y = -c.r;
      c.x = Math.random() * width;
    }
  }
  for (const p of planets) {
    p.y += p.speed + boost * 0.05;
    if (p.y - p.r > height) {
      p.y = -p.r * 2;
      p.x = Math.random() * width;
    }
  }

  updateEvents();
  spawnParticles();
}

function loop() {
  update();
  drawSky();
  drawEvents();
  drawParticles();
  drawRocket();
  requestAnimationFrame(loop);
}

// Audio
const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

function noteIndex() {
  return Math.floor(Math.random() * scale.length);
}

function scheduleMusic() {
  if (!audioCtx || musicMuted) return;
  const now = audioCtx.currentTime;
  while (musicNodes.length === 0 || musicNodes[musicNodes.length - 1].time < now + 2) {
    const lastTime = musicNodes.length ? musicNodes[musicNodes.length - 1].time : now;
    const interval = 0.55 + Math.random() * 0.45;
    const time = lastTime + interval;
    const freq = scale[noteIndex()];
    const dur = 1.2 + Math.random() * 0.8;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 0.5;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.045, time + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.005, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.2);

    musicNodes.push({ time, osc, gain });
  }

  const cutoff = now - 1;
  while (musicNodes.length && musicNodes[0].time < cutoff) {
    musicNodes.shift();
  }
}

function startMusic() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.35;
  musicGain.connect(audioCtx.destination);
  musicStarted = true;
}

function toggleMusic() {
  if (!audioCtx) startMusic();
  if (musicMuted) {
    musicMuted = false;
    musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.5);
    musicLabel.textContent = 'Musique';
    musicBtn.classList.remove('muted');
  } else {
    musicMuted = true;
    musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    musicLabel.textContent = 'Silence';
    musicBtn.classList.add('muted');
  }
}

window.addEventListener('pointermove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    spaceHeld = true;
    if (!audioCtx) startMusic();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    spaceHeld = false;
  }
});

window.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  mouse.x = t.clientX;
  mouse.y = t.clientY;
  mouse.active = true;
}, { passive: false });

window.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  if (t.clientY > height * 0.75) {
    spaceHeld = true;
  }
  if (!audioCtx) startMusic();
}, { passive: false });

window.addEventListener('touchend', () => {
  spaceHeld = false;
});

musicBtn.addEventListener('click', () => {
  if (!audioCtx) startMusic();
  toggleMusic();
});

setTimeout(() => {
  if (!eventMessageTimer) showInstruction('Attrape les cadeaux du ciel');
}, 6000);

setInterval(() => {
  if (musicStarted && !musicMuted) scheduleMusic();
}, 500);

window.addEventListener('resize', resize);
resize();
loop();
