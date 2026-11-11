/* OZAK ROYAL CHESS — main.js : المشهد السينمائي، اللوحة ثلاثية الأبعاد، الصوت، الفيزياء، الواجهة */
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t, clamp = THREE.MathUtils.clamp;
const easeIO = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, easeOut = k => 1 - Math.pow(1 - k, 3), easeIn = k => k * k;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };

/* ================= الصوت (WebAudio — توليد برمجي بالكامل مع صدى قاعة) ================= */
const Snd = (() => {
  let ctx, master, verb, musicG, nbuf, on = true, timer = null, bar = 0;
  const mf = n => 440 * Math.pow(2, (n - 69) / 12), CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = on ? .9 : 0; master.connect(ctx.destination);
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb = ctx.createConvolver(); verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = .45; verb.connect(vg); vg.connect(master);
    nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const nd = nbuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    musicG = ctx.createGain(); musicG.gain.value = 0; musicG.connect(master); musicG.connect(verb);
  }
  const out = (g, wet, dest) => { if (dest) { g.connect(dest); return; } g.connect(master); if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verb); } };
  function tone(f, dur, type = 'sine', vol = .2, when = 0, slide = 0, wet = 0, dest) {
    if (!ctx) return; const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); out(g, wet, dest); o.start(t); o.stop(t + dur + .05);
  }
  function noise(dur, ft, freq, q, vol, when = 0, wet = 0) {
    if (!ctx) return; const t = ctx.currentTime + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = nbuf; f.type = ft; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); out(g, wet); s.start(t, Math.random() * .5, dur + .02);
  }
  function bar_() {
    const c = CH[bar++ % 4], t = ctx.currentTime, L = 4.2;
    c.forEach(n => [-7, 7].forEach(dt => {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = mf(n); o.detune.value = dt; f.type = 'lowpass'; f.frequency.value = 750;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.03, t + 1.5); g.gain.linearRampToValueAtTime(0, t + L + .9);
      o.connect(f); f.connect(g); g.connect(musicG); o.start(t); o.stop(t + L + 1);
    }));
    tone(mf(c[0] - 24), L, 'sine', .3, 0, 0, 0, musicG);
    [0, 2.1].forEach((w, i) => tone(78, .9, 'sine', i ? .35 : .6, w, 38, 0, musicG));
    // جوقة (أوبرا) بدرجة عالية مع اهتزاز صوتي
    const o = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = mf(c[2] + 12); l.frequency.value = 5.4; lg.gain.value = 9; l.connect(lg); lg.connect(o.detune);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + 1.8); g.gain.linearRampToValueAtTime(0, t + L + .6);
    o.connect(g); g.connect(musicG); o.start(t); l.start(t); o.stop(t + L + .7); l.stop(t + L + .7);
  }
  return {
    init, get on() { return on; },
    toggle() { on = !on; if (master) master.gain.value = on ? .9 : 0; return on; },
    music(v = .4) { if (!ctx) return; musicG.gain.cancelScheduledValues(ctx.currentTime); musicG.gain.linearRampToValueAtTime(v, ctx.currentTime + 1.2); if (!timer) { bar_(); timer = setInterval(bar_, 4200); } },
    stopMusic(f = .4) { if (!ctx) return; clearInterval(timer); timer = null; musicG.gain.cancelScheduledValues(ctx.currentTime); musicG.gain.linearRampToValueAtTime(0, ctx.currentTime + f); },
    step() { tone(68, .4, 'sine', .55, 0, 34, .15); noise(.14, 'lowpass', 320, 1, .4, 0, .2); },
    clang() { noise(.6, 'highpass', 2800, .7, .55, 0, .6); [1, 2.76, 5.4, 8.93, 11.3].forEach((m, i) => tone(610 * m, 2 - i * .25, 'sine', .09 / (1 + i * .5), 0, 0, .7)); tone(120, .5, 'sine', .5, 0, 50); },
    click() { tone(1300, .05, 'sine', .07); },
    move() { noise(.06, 'bandpass', 1900, 2.2, .55); tone(215, .1, 'sine', .45, 0, 90); noise(.12, 'lowpass', 520, 1, .35, 0, .1); },
    capture() { this.move(); tone(92, .35, 'sine', .7, 0, 38, .2); noise(.3, 'bandpass', 900, 1, .45, .02, .2); tone(2100, .5, 'sine', .05, .06, 0, .7); },
    clink(v = .5) { tone(2400 + Math.random() * 900, .35, 'sine', .05 + v * .08, 0, 0, .6); noise(.05, 'highpass', 5000, 1, .15 * v + .05); },
    check() { tone(880, .6, 'triangle', .14, 0, 0, .7); tone(1319, .7, 'triangle', .1, .08, 0, .7); },
    boom() { tone(60, 1.6, 'sine', .9, 0, 28, .3); noise(1.1, 'lowpass', 400, 1, .6, 0, .5); },
    win() { [60, 64, 67, 72, 76].forEach((n, i) => { tone(mf(n), 2.4, 'triangle', .13, i * .16, 0, .7); tone(mf(n - 12), 2.4, 'sawtooth', .04, i * .16, 0, .5); }); },
    lose() { [57, 54, 50, 45].forEach((n, i) => tone(mf(n), 2.2, 'sawtooth', .07, i * .35, 0, .8)); },
    draw() { [62, 65, 69].forEach((n, i) => tone(mf(n), 1.6, 'triangle', .1, i * .2, 0, .6)); }
  };
})();

/* ================= المُصيِّر والبيئة ================= */
const canvas = $('#c');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { $('#err').hidden = false; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.outputEncoding = THREE.sRGBEncoding;

function canvasTex(w, h, draw, srgb = true) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t; }
function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// إضاءة بيئية HDRI مُولَّدة برمجياً (صناديق ضوء ناعمة) لانعكاسات واقعية على الرخام والذهب
const ENV = (() => {
  const t = canvasTex(1024, 512, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#201810'); g.addColorStop(.5, '#2c2217'); g.addColorStop(1, '#060504'); x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    [[150, 110, 170, '#fff4de'], [520, 80, 230, '#ffe2ae'], [860, 130, 160, '#d3e2ff'], [340, 300, 110, '#ffcb7a'], [700, 320, 90, '#ffd9a0']].forEach(([a, b, r, c]) => {
      const q = x.createRadialGradient(a, b, 0, a, b, r); q.addColorStop(0, c); q.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = q; x.fillRect(a - r, b - r, 2 * r, 2 * r);
    });
  });
  t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer), env = pm.fromEquirectangular(t).texture; pm.dispose(); return env;
})();

