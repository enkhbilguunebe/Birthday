import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const canvas = document.getElementById('birthdayCanvas');
const loading = document.getElementById('loading');
const loadingBar = document.getElementById('loadingBar');
const loadingText = document.getElementById('loadingText');
const fallback = document.getElementById('webglFallback');
const toast = document.getElementById('toast');
const effects = document.getElementById('effects');
const birthdayMusic = document.getElementById('birthdayMusic');
const ambientMusic = birthdayMusic;
const enterCelebration = document.getElementById('enterCelebration');
const messageCard = document.getElementById('birthdayMessage');
const candleStatus = document.getElementById('candleStatus');
const micButton = document.getElementById('micButton');
const blowButton = document.getElementById('blowButton');
const relightButton = document.getElementById('relightButton');
const micMeter = document.querySelector('#micMeter span');
const frameEditor = document.getElementById('frameEditor');
const frameTitle = document.getElementById('frameTitle');
const closeFrameEditor = document.getElementById('closeFrameEditor');
const replacePhoto = document.getElementById('replacePhoto');
const removePhoto = document.getElementById('removePhoto');
const resetCrop = document.getElementById('resetCrop');
const cropZoom = document.getElementById('cropZoom');
const cropX = document.getElementById('cropX');
const cropY = document.getElementById('cropY');
const photoInput = document.getElementById('photoInput');
const sceneHud = document.getElementById('sceneHud');
const candlePanel = document.getElementById('candlePanel');
const instructions = document.getElementById('instructions');

const isMobile = matchMedia('(max-width: 850px)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowQuality = false;
let animationsPaused = false;
let scene, camera, renderer, controls, clock;
let tableGroup, cakeGroup, candleGroup, cityGroup;
let raycaster, pointer;
let interactiveFrames = [];
let frameRecords = [];
let currentFrame = -1;
let pointerDown = null;
let pointerMoved = 0;
let candleState = [];
let candleLights = [];
let microphoneStream = null;
let microphoneContext = null;
let microphoneAnalyser = null;
let microphoneData = null;
let microphoneFreqData = null;
let microphoneActive = false;
let sustainedBlowFrames = 0;
let microphoneNoiseFloor = 0.008;
let microphoneCalibrationFrames = 0;
let lastMicrophoneExtinguish = 0;
let allCandlesOut = false;
let lastTime = 0;
let inactiveTimer;

function updateProgress(percent, label) {
  loadingBar.style.width = `${percent}%`;
  loadingText.textContent = label;
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function webglAvailable() {
  try {
    const test = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && test.getContext('webgl2')) || !!test.getContext('webgl');
  } catch {
    return false;
  }
}

setupFallbackPhotos();

if (!webglAvailable()) {
  loading.classList.remove('active');
  fallback.classList.remove('hidden');
  document.getElementById('fallbackBlow').addEventListener('click', launchCelebration);
} else {
  init().catch((error) => {
    console.error(error);
    loading.classList.remove('active');
    fallback.classList.remove('hidden');
    showToast('The full 3D scene could not start.');
  });
}

function setupFallbackPhotos() {
  const grid = document.getElementById('fallbackPhotoGrid');
  const input = document.getElementById('fallbackPhotoInput');
  const choose = document.getElementById('fallbackChoosePhoto');
  if (!grid || !input || !choose) return;
  const saved = JSON.parse(localStorage.getItem('birthdayFallbackPhotos') || '[]');
  const render = () => {
    grid.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const slot = document.createElement('div');
      if (saved[i]) {
        const img = document.createElement('img');
        img.src = saved[i];
        img.alt = `Fallback memory ${i + 1}`;
        slot.appendChild(img);
      }
      grid.appendChild(slot);
    }
  };
  render();
  choose.addEventListener('click', () => input.click());
  input.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const index = Math.min(saved.length, 4);
    saved[index] = dataUrl;
    localStorage.setItem('birthdayFallbackPhotos', JSON.stringify(saved));
    render();
    input.value = '';
  });
}

async function init() {
  updateProgress(5, 'Starting the 3D renderer…');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowQuality, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowQuality ? 0.78 : 1.0));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050208);
  scene.fog = new THREE.FogExp2(0x100718, 0.018);

  camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 250);
  camera.position.set(0, 5.5, 13.5);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2.4, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.rotateSpeed = 0.98;
  controls.zoomSpeed = 1.0;
  controls.panSpeed = 0.5;
  controls.enablePan = false;
  controls.minDistance = 8.2;
  controls.maxDistance = 18.5;
  controls.minPolarAngle = THREE.MathUtils.degToRad(58);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(98);
  controls.minAzimuthAngle = THREE.MathUtils.degToRad(-60);
  controls.maxAzimuthAngle = THREE.MathUtils.degToRad(60);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  clock = new THREE.Clock();

  updateProgress(15, 'Creating the waterfront night sky…');
  createPanorama();
  createLighting();

  updateProgress(32, 'Setting the birthday table…');
  createTable();
  createCake();
  createCakeBackdrop();

  updateProgress(58, 'Building the photo frames…');
  await createPhotoFrames();

  updateProgress(76, 'Adding candles and flowers…');
  createDecorations();
  createCandles();

  updateProgress(90, 'Preparing interactions…');
  setupEvents();
  await restoreFrameRecords();

  updateProgress(100, 'Ready');
  setTimeout(() => loading.classList.remove('active'), 300);
  animate();
}

