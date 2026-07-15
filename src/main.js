/**
 * Petite Fusée — jeu apaisant pour jeunes enfants.
 * Interaction : souris/trackpad (suivi) + barre espace (boost lumineux doux).
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
  // Planètes pastel lointaines, sans bleu vif
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

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#3d3430');
  grad.addColorStop(1, '#5c4d46');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Étoiles
  for (const s of stars) {
    const alpha = 0.4 + 0.4 * Math.sin(frame * 0.03 + s.twinkle);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 236, 214, ${alpha})`;
    ctx.fill();
  }

  // Planètes lointaines
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

  // Nuages brumeux
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

function drawRocket() {
  ctx.save();
  ctx.translate(rocket.x, rocket.y);
  ctx.rotate(rocket.angle);

  const scale = 0.7 + boost * 0.15;
  ctx.scale(scale, scale);

  // Flamme
  if (boost > 0.05 || !spaceHeld) {
    const flameLen = 38 + boost * 45 + Math.sin(frame * 0.5) * 4;
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

  // Boost lumineux doux (halo turquoise pastel quand espace)
  if (boost > 0.1) {
    ctx.beginPath();
    ctx.arc(0, 5, 55 + boost * 30, 0, Math.PI * 2);
    const halo = ctx.createRadialGradient(0, 5, 8, 0, 5, 70 + boost * 30);
    halo.addColorStop(0, `rgba(168, 218, 220, ${0.35 + boost * 0.25})`);
    halo.addColorStop(1, 'rgba(168, 218, 220, 0)');
    ctx.fillStyle = halo;
    ctx.fill();
  }

  // Ailerons
  ctx.fillStyle = '#e76f51';
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
  ctx.fillStyle = '#f7b267';
  ctx.fill();

  // Dôme
  ctx.beginPath();
  ctx.arc(0, -18, 18, Math.PI, 0);
  ctx.lineTo(-12, -12);
  ctx.closePath();
  ctx.fillStyle = '#e76f51';
  ctx.fill();

  // Hublot
  ctx.beginPath();
  ctx.arc(0, -8, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#2a9d8f';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-3, -11, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();

  ctx.restore();
}

function spawnParticles() {
  const count = spaceHeld ? 3 : 1;
  for (let i = 0; i < count; i++) {
    const angle = rocket.angle + Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    const speed = Math.random() * 2 + 1 + boost * 2;
    particles.push({
      x: rocket.x - Math.sin(rocket.angle) * 28,
      y: rocket.y + Math.cos(rocket.angle) * 28,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.01 + Math.random() * 0.015,
      color: spaceHeld ? '#a8dadc' : '#ffd166',
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

function update() {
  frame++;

  // Cible souris
  if (!mouse.active) {
    mouse.x = width / 2 + Math.sin(frame * 0.008) * width * 0.25;
    mouse.y = height * 0.55 + Math.cos(frame * 0.012) * height * 0.15;
  }

  // Mouvement doux de la fusée vers la souris
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

  // Angle doux
  let angleDiff = targetAngle - rocket.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  rocket.angle += angleDiff * 0.08;

  // Boost
  if (spaceHeld) {
    boost = Math.min(boost + 0.04, 1);
  } else {
    boost = Math.max(boost - 0.06, 0);
  }

  // Parallaxe
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

  spawnParticles();
}

function loop() {
  update();
  drawSky();
  drawParticles();
  drawRocket();
  requestAnimationFrame(loop);
}

// Audio — musique douce, générée en temps réel par Web Audio API
// Gamme pentatonique majeure (Do Majeur pentatonique : C, D, E, G, A)
const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

function noteIndex() {
  // Progression douce et aléatoire-biaisée vers les tons graves/aigus
  return Math.floor(Math.random() * scale.length);
}

function scheduleMusic() {
  if (!audioCtx || musicMuted) return;
  const now = audioCtx.currentTime;
  // On programme quelques notes en avance
  while (musicNodes.length === 0 || musicNodes[musicNodes.length - 1].time < now + 2) {
    const lastTime = musicNodes.length ? musicNodes[musicNodes.length - 1].time : now;
    const interval = 0.55 + Math.random() * 0.45; // tempo lent
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

  // Nettoyage des noeuds passés
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

// Interaction
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

// Touch device: suivi du doigt + bouton boost virtuel
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

// Message changeant après un moment
setTimeout(() => {
  instruction.textContent = 'Espace pour voler plus vite';
}, 6000);

// Boucle musique
setInterval(() => {
  if (musicStarted && !musicMuted) scheduleMusic();
}, 500);

window.addEventListener('resize', resize);
resize();
loop();
