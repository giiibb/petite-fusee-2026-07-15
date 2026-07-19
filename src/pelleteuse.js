/**
 * Petite Pelleteuse — jeu doux d'action = conséquence pour enfants de 3 ans et demi.
 * L'enfant guide la pelleteuse vers des tas de terre pour creuser, découvrir des cailloux,
 * et transporter la terre vers un petit jardin pour faire pousser des fleurs.
 * Le petit robot en haut raconte ce qui se passe.
 */

const canvas = document.getElementById('site');
const ctx = canvas.getContext('2d');
const agentEl = document.getElementById('agent');

let width, height, dpr;
let mouse = { x: 0, y: 0, active: false };
let frame = 0;
let demoMode = true;
let demoTimer = 0;
let demoPhaseIndex = 0;
let demoMessage = 'Regarde : la pelleteuse creuse toute seule';
let demoMessageTimer = 0;

const DEMO_DURATION = 2400; // ~40 secondes à 60fps

// La pelleteuse
let digger = {
  x: 0, y: 0,
  angle: 0,
  vx: 0, vy: 0,
  state: 'idle', // idle, driving, digging, carrying, dumping
  digTimer: 0,
  carryTimer: 0,
  hasDirt: false,
  bucketAngle: 0,
  tracks: [],
};

// Monde
let dirtPiles = [];
let garden = null;
let flowers = [];
let stones = [];
let butterflies = [];
let clouds = [];
let grass = [];
let agentTimer = 0;
let lastAgentMessage = '';

const PALETTE = {
  sky: '#e8f4e8',
  skyDeep: '#d4e6d8',
  ground: '#c4a77d',
  groundDeep: '#a68b64',
  dirt: '#8d6e63',
  dirtLight: '#a1887f',
  stone: '#b0bec5',
  stoneDark: '#78909c',
  garden: '#7cb342',
  gardenDeep: '#558b2f',
  flower1: '#f48fb1',
  flower2: '#fff176',
  flower3: '#ce93d8',
  diggerBody: '#ffb74d',
  diggerCab: '#4db6ac',
  diggerArm: '#ff8a65',
  track: '#5d4037',
  text: '#3e2723',
};

function say(text) {
  if (text === lastAgentMessage) return;
  lastAgentMessage = text;
  agentEl.textContent = text;
  agentTimer = 300;
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
  // Sol
  const groundY = height * 0.75;

  // Tas de terre (3 tas à creuser)
  dirtPiles = [
    { x: width * 0.2, y: groundY - 10, r: 45, dug: 0, maxDug: 3, stones: 3 },
    { x: width * 0.5, y: groundY - 15, r: 55, dug: 0, maxDug: 4, stones: 4 },
    { x: width * 0.8, y: groundY - 8, r: 40, dug: 0, maxDug: 3, stones: 2 },
  ];

  // Jardin (où déposer la terre)
  garden = {
    x: width * 0.85,
    y: groundY - 5,
    w: width * 0.22,
    h: 80,
    planted: 0,
  };

  // Cailloux découverts
  stones = [];

  // Fleurs qui poussent
  flowers = [];

  // Papillons
  butterflies = [];
  for (let i = 0; i < 3; i++) {
    butterflies.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.4,
      wing: 0,
      wingSpeed: 0.15 + Math.random() * 0.1,
      color: ['#f48fb1', '#fff176', '#81d4fa'][i],
    });
  }

  // Nuages
  clouds = [];
  const cloudCount = Math.floor(width / 280) + 2;
  for (let i = 0; i < cloudCount; i++) {
    clouds.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.3 + 20,
      r: 30 + Math.random() * 40,
      speed: 0.1 + Math.random() * 0.15,
    });
  }

  // Herbes décoratives
  grass = [];
  for (let i = 0; i < 30; i++) {
    grass.push({
      x: Math.random() * width,
      y: groundY + Math.random() * (height - groundY - 20),
      h: 8 + Math.random() * 15,
      sway: Math.random() * Math.PI * 2,
    });
  }

  // Position initiale
  if (!mouse.active) {
    mouse.x = width * 0.35;
    mouse.y = groundY - 60;
  }
  digger.x = mouse.x;
  digger.y = groundY - 60;
  digger.tracks = [];
}

function endDemo() {
  if (!demoMode) return;
  demoMode = false;
  say('À toi de jouer ! Guide la pelleteuse');
}