function createPanoramaTexture() {
  const width = lowQuality ? 1280 : 1920;
  const height = width / 2;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, height * 0.62);
  sky.addColorStop(0, '#03020a');
  sky.addColorStop(0.42, '#100722');
  sky.addColorStop(0.78, '#1a0c2d');
  sky.addColorStop(1, '#2b1538');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const nebulae = [
    [0.18, 0.18, '#8d4ac6'],
    [0.52, 0.12, '#385d9a'],
    [0.78, 0.22, '#b44784']
  ];
  for (const [px, py, color] of nebulae) {
    const g = ctx.createRadialGradient(width * px, height * py, 0, width * px, height * py, width * 0.18);
    g.addColorStop(0, `${color}55`);
    g.addColorStop(1, `${color}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height * 0.65);
  }

  const starCount = lowQuality ? 220 : 420;
  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height * 0.58;
    const r = Math.random() * 1.7 + 0.25;
    ctx.fillStyle = `rgba(255,255,255,${0.28 + Math.random() * 0.7})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const horizon = Math.floor(height * 0.57);
  const waterGradient = ctx.createLinearGradient(0, horizon, 0, height);
  waterGradient.addColorStop(0, '#0c1020');
  waterGradient.addColorStop(0.48, '#070b15');
  waterGradient.addColorStop(1, '#03050b');
  ctx.fillStyle = waterGradient;
  ctx.fillRect(0, horizon, width, height - horizon);

  const skylineBase = horizon + 8;
  const buildingCount = lowQuality ? 72 : 110;
  const buildings = [];
  for (let i = 0; i < buildingCount; i++) {
    const x = (i / buildingCount) * width;
    const w = 10 + Math.random() * 36;
    const h = 26 + Math.random() * 165;
    const color = ['#171a29', '#1e2032', '#222337', '#171b2b'][i % 4];
    buildings.push({ x, w, h, color });
    ctx.fillStyle = color;
    ctx.fillRect(x, skylineBase - h, w, h);
    if (Math.random() > 0.55) {
      ctx.fillStyle = 'rgba(255,255,255,.11)';
      ctx.fillRect(x + w * 0.25, skylineBase - h - h * 0.08, w * 0.5, h * 0.08);
    }
    const rows = Math.max(1, Math.floor(h / 16));
    const cols = Math.max(1, Math.floor(w / 9));
    for (let ry = 0; ry < rows; ry++) {
      for (let cx = 0; cx < cols; cx++) {
        if (Math.random() > 0.52) {
          const lights = ['rgba(255,220,154,.82)', 'rgba(255,103,190,.76)', 'rgba(111,164,255,.74)', 'rgba(255,255,255,.68)'];
          ctx.fillStyle = lights[(i + ry + cx) % lights.length];
          ctx.fillRect(x + 3 + cx * 8, skylineBase - h + 6 + ry * 14, 2.2, 3.2);
        }
      }
    }
  }

  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.translate(0, skylineBase * 2);
  ctx.scale(1, -1);
  for (const b of buildings) {
    const g = ctx.createLinearGradient(0, skylineBase - b.h, 0, skylineBase);
    g.addColorStop(0, '#7d2f6c');
    g.addColorStop(0.55, '#253b69');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(b.x, skylineBase - b.h * 0.75, b.w, b.h * 0.75);
  }
  ctx.restore();

  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#b8c8ff';
  for (let y = horizon + 8; y < height; y += 13) {
    ctx.beginPath();
    for (let x = 0; x < width; x += 20) {
      const yy = y + Math.sin(x * 0.02 + y * 0.04) * 1.5;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createPanorama() {
  const texture = createPanoramaTexture();
  const geometry = new THREE.SphereGeometry(90, lowQuality ? 32 : 48, lowQuality ? 16 : 24);
  geometry.scale(-1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, fog: false });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.rotation.y = Math.PI * 0.34;
  scene.add(sphere);

  cityGroup = new THREE.Group();
  scene.add(cityGroup);
  const cityColors = [0xff78c9, 0x8a9fff, 0xffc66f, 0xffffff];
  const lightCount = lowQuality ? 8 : 14;
  for (let i = 0; i < lightCount; i++) {
    const angle = (i / lightCount) * Math.PI * 2;
    const radius = 34 + Math.random() * 5;
    const geometry = new THREE.SphereGeometry(0.055 + Math.random() * 0.045, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: cityColors[i % cityColors.length] });
    const light = new THREE.Mesh(geometry, material);
    light.position.set(Math.cos(angle) * radius, 2.1 + Math.random() * 5.5, Math.sin(angle) * radius);
    light.userData.phase = Math.random() * Math.PI * 2;
    cityGroup.add(light);
  }
}

function createLighting() {
  scene.add(new THREE.HemisphereLight(0xb9a9df, 0x24132d, 1.65));

  const key = new THREE.DirectionalLight(0xffe8d8, 3.4);
  key.position.set(-5, 10, 7);
  key.castShadow = false;
  scene.add(key);

  const purpleFill = new THREE.PointLight(0xb779ff, lowQuality ? 10 : 15, 24, 2);
  purpleFill.position.set(5.5, 5.2, 3.5);
  scene.add(purpleFill);

  const pinkFill = new THREE.PointLight(0xff6fc7, lowQuality ? 8 : 13, 22, 2);
  pinkFill.position.set(-5.2, 4.6, 2.8);
  scene.add(pinkFill);

  const blueRim = new THREE.PointLight(0x70a7ff, lowQuality ? 6 : 10, 24, 2);
  blueRim.position.set(0, 5.8, -5.5);
  scene.add(blueRim);

  const warmTable = new THREE.PointLight(0xffc27b, lowQuality ? 7 : 11, 15, 2);
  warmTable.position.set(0, 4.2, 4.2);
  scene.add(warmTable);
}

function createCheckeredTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const size = 64;
  const colors = ['#17141d', '#e5dfe7', '#5e5367', '#b6a8bd'];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = colors[(x + y) % 2 === 0 ? 0 : 1];
      ctx.fillRect(x * size, y * size, size, size);
      ctx.fillStyle = colors[(x * 3 + y * 5) % 4];
      ctx.globalAlpha = 0.08;
      ctx.fillRect(x * size, y * size, size, size);
      ctx.globalAlpha = 1;
    }
  }
  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 1.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTable() {
  tableGroup = new THREE.Group();
  scene.add(tableGroup);

  const topGeo = new RoundedBoxGeometry(10.4, 0.34, 5.8, 7, 0.24);
  const topMat = new THREE.MeshStandardMaterial({ map: createCheckeredTexture(), roughness: 0.92, metalness: 0.02 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 0.25;
  top.receiveShadow = true;
  top.castShadow = !lowQuality;
  tableGroup.add(top);

  const rimGeo = new RoundedBoxGeometry(10.6, 0.26, 6.0, 5, 0.18);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x211927, roughness: 0.65 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = 0.04;
  tableGroup.add(rim);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x171219, roughness: 0.72 });
  const legGeo = new THREE.CylinderGeometry(0.32, 0.5, 4.2, 20);
  for (const x of [-3.8, 3.8]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, -1.95, 0);
    leg.castShadow = !lowQuality;
    tableGroup.add(leg);
  }
}