function marbleTex(base, vein, seed, dark) {
  return canvasTex(512, 512, (x, S) => {
    const R = rng(seed); x.fillStyle = base; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 18; i++) { x.globalAlpha = .06; x.fillStyle = R() > .5 ? (dark ? '#2a2a33' : '#ffffff') : (dark ? '#000' : '#cfc9bd'); x.beginPath(); x.arc(R() * S, R() * S, 40 + R() * 130, 0, 7); x.fill(); }
    x.globalAlpha = 1;
    for (let v = 0; v < (dark ? 10 : 8); v++) {
      let px = R() * S, py = R() * S, a = R() * 6.28; x.beginPath(); x.moveTo(px, py);
      for (let s = 0; s < 70; s++) { a += (R() - .5) * 1.0; px += Math.cos(a) * 9; py += Math.sin(a) * 9; x.lineTo(px, py); }
      x.strokeStyle = `rgba(${vein},${.14 + R() * .3})`; x.lineWidth = .4 + R() * 1.8; x.shadowColor = `rgba(${vein},.5)`; x.shadowBlur = 4; x.stroke();
    }
  });
}
const spriteTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
const smokeTex = canvasTex(128, 128, (x) => { const R = rng(9); for (let i = 0; i < 26; i++) { const a = R() * 128, b = R() * 128, r = 18 + R() * 30, g = x.createRadialGradient(a, b, 0, a, b, r); g.addColorStop(0, 'rgba(150,170,200,.22)'); g.addColorStop(1, 'rgba(150,170,200,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); } });
const shaftTex = canvasTex(8, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,225,160,0)'); g.addColorStop(.25, 'rgba(255,220,150,.5)'); g.addColorStop(1, 'rgba(255,200,110,.95)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });

const MAT = {
  gold: new THREE.MeshStandardMaterial({ color: 0xdcb44c, metalness: 1, roughness: .22, envMap: ENV, envMapIntensity: 1.9 }),
  glow: new THREE.MeshStandardMaterial({ color: 0xdcb44c, metalness: 1, roughness: .25, emissive: 0x6a4a08, envMap: ENV, envMapIntensity: 1.6 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x17171c, roughness: .48, metalness: .2, envMap: ENV, envMapIntensity: .9 }),
  white: [1, 2, 3, 4].map(i => new THREE.MeshPhysicalMaterial({ map: marbleTex('#f2eee6', '120,125,135', i * 77, false), roughness: .16, metalness: 0, clearcoat: 1, clearcoatRoughness: .06, envMap: ENV, envMapIntensity: 1.25 })),
  black: [1, 2, 3, 4].map(i => new THREE.MeshPhysicalMaterial({ map: marbleTex('#0c0c10', '215,175,80', i * 131, true), roughness: .12, metalness: .25, clearcoat: 1, clearcoatRoughness: .05, envMap: ENV, envMapIntensity: 1.5 })),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xc4dcff, transparent: true, opacity: .26, roughness: .04, metalness: 0, clearcoat: 1, envMap: ENV, envMapIntensity: 2.2, depthWrite: false })
};
const M = (geo, mat, x = 0, y = 0, z = 0, parent, cast = true, recv = false) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; if (parent) parent.add(m); return m; };
function shaft(rt, rb, h, op) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 40, 1, true), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); m.rotation.y = 0; return m; }
function dust(scene, n, box, size = .09) {
  const g = new THREE.BufferGeometry(), P = new Float32Array(n * 3), R = Math.random;
  for (let i = 0; i < n; i++) P.set([(R() - .5) * box.x, R() * box.y, (R() - .5) * box.z], i * 3);
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: spriteTex, color: 0xffd78a, size, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending }));
  p.frustumCulled = false; p.userData = { box, P, n, off: new THREE.Vector3(0, 0, 0) }; scene.add(p); return p;
}
function updDust(d, t, dt) { const { box, P, n } = d.userData; for (let i = 0; i < n; i++) { P[i * 3 + 1] += dt * (.12 + (i % 5) * .03); P[i * 3] += Math.sin(t * .6 + i) * dt * .06; if (P[i * 3 + 1] > box.y) P[i * 3 + 1] = 0; } d.geometry.attributes.position.needsUpdate = true; }

