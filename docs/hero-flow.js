(function () {
  const canvas = document.getElementById('flow-field');
  const ctx = canvas.getContext('2d');
  let W, H, dpr, Rp, CX, CY, paused = false, raf = 0;
  let stars = [], spherePts = [], ringPts = [];
  const mouse = { x: -9999, y: -9999 };
  const TILT = 0.40;            // 环平面绕 X 轴倾角（弧度）
  const FOCAL = 3.6;            // 透视焦距（单位=球半径）
  const LIGHT = norm3(-0.55, -0.62, -0.55);   // 光从左上前打来

  function norm3(x, y, z) {
    const l = Math.hypot(x, y, z);
    return { x: x / l, y: y / l, z: z / l };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Rp = Math.min(W * 0.15, H * 0.24);   // 土星本体半径（px）
    CX = W * 0.5;
    CY = H * 0.62;
    build();
  }

  function build() {
    /* 星空 */
    const starCount = Math.round(W * H / 10000);
    stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 0.4 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.2,
      drift: 2 + Math.random() * 7
    }));

    /* 球体：斐波那契球面 */
    spherePts = [];
    const NS = 1500, ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < NS; i++) {
      const y = 1 - (2 * (i + 0.5)) / NS;      // -1..1
      const rr = Math.sqrt(1 - y * y);
      const th = ga * i;
      spherePts.push({
        x: Math.cos(th) * rr, y, z: Math.sin(th) * rr,
        lon: th,                              // 自转用经度
        rr,
        size: 1.05 + Math.random() * 0.5,
        tw: Math.random() * Math.PI * 2,
        ox: 0, oy: 0                          // 鼠标扰动偏移
      });
    }

    /* 行星环：三条带 + 卡西尼缝（1.52~1.64 留空） */
    ringPts = [];
    const bands = [
      { rIn: 1.30, rOut: 1.50, n: 650, bright: 1.05 },   // C/B 内环
      { rIn: 1.64, rOut: 2.02, n: 1800, bright: 1.0 },   // B 主环
      { rIn: 2.10, rOut: 2.34, n: 720, bright: 0.75 }    // A 外环
    ];
    for (const b of bands) {
      for (let i = 0; i < b.n; i++) {
        const r = b.rIn + Math.random() * (b.rOut - b.rIn);
        ringPts.push({
          r,
          ang: Math.random() * Math.PI * 2,
          w: 0.42 / Math.pow(r, 1.5),          // 开普勒差速
          y: (Math.random() - 0.5) * 0.012,    // 环厚度
          size: 0.9 + Math.random() * 0.8,
          bright: b.bright * (0.7 + Math.random() * 0.5),
          tw: Math.random() * Math.PI * 2,
          ox: 0, oy: 0
        });
      }
    }
  }

  /* 3D → 2D：先绕 Y 转，再绕 X 倾，再透视 */
  function project(x, y, z) {
    const c = Math.cos(TILT), s = Math.sin(TILT);
    const yy = y * c - z * s;
    const zz = y * s + z * c;
    const scale = FOCAL / (FOCAL - zz);
    return { sx: CX + x * Rp * scale, sy: CY + yy * Rp * scale, z: zz, scale };
  }

  /* 鼠标斥力（对单个粒子生效，弹簧回位） */
  function repel(p, sx, sy, radius, force) {
    const dx = sx + p.ox - mouse.x, dy = sy + p.oy - mouse.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius && d2 > 0.01) {
      const d = Math.sqrt(d2);
      const f = (1 - d / radius) * force;
      p.ox += (dx / d) * f;
      p.oy += (dy / d) * f;
    }
    p.ox *= 0.88; p.oy *= 0.88;
  }

  const drawList = [];
  let sphereRot = 0;
  let last = performance.now();

  function frame(now) {
    if (paused) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const time = now / 1000;
    sphereRot += dt * 0.12;

    ctx.clearRect(0, 0, W, H);

    /* --- 星空 --- */
    for (const s of stars) {
      s.y += s.drift * dt;
      if (s.y > H + 3) { s.y = -3; s.x = Math.random() * W; }
      const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * s.speed * 2 + s.phase));
      ctx.fillStyle = `rgba(205, 222, 255, ${tw * 0.5})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    /* --- 收集土星粒子并计算投影 --- */
    drawList.length = 0;

    // 球体（自转 = 经度 + sphereRot）
    const cr = Math.cos(sphereRot), sr = Math.sin(sphereRot);
    for (const p of spherePts) {
      const x = p.x * cr + p.z * sr;          // 绕 Y 自转
      const z = -p.x * sr + p.z * cr;
      const pr = project(x, p.y, z);
      // 光照：法线即单位向量本身（旋转后）
      const diff = Math.max(0, x * LIGHT.x + p.y * LIGHT.y + z * LIGHT.z);
      const lum = 0.18 + 0.82 * diff;
      repel(p, pr.sx, pr.sy, 130, 2.2);
      drawList.push({
        sx: pr.sx + p.ox, sy: pr.sy + p.oy, z: pr.z, sc: pr.scale,
        size: p.size, type: 0, lum,
        twk: 0.9 + 0.1 * Math.sin(time * 2 + p.tw)
      });
    }

    // 行星环
    for (const p of ringPts) {
      p.ang += p.w * dt;
      const x = Math.cos(p.ang) * p.r;
      const z = Math.sin(p.ang) * p.r;
      const pr = project(x, p.y, z);
      // 球体遮挡：粒子在球后方且投影落在球盘内 → 跳过
      if (pr.z < 0) {
        const dxs = pr.sx - CX, dys = pr.sy - CY;
        if (dxs * dxs + dys * dys < (Rp * pr.scale * 0.97) ** 2) continue;
      }
      repel(p, pr.sx, pr.sy, 130, 2.6);
      const front = 0.45 + 0.55 * (0.5 + 0.5 * (pr.z / 2.3));   // 前亮后暗
      const twk = 0.85 + 0.3 * Math.sin(time * 2.4 + p.tw);
      drawList.push({
        sx: pr.sx + p.ox, sy: pr.sy + p.oy, z: pr.z, sc: pr.scale,
        size: p.size, type: 1, lum: p.bright * front * twk
      });
    }

    /* --- 深度排序（远的先画） --- */
    drawList.sort((a, b) => a.z - b.z);

    /* --- 绘制 --- */
    for (const d of drawList) {
      if (d.type === 0) {
        // 球体：琥珀金
        const a = Math.min(1, d.lum) * d.twk;
        const l = 42 + d.lum * 34;
        ctx.fillStyle = `hsla(38, 62%, ${l}%, ${a})`;
      } else {
        // 环：金白，随亮度
        const a = Math.min(1, Math.max(0, d.lum)) * 0.95;
        const l = 55 + d.lum * 25;
        ctx.fillStyle = `hsla(40, 42%, ${l}%, ${a})`;
      }
      const sz = d.size * d.sc;
      ctx.beginPath();
      ctx.arc(d.sx, d.sy, sz, 0, Math.PI * 2);
      ctx.fill();
    }

    /* --- 球心柔光（增强体积感） --- */
    const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, Rp * 1.6);
    g.addColorStop(0, 'rgba(232, 190, 110, 0.10)');
    g.addColorStop(0.6, 'rgba(232, 190, 110, 0.03)');
    g.addColorStop(1, 'rgba(232, 190, 110, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(CX, CY, Rp * 1.6, 0, Math.PI * 2);
    ctx.fill();

    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  window.F4RFlow = { setPaused(value) {
    const next = Boolean(value);
    if (next === paused) return;
    paused = next;
    if (paused) cancelAnimationFrame(raf);
    else { last = performance.now(); raf = requestAnimationFrame(frame); }
  }};
  resize();
  raf = requestAnimationFrame(frame);
})();