function makeLayer(width, height, depth, color, y, roughness = 0.75) {
  const geo = new RoundedBoxGeometry(width, height, depth, 7, 0.15);
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.01 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;
  mesh.castShadow = !lowQuality;
  mesh.receiveShadow = true;
  return mesh;
}

function createCake() {
  cakeGroup = new THREE.Group();
  cakeGroup.position.set(0, 0.54, 0.25);
  scene.add(cakeGroup);

  const plateGeo = new THREE.CylinderGeometry(2.55, 2.35, 0.18, 64);
  plateGeo.scale(1, 1, 0.68);
  const plateMat = new THREE.MeshPhysicalMaterial({ color: 0xf6eff9, roughness: 0.25, clearcoat: 0.38, clearcoatRoughness: 0.28 });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.y = 0.12;
  plate.receiveShadow = true;
  cakeGroup.add(plate);

  const layers = [
    [3.85, 0.36, 2.65, 0x7a472a, 0.46, 0.9],
    [3.9, 0.56, 2.7, 0xf4e2b9, 0.88, 0.58],
    [3.85, 0.42, 2.65, 0x6d3a21, 1.34, 0.92],
    [3.9, 0.58, 2.7, 0xf5e4be, 1.82, 0.56],
    [3.85, 0.42, 2.65, 0x704025, 2.30, 0.92],
    [3.9, 0.58, 2.7, 0xf7e9c9, 2.78, 0.54],
    [3.92, 0.18, 2.72, 0x5f2d19, 3.17, 0.96]
  ];
  for (const [w, h, d, c, y, r] of layers) cakeGroup.add(makeLayer(w, h, d, c, y, r));

  const cocoaGeo = new THREE.BufferGeometry();
  const cocoaCount = lowQuality ? 70 : 130;
  const positions = new Float32Array(cocoaCount * 3);
  for (let i = 0; i < cocoaCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 3.65;
    positions[i * 3 + 1] = 3.31 + Math.random() * 0.035;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2.45;
  }
  cocoaGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const cocoaMat = new THREE.PointsMaterial({ color: 0x2c130c, size: 0.03, sizeAttenuation: true, transparent: true, opacity: 0.75 });
  cakeGroup.add(new THREE.Points(cocoaGeo, cocoaMat));

  const plaqueCanvas = document.createElement('canvas');
  plaqueCanvas.width = 512;
  plaqueCanvas.height = 180;
  const pctx = plaqueCanvas.getContext('2d');
  pctx.fillStyle = '#4a2515';
  pctx.roundRect(10, 10, 492, 160, 36);
  pctx.fill();
  pctx.font = '700 66px Cormorant Garamond';
  pctx.textAlign = 'center';
  pctx.textBaseline = 'middle';
  pctx.fillStyle = '#ffd5be';
  pctx.fillText('Happy Birthday', 256, 92);
  const plaqueTexture = new THREE.CanvasTexture(plaqueCanvas);
  plaqueTexture.colorSpace = THREE.SRGBColorSpace;
  const plaque = new THREE.Mesh(new RoundedBoxGeometry(1.65, 0.55, 0.12, 4, 0.08), new THREE.MeshStandardMaterial({ map: plaqueTexture, roughness: 0.58 }));
  plaque.position.set(0.8, 3.43, -0.1);
  plaque.rotation.x = -0.18;
  cakeGroup.add(plaque);

  const stickMat = new THREE.MeshStandardMaterial({ color: 0x5d301c, roughness: 0.55 });
  for (const [x, rot] of [[-0.35, -0.18], [0.05, 0.16]]) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 1.55, 14), stickMat);
    stick.position.set(x, 4.05, -0.15);
    stick.rotation.z = rot;
    stick.castShadow = !lowQuality;
    cakeGroup.add(stick);
  }
}