/* ================= المشهد الافتتاحي: قاعة العرش ================= */
const intro = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(42, 1, .1, 120), t: 0, flick: [] };
(function buildIntro() {
  const s = intro.scene; s.background = new THREE.Color(0x030302); s.fog = new THREE.FogExp2(0x040302, .03); s.environment = ENV;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: .07, metalness: .7, transparent: true, opacity: .74, envMap: ENV, envMapIntensity: 1.2 });
  const hall = new THREE.Group(); s.add(hall);
  // العرش
  [[7, 5, .15], [5.8, 4, .45], [4.6, 3.2, .75]].forEach(([w, d, y]) => M(new THREE.BoxGeometry(w, .3, d), MAT.stone, 0, y, 0, hall, true, true));
  M(new THREE.BoxGeometry(2.3, .75, 1.8), MAT.stone, 0, 1.28, -.1, hall);
  M(new THREE.BoxGeometry(2.8, 4.4, .5), MAT.stone, 0, 3.1, -1.1, hall);
  [-1, 1].forEach(sx => { M(new THREE.BoxGeometry(.42, 1, 1.8), MAT.stone, sx * 1.4, 1.95, -.1, hall); M(new THREE.BoxGeometry(.5, .08, 1.9), MAT.glow, sx * 1.4, 2.48, -.1, hall); M(new THREE.ConeGeometry(.28, 1.4, 4), MAT.glow, sx * 1.25, 5.9, -1.1, hall); });
  M(new THREE.ConeGeometry(.4, 2, 4), MAT.glow, 0, 6.3, -1.1, hall); M(new THREE.BoxGeometry(2.9, .1, .6), MAT.glow, 0, 5.35, -1.1, hall);
  [-1, -.5, 0, .5, 1].forEach(x => M(new THREE.BoxGeometry(.06, 3.5, .03), MAT.glow, x, 3.0, -.84, hall, false));
  [3.2, 4.1, 4.9].forEach(y => M(new THREE.BoxGeometry(2.5, .05, .03), MAT.glow, 0, y, -.84, hall, false));
  [-1, 1].forEach(sx => M(new THREE.BoxGeometry(.08, 4, .03), MAT.glow, sx * 1.35, 3.1, -.84, hall, false));
  // الأعمدة والمشاعل
  [-9, -5.5, 5.5, 9].forEach((x, i) => {
    [-4, -12].forEach(z => {
      M(new THREE.CylinderGeometry(.9, 1, 16, 20), MAT.stone, x * (z < -8 ? 1.5 : 1), 8, z, hall);
      M(new THREE.TorusGeometry(.95, .08, 8, 28), MAT.glow, x * (z < -8 ? 1.5 : 1), 1.2, z, hall).rotation.x = Math.PI / 2;
    });
    const tx = x * .9, torch = new THREE.PointLight(0xff9a3c, 1.4, 16, 1.6); torch.position.set(tx, 3.4, -3.2); s.add(torch); intro.flick.push(torch);
    M(new THREE.SphereGeometry(.14, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffb060 }), tx, 3.4, -3.2, s, false);
  });
  // الملك (جالس)
  const king = new THREE.Group(); king.position.set(0, 1.65, -.2); hall.add(king); intro.king = king;
  M(new THREE.CylinderGeometry(.55, .72, 1.3, 20), MAT.gold, 0, .85, 0, king);
  M(new THREE.TorusGeometry(.62, .06, 8, 28), MAT.glow, 0, .3, 0, king).rotation.x = Math.PI / 2;
  [-1, 1].forEach(sx => {
    M(new THREE.SphereGeometry(.34, 18, 14), MAT.gold, sx * .72, 1.35, 0, king);
    const arm = M(new THREE.CylinderGeometry(.15, .17, 1, 12), MAT.gold, sx * .85, .85, .3, king); arm.rotation.x = Math.PI / 2.6; arm.rotation.z = -sx * .12;
    M(new THREE.CylinderGeometry(.27, .22, 1.0, 12), MAT.gold, sx * .32, .22, .55, king).rotation.x = Math.PI / 2;
    M(new THREE.CylinderGeometry(.19, .16, 1.0, 12), MAT.gold, sx * .32, -.3, 1.0, king);
  });
  const head = new THREE.Group(); head.position.y = 1.85; king.add(head); intro.kHead = head;
  M(new THREE.SphereGeometry(.31, 24, 18), new THREE.MeshStandardMaterial({ color: 0xc89b76, roughness: .6 }), 0, 0, 0, head);
  M(new THREE.SphereGeometry(.3, 16, 12, 0, 6.3, 1.5, 1.6), new THREE.MeshStandardMaterial({ color: 0x2a1f18, roughness: .9 }), 0, -.12, .05, head).scale.set(1.05, 1.1, 1.05);
  M(new THREE.CylinderGeometry(.34, .32, .2, 24, 1, true), MAT.glow, 0, .3, 0, head);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; M(new THREE.ConeGeometry(.07, .26, 6), MAT.glow, Math.cos(a) * .33, .52, Math.sin(a) * .33, head); }
  const jew = M(new THREE.SphereGeometry(.07, 12, 12), new THREE.MeshBasicMaterial({ color: 0xff3040 }), 0, .32, .34, head, false);
  const cl = new THREE.PointLight(0xffd07a, 1.6, 7); cl.position.set(0, .7, .3); head.add(cl);
  const cape = M(new THREE.CylinderGeometry(.9, 1.15, 2.4, 20, 1, true, Math.PI * .55, Math.PI * .9), new THREE.MeshStandardMaterial({ color: 0x4a0a14, roughness: .85, side: THREE.DoubleSide }), 0, .6, -.45, king);
  // الملكة (واقفة على يمينه = يسار المشاهد)
  const q = new THREE.Group(); q.position.set(-2.9, .9, .2); hall.add(q); intro.queen = q;
  const velvet = new THREE.MeshPhysicalMaterial({ color: 0x0b0a0e, roughness: .85, sheen: new THREE.Color(0x4a3a60), envMap: ENV, envMapIntensity: .4 });
  const dress = [[0, 0], [1.1, 0], [1.05, .16], [.78, .95], [.42, 1.75], [.28, 2.05], [.34, 2.28], [.24, 2.4], [0, 2.4]].map(p => new THREE.Vector2(p[0], p[1]));
  M(new THREE.LatheGeometry(dress, 40), velvet, 0, 0, 0, q).material.side = THREE.DoubleSide;
  [[1.07, .08], [.62, 1.3], [.4, 1.8]].forEach(([r, y]) => M(new THREE.TorusGeometry(r, .03, 8, 48), MAT.glow, 0, y, 0, q, false).rotation.x = Math.PI / 2);
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; M(new THREE.BoxGeometry(.03, 1.5, .02), MAT.glow, Math.cos(a) * .72, .78, Math.sin(a) * .72, q, false).rotation.y = -a; }
  [-1, 1].forEach(sx => { const ar = M(new THREE.CylinderGeometry(.08, .1, 1.1, 10), velvet, sx * .38, 1.7, .08, q); ar.rotation.z = sx * .2; });
  const qh = new THREE.Group(); qh.position.y = 2.72; q.add(qh); intro.qHead = qh;
  M(new THREE.SphereGeometry(.27, 24, 18), new THREE.MeshStandardMaterial({ color: 0xe0b896, roughness: .55 }), 0, 0, 0, qh);
  M(new THREE.SphereGeometry(.29, 20, 14, 0, 6.3, 0, 1.9), new THREE.MeshStandardMaterial({ color: 0x120c0a, roughness: .7 }), 0, .02, -.04, qh);
  M(new THREE.TorusGeometry(.26, .035, 8, 32), MAT.glow, 0, .27, 0, qh).rotation.x = Math.PI / 2;
  intro.gems = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * 6.283, x = Math.cos(a) * .26, z = Math.sin(a) * .26;
    M(new THREE.ConeGeometry(.04, .2 + (i % 2) * .08, 5), MAT.glow, x, .4, z, qh);
    const col = i % 2 ? 0x9fd8ff : 0xff4060; M(new THREE.SphereGeometry(.045, 10, 10), new THREE.MeshBasicMaterial({ color: col }), x, .52 + (i % 2) * .05, z, qh, false);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); sp.scale.setScalar(.35); sp.position.set(x, .54, z); qh.add(sp); intro.gems.push(sp);
  }
  // الأرضية العاكسة (نسخة معكوسة تحت أرضية شبه شفافة)
  const mirror = hall.clone(true); mirror.scale.y = -1; mirror.traverse(o => { if (o.isLight) o.visible = false; o.castShadow = false; }); s.add(mirror);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), floorMat); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; s.add(fl);
  // الإضاءة الحجمية
  const sh = shaft(1.3, 3.6, 15, .42); sh.position.set(0, 7.5, -.3); s.add(sh); intro.shaft = sh;
  const sh2 = shaft(.7, 1.6, 15, .22); sh2.position.set(-2.9, 7.5, .2); s.add(sh2);
  const sp = new THREE.SpotLight(0xffdca0, 3.4, 40, .38, .6, 1); sp.position.set(0, 14, 3); sp.target.position.set(0, 2, -.3); sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -.0005; s.add(sp, sp.target);
  s.add(new THREE.HemisphereLight(0x302a40, 0x050403, .5));
  const rim = new THREE.PointLight(0x4060b0, 1.2, 30); rim.position.set(0, 6, -9); s.add(rim);
  intro.dust = dust(s, 420, { x: 16, y: 14, z: 16 }, .1); intro.dust.position.set(0, 0, -2);
})();

