/* =========================================================
   3D Workspace hero — Three.js
   A laptop that types out your profile as code, surrounded by
   floating screens showing your live projects (hover / click).
   ========================================================= */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const CFG = window.CONFIG || {};
const canvas = document.getElementById("scene3d");
const hero = document.querySelector(".hero");
const tip = document.getElementById("sceneTip");
const isMobile = matchMedia("(max-width: 960px)").matches;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// tell the page loader the 3D scene (and its textures) are ready
function signalReady() {
  if (window.__sceneReady) return;
  window.__sceneReady = true;
  dispatchEvent(new Event("scene:ready"));
}
// run fn when the loader starts its exit animation (or right away if there is no loader)
function onLoaderExit(fn) {
  if (window.__loaderExit || !document.getElementById("loader")) fn();
  else addEventListener("loader:exit", fn, { once: true });
}

let renderer;
try {
  // high-DPI phones already look sharp, so skip MSAA there (big GPU saving)
  renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 2, alpha: true, powerPreference: "high-performance" });
} catch (e) { console.warn("WebGL unavailable — static hero", e); }
if (renderer) init(); else signalReady();

function init() {
  hero.classList.add("gl");
  let pixelRatio = Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070707, 14, 30);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const camBase = new THREE.Vector3(0, 2.2, 11.5);
  const lookAt = new THREE.Vector3(0, 1.1, 0);
  camera.position.copy(camBase);

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x080808, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 7, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x6aa8ff, 1.4); rim.position.set(-6, 3, -6); scene.add(rim);
  const warm = new THREE.PointLight(0xffb27a, 6, 14, 2); warm.position.set(5, 1.5, 3); scene.add(warm);

  const world = new THREE.Group();
  scene.add(world);
  // two rigs: on desktop they sit at the origin; on phones each is moved/scaled into a gap in the page text
  const laptopRig = new THREE.Group(), screensRig = new THREE.Group();
  world.add(laptopRig, screensRig);

  /* ---------- helpers ---------- */
  const canvasTex = (w, h, draw) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  };
  const radial = (inner, outer) => canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, inner); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });

  /* ---------- floor: light pool + soft shadow ---------- */
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64),
    new THREE.MeshBasicMaterial({ map: radial("rgba(60,70,90,0.55)", "rgba(0,0,0,0)"), transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01;
  laptopRig.add(floor);
  floor.visible = !isMobile;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.4),
    new THREE.MeshBasicMaterial({ map: radial("rgba(0,0,0,0.85)", "rgba(0,0,0,0)"), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.001;
  laptopRig.add(shadow);

  // phones: glowing "planet horizon" arc behind/below the laptop
  if (isMobile) {
    const horizon = new THREE.Mesh(new THREE.PlaneGeometry(13, 4.4), new THREE.MeshBasicMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      map: canvasTex(1400, 480, (g, w, h) => {
        const cx = w / 2, cy = h + 1500, R = 1720;
        // dark planet body (hides stars below the rim)
        const body = g.createRadialGradient(cx, cy, R - 260, cx, cy, R);
        body.addColorStop(0, "rgba(4,6,14,1)"); body.addColorStop(1, "rgba(8,12,28,0.96)");
        g.fillStyle = body; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
        // soft atmosphere glow above the rim
        const atm = g.createRadialGradient(cx, cy, R - 10, cx, cy, R + 170);
        atm.addColorStop(0, "rgba(90,140,255,0.55)"); atm.addColorStop(0.35, "rgba(70,110,255,0.18)"); atm.addColorStop(1, "rgba(60,90,255,0)");
        g.fillStyle = atm; g.beginPath(); g.arc(cx, cy, R + 170, 0, Math.PI * 2); g.arc(cx, cy, R, 0, Math.PI * 2, true); g.fill();
        // bright thin rim
        g.shadowColor = "rgba(120,170,255,0.9)"; g.shadowBlur = 28;
        const rimG = g.createLinearGradient(0, 0, w, 0);
        rimG.addColorStop(0, "rgba(90,140,255,0)"); rimG.addColorStop(0.5, "rgba(170,205,255,1)"); rimG.addColorStop(1, "rgba(90,140,255,0)");
        g.strokeStyle = rimG; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R, Math.PI * 1.25, Math.PI * 1.75); g.stroke();
      }),
    }));
    horizon.position.set(0, 0.35, -1.9);
    laptopRig.add(horizon);
  }

  /* ---------- laptop ---------- */
  const laptop = new THREE.Group();
  laptopRig.add(laptop);
  const alu = new THREE.MeshStandardMaterial({ color: 0x3a3c41, metalness: 0.85, roughness: 0.32 });
  const aluDark = new THREE.MeshStandardMaterial({ color: 0x1c1d20, metalness: 0.6, roughness: 0.5 });
  const W = 3.2, D = 2.2;

  const base = new THREE.Mesh(new RoundedBoxGeometry(W, 0.12, D, 4, 0.05), alu);
  base.position.y = 0.06; laptop.add(base);

  // keyboard: instanced keys
  const keyGeo = new RoundedBoxGeometry(0.17, 0.03, 0.16, 2, 0.015);
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.65, metalness: 0.1 });
  const cols = 14, rows = 5, keys = new THREE.InstancedMesh(keyGeo, keyMat, cols * rows);
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    m4.makeTranslation(-1.3 + c * 0.2, 0.13, -0.85 + r * 0.19);
    keys.setMatrixAt(k++, m4);
  }
  laptop.add(keys);
  const pad = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.012, 0.62, 2, 0.006), aluDark);
  pad.position.set(0, 0.123, 0.62); laptop.add(pad);

  // lid (pivot on the back hinge)
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.12, -D / 2 + 0.02);
  laptop.add(hinge);
  const LH = 2.1;
  const lid = new THREE.Mesh(new RoundedBoxGeometry(W, LH, 0.07, 4, 0.03), alu);
  lid.position.set(0, LH / 2, -0.035); hinge.add(lid);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.08, LH - 0.08), new THREE.MeshBasicMaterial({ color: 0x050505 }));
  bezel.position.set(0, LH / 2, 0.002); hinge.add(bezel);

  // screen: live code editor drawn to a canvas
  // drawn in 1024×640 "logical" units onto a 2× canvas so the text stays crisp
  const SCR_W = 1024, SCR_H = 640, SCR_SCALE = isMobile ? 1.25 : 2;   // lighter texture on phones (small screen anyway)
  const scrCanvas = document.createElement("canvas"); scrCanvas.width = SCR_W * SCR_SCALE; scrCanvas.height = SCR_H * SCR_SCALE;
  const sctx = scrCanvas.getContext("2d");
  const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace;
  scrTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.22, (W - 0.22) * SCR_H / SCR_W),
    new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }));
  screen.position.set(0, LH / 2 + 0.03, 0.004); hinge.add(screen);
  const screenGlow = new THREE.PointLight(0x7fb0ff, 2.2, 4, 2);
  screenGlow.position.set(0, 1, 0.8); hinge.add(screenGlow);

  /* ---------- the code that gets typed ---------- */
  const name = CFG.name || "Your Name";
  // short lines → big, readable font on the laptop screen
  const CODE = [
    "const dev = {",
    `  name: "${name}",`,
    `  role: "MERN + Three.js",`,
    `  based: "Coimbatore",`,
    `  shipped: "30+ projects",`,
    `  stack: ["React", "Three.js"],`,
    "  available: true,",
    "};",
    "dev.hire(); // let's build!",
  ];
  const TOTAL = CODE.reduce((n, l) => n + l.length + 1, 0);
  const TOKEN = /(\/\/.*$)|("[^"]*"?)|\b(const|true|false)\b|(\b\w+)(?=:)|(\w+)(?=\()|([{}\[\]();,.=:])|([^\s"{}\[\]();,.=:]+)|(\s+)/g;
  const COLORS = { comment: "#a3acba", string: "#b5f0a8", kw: "#ff8cc6", key: "#8fd0ff", fn: "#ffe08a", punct: "#cfd6e0", word: "#ffffff" };

  function drawScreen(chars, t) {
    const g = sctx;
    g.setTransform(SCR_SCALE, 0, 0, SCR_SCALE, 0, 0);
    g.fillStyle = "#0d1117"; g.fillRect(0, 0, SCR_W, SCR_H);
    // title bar
    g.fillStyle = "#161b24"; g.fillRect(0, 0, SCR_W, 54);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(32 + i * 28, 27, 9, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = "#0d1117"; g.fillRect(124, 10, 210, 44);
    g.font = "600 22px 'JetBrains Mono', monospace"; g.fillStyle = "#ffffff"; g.fillText("developer.js", 142, 40);
    g.font = "500 18px 'JetBrains Mono', monospace"; g.fillStyle = "#8b94a3"; g.fillText("saikiran.dev", SCR_W - 170, 36);
    // code
    g.font = "600 40px 'JetBrains Mono', monospace";
    const lh = 56, x0 = 76, y0 = 122;
    let left = chars, cx = x0, cy = y0;
    for (let li = 0; li < CODE.length; li++) {
      const line = CODE[li], y = y0 + li * lh;
      g.font = "500 24px 'JetBrains Mono', monospace";
      g.fillStyle = "#4b5563"; g.fillText(String(li + 1), 22, y - 4);
      g.font = "600 40px 'JetBrains Mono', monospace";
      if (left <= 0) continue;
      const shown = line.slice(0, Math.max(0, left));
      left -= line.length + 1;
      let x = x0; TOKEN.lastIndex = 0; let m;
      while ((m = TOKEN.exec(shown)) && m[0].length) {
        const s = m[0];
        g.fillStyle = m[1] ? COLORS.comment : m[2] ? COLORS.string : m[3] ? COLORS.kw : m[4] ? COLORS.key : m[5] ? COLORS.fn : m[6] ? COLORS.punct : COLORS.word;
        if (!m[8]) g.fillText(s, x, y);
        x += g.measureText(s).width;
      }
      cx = x; cy = y;
    }
    // blinking caret
    if (Math.floor(t * 2) % 2 === 0 || chars < TOTAL) { g.fillStyle = "#8fd0ff"; g.fillRect(cx + 3, cy - 32, 18, 42); }
    // status bar
    g.fillStyle = "#161b24"; g.fillRect(0, SCR_H - 42, SCR_W, 42);
    g.font = "600 20px 'JetBrains Mono', monospace"; g.fillStyle = "#3ddc6f"; g.fillText("● live", 22, SCR_H - 14);
    g.fillStyle = "#8b94a3"; g.fillText("JavaScript · Three.js", SCR_W - 270, SCR_H - 14);
    scrTex.needsUpdate = true;
  }

  /* ---------- floating project screens ---------- */
  const manager = new THREE.LoadingManager();
  manager.onLoad = signalReady;                 // all project screenshots loaded (or failed)
  const loader = new THREE.TextureLoader(manager);
  // phones: 3 bigger screens in a clean arc above the laptop; desktop: 5 around it
  const picks = (CFG.projects || []).filter(p => p.link && p.img).slice(0, isMobile ? 3 : 5);
  const layout = isMobile
    ? [[-2.3, -0.22, 0, 0.34], [0, 0.24, -0.35, 0], [2.3, -0.22, 0, -0.34]]   // arc, relative to the rig centre
    : [[-2.85, 2.9, -1.7, 0.32], [0, 3.5, -2.6, 0], [2.85, 2.9, -1.7, -0.32], [-3.2, 1.2, -0.1, 0.48], [3.2, 1.2, -0.1, -0.48]];
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, metalness: 0.8, roughness: 0.35 });
  const SW = 1.75, SH = 1.1;
  const screens = [];
  picks.forEach((p, i) => {
    const [x, y, z, ry] = layout[i];
    const g = new THREE.Group();
    g.position.set(x, y, z); g.rotation.y = ry;
    g.userData = { p, base: new THREE.Vector3(x, y, z), phase: i * 1.3, hover: 0 };
    const frame = new THREE.Mesh(new RoundedBoxGeometry(SW + 0.08, SH + 0.08, 0.05, 3, 0.025), frameMat);
    g.add(frame);
    const tex = loader.load(p.img, t => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      // object-fit: cover
      const ia = t.image.width / t.image.height, pa = SW / SH;
      if (ia > pa) { t.repeat.set(pa / ia, 1); t.offset.set((1 - pa / ia) / 2, 0); }
      else { t.repeat.set(1, ia / pa); t.offset.set(0, (1 - ia / pa) / 2); }
    });
    const img = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: 0xbbbbbb }));
    img.position.z = 0.027; g.add(img);
    // glow edge shown on hover
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(SW + 0.5, SH + 0.5),
      new THREE.MeshBasicMaterial({ map: radial("rgba(120,170,255,0.55)", "rgba(120,170,255,0)"), transparent: true, depthWrite: false, opacity: 0 }));
    glow.position.z = -0.04; g.add(glow);
    // label
    const label = new THREE.Mesh(new THREE.PlaneGeometry(SW, 0.22), new THREE.MeshBasicMaterial({
      transparent: true, toneMapped: false, depthWrite: false,
      map: canvasTex(700, 88, (c, w, h) => {
        c.font = "600 40px Inter, sans-serif"; c.fillStyle = "#ffffff"; c.fillText(p.title, 4, 46);
        c.font = "500 24px 'JetBrains Mono', monospace"; c.fillStyle = "#8b93a1"; c.fillText((p.type || "").toUpperCase() + "  ↗", 4, 82);
      }),
    }));
    label.position.set(0, -SH / 2 - 0.2, 0.03); g.add(label);
    img.userData.screen = g; frame.userData.screen = g;
    g.userData.img = img; g.userData.glow = glow;
    g.scale.setScalar(0.001);
    screensRig.add(g); screens.push(g);
  });

  /* ---------- dust ---------- */
  const DUST = isMobile ? 200 : 500, dpos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) { dpos[i * 3] = (Math.random() - 0.5) * 16; dpos[i * 3 + 1] = Math.random() * 7; dpos[i * 3 + 2] = (Math.random() - 0.5) * 10; }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ size: 0.025, color: 0x9fb6ff, transparent: true, opacity: 0.5, depthWrite: false }));
  world.add(dust);

  /* ---------- layout / resize ---------- */
  // screen pixel (relative to the hero) → point on the z = 0 plane in world space
  const _ray = new THREE.Raycaster(), _plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), _v2 = new THREE.Vector2();
  function pxToWorld(px, py, w, h) {
    _v2.set((px / w) * 2 - 1, -(py / h) * 2 + 1);
    _ray.setFromCamera(_v2, camera);
    const out = new THREE.Vector3();
    return _ray.ray.intersectPlane(_plane, out) || out;
  }
  // phones: put the screens into .m-stage-top and the laptop into .m-stage-laptop (gaps in the page text)
  function placeMobile(w, h) {
    camera.position.copy(camBase); camera.lookAt(lookAt); camera.updateMatrixWorld();
    const hr = hero.getBoundingClientRect();
    // unitsW / unitsH = the group's size in world units, unitsCenterY = how far up its visual centre is
    const fit = (el, rig, unitsW, unitsH, unitsCenterY, fillW) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left - hr.left + r.width / 2, cy = r.top - hr.top + r.height / 2;
      const a = pxToWorld(cx, cy, w, h), b = pxToWorld(cx + 100, cy, w, h);
      const unitsPerPx = a.distanceTo(b) / 100;
      const s = Math.min((r.width * fillW * unitsPerPx) / unitsW, (r.height * unitsPerPx) / unitsH);
      rig.scale.setScalar(s);
      rig.position.set(a.x, a.y - unitsCenterY * s, 0);
    };
    fit(document.querySelector(".m-stage-top"), screensRig, 6.5, 2.0, -0.12, 0.98);   // 3 screens ≈ 6.5 × 2.0 units (labels hang below)
    fit(document.querySelector(".m-stage-laptop"), laptopRig, 3.4, 2.3, 1.0, 0.8);    // laptop ≈ 3.4 × 2.3, centre ~1 unit up
  }

  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (isMobile) {
      world.position.set(0, 0, 0); world.scale.setScalar(1);
      screens.forEach(g => g.userData.mobileScale = 1);
      placeMobile(w, h);
    }
    else {
      laptopRig.position.set(0, 0, 0); laptopRig.scale.setScalar(1);
      screensRig.position.set(0, 0, 0); screensRig.scale.setScalar(1);
      const wide = Math.min(1, camera.aspect / 1.6);
      world.position.set(0.5 * wide, 0.62, 0); world.scale.setScalar(0.66 + 0.1 * wide);
    }
  }
  resize();
  addEventListener("resize", resize);
  // text height can change once web fonts arrive — re-fit then
  if (document.fonts) document.fonts.ready.then(resize);
  addEventListener("load", resize);
  // crossing the phone/desktop width (e.g. resizing a desktop window) → rebuild with the right layout
  matchMedia("(max-width: 960px)").addEventListener("change", () => location.reload());

  /* ---------- intro ---------- */
  hinge.rotation.x = Math.PI / 2 - 0.02;       // closed
  laptop.position.y = -0.6; laptop.rotation.y = -0.5;
  const state = { typing: false, typeStart: 0, intro: 0 };
  const LID_OPEN = -0.2;
  const startIntro = () => {
    if (window.gsap) {
      const tl = gsap.timeline({ delay: 0.35 });   // starts while the loader is sliding away
      tl.to(laptop.position, { y: 0, duration: 1.4, ease: "power3.out" })
        .to(laptop.rotation, { y: isMobile ? -0.03 : -0.32, duration: 2, ease: "power3.out" }, 0)   // phones: face the viewer
        .to(hinge.rotation, { x: LID_OPEN, duration: 1.6, ease: "power2.inOut" }, 0.7)
        .add(() => { state.typing = true; state.typeStart = performance.now(); }, 1.8)
        .to(screens.map(s => s.scale), { x: 1, y: 1, z: 1, duration: 1.1, ease: "back.out(1.6)", stagger: 0.12 }, 1.5);
    } else {
      hinge.rotation.x = LID_OPEN; laptop.position.y = 0; laptop.rotation.y = isMobile ? -0.03 : -0.32;
      screens.forEach(s => s.scale.setScalar(isMobile ? 0.82 : 1)); state.typing = true; state.typeStart = performance.now();
    }
  };
  onLoaderExit(startIntro);
  if (!picks.length) signalReady();

  /* ---------- pointer / hover / click ---------- */
  const ndc = new THREE.Vector2(0, 0), ray = new THREE.Raycaster();
  let pointerIn = false, hovered = null;
  const hitTargets = screens.flatMap(s => [s.userData.img]);
  hero.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    pointerIn = true;
    if (tip) {
      // keep the tooltip fully on screen: flip to the left / above the cursor near the edges
      const tw = tip.offsetWidth || 200, th = tip.offsetHeight || 50, mx = e.clientX - r.left, my = e.clientY - r.top;
      const x = mx + 18 + tw > r.width - 12 ? mx - tw - 18 : mx + 18;
      const y = my + 18 + th > r.height - 12 ? my - th - 18 : my + 18;
      tip.style.transform = `translate(${Math.max(12, x)}px, ${Math.max(12, y)}px)`;
    }
  });
  hero.addEventListener("pointerleave", () => { pointerIn = false; });
  // mouse: open the screen under the cursor
  let lastPointerType = "mouse", downAt = null;
  canvas.addEventListener("click", () => {
    if (lastPointerType !== "mouse") return;            // taps are handled below
    if (hovered) window.open(hovered.userData.p.link, "_blank", "noopener");
  });
  // touch / pen: a tap has no hover, so ray-cast at the tap position itself
  const pickAt = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    const p = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(p, camera);
    const h = ray.intersectObjects(hitTargets, false)[0];
    return h ? h.object.userData.screen : null;
  };
  canvas.addEventListener("pointerdown", e => { lastPointerType = e.pointerType; downAt = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", e => {
    if (e.pointerType === "mouse" || !downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y); downAt = null;
    if (moved > 10) return;                              // that was a scroll, not a tap
    const s = pickAt(e.clientX, e.clientY);
    if (s) window.open(s.userData.p.link, "_blank", "noopener");
  });
  window.__pickAt = pickAt;

  /* ---------- pause off-screen ---------- */
  let visible = true;
  // stop rendering once only a sliver of the hero is left on screen (frees the GPU/CPU for scrolling the next section)
  let heroRatio = 1;
  new IntersectionObserver(([en]) => { heroRatio = en.intersectionRatio; visible = en.isIntersecting && heroRatio > 0.2; },
    { threshold: [0, 0.2, 0.5, 0.8, 1] }).observe(hero);

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  const camTarget = new THREE.Vector3();
  let lastDraw = -1, drawnChars = -1, lastDrawMs = 0;
  function frame() {
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;

    // typing: relaxed ~14 chars/s, short pause at each line end, hold 8s, then retype
    let chars = 0;
    if (state.typing) {
      const CPS = 14, LINE_PAUSE = 0.35;
      const el = (performance.now() - state.typeStart) / 1000;
      const typeDur = TOTAL / CPS + CODE.length * LINE_PAUSE, cycle = typeDur + 8;
      let ct = reduceMotion ? typeDur : el % cycle;
      // walk the lines so each one finishes, pauses, then the next starts
      for (const line of CODE) {
        const lt = (line.length + 1) / CPS;
        if (ct <= lt) { chars += Math.floor(ct * CPS); break; }
        chars += line.length + 1; ct -= lt + LINE_PAUSE;
        if (ct < 0) break;
      }
      chars = Math.min(TOTAL, chars);
    }
    // redraw + re-upload the laptop screen only when something changed, max ~20×/s
    const nowMs = performance.now();
    if (heroRatio > 0.5 && (chars !== drawnChars || Math.floor(t * 2) !== lastDraw) && nowMs - lastDrawMs > 48) {
      drawScreen(chars, t); drawnChars = chars; lastDraw = Math.floor(t * 2); lastDrawMs = nowMs;
    }

    // hover detection
    let hit = null;
    if (pointerIn && hitTargets.length) {
      ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(hitTargets, false)[0];
      hit = h ? h.object.userData.screen : null;
    }
    if (hit !== hovered) {
      hovered = hit;
      canvas.style.cursor = hovered ? "pointer" : "default";
      if (tip) {
        tip.classList.toggle("show", !!hovered);
        if (hovered) tip.innerHTML = `<b>${hovered.userData.p.title}</b><span>Open live project ↗</span>`;
      }
    }

    // floating screens
    screens.forEach(s => {
      const u = s.userData, target = s === hovered ? 1 : 0;
      u.hover += (target - u.hover) * 0.12;
      const bob = reduceMotion ? 0 : Math.sin(t * 0.9 + u.phase) * 0.09;
      s.position.set(u.base.x, u.base.y + bob, u.base.z + u.hover * 0.6);
      const ms = u.mobileScale || 1;
      if (s.scale.x > 0.99 * ms) s.scale.setScalar(ms * (1 + u.hover * 0.12));
      s.rotation.x = Math.sin(t * 0.6 + u.phase) * 0.03;
      u.img.material.color.setScalar(0.9 + u.hover * 0.1);
      u.glow.material.opacity = Math.max(isMobile ? 0.55 : 0, u.hover);   // phones: screens always softly glow
    });

    // dust drift
    const dp = dgeo.attributes.position.array;
    for (let i = 0; i < DUST; i++) { dp[i * 3 + 1] += 0.0025; if (dp[i * 3 + 1] > 7) dp[i * 3 + 1] = 0; }
    dgeo.attributes.position.needsUpdate = true;

    // camera parallax + scroll dolly
    const sc = Math.min(1, scrollY / Math.max(1, hero.offsetHeight));
    const mx = pointerIn ? ndc.x : Math.sin(t * 0.25) * 0.3, my = pointerIn ? ndc.y : 0;
    // phones: the camera stays put so the 3D objects stay lined up with the text around them
    if (isMobile) camTarget.copy(camBase);
    else camTarget.set(camBase.x + mx * 1.4, camBase.y + my * 0.7 + sc * 1.2, camBase.z - sc * 2.5);
    camera.position.lerp(camTarget, 0.045);
    camera.lookAt(lookAt);

    renderer.render(scene, camera);
  }
  // safety net for slow phones: if the hero runs below ~40fps for a couple of seconds,
  // drop to 1× resolution once (looks nearly the same, roughly halves the GPU work)
  let fpsSamples = [], lastTs = 0, downgraded = false;
  (function loop(ts) {
    requestAnimationFrame(loop);
    if (visible && !document.hidden && lastTs && !downgraded) {
      fpsSamples.push(ts - lastTs);
      if (fpsSamples.length >= 120) {
        const sorted = fpsSamples.slice().sort((a, b) => a - b), median = sorted[60];
        if (median > 25 && pixelRatio > 1) { pixelRatio = 1; renderer.setPixelRatio(1); resize(); downgraded = true; }
        fpsSamples = [];
      }
    }
    lastTs = ts;
    frame();
  })(0);
  window.__hero = { step: n => { for (let i = 0; i < (n || 60); i++) frame(); } };
}