function createPlaceholderTexture(index) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 640;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, c.width, c.height);
  g.addColorStop(0, '#2b193b');
  g.addColorStop(0.55, '#5a356d');
  g.addColorStop(1, '#1a203d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  for (let i = 0; i < 34; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * c.width, Math.random() * c.height, Math.random() * 3 + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f7e9ff';
  ctx.font = '600 38px Inter';
  ctx.textAlign = 'center';
  ctx.fillText(`Add a memory`, c.width / 2, c.height / 2 - 14);
  ctx.font = '400 25px Inter';
  ctx.fillStyle = '#d9c8e7';
  ctx.fillText(`Frame ${index + 1}`, c.width / 2, c.height / 2 + 34);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeFrame(index, position, rotation, scale = 1) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.set(rotation.x, rotation.y, rotation.z);
  group.scale.setScalar(scale);

  const borderMat = new THREE.MeshPhysicalMaterial({ color: 0xcbaeb8, roughness: 0.38, clearcoat: 0.3, clearcoatRoughness: 0.32 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x6b5364, roughness: 0.72 });
  const borderPieces = [
    [0, 1.05, 0, 1.75, 0.16, 0.12],
    [0, -1.05, 0, 1.75, 0.16, 0.12],
    [-0.96, 0, 0, 0.16, 2.25, 0.12],
    [0.96, 0, 0, 0.16, 2.25, 0.12]
  ];
  for (const [x, y, z, w, h, d] of borderPieces) {
    const piece = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.05), borderMat);
    piece.position.set(x, y, z);
    piece.castShadow = !lowQuality;
    group.add(piece);
  }
  const backing = new THREE.Mesh(new THREE.BoxGeometry(1.82, 2.12, 0.12), backMat);
  backing.position.z = -0.08;
  group.add(backing);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const texture = createPlaceholderTexture(index);
  const photoMat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 2.02), photoMat);
  photo.position.z = 0.075;
  photo.userData.frameIndex = index;
  photo.userData.isPhotoSurface = true;
  group.add(photo);

  const stand = new THREE.Mesh(new RoundedBoxGeometry(0.18, 1.18, 0.12, 3, 0.04), borderMat);
  stand.position.set(0, -1.08, -0.42);
  stand.rotation.x = -0.58;
  group.add(stand);

  const foot = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.08, 0.34, 3, 0.04), borderMat);
  foot.position.set(0, -1.76, -0.12);
  group.add(foot);

  interactiveFrames.push(photo);
  frameRecords[index] = { group, photo, canvas, context: canvas.getContext('2d'), image: null, dataUrl: null, zoom: 1, x: 0, y: 0, texture };
  return group;
}


function createCakeBackdrop() {
  const group = new THREE.Group();
  group.position.set(0, 0, 0);

  const panelGeom = new RoundedBoxGeometry(8.4, 5.2, 0.12, 6, 0.08);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a1020, metalness: 0.08, roughness: 0.56 });
  const panel = new THREE.Mesh(panelGeom, panelMat);
  panel.position.set(0, 3.0, -6.3);
  group.add(panel);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(9.1, 5.9),
    new THREE.MeshBasicMaterial({ color: 0xffb3d9, transparent: true, opacity: 0.12 })
  );
  glow.position.set(0, 3.0, -6.42);
  group.add(glow);

  const photoMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
    emissive: 0x11040d,
    emissiveIntensity: 0.18
  });
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(7.75, 4.55), photoMat);
  photo.position.set(0, 3.0, -6.22);
  group.add(photo);

  const edge = new THREE.Mesh(
    new THREE.TorusGeometry(4.38, 0.045, 8, 80, Math.PI * 2),
    new THREE.MeshStandardMaterial({ color: 0xf0c5df, roughness: 0.55, metalness: 0.12 })
  );
  edge.rotation.x = Math.PI / 2;
  edge.scale.set(1, 0.61, 1);
  edge.position.set(0, 3.0, -6.16);
  group.add(edge);

  const loader = new THREE.TextureLoader();
  loader.load('assets/images/cake-background.jpg', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    photo.material.map = tex;
    photo.material.needsUpdate = true;
  });

  scene.add(group);
}

async function createPhotoFrames() {
  // Repositioned so every frame clearly rests on the table and stays away from the cake volume.
  const specs = [
    [new THREE.Vector3(-4.35, 1.95, 2.05), new THREE.Euler(-0.02, 0.42, -0.08), 0.72],
    [new THREE.Vector3(-2.95, 1.92, 1.40), new THREE.Euler(-0.02, 0.26, -0.03), 0.78],
    [new THREE.Vector3(0, 2.08, -2.55), new THREE.Euler(0.00, 0, 0), 0.54],
    [new THREE.Vector3(2.95, 1.92, 1.40), new THREE.Euler(-0.02, -0.26, 0.03), 0.78],
    [new THREE.Vector3(4.35, 1.95, 2.05), new THREE.Euler(-0.02, -0.42, 0.08), 0.72]
  ];
  specs.forEach((s, i) => scene.add(makeFrame(i, s[0], s[1], s[2])));
}

function makeTulip(x, z, scale = 1) {
  const group = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3f7c4b, roughness: 0.76 });
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0x8a4ec2, roughness: 0.46, side: THREE.DoubleSide });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.78, 8), stemMat);
  stem.position.y = 0.38;
  group.add(stem);
  for (let i = 0; i < 5; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.7), flowerMat);
    petal.scale.set(0.6, 1, 0.45);
    petal.position.set(Math.cos(i * Math.PI * 0.4) * 0.08, 0.83, Math.sin(i * Math.PI * 0.4) * 0.08);
    petal.rotation.z = Math.cos(i) * 0.32;
    petal.rotation.y = i * Math.PI * 0.4;
    group.add(petal);
  }
  group.position.set(x, 0.45, z);
  group.scale.setScalar(scale);
  return group;
}