/* ================= مشهد اللعب: اللوحة والقطع ================= */
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x070605); scene.fog = new THREE.FogExp2(0x070605, .006); scene.environment = ENV;
const cam = new THREE.PerspectiveCamera(40, 1, .5, 300);
const O = { az: 0, pol: .9, dist: 30, zoom: 1, tx: 0, ty: 0, tz: 0, shake: 0, vaz: 0, vpol: 0, auto: false };
const sqPos = i => new THREE.Vector3((i & 7) - 3.5, 0, (i >> 3) - 3.5);
const world = new THREE.Group(); scene.add(world); let G_dust;

(function lights() {
  const d = new THREE.DirectionalLight(0xffe3bd, 2.3); d.position.set(6, 13, 6); d.castShadow = true; d.shadow.mapSize.set(2048, 2048);
  Object.assign(d.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 }); d.shadow.bias = -.0004; d.shadow.normalBias = .02; scene.add(d);
  const sp = new THREE.SpotLight(0xffc873, 1.6, 50, .55, .8, 1); sp.position.set(0, 18, 0); scene.add(sp);
  scene.add(new THREE.HemisphereLight(0x7a6a55, 0x050403, .55));
  const r = new THREE.PointLight(0x4a70c0, 1.1, 40); r.position.set(-9, 6, -9); scene.add(r);
  const f = new THREE.PointLight(0xffe0b0, .5, 40); f.position.set(0, 8, 14); scene.add(f);
})();
(function board() {
  const base = new THREE.Group(); world.add(base);
  M(new THREE.BoxGeometry(8.08, .3, 8.08), MAT.gold, 0, -.18, 0, base, false, true);
  for (let i = 0; i < 64; i++) {
    const light = ((i >> 3) + (i & 7)) % 2 === 0, mats = light ? MAT.white : MAT.black;
    const sq = M(new THREE.BoxGeometry(.975, .3, .975), mats[(i * 7 + (i >> 3)) % 4], (i & 7) - 3.5, -.15, (i >> 3) - 3.5, base, false, true);
    sq.rotation.y = ((i * 13) % 4) * Math.PI / 2;
  }
  [[0, 4.36, 9.4, .62], [0, -4.36, 9.4, .62]].forEach(([x, z, w, d]) => { M(new THREE.BoxGeometry(w, .45, d), MAT.stone, x, -.12, z, base, false, true); M(new THREE.BoxGeometry(w - .5, .03, .05), MAT.gold, x, .11, z, base, false); });
  [-4.36, 4.36].forEach(x => { M(new THREE.BoxGeometry(.62, .45, 8.1), MAT.stone, x, -.12, 0, base, false, true); M(new THREE.BoxGeometry(.05, .03, 8.1), MAT.gold, x, .11, 0, base, false); });
  M(new THREE.BoxGeometry(10.6, .7, 10.6), MAT.stone, 0, -.65, 0, base, false, true); M(new THREE.BoxGeometry(10.8, .06, 10.8), MAT.gold, 0, -.33, 0, base, false);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(80, 48), new THREE.MeshStandardMaterial({ color: 0x0b0a09, roughness: .3, metalness: .5, envMap: ENV, envMapIntensity: .8 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -1; fl.receiveShadow = true; scene.add(fl);
  // الرفوف الزجاجية (قطع مأكولة): قرب اللاعب = قطع الخصم، بعيداً = قطع اللاعب
  [6.1, -6.1].forEach(z => { M(new THREE.BoxGeometry(5.6, .1, 1.6), MAT.glass, 0, -.05, z, world, false, true); [-.8, .8].forEach(dz => M(new THREE.BoxGeometry(5.6, .03, .04), MAT.gold, 0, .0, z + dz, world, false)); });
  const sh = shaft(1.6, 7, 20, .1); sh.position.set(0, 10, 0); scene.add(sh);
  G_dust = dust(scene, 160, { x: 14, y: 8, z: 14 }, .07);
})();

/* القطع على طراز ستونتون: خراطة (Lathe) عالية التفاصيل + تفاصيل ذهبية */
const PROF = {
  P: [[0, 0], [.36, 0], [.38, .04], [.37, .09], [.3, .14], [.2, .2], [.15, .34], [.2, .4], [.27, .44], [.27, .48], [.14, .52], [0, .52]],
  R: [[0, 0], [.41, 0], [.43, .05], [.42, .1], [.34, .16], [.25, .24], [.21, .6], [.27, .64], [.32, .68], [.32, .74], [.36, .78], [.36, .96], [.25, .96], [.25, .9], [0, .9]],
  B: [[0, 0], [.4, 0], [.42, .05], [.4, .1], [.32, .16], [.22, .27], [.14, .52], [.2, .58], [.25, .62], [.24, .66], [.12, .7], [0, .7]],
  Q: [[0, 0], [.43, 0], [.45, .05], [.43, .1], [.35, .16], [.24, .28], [.14, .74], [.23, .82], [.26, .88], [.32, 1.0], [.35, 1.1], [.2, 1.12], [0, 1.1]],
  K: [[0, 0], [.44, 0], [.46, .05], [.44, .1], [.36, .16], [.25, .3], [.15, .74], [.25, .82], [.27, .88], [.31, 1.02], [.31, 1.12], [.14, 1.16], [0, 1.14]],
  N: [[0, 0], [.41, 0], [.43, .05], [.41, .1], [.33, .17], [.29, .26], [.27, .32], [0, .32]]
};
const RINGS = { P: [[.2, .22]], R: [[.27, .22], [.37, .8]], B: [[.17, .3], [.26, .64]], Q: [[.19, .36], [.29, .86]], K: [[.2, .36], [.3, .88]], N: [[.3, .27]] };
const GEO = {}; for (const k in PROF) GEO[k] = new THREE.LatheGeometry(PROF[k].map(p => new THREE.Vector2(p[0], p[1])), 44);
const horse = (() => {
  const pts = [[-.24, .28], [.24, .28], [.22, .42], [.13, .56], [.32, .7], [.36, .82], [.3, .9], [.17, .86], [.12, 1.04], [.03, .94], [-.08, 1.0], [-.14, .84], [-.28, .62], [-.3, .42]];
  const sh = new THREE.Shape(); pts.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
  const g = new THREE.ExtrudeGeometry(sh, { depth: .2, bevelEnabled: true, bevelSize: .045, bevelThickness: .045, bevelSegments: 4, curveSegments: 8 }); g.translate(0, 0, -.1); return g;
})();
const ringGeo = {}, getRing = r => ringGeo[r] || (ringGeo[r] = new THREE.TorusGeometry(r, .022, 8, 40));
const jewel = new THREE.SphereGeometry(.05, 12, 12), boxGold = new THREE.BoxGeometry(.1, .34, .1), boxGold2 = new THREE.BoxGeometry(.28, .09, .1);
function makePiece(type, col) {
  const g = new THREE.Group(), mat = col === 'w' ? MAT.white[(type.charCodeAt(0)) % 4] : MAT.black[(type.charCodeAt(0)) % 4];
  const body = M(GEO[type], mat, 0, 0, 0, g); body.material = mat.clone(); body.material.side = THREE.DoubleSide; const bm = body.material;
  if (type === 'P') M(new THREE.SphereGeometry(.19, 28, 20), bm, 0, .64, 0, g);
  if (type === 'R') for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, m = M(new THREE.BoxGeometry(.13, .15, .13), bm, Math.cos(a) * .3, 1.02, Math.sin(a) * .3, g); m.rotation.y = -a; }
  if (type === 'B') { M(new THREE.SphereGeometry(.17, 28, 20), bm, 0, .86, 0, g).scale.set(1, 1.4, 1); M(jewel, MAT.gold, 0, 1.14, 0, g); }
  if (type === 'Q') { for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; M(jewel, MAT.gold, Math.cos(a) * .27, 1.17, Math.sin(a) * .27, g).scale.setScalar(.9); } M(new THREE.SphereGeometry(.09, 16, 12), MAT.gold, 0, 1.24, 0, g); }
  if (type === 'K') { M(boxGold, MAT.gold, 0, 1.36, 0, g); M(boxGold2, MAT.gold, 0, 1.38, 0, g); }
  if (type === 'N') {
    const h = M(horse, bm, 0, 0, 0, g); h.rotation.y = col === 'w' ? Math.PI / 2 : -Math.PI / 2;
    const fz = col === 'w' ? -1 : 1; [-1, 1].forEach(sd => M(jewel, MAT.gold, sd * .15, .83, fz * .17, g).scale.setScalar(.7));
  }
  RINGS[type].forEach(([r, y]) => { const t = M(getRing(r), MAT.gold, 0, y, 0, g, false); t.rotation.x = Math.PI / 2; });
  g.scale.setScalar(.9); g.userData = { type, col, sq: -1 }; return g;
}