function runDemo() {
  demoTimer++;

  // Messages progressifs
  const messages = [
    'Regarde : la pelleteuse creuse toute seule',
    'Elle porte la terre dans sa pelle',
    'Elle dépose la terre dans le jardin',
    'Des fleurs vont pousser !',
    'À toi de jouer !',
  ];

  const msgIndex = Math.min(Math.floor(demoTimer / 480), messages.length - 1);
  if (msgIndex !== demoPhaseIndex) {
    demoPhaseIndex = msgIndex;
    demoMessageTimer = 0;
  }
  say(messages[demoPhaseIndex]);

  // Trouver le prochain tas non creusé
  let targetPile = dirtPiles.find(p => p.dug < p.maxDug);

  if (targetPile) {
    // Aller vers le tas
    if (digger.state === 'idle' || digger.state === 'driving') {
      digger.state = 'driving';
      mouse.x = targetPile.x;
      mouse.y = targetPile.y - 30;
    }

    // Arrivé près du tas : creuser
    const dist = Math.hypot(digger.x - targetPile.x, digger.y - (targetPile.y - 30));
    if (dist < 60 && digger.state === 'driving') {
      digger.state = 'digging';
      digger.digTimer = 0;
      say('La pelleteuse creuse...');
    }

    // Creuser
    if (digger.state === 'digging') {
      digger.digTimer++;
      digger.bucketAngle = Math.sin(digger.digTimer * 0.15) * 0.5;
      if (digger.digTimer > 60) {
        targetPile.dug++;
        digger.hasDirt = true;
        digger.state = 'carrying';
        // Découvrir des cailloux
        for (let i = 0; i < 2; i++) {
          stones.push({
            x: targetPile.x + (Math.random() - 0.5) * targetPile.r,
            y: targetPile.y + 10 + Math.random() * 15,
            r: 6 + Math.random() * 8,
            discovered: true,
            sparkle: 0,
          });
        }
        say('Des cailloux brillants !');
      }
    }

    // Porter vers le jardin
    if (digger.state === 'carrying') {
      mouse.x = garden.x;
      mouse.y = garden.y - 40;
      const gDist = Math.hypot(digger.x - garden.x, digger.y - (garden.y - 40));
      if (gDist < 70) {
        digger.state = 'dumping';
        digger.carryTimer = 0;
        say('On dépose la terre doucement');
      }
    }

    // Déposer
    if (digger.state === 'dumping') {
      digger.carryTimer++;
      if (digger.carryTimer > 40) {
        digger.hasDirt = false;
        digger.state = 'idle';
        garden.planted++;
        // Faire pousser une fleur
        if (garden.planted <= 6) {
          flowers.push({
            x: garden.x - garden.w / 2 + 30 + (garden.planted - 1) * (garden.w - 60) / 5,
            y: garden.y - 20,
            h: 0,
            maxH: 25 + Math.random() * 20,
            color: [PALETTE.flower1, PALETTE.flower2, PALETTE.flower3][(garden.planted - 1) % 3],
            bloom: 0,
          });
        }
        say('Une fleur pousse !');
      }
    }
  } else {
    // Tout creusé : papillons et message final
    say('Bravo ! Le jardin est plein de fleurs');
    // Tourner autour du jardin
    const t = demoTimer * 0.008;
    mouse.x = garden.x + Math.cos(t) * 80;
    mouse.y = garden.y - 40 + Math.sin(t) * 20;
  }

  // Fin de la démo
  if (demoTimer > DEMO_DURATION) {
    say('À toi de jouer !');
    // Attendre interaction
  }
}