function createDecorations() {
  const vaseMat = new THREE.MeshPhysicalMaterial({ color: 0xd7c8e7, roughness: 0.26, transmission: 0.12, transparent: true, opacity: 0.9 });
  for (const x of [-4.5, 4.5]) {
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.78, 24), vaseMat);
    vase.position.set(x, 0.82, -1.45);
    vase.castShadow = !lowQuality;
    scene.add(vase);
    for (let i = 0; i < 5; i++) scene.add(makeTulip(x + (i - 2) * 0.12, -1.45 + (i % 2) * 0.08, 0.92));
  }

  const warmCandleMat = new THREE.MeshStandardMaterial({ color: 0xf7e5cc, roughness: 0.58 });
  for (const x of [-4.55, -3.6, 3.6, 4.55]) {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.36, 18), warmCandleMat);
    candle.position.set(x, 0.62, 2.15);
    candle.castShadow = !lowQuality;
    scene.add(candle);
    const flame = makeFlameSprite();
    flame.scale.set(0.24, 0.34, 1);
    flame.position.set(x, 0.95, 2.15);
    scene.add(flame);
  }

  const cardCanvas = document.createElement('canvas');
  cardCanvas.width = 512;
  cardCanvas.height = 320;
  const cardCtx = cardCanvas.getContext('2d');
  cardCtx.fillStyle = '#f5eef8';
  cardCtx.fillRect(0, 0, 512, 320);
  cardCtx.fillStyle = '#58376c';
  cardCtx.font = '700 54px Cormorant Garamond';
  cardCtx.textAlign = 'center';
  cardCtx.fillText('A little world', 256, 132);
  cardCtx.font = '500 38px Cormorant Garamond';
  cardCtx.fillText('made for you', 256, 196);
  const cardTexture = new THREE.CanvasTexture(cardCanvas);
  cardTexture.colorSpace = THREE.SRGBColorSpace;
  const card = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.08, 1.0, 4, 0.07), new THREE.MeshStandardMaterial({ map: cardTexture, roughness: 0.78 }));
  card.position.set(3.3, 0.54, 1.9);
  card.rotation.y = -0.25;
  card.castShadow = !lowQuality;
  scene.add(card);

  const fairyGeo = new THREE.BufferGeometry();
  const count = lowQuality ? 20 : 36;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = -5 + (i / (count - 1)) * 10;
    positions[i * 3 + 1] = 1.35 + Math.sin(i * 0.65) * 0.22;
    positions[i * 3 + 2] = -2.4;
  }
  fairyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const fairyMaterial = new THREE.PointsMaterial({
    color: 0xffd7a4,
    size: lowQuality ? 0.075 : 0.10,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const fairy = new THREE.Points(fairyGeo, fairyMaterial);
  scene.add(fairy);

  // Lightweight coloured table accents: visible bulbs plus only three actual lights.
  const accentColors = [0xff7cc9, 0x9f87ff, 0x6fb8ff];
  const accentPositions = [
    new THREE.Vector3(-3.8, 1.05, -2.1),
    new THREE.Vector3(0, 1.15, -2.35),
    new THREE.Vector3(3.8, 1.05, -2.1)
  ];
  accentPositions.forEach((position, index) => {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 10, 8),
      new THREE.MeshBasicMaterial({ color: accentColors[index] })
    );
    bulb.position.copy(position);
    scene.add(bulb);
    const light = new THREE.PointLight(accentColors[index], lowQuality ? 2.4 : 4.0, 8.5, 2);
    light.position.copy(position).add(new THREE.Vector3(0, 0.35, 0.25));
    scene.add(light);
  });
}

function makeFlameTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 192;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 82, 8, 64, 96, 72);
  g.addColorStop(0, 'rgba(255,255,235,1)');
  g.addColorStop(0.25, 'rgba(255,221,103,.95)');
  g.addColorStop(0.56, 'rgba(255,135,45,.86)');
  g.addColorStop(1, 'rgba(255,100,30,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(64, 8);
  ctx.bezierCurveTo(112, 62, 108, 138, 64, 184);
  ctx.bezierCurveTo(20, 138, 16, 62, 64, 8);
  ctx.fill();
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const sharedFlameTexture = makeFlameTexture();

function makeFlameSprite() {
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: sharedFlameTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
}

function createCandles() {
  candleGroup = new THREE.Group();
  cakeGroup.add(candleGroup);
  candleState = [];
  candleLights = [];
  const colors = [0xf6b4d7, 0xd4b1ff, 0xffe1a8, 0xffffff];
  const cols = [5, 5, 5, 4];
  let index = 0;
  for (let row = 0; row < cols.length; row++) {
    const count = cols[row];
    for (let col = 0; col < count; col++) {
      const x = (col - (count - 1) / 2) * 0.64;
      const z = (row - 1.5) * 0.54;
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.72, 12), new THREE.MeshStandardMaterial({ color: colors[index % colors.length], roughness: 0.5 }));
      body.position.y = 0.36;
      body.castShadow = !lowQuality;
      group.add(body);
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6), new THREE.MeshBasicMaterial({ color: 0x29160e }));
      wick.position.y = 0.76;
      group.add(wick);
      const flame = makeFlameSprite();
      flame.scale.set(0.22, 0.34, 1);
      flame.position.y = 0.93;
      group.add(flame);
      group.position.set(x, 3.33, z);
      candleGroup.add(group);
      candleState.push({ group, flame, out: false, phase: Math.random() * Math.PI * 2, smoke: null });
      index++;
    }
  }

  for (const x of [-1.3, 0, 1.3]) {
    const light = new THREE.PointLight(0xffb45b, lowQuality ? 1.3 : 2.0, 4.8, 2);
    light.position.set(x, 4.45, 0.2);
    cakeGroup.add(light);
    candleLights.push(light);
  }
}

function createSmokeSprite(candle) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 5, 64, 64, 55);
  g.addColorStop(0, 'rgba(220,220,220,.45)');
  g.addColorStop(1, 'rgba(220,220,220,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(0.35, 0.52, 1);
  sprite.position.y = 1.06;
  candle.group.add(sprite);
  candle.smoke = { sprite, age: 0 };
}

function extinguishOne() {
  const candle = candleState.find((item) => !item.out);
  if (!candle) return;
  candle.out = true;
  candle.flame.visible = false;
  createSmokeSprite(candle);
  const outCount = candleState.filter((item) => item.out).length;
  candleStatus.textContent = `${outCount} of 19 candles blown out.`;
  updateCandleLights();
  if (outCount === 19) finishCandles();
}