/* تظليل الخانات: تحديد، حركات، كش، تلميحات */
const marks = new THREE.Group(), hints = new THREE.Group(); world.add(marks, hints);
const plane = new THREE.PlaneGeometry(.96, .96), dotG = new THREE.CircleGeometry(.15, 28), ringG = new THREE.RingGeometry(.36, .47, 36);
const hm = (c, o, over) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, depthTest: !over });
const HM = { sel: hm(0xffd45e, .5), last: hm(0xffc94a, .26), chk: hm(0xff2a2a, .6), dot: hm(0xffd45e, .9, true), cap: hm(0xff4040, .95, true) };
function flat(geo, mat, i, y = .013) { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.copy(sqPos(i)); m.position.y = y; m.renderOrder = 5; return m; }
const hitBoxes = []; (() => { const g = new THREE.BoxGeometry(1, 1.7, 1), mt = new THREE.MeshBasicMaterial({ visible: false }); for (let i = 0; i < 64; i++) { const m = new THREE.Mesh(g, mt); m.position.copy(sqPos(i)); m.position.y = .85; m.userData.sq = i; world.add(m); hitBoxes.push(m); } })();

/* ضباب الحرب الحجمي: صناديق معتمة + سُحب متحركة فوق الخانات غير المرئية */
const fogC = []; (() => {
  const g = new THREE.BoxGeometry(1, 1.75, 1);
  for (let i = 0; i < 64; i++) {
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x0a1018, transparent: true, opacity: 0, depthWrite: false }));
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false, color: 0x8aa0c0 }));
    m.position.copy(sqPos(i)); m.position.y = .87; s.position.copy(sqPos(i)); s.position.y = 1.0; s.scale.setScalar(2.2); m.visible = s.visible = false; m.renderOrder = 3; s.renderOrder = 4;
    world.add(m, s); fogC.push({ m, s, t: 0, k: 0, ph: Math.random() * 6 });
  }
})();

/* ================= التحكم بالكاميرا (سحب = تدوير، لمستان = تكبير وتحريك) ================= */
function fit() {
  const w = innerWidth, h = innerHeight, a = w / h; renderer.setSize(w, h, false); cam.aspect = a; cam.updateProjectionMatrix(); intro.cam.aspect = a; intro.cam.updateProjectionMatrix();
  const tv = Math.tan(cam.fov * Math.PI / 360), th = tv * a; O.dist = Math.max(6.2 / th, 9.6 / tv * .88);
}
addEventListener('resize', fit);
function placeCam() {
  const d = O.dist * O.zoom, s = O.shake;
  cam.position.set(O.tx + d * Math.sin(O.pol) * Math.sin(O.az), O.ty + d * Math.cos(O.pol), O.tz + d * Math.sin(O.pol) * Math.cos(O.az));
  if (s > 0) cam.position.add(new THREE.Vector3((Math.random() - .5) * s, (Math.random() - .5) * s, (Math.random() - .5) * s));
  cam.lookAt(O.tx, O.ty, O.tz);
}
const ptrs = new Map(); let moved = 0, downT = 0, lastPinch = 0, lastMid = null;
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button }); if (ptrs.size === 1) { moved = 0; downT = performance.now(); O.vaz = O.vpol = 0; } if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; lastPinch = Math.hypot(a.x - b.x, a.y - b.y); lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; } });
canvas.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p || mode !== 'game') { if (p) { p.x = e.clientX; p.y = e.clientY; } return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) {
    moved += Math.abs(dx) + Math.abs(dy);
    if (p.b === 2) pan(dx, dy); else if (moved > 8) { O.az -= dx * .0055; O.pol = clamp(O.pol - dy * .0045, .25, 1.4); O.vaz = -dx * .0055; O.vpol = -dy * .0045; }
  } else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()], dist = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    O.zoom = clamp(O.zoom * lastPinch / Math.max(dist, 1), .4, 1.5); lastPinch = dist; pan(mid.x - lastMid.x, mid.y - lastMid.y); lastMid = mid; moved = 99;
  }
});
function pan(dx, dy) { const k = O.dist * O.zoom * .0016, s = Math.sin(O.az), c = Math.cos(O.az); O.tx = clamp(O.tx - c * dx * k - s * dy * k, -4, 4); O.tz = clamp(O.tz + s * dx * k - c * dy * k, -4, 4); }
const endPtr = e => { const had = ptrs.has(e.pointerId), rb = had && ptrs.get(e.pointerId).b === 2; ptrs.delete(e.pointerId); if (had && !rb && e.type === 'pointerup' && ptrs.size === 0 && moved < 9 && performance.now() - downT < 600 && mode === 'game') tap(e.clientX, e.clientY); };
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', e => { O.zoom = clamp(O.zoom * (1 + e.deltaY * .001), .4, 1.5); e.preventDefault(); }, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
const ray = new THREE.Raycaster();
function tap(x, y) { ray.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), cam); const h = ray.intersectObjects(hitBoxes, false)[0]; if (h) onSquare(h.object.userData.sq); }

