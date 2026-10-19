import * as THREE from "three";

const ARENA = 36;
const WALL_H = 6;
const PLAYER_R = 0.7;
const SPEED = 9;
const TURN = 2.35;
const FIRE_COOLDOWN = 0.28;
const BOLT_SPEED = 48;
const MAX_HP = 100;
const TO_WIN = 3;

const canvas = document.getElementById("game");
const menu = document.getElementById("menu");
const hud = document.getElementById("hud");
const result = document.getElementById("result");
const roundEl = document.getElementById("round");
const playerHpEl = document.getElementById("player-hp");
const enemyHpEl = document.getElementById("enemy-hp");
const playerKillsEl = document.getElementById("player-kills");
const enemyKillsEl = document.getElementById("enemy-kills");

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, " ": false };

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141c2a);
scene.fog = new THREE.Fog(0x141c2a, 22, 70);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.08, 120);
const clock = new THREE.Clock();

const obstacles = [];
const bolts = [];
let running = false;
let bannerTimer = 0;

const audio = createAudio();

function makeNoiseTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1a2230";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const v = 18 + Math.random() * 28;
    ctx.fillStyle = `rgb(${v},${v + 6},${v + 14})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  ctx.strokeStyle = "rgba(70, 90, 120, 0.35)";
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo((i * size) / 8, 0);
    ctx.lineTo((i * size) / 8, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (i * size) / 8);
    ctx.lineTo(size, (i * size) / 8);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

function addBox(x, y, z, w, h, d, color, opts = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.72,
      metalness: 0.18,
      side: THREE.DoubleSide,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.emissive ? 0.55 : 0,
    })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (opts.solid !== false) {
    obstacles.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, r: Math.max(w, d) / 2 });
  }
  return mesh;
}

function buildArena() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA * 2 + 4, ARENA * 2 + 4),
    new THREE.MeshStandardMaterial({ map: makeNoiseTexture(), roughness: 0.9, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const trim = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 48),
    new THREE.MeshStandardMaterial({ color: 0x0e1622, emissive: 0x12384a, roughness: 0.4 })
  );
  trim.rotation.x = -Math.PI / 2;
  trim.position.y = 0.02;
  scene.add(trim);

  const half = ARENA;
  const t = 1.4;
  addBox(0, WALL_H / 2, -half, half * 2 + t, WALL_H, t, 0x243044, { solid: false });
  addBox(0, WALL_H / 2, half, half * 2 + t, WALL_H, t, 0x243044, { solid: false });
  addBox(-half, WALL_H / 2, 0, t, WALL_H, half * 2, 0x243044, { solid: false });
  addBox(half, WALL_H / 2, 0, t, WALL_H, half * 2, 0x243044, { solid: false });

  const covers = [
    [0, 1.1, 0, 4.4, 2.2, 4.4, 0x2a3346],
    [-12, 1.4, -10, 2.4, 2.8, 6, 0x2e3a52],
    [12, 1.4, 10, 2.4, 2.8, 6, 0x2e3a52],
    [-14, 1.1, 12, 5, 2.2, 2.2, 0x334058],
    [14, 1.1, -12, 5, 2.2, 2.2, 0x334058],
    [-6, 0.9, 16, 2, 1.8, 2, 0x3a465c],
    [6, 0.9, -16, 2, 1.8, 2, 0x3a465c],
  ];
  for (const c of covers) addBox(...c);

  for (const [x, z] of [
    [-20, -20],
    [20, -20],
    [-20, 20],
    [20, 20],
  ]) {
    addBox(x, 3.2, z, 1.2, 6.4, 1.2, 0x1c2738, { emissive: 0x1a6a88 });
  }

  scene.add(new THREE.HemisphereLight(0x9eb6ff, 0x1a140e, 0.55));
  const sun = new THREE.DirectionalLight(0xffe6c8, 1.05);
  sun.position.set(16, 28, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  scene.add(sun);

  const neon = new THREE.PointLight(0x4df3ff, 40, 40);
  neon.position.set(0, 5, 0);
  scene.add(neon);
}

function makeFighter(color, visor) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 0.85, 6, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.35 })
  );
  body.position.y = 1.05;
  body.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x15181f, roughness: 0.35, metalness: 0.5 })
  );
  head.position.y = 1.78;
  const vis = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.12, 0.1),
    new THREE.MeshStandardMaterial({ color: visor, emissive: visor, emissiveIntensity: 1.4 })
  );
  vis.position.set(0, 1.8, -0.26);
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x111318, metalness: 0.7 })
  );
  gun.position.set(0.38, 1.15, -0.45);
  root.add(body, head, vis, gun);
  root.scale.setScalar(1.18);
  scene.add(root);
  return root;
}

function makeViewmodel() {
  const gun = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x1b212c, metalness: 0.65, roughness: 0.28 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.7), mat);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.55, 10),
    new THREE.MeshStandardMaterial({ color: 0x4df3ff, emissive: 0x145a66, metalness: 0.8 })
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.55);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.22), mat);
  stock.position.set(0, -0.08, 0.38);
  gun.add(body, barrel, stock);
  gun.position.set(0.34, -0.28, -0.62);
  camera.add(gun);
  scene.add(camera);
  return gun;
}

const player = {
  x: 0,
  z: 12,
  yaw: 0,
  hp: MAX_HP,
  cool: 0,
  kills: 0,
  alive: true,
};
const enemyMesh = makeFighter(0x8a3140, 0xff4d5a);
const enemy = {
  x: 4,
  z: -10,
  yaw: Math.PI,
  hp: MAX_HP,
  cool: 0,
  kills: 0,
  alive: true,
  mesh: enemyMesh,
};
const viewmodel = makeViewmodel();
buildArena();

function collide(x, z, radius) {
  const limit = ARENA - 1.8;
  x = Math.max(-limit, Math.min(limit, x));
  z = Math.max(-limit, Math.min(limit, z));
  for (const o of obstacles) {
    const minX = o.minX - radius;
    const maxX = o.maxX + radius;
    const minZ = o.minZ - radius;
    const maxZ = o.maxZ + radius;
    if (x <= minX || x >= maxX || z <= minZ || z >= maxZ) continue;
    const left = x - minX;
    const right = maxX - x;
    const north = z - minZ;
    const south = maxZ - z;
    const m = Math.min(left, right, north, south);
    if (m === left) x = minX;
    else if (m === right) x = maxX;
    else if (m === north) z = minZ;
    else z = maxZ;
  }
  x = Math.max(-limit, Math.min(limit, x));
  z = Math.max(-limit, Math.min(limit, z));
  return { x, z };
}

function los(ax, az, bx, bz) {
  const steps = 28;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    for (const o of obstacles) {
      if (x > o.minX - 0.15 && x < o.maxX + 0.15 && z > o.minZ - 0.15 && z < o.maxZ + 0.15) return false;
    }
  }
  return true;
}

function spawnBolt(x, y, z, yaw, fromEnemy) {
  const dir = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshBasicMaterial({ color: fromEnemy ? 0xff5a4d : 0x7af7ff })
  );
  mesh.position.set(x + dir.x * 0.9, y, z + dir.z * 0.9);
  scene.add(mesh);
  const light = new THREE.PointLight(fromEnemy ? 0xff5533 : 0x4df3ff, 8, 8);
  mesh.add(light);
  bolts.push({ mesh, dir, life: 1.15, fromEnemy, y });
  audio.shot(fromEnemy);
}

function updateHud() {
  playerHpEl.style.transform = `scaleX(${Math.max(0, player.hp) / MAX_HP})`;
  enemyHpEl.style.transform = `scaleX(${Math.max(0, enemy.hp) / MAX_HP})`;
  playerKillsEl.textContent = String(player.kills);
  enemyKillsEl.textContent = String(enemy.kills);
}

function showBanner(text) {
  roundEl.textContent = text;
  roundEl.classList.remove("hidden");
  bannerTimer = 1.6;
}

function resetRound(scoredBy) {
  player.x = 0;
  player.z = 12;
  player.yaw = 0;
  player.hp = MAX_HP;
  player.cool = 0.4;
  player.alive = true;
  enemy.x = 4;
  enemy.z = -10;
  enemy.yaw = Math.PI;
  enemy.hp = MAX_HP;
  enemy.cool = 0.4;
  enemy.alive = true;
  for (const b of bolts) scene.remove(b.mesh);
  bolts.length = 0;
  updateHud();
  if (scoredBy) showBanner(scoredBy === "player" ? "YOU SCORED" : "RIVAL SCORED");
}

function endMatch() {
  running = false;
  hud.classList.add("hidden");
  hud.setAttribute("aria-hidden", "true");
  result.classList.remove("hidden");
  const win = player.kills >= TO_WIN;
  document.getElementById("result-title").textContent = win ? "VICTORY" : "DEFEAT";
  document.getElementById("result-kicker").textContent = "MATCH OVER";
  document.getElementById("result-copy").textContent = `${player.kills} — ${enemy.kills}`;
}

function damage(who, amt, src) {
  if (!who.alive) return;
  who.hp -= amt;
  audio.hit();
  if (who.hp <= 0) {
    who.hp = 0;
    who.alive = false;
    if (src === "player") player.kills += 1;
    else enemy.kills += 1;
    updateHud();
    if (player.kills >= TO_WIN || enemy.kills >= TO_WIN) {
      showBanner(player.kills >= TO_WIN ? "MATCH WON" : "MATCH LOST");
      setTimeout(endMatch, 900);
    } else {
      setTimeout(() => resetRound(src), 700);
    }
  } else updateHud();
}

function updatePlayer(dt) {
  if (!player.alive) return;
  if (keys.ArrowLeft) player.yaw += TURN * dt;
  if (keys.ArrowRight) player.yaw -= TURN * dt;
  let mx = 0;
  let mz = 0;
  const fx = -Math.sin(player.yaw);
  const fz = -Math.cos(player.yaw);
  if (keys.ArrowUp) {
    mx += fx;
    mz += fz;
  }
  if (keys.ArrowDown) {
    mx -= fx;
    mz -= fz;
  }
  const len = Math.hypot(mx, mz) || 1;
  const next = collide(player.x + (mx / len) * SPEED * dt, player.z + (mz / len) * SPEED * dt, PLAYER_R);
  const dx = next.x - enemy.x;
  const dz = next.z - enemy.z;
  if (Math.hypot(dx, dz) < PLAYER_R * 2) {
    const n = Math.hypot(dx, dz) || 1;
    next.x = enemy.x + (dx / n) * PLAYER_R * 2;
    next.z = enemy.z + (dz / n) * PLAYER_R * 2;
  }
  player.x = next.x;
  player.z = next.z;
  player.cool = Math.max(0, player.cool - dt);
  if (keys[" "] && player.cool <= 0) {
    player.cool = FIRE_COOLDOWN;
    spawnBolt(player.x, 1.45, player.z, player.yaw, false);
  }
}

function updateEnemy(dt) {
  if (!enemy.alive) {
    enemy.mesh.visible = false;
    return;
  }
  enemy.mesh.visible = true;
  const dx = player.x - enemy.x;
  const dz = player.z - enemy.z;
  const dist = Math.hypot(dx, dz);
  const desired = Math.atan2(-dx, -dz);
  let yawErr = desired - enemy.yaw;
  while (yawErr > Math.PI) yawErr -= Math.PI * 2;
  while (yawErr < -Math.PI) yawErr += Math.PI * 2;
  enemy.yaw += Math.max(-2.8, Math.min(2.8, yawErr)) * dt * 3.2;

  const canSee = player.alive && los(enemy.x, enemy.z, player.x, player.z);
  let mx = 0;
  let mz = 0;
  const fx = -Math.sin(enemy.yaw);
  const fz = -Math.cos(enemy.yaw);
  if (canSee) {
    if (dist > 11) {
      mx = fx;
      mz = fz;
    } else if (dist < 6.5) {
      mx = -fx;
      mz = -fz;
    } else {
      mx = -fz * 0.7;
      mz = fx * 0.7;
    }
  } else {
    mx = fx;
    mz = fz;
    if (Math.random() < 0.02) enemy.yaw += (Math.random() - 0.5) * 1.4;
  }
  const len = Math.hypot(mx, mz) || 1;
  const spd = canSee ? 8.4 : 6.2;
  const next = collide(enemy.x + (mx / len) * spd * dt, enemy.z + (mz / len) * spd * dt, PLAYER_R);
  const pdx = next.x - player.x;
  const pdz = next.z - player.z;
  if (Math.hypot(pdx, pdz) < PLAYER_R * 2) {
    const n = Math.hypot(pdx, pdz) || 1;
    next.x = player.x + (pdx / n) * PLAYER_R * 2;
    next.z = player.z + (pdz / n) * PLAYER_R * 2;
  }
  enemy.x = next.x;
  enemy.z = next.z;

  enemy.cool = Math.max(0, enemy.cool - dt);
  if (canSee && dist < 22 && Math.abs(yawErr) < 0.28 && enemy.cool <= 0) {
    enemy.cool = 0.72 + Math.random() * 0.28;
    spawnBolt(enemy.x, 1.45, enemy.z, enemy.yaw, true);
  }

  enemy.mesh.position.set(enemy.x, 0, enemy.z);
  enemy.mesh.rotation.y = enemy.yaw;
  enemy.mesh.position.y = Math.sin(performance.now() * 0.008) * 0.03;
}

function updateBolts(dt) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.life -= dt;
    b.mesh.position.x += b.dir.x * BOLT_SPEED * dt;
    b.mesh.position.z += b.dir.z * BOLT_SPEED * dt;
    const x = b.mesh.position.x;
    const z = b.mesh.position.z;
    let hit = b.life <= 0 || Math.abs(x) > ARENA || Math.abs(z) > ARENA;
    for (const o of obstacles) {
      if (x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ) hit = true;
    }
    if (!b.fromEnemy && enemy.alive && Math.hypot(x - enemy.x, z - enemy.z) < 0.85) {
      damage(enemy, 22, "player");
      hit = true;
    }
    if (b.fromEnemy && player.alive && Math.hypot(x - player.x, z - player.z) < 0.85) {
      damage(player, 11, "enemy");
      hit = true;
    }
    if (hit) {
      scene.remove(b.mesh);
      bolts.splice(i, 1);
    }
  }
}

function syncCamera(dt) {
  camera.position.set(player.x, 1.62, player.z);
  camera.rotation.set(0, player.yaw, 0);
  viewmodel.rotation.x = Math.sin(performance.now() * 0.012) * (keys.ArrowUp || keys.ArrowDown ? 0.03 : 0.01);
  viewmodel.position.y = -0.28 + Math.sin(performance.now() * 0.01) * 0.012;
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.033, clock.getDelta());
  if (bannerTimer > 0) {
    bannerTimer -= dt;
    if (bannerTimer <= 0) roundEl.classList.add("hidden");
  }
  if (running) {
    updatePlayer(dt);
    updateEnemy(dt);
    updateBolts(dt);
    syncCamera(dt);
  } else {
    camera.position.set(18, 10, 22);
    camera.lookAt(0, 1, 0);
    enemy.mesh.rotation.y += dt * 0.35;
  }
  renderer.render(scene, camera);
}

function startMatch() {
  player.kills = 0;
  enemy.kills = 0;
  resetRound();
  menu.classList.add("hidden");
  result.classList.add("hidden");
  hud.classList.remove("hidden");
  hud.setAttribute("aria-hidden", "false");
  running = true;
  audio.unlock();
  showBanner("FIGHT");
}

function createAudio() {
  let ctx;
  function unlock() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  }
  function beep(freq, dur, type, gain) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  }
  return {
    unlock,
    shot(enemyShot) {
      beep(enemyShot ? 180 : 420, 0.08, "square", 0.04);
    },
    hit() {
      beep(90, 0.12, "sawtooth", 0.05);
    },
  };
}

addEventListener("keydown", (e) => {
  if (e.key in keys) {
    keys[e.key] = true;
    e.preventDefault();
  }
});
addEventListener("keyup", (e) => {
  if (e.key in keys) {
    keys[e.key] = false;
    e.preventDefault();
  }
});
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

document.getElementById("play-btn").addEventListener("click", startMatch);
document.getElementById("again-btn").addEventListener("click", startMatch);
document.getElementById("menu-btn").addEventListener("click", () => {
  result.classList.add("hidden");
  menu.classList.remove("hidden");
  running = false;
});

resetRound();
updateHud();
loop();