function extinguishAllProgressively() {
  let delay = 0;
  for (const candle of candleState) {
    if (candle.out) continue;
    setTimeout(extinguishOne, delay);
    delay += 85;
  }
}

function updateCandleLights() {
  const remaining = candleState.filter((item) => !item.out).length / 19;
  for (const light of candleLights) light.intensity = (lowQuality ? 1.3 : 2) * remaining;
}

function relightCandles() {
  allCandlesOut = false;
  for (const candle of candleState) {
    candle.out = false;
    candle.flame.visible = true;
    if (candle.smoke) {
      candle.group.remove(candle.smoke.sprite);
      candle.smoke.sprite.material.map.dispose();
      candle.smoke.sprite.material.dispose();
      candle.smoke = null;
    }
  }
  updateCandleLights();
  candleStatus.textContent = 'Make a wish, then blow out the 19 candles.';
  relightButton.classList.add('hidden');
}

async function finishCandles() {
  if (allCandlesOut) return;
  allCandlesOut = true;
  stopMicrophone();
  candleStatus.textContent = 'Happy 19th Birthday. I hope this year brings you the same happiness, love, and warmth that you bring into my life every day.';
  relightButton.classList.remove('hidden');
  try {
    birthdayMusic.volume = Number(document.getElementById('volumeSlider').value);
    if (birthdayMusic.paused) await birthdayMusic.play();
  } catch {
    showToast('Music has not been added yet.');
  }
  launchCelebration();
}

function setupEvents() {
  renderer.domElement.addEventListener('pointerdown', (event) => {
    pointerDown = { x: event.clientX, y: event.clientY };
    pointerMoved = 0;
  }, { passive: true });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (pointerDown) pointerMoved += Math.abs(event.clientX - pointerDown.x) + Math.abs(event.clientY - pointerDown.y);
    markUiActive();
  }, { passive: true });
  renderer.domElement.addEventListener('pointerup', (event) => {
    if (pointerMoved < 9) pickFrame(event);
    pointerDown = null;
  }, { passive: true });
  renderer.domElement.addEventListener('dblclick', focusCake);
  addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clock.stop(); else clock.start(); });
  document.addEventListener('keydown', onKeyDown);

  document.getElementById('focusCake').addEventListener('click', focusCake);
  document.getElementById('resetView').addEventListener('click', resetView);
  document.getElementById('fullscreenToggle').addEventListener('click', toggleFullscreen);
  document.getElementById('musicToggle').addEventListener('click', toggleMusic);
  document.getElementById('pauseAnimation').addEventListener('click', toggleAnimation);
  document.getElementById('hideUi').addEventListener('click', toggleUi);
  document.getElementById('volumeSlider').addEventListener('input', updateVolume);
  enterCelebration.addEventListener('click', enterScene);
  micButton.addEventListener('click', startMicrophone);
  blowButton.addEventListener('click', extinguishAllProgressively);
  relightButton.addEventListener('click', relightCandles);
  closeFrameEditor.addEventListener('click', closeEditor);
  replacePhoto.addEventListener('click', () => photoInput.click());
  removePhoto.addEventListener('click', removeCurrentPhoto);
  resetCrop.addEventListener('click', resetCurrentCrop);
  photoInput.addEventListener('change', loadSelectedPhoto);
  for (const slider of [cropZoom, cropX, cropY]) slider.addEventListener('input', updateCurrentCrop);
  document.getElementById('fallbackBlow').addEventListener('click', launchCelebration);
  ['mousemove', 'pointerdown', 'touchstart'].forEach((event) => addEventListener(event, markUiActive, { passive: true }));
}

function pickFrame(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(interactiveFrames, false);
  if (!hits.length) return;
  openEditor(hits[0].object.userData.frameIndex);
}

function openEditor(index) {
  currentFrame = index;
  const record = frameRecords[index];
  frameTitle.textContent = `Photo Frame ${index + 1}`;
  cropZoom.value = record.zoom;
  cropX.value = record.x;
  cropY.value = record.y;
  frameEditor.classList.add('open');
  frameEditor.setAttribute('aria-hidden', 'false');
}

function closeEditor() {
  frameEditor.classList.remove('open');
  frameEditor.setAttribute('aria-hidden', 'true');
  currentFrame = -1;
}

async function loadSelectedPhoto(event) {
  const file = event.target.files?.[0];
  if (!file || currentFrame < 0) return;
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);
  const record = frameRecords[currentFrame];
  record.dataUrl = dataUrl;
  record.image = image;
  record.zoom = 1;
  record.x = 0;
  record.y = 0;
  renderFrameTexture(currentFrame);
  await saveFrameRecord(currentFrame);
  cropZoom.value = 1;
  cropX.value = 0;
  cropY.value = 0;
  photoInput.value = '';
}

function updateCurrentCrop() {
  if (currentFrame < 0) return;
  const record = frameRecords[currentFrame];
  record.zoom = Number(cropZoom.value);
  record.x = Number(cropX.value);
  record.y = Number(cropY.value);
  renderFrameTexture(currentFrame);
  saveFrameRecord(currentFrame);
}

function resetCurrentCrop() {
  if (currentFrame < 0) return;
  const record = frameRecords[currentFrame];
  record.zoom = 1;
  record.x = 0;
  record.y = 0;
  cropZoom.value = 1;
  cropX.value = 0;
  cropY.value = 0;
  renderFrameTexture(currentFrame);
  saveFrameRecord(currentFrame);
}

async function removeCurrentPhoto() {
  if (currentFrame < 0) return;
  const record = frameRecords[currentFrame];
  record.dataUrl = null;
  record.image = null;
  record.zoom = 1;
  record.x = 0;
  record.y = 0;
  replaceFrameTexture(currentFrame, createPlaceholderTexture(currentFrame));
  await deleteFrameRecord(currentFrame);
  closeEditor();
}