/* ================= Tween + فيزياء + جزيئات ================= */
const tweens = [], bodies = [], bursts = [];
const tween = (dur, fn, ease = k => k) => new Promise(res => tweens.push({ t: 0, dur, fn, ease, res }));
function burst(pos, white, n = 40) {
  const sets = [[white ? 0xfff2d4 : 0x14141b, !white ? THREE.NormalBlending : THREE.AdditiveBlending, .13, n], [0xffc94a, THREE.AdditiveBlending, .07, 18]];
  sets.forEach(([color, blending, size, cnt], si) => {
    const geo = new THREE.BufferGeometry(), P = new Float32Array(cnt * 3), Vl = [];
    for (let i = 0; i < cnt; i++) { P.set([pos.x, pos.y + .35, pos.z], i * 3); const a = Math.random() * 6.283, u = Math.random(); Vl.push(new THREE.Vector3(Math.cos(a) * 2.8 * u, 1.2 + Math.random() * 4, Math.sin(a) * 2.8 * u)); }
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: spriteTex, transparent: true, depthWrite: false, blending })); pts.frustumCulled = false; world.add(pts); bursts.push({ pts, Vl, life: 0, P });
  });
}
const SHELF = { b: { n: 0, z: 6.1 }, w: { n: 0, z: -6.1 } };
function launch(g, col, from) {
  const sh = col === 'b' ? SHELF.b : SHELF.w, i = sh.n++, slot = new THREE.Vector3(((i % 8) - 3.5) * .62, 0, sh.z + (i < 8 ? -.3 : .3));
  const T = .85, G = 24, p = g.position;
  bodies.push({ g, slot, v: new THREE.Vector3((slot.x - p.x) / T + (Math.random() - .5), (-p.y + .5 * G * T * T) / T, (slot.z - p.z) / T), w: new THREE.Vector3((Math.random() - .5) * 7, 0, (Math.random() - .5) * 7), age: 0, G });
}
function updBodies(dt) {
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i], g = b.g; b.age += dt; b.v.y -= b.G * dt; g.position.addScaledVector(b.v, dt); g.rotation.x += b.w.x * dt; g.rotation.z += b.w.z * dt; g.scale.setScalar(Math.max(.5, g.scale.x - dt * .55));
    const done = () => { bodies.splice(i, 1); const r0 = g.rotation.clone(), p0 = g.position.clone(); g.userData.sq = -1; tween(.3, (e) => { g.position.lerpVectors(p0, b.slot, e); g.rotation.x = lerp(r0.x, 0, e); g.rotation.z = lerp(r0.z, 0, e); }, easeOut); };
    if (g.position.y <= 0 && b.v.y < 0 && Math.abs(g.position.x) < 3.4 && Math.abs(g.position.z - b.slot.z) < 1.2) {
      g.position.y = 0;
      if (Math.abs(b.v.y) > 2) { Snd.clink(Math.min(1, Math.abs(b.v.y) / 8)); b.v.y *= -.34; b.v.x *= .4; b.v.z *= .4; b.w.multiplyScalar(.45); } else done();
    } else if (b.age > 3) { g.position.y = Math.max(0, g.position.y); done(); }
  }
}

/* ================= حالة اللعبة ================= */
const chess = new Chess(), ai = new AI(chess);
const G = { level: 1, L: null, pcs: new Array(64).fill(null), sel: -1, legal: [], busy: true, over: true, human: 'w', moves: 0, lost: 0, clock: { w: 600, b: 600 }, last: null, fog: false };
const piecesG = new THREE.Group(); world.add(piecesG);
let mode = 'boot';
const Save = { d: (() => { try { return JSON.parse(localStorage.getItem('ozak.save')) || { stars: {} }; } catch (e) { return { stars: {} }; } })(), put(n, s) { this.d.stars[n] = Math.max(this.d.stars[n] || 0, s); try { localStorage.setItem('ozak.save', JSON.stringify(this.d)); } catch (e) { } }, total() { return Object.values(this.d.stars).reduce((a, b) => a + b, 0); } };

function buildPieces() {
  while (piecesG.children.length) piecesG.remove(piecesG.children[0]); G.pcs.fill(null); bodies.length = 0; SHELF.b.n = SHELF.w.n = 0;
  chess.b.forEach((p, i) => { if (p) { const g = makePiece(p[1], p[0]); g.position.copy(sqPos(i)); g.userData.sq = i; piecesG.add(g); G.pcs[i] = g; } });
}
function drawMarks() {
  while (marks.children.length) marks.remove(marks.children[0]);
  if (G.last) { marks.add(flat(plane, HM.last, G.last.f, .011), flat(plane, HM.last, G.last.t, .011)); }
  if (chess.inCheck(chess.turn)) { const k = chess.kingSq(chess.turn); if (k >= 0) marks.add(flat(plane, HM.chk, k, .014)); }
}
function drawHints() {
  while (hints.children.length) hints.remove(hints.children[0]); if (G.sel < 0) return;
  hints.add(flat(plane, HM.sel, G.sel, .016)); const seen = new Set();
  G.legal.forEach(m => { if (seen.has(m.t)) return; seen.add(m.t); hints.add(m.c ? flat(ringG, HM.cap, m.t, .02) : flat(dotG, HM.dot, m.t, .02)); });
}
function updateFog(instant) {
  const on = G.fog, kg = chess.kingSq(G.human), kr = kg >> 3, kc = kg & 7;
  for (let i = 0; i < 64; i++) {
    const p = chess.b[i], mine = p && p[0] === G.human, near = Math.abs((i >> 3) - kr) <= 1 && Math.abs((i & 7) - kc) <= 1;
    const hidden = on && !mine && !near; fogC[i].t = hidden ? 1 : 0; if (instant) fogC[i].k = fogC[i].t;
    if (G.pcs[i]) G.pcs[i].visible = !(hidden && !mine);
    fogC[i].m.visible = fogC[i].s.visible = on;
  }
}