function update() {
  frame++;

  if (demoMode) {
    runDemo();
  }

  // Physique de la pelleteuse
  const dx = mouse.x - digger.x;
  const dy = mouse.y - digger.y;
  const targetAngle = Math.atan2(dy, dx);

  const accel = demoMode ? 0.12 : 0.08;
  digger.vx += dx * accel * 0.02;
  digger.vy += dy * accel * 0.02;
  digger.vx *= 0.85;
  digger.vy *= 0.85;
  digger.x += digger.vx;
  digger.y += digger.vy;

  let angleDiff = targetAngle - digger.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  digger.angle += angleDiff * 0.08;

  // Limites
  const groundY = height * 0.75;
  digger.x = Math.max(50, Math.min(width - 50, digger.x));
  digger.y = Math.max(80, Math.min(groundY - 40, digger.y));

  // Traces de chenilles
  if (Math.abs(digger.vx) > 0.5 || Math.abs(digger.vy) > 0.5) {
    digger.tracks.push({ x: digger.x, y: digger.y + 18, life: 1 });
    if (digger.tracks.length > 40) digger.tracks.shift();
  }
  digger.tracks.forEach(t => t.life -= 0.005);
  digger.tracks = digger.tracks.filter(t => t.life > 0);

  // Actions en mode jeu (pas démo)
  if (!demoMode) {
    // Creuser quand on est près d'un tas
    let nearPile = dirtPiles.find(p => {
      const d = Math.hypot(digger.x - p.x, digger.y - (p.y - 30));
      return d < 55 && p.dug < p.maxDug;
    });

    if (nearPile && !digger.hasDirt) {
      digger.state = 'digging';
      digger.digTimer++;
      digger.bucketAngle = Math.sin(digger.digTimer * 0.15) * 0.5;
      if (digger.digTimer > 50) {
        nearPile.dug++;
        digger.hasDirt = true;
        digger.digTimer = 0;
        // Cailloux
        for (let i = 0; i < 2; i++) {
          stones.push({
            x: nearPile.x + (Math.random() - 0.5) * nearPile.r,
            y: nearPile.y + 10 + Math.random() * 15,
            r: 6 + Math.random() * 8,
            discovered: true,
            sparkle: 0,
          });
        }
        say('Tu as trouvé des cailloux !');
      }
    } else if (!nearPile && digger.state === 'digging') {
      digger.state = 'idle';
      digger.digTimer = 0;
    }

    // Déposer au jardin
    if (digger.hasDirt) {
      const gDist = Math.hypot(digger.x - garden.x, digger.y - (garden.y - 40));
      if (gDist < 70) {
        digger.carryTimer++;
        if (digger.carryTimer > 35) {
          digger.hasDirt = false;
          digger.carryTimer = 0;
          garden.planted++;
          if (garden.planted <= 6) {
            flowers.push({
              x: garden.x - garden.w / 2 + 30 + (garden.planted - 1) * (garden.w - 60) / 5,
              y: garden.y - 20,
              h: 0,
              maxH: 25 + Math.random() * 20,
              color: [PALETTE.flower1, PALETTE.flower2, PALETTE.flower3][(garden.planted - 1) % 3],
              bloom: 0,
            });
          }
          say('Une fleur pousse !');
        }
      } else {
        digger.carryTimer = 0;
      }
    }

    // Messages contextuels
    if (agentTimer <= 0) {
      if (digger.hasDirt) {
        say('Porte la terre vers le jardin');
      } else if (nearPile) {
        say('La pelleteuse creuse...');
      } else if (flowers.length > 0 && flowers.some(f => f.bloom < 1)) {
        say('Regarde les fleurs grandir');
      } else if (dirtPiles.every(p => p.dug >= p.maxDug)) {
        say('Bravo ! Tout le jardin est fleuri');
      }
    }
  }

  // Mise à jour des fleurs
  flowers.forEach(f => {
    if (f.h < f.maxH) f.h += 0.15;
    else if (f.bloom < 1) f.bloom += 0.02;
  });

  // Papillons
  butterflies.forEach(b => {
    b.wing += b.wingSpeed;
    if (demoMode || flowers.length > 0) {
      const target = flowers.length > 0 ? flowers[Math.floor(Math.random() * flowers.length)] : garden;
      b.x += (target.x - b.x) * 0.005 + (Math.random() - 0.5) * 2;
      b.y += (target.y - 40 - b.y) * 0.005 + (Math.random() - 0.5) * 2;
    } else {
      b.x += (Math.random() - 0.5) * 3;
      b.y += (Math.random() - 0.5) * 3;
    }
    b.x = Math.max(20, Math.min(width - 20, b.x));
    b.y = Math.max(20, Math.min(height * 0.6, b.y));
  });

  // Nuages
  clouds.forEach(c => {
    c.x += c.speed;
    if (c.x > width + c.r * 2) c.x = -c.r * 2;
  });

  // Timer agent
  if (agentTimer > 0) agentTimer--;
}