function renderFrameTexture(index) {
  const record = frameRecords[index];
  if (!record.image) return;
  const c = record.canvas;
  const ctx = record.context;
  const image = record.image;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#1b1124';
  ctx.fillRect(0, 0, c.width, c.height);

  const baseScale = Math.max(c.width / image.width, c.height / image.height);
  const scale = baseScale * record.zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const maxX = Math.max(0, (drawWidth - c.width) / 2);
  const maxY = Math.max(0, (drawHeight - c.height) / 2);
  const dx = (c.width - drawWidth) / 2 + record.x * maxX;
  const dy = (c.height - drawHeight) / 2 + record.y * maxY;
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  replaceFrameTexture(index, texture);
}

function replaceFrameTexture(index, texture) {
  const record = frameRecords[index];
  if (record.photo.material.map && record.photo.material.map !== sharedFlameTexture) record.photo.material.map.dispose();
  record.photo.material.map = texture;
  record.photo.material.needsUpdate = true;
  record.texture = texture;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

const DB_NAME = 'birthdayPlanetDB';
const STORE_NAME = 'frames';
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'index' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveFrameRecord(index) {
  const db = await openDb();
  const record = frameRecords[index];
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put({ index, dataUrl: record.dataUrl, zoom: record.zoom, x: record.x, y: record.y });
  await transactionDone(tx);
  db.close();
}
async function deleteFrameRecord(index) {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(index);
  await transactionDone(tx);
  db.close();
}
function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
async function restoreFrameRecords() {
  if (!('indexedDB' in window)) return;
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).getAll();
  const records = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  for (const saved of records) {
    if (!saved.dataUrl || !frameRecords[saved.index]) continue;
    try {
      const image = await loadImage(saved.dataUrl);
      Object.assign(frameRecords[saved.index], { image, dataUrl: saved.dataUrl, zoom: saved.zoom || 1, x: saved.x || 0, y: saved.y || 0 });
      renderFrameTexture(saved.index);
    } catch {}
  }
  db.close();
}

function enterScene() {
  messageCard.style.display = 'none';
  birthdayMusic.volume = Number(document.getElementById('volumeSlider').value);
  birthdayMusic.play().catch(() => showToast('Music has not been added yet.')); 
}

function fadeAudio(audio, target, duration, pauseAtEnd = false) {
  const start = audio.volume;
  const startTime = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - startTime) / duration);
    audio.volume = start + (target - start) * t;
    if (t < 1) requestAnimationFrame(tick);
    else if (pauseAtEnd) audio.pause();
  };
  requestAnimationFrame(tick);
}

async function startMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Microphone input is unavailable. Use the tap button instead.');
    return;
  }
  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    microphoneContext = new (window.AudioContext || window.webkitAudioContext)();
    await microphoneContext.resume();
    const source = microphoneContext.createMediaStreamSource(microphoneStream);
    microphoneAnalyser = microphoneContext.createAnalyser();
    microphoneAnalyser.fftSize = 512;
    microphoneAnalyser.smoothingTimeConstant = 0.08;
    microphoneData = new Uint8Array(microphoneAnalyser.fftSize);
    microphoneFreqData = new Uint8Array(microphoneAnalyser.frequencyBinCount);
    microphoneNoiseFloor = 0.008;
    microphoneCalibrationFrames = 0;
    sustainedBlowFrames = 0;
    source.connect(microphoneAnalyser);
    microphoneActive = true;
    micButton.disabled = true;
    micButton.textContent = 'Listening… blow gently toward the microphone';
  } catch {
    showToast('Microphone permission was denied. Use Tap to Blow Out instead.');
  }
}

function stopMicrophone() {
  microphoneActive = false;
  microphoneStream?.getTracks().forEach((track) => track.stop());
  microphoneContext?.close().catch(() => {});
  microphoneStream = null;
  microphoneContext = null;
  microphoneAnalyser = null;
  microphoneData = null;
  microphoneFreqData = null;
  micButton.disabled = false;
  micButton.textContent = 'Allow Microphone to Blow Out the Candles';
  micMeter.style.width = '0%';
}

