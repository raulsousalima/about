// @ts-nocheck — Three.js port of the "Smartphone 3D" mockup (kept close to the original JS).
// Rotatable iPhone-style device; the screen is a canvas texture so it can later
// show a navigable prototype instead of a still image.
import * as THREE from 'three';

export const FINISHES = {
  preto: { frame: 0x2a2b2e, back: 0x141517 },
  branco: { frame: 0xd9d8d4, back: 0xecebe7 },
  cinza: { frame: 0x6f7a86, back: 0x5f6a77 },
};

const VIEWS = { frente: 0, lateral: -Math.PI / 2, verso: Math.PI };

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function flatUV(geo, w, h) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  uv.needsUpdate = true;
}

export function createPhone3D(container, opts = {}) {
  const o = {
    screenSrc: null,      // URL da imagem da tela (proporção ~ 9:19.5)
    finish: 'preto',      // 'preto' | 'branco' | 'cinza'
    autoRotate: false,    // gira sozinho
    autoRotateSpeed: 0.6, // rad/s (negativo inverte)
    zoom: false,          // zoom com roda/pinça (desligado para não prender a rolagem da página)
    float: true,          // leve flutuação
    shadow: true,         // sombra de contato
    initialRotation: { x: 0.12, y: 0.45 },
    distance: 4.1,
    onRotate: null,       // (graus Y, graus X) => void
    ...opts,
  };
  const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const disposables = [];
  const track = (x) => (disposables.push(x), x);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%', touchAction: 'pan-y', cursor: 'grab' });
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

  // Ambiente de estúdio para os reflexos do metal
  {
    const env = new THREE.Scene();
    const c = document.createElement('canvas'); c.width = 16; c.height = 256;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.45, '#5a6068'); gr.addColorStop(1, '#0b0c0e');
    g.fillStyle = gr; g.fillRect(0, 0, 16, 256);
    const skyTex = new THREE.CanvasTexture(c);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide }));
    env.add(sky);
    const panels = [];
    const panel = (w, h, x, y, z, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i, i), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); panels.push(m);
    };
    panel(6, 2, -6, 3, 4, 4); panel(3, 6, 7, 1, -2, 3); panel(8, 1, 0, 6, -5, 2.5);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = track(pm.fromScene(env, 0.02).texture);
    pm.dispose(); skyTex.dispose();
    [sky, ...panels].forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
  }
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222428, 0.35 * Math.PI));
  const key = new THREE.DirectionalLight(0xffffff, 0.9 * Math.PI); key.position.set(-2, 3, 4); scene.add(key);

  // Corpo
  const W = 0.72, H = 1.5, R = 0.115, D = 0.078, B = 0.02;
  const phone = new THREE.Group(); scene.add(phone);

  const frameMat = track(new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.28 }));
  const backMat = track(new THREE.MeshPhysicalMaterial({ metalness: 0.15, roughness: 0.55, clearcoat: 1, clearcoatRoughness: 0.35 }));
  const bumpMat = track(new THREE.MeshPhysicalMaterial({ metalness: 0.2, roughness: 0.15, clearcoat: 1 }));
  const ringMat = track(new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.22 }));
  const glassMat = track(new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }));
  const lensMat = track(new THREE.MeshPhysicalMaterial({ color: 0x0a0c12, metalness: 0.3, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0 }));
  const dotMat = track(new THREE.MeshBasicMaterial({ color: 0x1d2433 }));
  const flashMat = track(new THREE.MeshStandardMaterial({ color: 0xf3e7c9, roughness: 0.4 }));

  const bodyGeo = track(new THREE.ExtrudeGeometry(roundedRect(W - 2 * B, H - 2 * B, R - B), {
    depth: D - 2 * B, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelSegments: 10, curveSegments: 32,
  }));
  bodyGeo.translate(0, 0, -(D - 2 * B) / 2);
  phone.add(new THREE.Mesh(bodyGeo, frameMat));

  const faceGeo = track(new THREE.ShapeGeometry(roundedRect(W - 0.012, H - 0.012, R - 0.006), 32));
  const front = new THREE.Mesh(faceGeo, glassMat); front.position.z = D / 2 + 0.0008; phone.add(front);
  const back = new THREE.Mesh(faceGeo, backMat); back.rotation.y = Math.PI; back.position.z = -D / 2 - 0.0008; phone.add(back);

  // Tela
  const SW = W - 0.058, SH = H - 0.058;
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 640; screenCanvas.height = Math.round(640 * SH / SW);
  const sctx = screenCanvas.getContext('2d');
  const screenTex = track(new THREE.CanvasTexture(screenCanvas));
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const drawIsland = () => {
    const cw = screenCanvas.width, pw = cw * 0.3, ph = cw * 0.085, px = (cw - pw) / 2, py = cw * 0.035;
    sctx.fillStyle = '#000'; sctx.beginPath();
    sctx.moveTo(px + ph / 2, py);
    sctx.arc(px + pw - ph / 2, py + ph / 2, ph / 2, -Math.PI / 2, Math.PI / 2);
    sctx.arc(px + ph / 2, py + ph / 2, ph / 2, Math.PI / 2, Math.PI * 1.5);
    sctx.fill();
  };
  const paintScreen = (img) => {
    sctx.fillStyle = '#000'; sctx.fillRect(0, 0, screenCanvas.width, screenCanvas.height);
    if (img) {
      const s = screenCanvas.width / img.width;
      sctx.drawImage(img, 0, (screenCanvas.height - img.height * s) / 2, screenCanvas.width, img.height * s);
    }
    drawIsland(); screenTex.needsUpdate = true;
  };
  paintScreen(null);
  const setScreen = (src) => {
    if (!src) return paintScreen(null);
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => paintScreen(img); img.src = src;
  };
  setScreen(o.screenSrc);

  const screenGeo = track(new THREE.ShapeGeometry(roundedRect(SW, SH, R - 0.03), 32));
  flatUV(screenGeo, SW, SH);
  const screenMat = track(new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  const screen = new THREE.Mesh(screenGeo, screenMat); screen.position.z = D / 2 + 0.0016; phone.add(screen);
  const glossMat = track(new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.12, roughness: 0.05, clearcoat: 1, depthWrite: false }));
  const gloss = new THREE.Mesh(screenGeo, glossMat); gloss.position.z = D / 2 + 0.0022; phone.add(gloss);

  // Módulo de câmera
  const cam = new THREE.Group(); cam.position.set(W / 2 - 0.19, H / 2 - 0.19, -D / 2); phone.add(cam);
  const bumpGeo = track(new THREE.ExtrudeGeometry(roundedRect(0.28, 0.28, 0.075), {
    depth: 0.008, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 6, curveSegments: 24,
  }));
  const bump = new THREE.Mesh(bumpGeo, bumpMat); bump.rotation.y = Math.PI; bump.position.z = -0.002; cam.add(bump);
  const ringGeo = track(new THREE.CylinderGeometry(0.05, 0.052, 0.022, 48));
  const lensGeo = track(new THREE.CircleGeometry(0.038, 48));
  const dotGeo = track(new THREE.CircleGeometry(0.012, 32));
  for (const [x, y] of [[0.062, 0.062], [0.062, -0.062], [-0.062, 0]]) {
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, -0.026); cam.add(ring);
    const lens = new THREE.Mesh(lensGeo, lensMat); lens.rotation.y = Math.PI; lens.position.set(x, y, -0.0375); cam.add(lens);
    const dot = new THREE.Mesh(dotGeo, dotMat); dot.rotation.y = Math.PI; dot.position.set(x, y, -0.0378); cam.add(dot);
  }
  const flash = new THREE.Mesh(track(new THREE.CircleGeometry(0.018, 32)), flashMat);
  flash.rotation.y = Math.PI; flash.position.set(-0.07, 0.085, -0.0168); cam.add(flash);

  // Botões laterais
  for (const [h, x, y] of [[0.07, -1, 0.42], [0.13, -1, 0.26], [0.13, -1, 0.1], [0.2, 1, 0.25]]) {
    const m = new THREE.Mesh(track(new THREE.BoxGeometry(0.012, h, 0.026)), frameMat);
    m.position.set(x * (W / 2 + 0.003), y, 0); phone.add(m);
  }

  // Sombra de contato
  let shadowMesh = null;
  if (o.shadow) {
    const sc = document.createElement('canvas'); sc.width = sc.height = 128;
    const sg = sc.getContext('2d'), rg = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, 'rgba(0,0,0,.55)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = rg; sg.fillRect(0, 0, 128, 128);
    const sTex = track(new THREE.CanvasTexture(sc));
    shadowMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(1.3, 0.32)),
      track(new THREE.MeshBasicMaterial({ map: sTex, transparent: true, depthWrite: false })));
    shadowMesh.rotation.x = -Math.PI / 2; shadowMesh.position.y = -H / 2 - 0.16; scene.add(shadowMesh);
  }

  const setFinish = (name) => {
    const f = FINISHES[name] || FINISHES.preto;
    frameMat.color.setHex(f.frame); ringMat.color.setHex(f.frame);
    backMat.color.setHex(f.back); bumpMat.color.setHex(f.back);
  };
  setFinish(o.finish);

  // Interação
  let ry = o.initialRotation.y, rx = o.initialRotation.x, vy = 0, vx = 0, tRy = null, tRx = null;
  let baseDist = o.distance, dist = baseDist, tDist = baseDist, auto = o.autoRotate, drag = null;
  const pts = new Map(); let pinch0 = 0, dist0 = 0;
  const clampX = (v) => Math.max(-1.1, Math.min(1.1, v));
  const clampD = (v) => Math.max(baseDist * 0.6, Math.min(baseDist * 1.7, v));

  const onDown = (e) => {
    canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { drag = { x: e.clientX, y: e.clientY }; vy = vx = 0; tRy = tRx = null; canvas.style.cursor = 'grabbing'; }
    if (pts.size === 2 && o.zoom) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = tDist; drag = null; }
  };
  const onMove = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && o.zoom) { const [a, b] = [...pts.values()]; tDist = clampD(dist0 * pinch0 / Math.hypot(a.x - b.x, a.y - b.y)); return; }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
    vy = -dx * 0.008; vx = dy * 0.006; ry += vy; rx = clampX(rx + vx);
  };
  const onUp = (e) => { pts.delete(e.pointerId); if (!pts.size) { drag = null; canvas.style.cursor = 'grab'; } };
  const onWheel = (e) => { if (!o.zoom) return; e.preventDefault(); tDist = clampD(tDist * (1 + e.deltaY * 0.0012)); };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    baseDist = o.distance * (w / h < 0.75 ? 1.45 : 1); tDist = clampD(baseDist);
  };
  const ro = new ResizeObserver(resize); ro.observe(container); resize(); dist = tDist;

  // Pausa quando fora da tela
  let visible = true;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }); io.observe(container);

  let raf = 0, t0 = performance.now();
  const loop = (t) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - t0) / 1000); t0 = t;
    if (!visible) return;
    if (!drag) {
      if (tRy !== null) {
        const k = Math.min(1, dt * 7); ry += (tRy - ry) * k; rx += (tRx - rx) * k;
        if (Math.abs(tRy - ry) < 0.001) { ry = tRy; tRy = null; }
      } else {
        ry += vy; rx = clampX(rx + vx); vy *= 0.94; vx *= 0.9;
        if (auto && !reduceMotion) ry -= dt * o.autoRotateSpeed;
      }
    }
    dist += (tDist - dist) * Math.min(1, dt * 8);
    phone.rotation.set(rx, ry, 0, 'YXZ');
    phone.position.y = o.float && !reduceMotion ? Math.sin(t / 1400) * 0.02 : 0;
    camera.position.set(0, 0.05, dist); camera.lookAt(0, 0, 0);
    if (o.onRotate) o.onRotate(Math.round(((ry * 180 / Math.PI) % 360 + 540) % 360 - 180), Math.round(rx * 180 / Math.PI));
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    setFinish,
    setScreen,
    setAutoRotate: (v) => { auto = !!v; tRy = tRx = null; },
    setView: (name) => {
      const y = VIEWS[name] ?? 0, n = Math.round((ry - y) / (2 * Math.PI));
      tRy = y + n * 2 * Math.PI; tRx = 0; vy = vx = 0; auto = false;
    },
    dispose: () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      disposables.forEach((d) => d.dispose());
      renderer.dispose(); canvas.remove();
    },
  };
}