async function animateMove(m) {
  const g = G.pcs[m.f], cs = m.ep ? (m.f >> 3) * 8 + (m.t & 7) : m.t, cg = m.c ? G.pcs[cs] : null;
  if (cg) G.pcs[cs] = null; G.pcs[m.f] = null;
  if (m.cs) { const row = m.f >> 3, rf = row * 8 + (m.cs === 'K' ? 7 : 0), rt = row * 8 + (m.cs === 'K' ? 5 : 3), rg = G.pcs[rf]; G.pcs[rf] = null; G.pcs[rt] = rg; rg.userData.sq = rt; const a = rg.position.clone(), b = sqPos(rt); tween(.55, (e, k) => { rg.position.lerpVectors(a, b, e); rg.position.y = Math.sin(k * Math.PI) * .25; }, easeIO); }
  g.userData.sq = m.t; G.pcs[m.t] = g;
  const a = g.position.clone(), b = sqPos(m.t), hop = g.userData.type === 'N' ? .8 : .1, dur = .3 + a.distanceTo(b) * .07;
  Snd.click();
  await tween(.13, (e) => g.position.y = e * .5, easeOut);
  await tween(dur, (e, k) => { g.position.x = lerp(a.x, b.x, e); g.position.z = lerp(a.z, b.z, e); g.position.y = .5 + Math.sin(k * Math.PI) * hop; }, easeIO);
  await tween(.1, e => g.position.y = lerp(.5, 0, e), easeIn);
  O.shake = Math.max(O.shake, cg ? .16 : .04);
  if (cg) { burst(b, cg.userData.col === 'w'); Snd.capture(); vib(28); cg.visible = true; launch(cg, cg.userData.col); } else Snd.move();
  tween(.12, e => g.position.y = Math.sin(e * Math.PI) * .05);
  if (m.pr) { piecesG.remove(g); const ng = makePiece(m.pr, g.userData.col); ng.position.copy(b); ng.userData.sq = m.t; piecesG.add(ng); G.pcs[m.t] = ng; burst(b, true, 30); Snd.clink(1); }
  await sleep(120);
}

/* ================= منطق اللعب والتفاعل ================= */
function onSquare(i) {
  if (G.busy || G.over || chess.turn !== G.human) return;
  const mv = G.legal.filter(m => m.t === i);
  if (G.sel >= 0 && mv.length) return play(mv);
  const p = chess.b[i];
  if (p && p[0] === G.human) { G.sel = i; G.legal = chess.legal().filter(m => m.f === i); Snd.click(); } else { G.sel = -1; G.legal = []; }
  drawHints();
}
async function play(mv) {
  let m = mv[0];
  if (mv.length > 1) { const q = await askPromo(); m = mv.find(x => x.pr === q); }
  G.sel = -1; G.legal = []; drawHints(); await doMove(m, G.human);
}
function askPromo() { return new Promise(res => { const p = $('#promo'); p.hidden = false; const h = e => { const b = e.target.closest('button'); if (!b) return; p.hidden = true; p.removeEventListener('click', h); res(b.dataset.p); }; p.addEventListener('click', h); }); }
async function doMove(m, who) {
  G.busy = true; const cap = !!m.c; chess.move(m); if (who === G.human) G.moves++; else if (cap) G.lost++;
  await animateMove(m); G.last = m; drawMarks(); updateFog();
  const st = chess.status();
  if (st === 'check') { Snd.check(); vib([20, 40, 20]); toast('كش!'); }
  if (st === 'checkmate' || st === 'stalemate' || st === 'draw') return finish(st);
  G.busy = false; if (chess.turn !== G.human) aiTurn();
}
function aiTurn() {
  G.busy = true; $('#think').classList.add('on');
  setTimeout(() => {
    const m = ai.pick(G.level); $('#think').classList.remove('on');
    if (!m) return finish(chess.status()); doMove(m, G.human === 'w' ? 'b' : 'w');
  }, 500);
}
const fmt = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function clocks() { $('#clkMe').textContent = fmt(G.clock[G.human]); $('#clkOp').textContent = fmt(G.clock[G.human === 'w' ? 'b' : 'w']); $('#clkMe').classList.toggle('run', chess.turn === G.human && !G.over); $('#clkOp').classList.toggle('run', chess.turn !== G.human && !G.over); }
setInterval(() => { if (mode !== 'game' || G.over) return; G.clock[chess.turn] -= .2; clocks(); if (G.clock[chess.turn] <= 0) finish('timeout'); }, 200);
let toastT; function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 1400); }

function startLevel(n) {
  Snd.init(); Snd.click(); G.level = n; G.L = levelInfo(n); chess.reset(); G.sel = -1; G.legal = []; G.last = null; G.moves = G.lost = 0; G.clock = { w: 600, b: 600 }; G.fog = G.L.fog; G.over = false; G.busy = false;
  buildPieces(); drawMarks(); drawHints(); updateFog(true); clocks();
  $('#nmOp').textContent = 'م' + n + ' · ' + G.L.title; $('#avOp').textContent = ['♟', '♞', '♝', '♜', '♛', '♚', '♚', '♚'][Math.min(7, Math.floor((n - 1) / 13))];
  show(null); $('#bar').hidden = false; $('#fab').hidden = false; mode = 'game'; O.auto = false; O.az = 0; O.pol = .9; O.zoom = 1; O.tx = O.ty = O.tz = 0; O.shake = 0;
  Snd.music(.22); toast(G.L.fog ? 'ضباب الحرب — لا ترى إلا ما حول ملكك' : 'المستوى ' + n);
}
async function finish(kind) {
  G.over = true; G.busy = true; clocks(); Snd.stopMusic(.3);
  const res = kind === 'checkmate' ? (chess.turn === G.human ? 'lose' : 'win') : kind === 'timeout' ? (G.clock[G.human] <= 0 ? 'lose' : 'win') : 'draw';
  if (kind === 'checkmate') {
    const loser = chess.turn, ks = chess.kingSq(loser), kg = G.pcs[ks], kp = sqPos(ks), f = { tx: O.tx, ty: O.ty, tz: O.tz, z: O.zoom, p: O.pol };
    G.fog = false; updateFog(); O.shake = .6; document.body.classList.add('quake'); Snd.boom(); vib([90, 40, 200, 40, 320]);
    if (kg) tween(.9, e => { kg.rotation.z = e * 1.45 * (loser === 'w' ? 1 : -1); kg.position.y = e * .2; }, easeOut);
    await tween(1.7, e => { O.tx = lerp(f.tx, kp.x, e); O.tz = lerp(f.tz, kp.z, e); O.ty = lerp(f.ty, .4, e); O.zoom = lerp(f.z, .3, e); O.pol = lerp(f.p, .75, e); }, easeIO);
    document.body.classList.remove('quake');
  } else await sleep(500);
  Snd[res === 'win' ? 'win' : res === 'lose' ? 'lose' : 'draw']();
  const stars = res !== 'win' ? 0 : G.lost === 0 ? 3 : G.moves < 30 ? 2 : 1; if (stars) Save.put(G.level, stars);
  const r = $('#s-result'); r.className = 'scr on ' + res;
  $('#rTitle').textContent = res === 'win' ? 'VICTORY' : res === 'lose' ? 'DEFEAT' : 'DRAW';
  $('#rSub').textContent = kind === 'timeout' ? 'انتهى الوقت' : kind === 'stalemate' ? 'تعادل بالجمود' : kind === 'draw' ? 'تعادل' : res === 'win' ? 'كش مات — سقط الملك' : 'كش مات — سقط ملكك';
  $$('#rStars i').forEach((s, i) => s.classList.toggle('on', i < stars)); $('#rStars').style.visibility = res === 'win' ? 'visible' : 'hidden';
  $('#rInfo').textContent = res === 'win' ? `${G.moves} حركة · خسرت ${G.lost} قطعة` : '';
  $('#bNext').hidden = !(res === 'win' && G.level < 100); show('s-result');
}