function sampleMicrophone() {
  if (!microphoneActive || !microphoneAnalyser || !microphoneData || !microphoneFreqData) return;

  microphoneAnalyser.getByteTimeDomainData(microphoneData);
  microphoneAnalyser.getByteFrequencyData(microphoneFreqData);
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < microphoneData.length; i++) {
    const value = (microphoneData[i] - 128) / 128;
    sum += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  const rms = Math.sqrt(sum / microphoneData.length);

  let freqSum = 0;
  const startBin = 2;
  const endBin = Math.min(microphoneFreqData.length, 56);
  for (let i = startBin; i < endBin; i++) freqSum += microphoneFreqData[i];
  const freqEnergy = (freqSum / Math.max(1, endBin - startBin)) / 255;

  const combined = Math.max(rms * 1.05, peak * 0.7, freqEnergy * 0.95);

  if (microphoneCalibrationFrames < 20) {
    microphoneNoiseFloor = microphoneNoiseFloor * 0.78 + combined * 0.22;
    microphoneCalibrationFrames++;
  } else if (combined < microphoneNoiseFloor * 1.45) {
    microphoneNoiseFloor = microphoneNoiseFloor * 0.985 + combined * 0.015;
  }

  const threshold = Math.max(0.012, microphoneNoiseFloor * 1.45);
  const meter = Math.min(100, (combined / Math.max(threshold * 2.5, 0.05)) * 100);
  micMeter.style.width = `${meter}%`;

  const detected = microphoneCalibrationFrames >= 8 && combined > threshold;
  sustainedBlowFrames = detected ? sustainedBlowFrames + 1 : Math.max(0, sustainedBlowFrames - 1);

  const now = performance.now();
  if (sustainedBlowFrames >= 2 && now - lastMicrophoneExtinguish > 70) {
    sustainedBlowFrames = 0;
    lastMicrophoneExtinguish = now;
    extinguishOne();
    if (combined > threshold * 1.8) setTimeout(extinguishOne, 45);
    if (combined > threshold * 2.4) setTimeout(extinguishOne, 95);
  }
}
function launchCelebration() {
  launchConfetti();
  launchBalloons();
  launchFireworks();
}
function launchConfetti() {
  for (let i = 0; i < (lowQuality ? 55 : 90); i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = `${Math.random() * 100}%`;
    el.style.top = `-${10 + Math.random() * 40}px`;
    el.style.background = ['#ffd7ed', '#c8a7ff', '#ffe0b6', '#ffffff', '#ff8fc8'][i % 5];
    el.style.animationDelay = `${Math.random() * 0.7}s`;
    effects.appendChild(el);
    setTimeout(() => el.remove(), 4300);
  }
}
function launchBalloons() {
  for (let i = 0; i < 14; i++) {
    const el = document.createElement('div');
    el.className = 'balloon';
    el.style.left = `${5 + Math.random() * 90}%`;
    el.style.bottom = '-65px';
    el.style.background = ['#ffd7ed', '#c8a7ff', '#ffe0b6', '#ff9ed5'][i % 4];
    el.style.animationDelay = `${Math.random()}s`;
    effects.appendChild(el);
    setTimeout(() => el.remove(), 6500);
  }
}
function launchFireworks() {
  for (let i = 0; i < 10; i++) {
    const el = document.createElement('div');
    el.className = 'firework';
    el.style.left = `${8 + Math.random() * 84}%`;
    el.style.top = `${6 + Math.random() * 34}%`;
    el.style.animationDelay = `${i * 0.16}s`;
    effects.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }
}

function focusCake() {
  animateCamera(new THREE.Vector3(0, 4.8, 12.2), new THREE.Vector3(0, 2.35, 0.15), 700);
}
function resetView() {
  animateCamera(new THREE.Vector3(0, 5.2, 13.2), new THREE.Vector3(0, 2.35, 0.15), 700);
}
function animateCamera(position, target, duration) {
  const fromPosition = camera.position.clone();
  const fromTarget = controls.target.clone();
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const smooth = t * t * (3 - 2 * t);
    camera.position.lerpVectors(fromPosition, position, smooth);
    controls.target.lerpVectors(fromTarget, target, smooth);
    controls.update();
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
}
function toggleMusic() {
  if (!birthdayMusic.paused) birthdayMusic.pause();
  else birthdayMusic.play().catch(() => showToast('Music has not been added yet.'));
}
function updateVolume(event) {
  birthdayMusic.volume = Number(event.target.value);
}
function toggleAnimation() {
  animationsPaused = !animationsPaused;
  document.getElementById('pauseAnimation').textContent = animationsPaused ? 'Resume' : 'Pause';
}
function toggleUi() {
  const hidden = candlePanel.style.display === 'none';
  candlePanel.style.display = hidden ? '' : 'none';
  instructions.style.display = hidden ? '' : 'none';
  sceneHud.style.opacity = hidden ? '1' : '0.22';
}
function markUiActive() {
  sceneHud.classList.remove('inactive');
  clearTimeout(inactiveTimer);
  inactiveTimer = setTimeout(() => sceneHud.classList.add('inactive'), 2800);
}
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowQuality ? 0.78 : 1.0));
  renderer.setSize(innerWidth, innerHeight, false);
}
function onKeyDown(event) {
  if (event.key === 'Escape') closeEditor();
  const offset = camera.position.clone().sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  if (event.key === 'ArrowLeft') spherical.theta += 0.06;
  if (event.key === 'ArrowRight') spherical.theta -= 0.06;
  if (event.key === 'ArrowUp') spherical.phi = Math.max(controls.minPolarAngle, spherical.phi - 0.045);
  if (event.key === 'ArrowDown') spherical.phi = Math.min(controls.maxPolarAngle, spherical.phi + 0.045);
  if (event.key === '+' || event.key === '=') spherical.radius = Math.max(controls.minDistance, spherical.radius / 1.08);
  if (event.key === '-' || event.key === '_') spherical.radius = Math.min(controls.maxDistance, spherical.radius * 1.08);
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
  controls.update();
}

function animate(time = 0) {
  requestAnimationFrame(animate);
  if (document.hidden) return;
  const targetInterval = lowQuality ? 24 : 18;
  if (time - lastTime < targetInterval) return;
  const delta = Math.min(clock.getDelta(), 0.05);
  controls.update();
  sampleMicrophone();

  if (!animationsPaused && !reducedMotion) {
    for (const candle of candleState) {
      if (!candle.out) {
        candle.phase += delta * 4.2;
        candle.flame.scale.x = 0.20 + Math.sin(candle.phase) * 0.012;
        candle.flame.scale.y = 0.33 + Math.cos(candle.phase * 1.2) * 0.018;
      } else if (candle.smoke) {
        candle.smoke.age += delta;
        candle.smoke.sprite.position.y += delta * 0.18;
        candle.smoke.sprite.material.opacity = Math.max(0, 1 - candle.smoke.age / 2.2);
      }
    }
    for (let i = 0; i < cityGroup.children.length; i += 2) {
      const light = cityGroup.children[i];
      light.material.opacity = 0.68 + Math.sin(time * 0.0012 + light.userData.phase) * 0.18;
      light.material.transparent = true;
    }
  }

  renderer.render(scene, camera);
  lastTime = time;
}