function drawBackground() {
  // Ciel
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.75);
  skyGrad.addColorStop(0, PALETTE.sky);
  skyGrad.addColorStop(1, PALETTE.skyDeep);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height * 0.75);

  // Nuages
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  clouds.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.arc(c.x - c.r * 0.6, c.y + 5, c.r * 0.7, 0, Math.PI * 2);
    ctx.arc(c.x + c.r * 0.6, c.y + 5, c.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  });

  // Soleil doux
  ctx.fillStyle = '#fff9c4';
  ctx.beginPath();
  ctx.arc(width - 80, 80, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 249, 196, 0.3)';
  ctx.beginPath();
  ctx.arc(width - 80, 80, 55, 0, Math.PI * 2);
  ctx.fill();

  // Sol
  const groundY = height * 0.75;
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
  groundGrad.addColorStop(0, PALETTE.ground);
  groundGrad.addColorStop(1, PALETTE.groundDeep);
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, width, height - groundY);

  // Herbes
  grass.forEach(g => {
    const sway = Math.sin(frame * 0.02 + g.sway) * 3;
    ctx.strokeStyle = '#7cb342';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.quadraticCurveTo(g.x + sway, g.y - g.h * 0.6, g.x + sway * 0.5, g.y - g.h);
    ctx.stroke();
  });
}