/* ================= الشاشات والمشهد الافتتاحي ================= */
function show(id) { $$('.scr').forEach(s => { s.classList.toggle('on', s.id === id); }); }
function toLevels() { mode = 'menu'; G.over = true; chess.reset(); G.last = null; G.sel = -1; G.legal = []; O.auto = true; $('#bar').hidden = $('#fab').hidden = true; renderLevels(); show('s-levels'); buildPieces(); G.fog = false; updateFog(true); drawMarks(); drawHints(); Snd.music(.3); O.az = 0; O.pol = .75; O.zoom = 1; O.tx = O.ty = O.tz = 0; }
function renderLevels() {
  const el = $('#grid'); el.innerHTML = '';
  for (let n = 1; n <= 100; n++) {
    const st = Save.d.stars[n] || 0, open = n === 1 || (Save.d.stars[n - 1] || 0) > 0, L = levelInfo(n), b = document.createElement('button');
    b.className = 'lv' + (open ? '' : ' lock') + (L.fog ? ' fog' : ''); b.disabled = !open;
    b.innerHTML = `<b>${n}</b><span>${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>`; b.onclick = () => startLevel(n); el.appendChild(b);
  }
  $('#tot').textContent = Save.total() + ' / 300 ★';
}
function endIntro() { if (mode !== 'intro') return; Snd.click(); toLevels(); }
let introTitle = false;
function updIntro(dt) {
  const t = intro.t += dt, c = intro.cam, k = easeIO(clamp(t / 8, 0, 1));
  const bump = [.5, 1.4, 2.3, 3.2, 4.1, 5].reduce((a, s) => a + (t > s ? Math.exp(-(t - s) * 7) : 0), 0) * .06;
  c.position.set(Math.sin(t * .25) * .35, lerp(2.4, 3.3, k) - bump, lerp(19, 8.6, k)); c.lookAt(-.3, lerp(2.2, 2.5, k), -.4);
  intro.kHead.rotation.y = Math.sin(t * .5) * .12; intro.kHead.position.y = 1.85 + Math.sin(t * 1.3) * .015; intro.qHead.rotation.y = Math.sin(t * .4 + 1) * .15; intro.queen.rotation.y = Math.sin(t * .3) * .04;
  intro.gems.forEach((g, i) => g.material.opacity = .45 + .55 * Math.abs(Math.sin(t * 3 + i * 1.7)));
  intro.flick.forEach((l, i) => l.intensity = 1.3 + Math.sin(t * 13 + i * 2) * .25 + Math.random() * .25);
  intro.shaft.material.opacity = .36 + Math.sin(t * .8) * .05; updDust(intro.dust, t, dt);
  if (!introTitle && t > 6.6) { introTitle = true; Snd.clang(); O.shake = 0; $('#s-intro').classList.add('title'); vib(40); }
  if (t > 9) $('#s-intro').classList.add('ready');
}
function startIntro() {
  Snd.init(); mode = 'intro'; show('s-intro'); intro.t = 0; introTitle = false; Snd.music(.34);
  [.5, 1.4, 2.3, 3.2, 4.1, 5].forEach(s => setTimeout(() => mode === 'intro' && Snd.step(), s * 1000));
}

/* ================= الحلقة الرئيسية ================= */
const clock = new THREE.Clock(); let T = 0;
function loop() {
  requestAnimationFrame(loop); const dt = Math.min(clock.getDelta(), .05); T += dt;
  for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t += dt; const k = Math.min(1, w.t / w.dur); w.fn(w.ease(k), k); if (k >= 1) { tweens.splice(i, 1); w.res(); } }
  updBodies(dt);
  for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i]; b.life += dt; const p = b.P; b.Vl.forEach((v, j) => { v.y -= 9 * dt; p[j * 3] += v.x * dt; p[j * 3 + 1] += v.y * dt; p[j * 3 + 2] += v.z * dt; }); b.pts.geometry.attributes.position.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.life / 1.1); if (b.life > 1.1) { world.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(i, 1); } }
  if (mode === 'intro') { updIntro(dt); renderer.render(intro.scene, intro.cam); return; }
  if (O.auto) O.az += dt * .12; else { O.az += O.vaz; O.pol = clamp(O.pol + O.vpol, .25, 1.4); O.vaz *= .9; O.vpol *= .9; }
  O.shake = Math.max(0, O.shake - dt * .5);
  hints.children.forEach((m, i) => m.scale.setScalar(1 + .1 * Math.sin(T * 5 + i)));
  fogC.forEach(f => { if (!f.m.visible) return; f.k += (f.t - f.k) * Math.min(1, dt * 5); f.m.material.opacity = f.k * .9; f.s.material.opacity = f.k * (.55 + .2 * Math.sin(T * .8 + f.ph)); f.s.position.x = f.m.position.x + Math.sin(T * .3 + f.ph) * .25; f.s.material.rotation = T * .05 + f.ph; });
  updDust(G_dust, T, dt); placeCam(); renderer.render(scene, cam);
}

/* ================= الأزرار والإقلاع ================= */
$('#bEnter').onclick = () => { Snd.init(); $('#s-start').classList.remove('on'); startIntro(); };
$('#s-intro').addEventListener('click', () => { if (intro.t > 9) endIntro(); });
$('#bSkip').onclick = e => { e.stopPropagation(); endIntro(); };
$('#bHome').onclick = () => { G.over = true; tweens.length = 0; Snd.click(); toLevels(); };
$('#bCam').onclick = () => { Snd.click(); const f = { az: O.az, pol: O.pol, z: O.zoom, tx: O.tx, tz: O.tz }, d = Math.round(f.az / (Math.PI * 2)) * Math.PI * 2; tween(.6, e => { O.az = lerp(f.az, d, e); O.pol = lerp(f.pol, .9, e); O.zoom = lerp(f.z, 1, e); O.tx = lerp(f.tx, 0, e); O.tz = lerp(f.tz, 0, e); }, easeIO); };
$('#bSnd').onclick = () => { const on = Snd.toggle(); $('#bSnd').classList.toggle('off', !on); };
$('#bRetry').onclick = () => startLevel(G.level); $('#bNext').onclick = () => startLevel(G.level + 1); $('#bMenu').onclick = () => toLevels();
fit(); intro.cam.position.set(0, 2.4, 19); loop(); show('s-start');
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