function drawDirtPiles() {
  dirtPiles.forEach(p => {
    if (p.dug >= p.maxDug) {
      // Trou vide
      ctx.fillStyle = PALETTE.dirtLight;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * 0.7, p.r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.dirt;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 5, p.r * 0.5, p.r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const scale = 1 - (p.dug / p.maxDug) * 0.4;

    // Tas de terre
    ctx.fillStyle = PALETTE.dirt;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r * scale, p.r * 0.6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.dirtLight;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 5 * scale, p.r * 0.7 * scale, p.r * 0.4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Petites mottes
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + p.x;
      const mx = p.x + Math.cos(angle) * p.r * 0.6 * scale;
      const my = p.y + Math.sin(angle) * p.r * 0.3 * scale - 5;
      ctx.fillStyle = PALETTE.dirt;
      ctx.beginPath();
      ctx.arc(mx, my, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawStones() {
  stones.forEach(s => {
    s.sparkle += 0.05;
    const alpha = 0.7 + Math.sin(s.sparkle) * 0.3;

    ctx.fillStyle = PALETTE.stone;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.stoneDark;
    ctx.beginPath();
    ctx.arc(s.x - s.r * 0.2, s.y - s.r * 0.2, s.r * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Éclat
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGarden() {
  // Cadre du jardin
  ctx.fillStyle = PALETTE.gardenDeep;
  ctx.fillRect(garden.x - garden.w / 2, garden.y, garden.w, garden.h);

  ctx.fillStyle = PALETTE.garden;
  ctx.fillRect(garden.x - garden.w / 2 + 5, garden.y + 5, garden.w - 10, garden.h - 10);

  // Terre du jardin
  const rows = Math.floor(garden.h / 20);
  for (let i = 0; i < rows; i++) {
    ctx.fillStyle = i % 2 === 0 ? PALETTE.dirt : PALETTE.dirtLight;
    ctx.fillRect(
      garden.x - garden.w / 2 + 10,
      garden.y + 10 + i * 20,
      garden.w - 20,
      12
    );
  }

  // Fleurs
  flowers.forEach(f => {
    // Tige
    ctx.strokeStyle = '#558b2f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(f.x, f.y - f.h);
    ctx.stroke();

    // Feuilles
    if (f.h > 10) {
      ctx.fillStyle = '#7cb342';
      ctx.beginPath();
      ctx.ellipse(f.x - 8, f.y - f.h * 0.4, 8, 4, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(f.x + 8, f.y - f.h * 0.6, 8, 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fleur
    if (f.h >= f.maxH) {
      const bloomScale = 0.5 + f.bloom * 0.5;
      const petalCount = 6;
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2 + frame * 0.01;
        const px = f.x + Math.cos(angle) * 8 * bloomScale;
        const py = f.y - f.h + Math.sin(angle) * 8 * bloomScale;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.ellipse(px, py, 6 * bloomScale, 4 * bloomScale, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      // Centre
      ctx.fillStyle = '#fff176';
      ctx.beginPath();
      ctx.arc(f.x, f.y - f.h, 5 * bloomScale, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Étiquette
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = 'bold 14px Quicksand';
  ctx.textAlign = 'center';
  ctx.fillText('Jardin', garden.x, garden.y + garden.h + 20);
}

function drawButterflies() {
  butterflies.forEach(b => {
    const wing = Math.sin(b.wing) * 0.5;

    ctx.save();
    ctx.translate(b.x, b.y);

    // Ailes
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.ellipse(-6, 0, 8, 12, -wing, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, 0, 8, 12, wing, 0, Math.PI * 2);
    ctx.fill();

    // Corps
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

function drawDigger() {
  ctx.save();
  ctx.translate(digger.x, digger.y);
  ctx.rotate(digger.angle);

  // Traces de chenilles
  digger.tracks.forEach((t, i) => {
    ctx.fillStyle = `rgba(93, 64, 55, ${t.life * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(t.x - digger.x, t.y - digger.y, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Chenilles
  ctx.fillStyle = PALETTE.track;
  ctx.beginPath();
  ctx.ellipse(0, 15, 35, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4e342e';
  ctx.beginPath();
  ctx.ellipse(0, 15, 30, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Roues des chenilles
  for (let i = -1; i <= 1; i++) {
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.arc(i * 18, 15, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Corps
  ctx.fillStyle = PALETTE.diggerBody;
  ctx.beginPath();
  ctx.roundRect(-25, -5, 50, 20, 5);
  ctx.fill();

  // Cabine
  ctx.fillStyle = PALETTE.diggerCab;
  ctx.beginPath();
  ctx.roundRect(-20, -25, 25, 22, 4);
  ctx.fill();

  // Vitre
  ctx.fillStyle = '#b2dfdb';
  ctx.beginPath();
  ctx.roundRect(-17, -22, 18, 12, 2);
  ctx.fill();

  // Bras de la pelle
  const armAngle = digger.state === 'digging' ? -0.5 + digger.bucketAngle * 0.3 : 0.2;
  const armLength = 40;

  ctx.save();
  ctx.translate(20, -5);
  ctx.rotate(armAngle);

  // Bras
  ctx.strokeStyle = PALETTE.diggerArm;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(armLength * 0.6, -armLength * 0.4);
  ctx.stroke();

  // Avant-bras
  const elbowX = armLength * 0.6;
  const elbowY = -armLength * 0.4;
  ctx.beginPath();
  ctx.moveTo(elbowX, elbowY);
  ctx.lineTo(elbowX + armLength * 0.5, elbowY + armLength * 0.3);
  ctx.stroke();

  // Pelle
  const bucketX = elbowX + armLength * 0.5;
  const bucketY = elbowY + armLength * 0.3;

  ctx.fillStyle = PALETTE.dirt;
  ctx.save();
  ctx.translate(bucketX, bucketY);
  ctx.rotate(digger.state === 'digging' ? digger.bucketAngle : 0.3);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(12, -5);
  ctx.lineTo(15, 5);
  ctx.lineTo(5, 10);
  ctx.closePath();
  ctx.fill();

  // Terre dans la pelle
  if (digger.hasDirt) {
    ctx.fillStyle = PALETTE.dirtLight;
    ctx.beginPath();
    ctx.ellipse(8, 2, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();

  // Yeux mignons
  const lookX = Math.cos(digger.angle) * 3;
  const lookY = Math.sin(digger.angle) * 3;

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(-8, -18, 5, 0, Math.PI * 2);
  ctx.arc(2, -18, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.arc(-8 + lookX, -18 + lookY, 2.5, 0, Math.PI * 2);
  ctx.arc(2 + lookX, -18 + lookY, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Sourire
  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-3, -12, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.restore();
}

function draw() {
  drawBackground();
  drawDirtPiles();
  drawGarden();
  drawStones();
  drawButterflies();
  drawDigger();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// Événements
window.addEventListener('resize', resize);
window.addEventListener('pointermove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  endDemo();
});
window.addEventListener('pointerdown', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
  endDemo();
});
window.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  mouse.x = t.clientX;
  mouse.y = t.clientY;
  endDemo();
}, { passive: false });
window.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  mouse.x = t.clientX;
  mouse.y = t.clientY;
  mouse.active = true;
  endDemo();
});
window.addEventListener('keydown', () => {
  endDemo();
});

// Démarrage
resize();
requestAnimationFrame(loop);
