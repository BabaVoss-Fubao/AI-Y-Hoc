/* Mô hình 3D cho bài trình bày · ThS.BS Nguyễn Văn Tú */
(function () {
  var T = window.THREE;
  if (T.ColorManagement) T.ColorManagement.legacyMode = false;
  var scenes = {}, active = null;
  function ease(x) { x = Math.min(1, Math.max(0, x)); return 1 - Math.pow(1 - x, 3); }

  function base(el, camPos, look) {
    var w = parseInt(el.style.width, 10), h = parseInt(el.style.height, 10);
    var canvas = document.createElement('canvas');
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; canvas.style.display = 'block'; canvas.style.cursor = 'grab';
    el.appendChild(canvas);
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    renderer.outputEncoding = T.sRGBEncoding;
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(32, w / h, 0.1, 100);
    camera.position.set(camPos[0], camPos[1], camPos[2]);
    camera.lookAt(new T.Vector3(look[0], look[1], look[2]));
    scene.add(new T.HemisphereLight(0xffffff, 0x445566, 1.1));
    var d = new T.DirectionalLight(0xffffff, 1.6); d.position.set(5, 10, 7); scene.add(d);
    var root = new T.Group(); scene.add(root);
    var st = { yaw: 0, drag: null };
    canvas.addEventListener('pointerdown', function (e) { st.drag = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; e.stopPropagation(); });
    canvas.addEventListener('pointermove', function (e) { if (st.drag !== null) { st.yaw += (e.clientX - st.drag) * 0.008; st.drag = e.clientX; } });
    canvas.addEventListener('pointerup', function () { st.drag = null; canvas.style.cursor = 'grab'; });
    var labels = [], v = new T.Vector3();
    return {
      w: w, h: h, renderer: renderer, scene: scene, camera: camera, root: root, st: st,
      label: function (html, cls, anchor) {
        var div = document.createElement('div'); div.className = 'lbl ' + (cls || ''); div.innerHTML = html;
        el.appendChild(div); labels.push({ d: div, a: anchor }); return div;
      },
      draw: function () {
        renderer.render(scene, camera);
        for (var i = 0; i < labels.length; i++) {
          labels[i].a.getWorldPosition(v); v.project(camera);
          labels[i].d.style.left = ((v.x + 1) / 2 * w) + 'px';
          labels[i].d.style.top = ((1 - v.y) / 2 * h) + 'px';
        }
      }
    };
  }

  function edges(geo, op) {
    return new T.LineSegments(new T.EdgesGeometry(geo), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: op }));
  }

  /* Ba tầng dùng AI: ba khối bậc thang */
  function stairs(el) {
    var cam = (el.getAttribute('data-cam') || '8.5,6.8,11.5').split(',').map(Number);
    var b = base(el, cam, [0, 1.6, 0]);
    var withLabels = el.getAttribute('data-labels') === '1';
    var colors = ['#5E7A93', '#1F7A8C', '#C8323C'];
    var names = ['Tầng 1 · Hỏi đáp', 'Tầng 2 · Làm cùng', 'Tầng 3 · Giao việc'];
    var floor = new T.Mesh(new T.CylinderGeometry(5.0, 5.0, 0.08, 72), new T.MeshStandardMaterial({ color: el.getAttribute('data-floor') || '#E2DED6', roughness: 0.9 }));
    floor.position.y = -0.05; b.root.add(floor);
    var boxes = [];
    for (var i = 0; i < 3; i++) {
      var hg = (i + 1) * 1.15;
      var geo = new T.BoxGeometry(2.3, hg, 2.6); geo.translate(0, hg / 2, 0);
      var mat = new T.MeshStandardMaterial({ color: colors[i], roughness: 0.45, metalness: 0.05, emissive: colors[i], emissiveIntensity: 0 });
      var m = new T.Mesh(geo, mat); m.position.set((i - 1) * 2.7, 0, 0); m.add(edges(geo, 0.35));
      b.root.add(m); boxes.push({ m: m, mat: mat });
      if (withLabels) { var a = new T.Object3D(); a.position.set(0, hg + 0.3, 0); m.add(a); b.label(names[i], 'top', a); }
    }
    var t0 = 0, focus = -1;
    return {
      enter: function () { t0 = performance.now(); focus = -1; },
      step: function (k) { focus = k - 1; },
      frame: function (now) {
        var t = (now - t0) / 1000;
        for (var i = 0; i < 3; i++) {
          var o = boxes[i];
          o.m.scale.y = Math.max(0.001, ease((t - i * 0.35) / 0.9));
          var on = focus === i;
          o.mat.emissiveIntensity += ((on ? 0.35 : 0) - o.mat.emissiveIntensity) * 0.1;
          o.m.position.y += ((on ? 0.3 : 0) - o.m.position.y) * 0.12;
        }
        b.root.rotation.y = Math.sin(t * 0.35) * 0.3 - 0.15 + b.st.yaw;
        b.draw();
      }
    };
  }

  /* Sáu lớp: các tấm xếp chồng, tách ra khi bấm */
  function layers(el) {
    var b = base(el, [10.5, 7.2, 13.5], [0.8, 2.9, 0]);
    var L = [
      ['Model', 'phần đọc, suy luận và viết', '#1F7A8C'],
      ['Môi trường', 'ứng dụng bao quanh model', '#4E7E96'],
      ['Công cụ, MCP', 'đọc file, chạy mã, vào ứng dụng', '#7C93A8'],
      ['Skill', 'quy trình chuẩn viết sẵn', '#A9B7C6'],
      ['Agent', 'tự làm nhiều bước tới khi xong', '#13233A'],
      ['Con người', 'đặt mục tiêu, nghiệm thu, chịu trách nhiệm', '#C8323C']
    ];
    var TH = 0.34, slabs = [];
    for (var i = 0; i < L.length; i++) {
      var geo = new T.BoxGeometry(4.6, TH, 3.0);
      var mat = new T.MeshStandardMaterial({ color: L[i][2], roughness: 0.5, transparent: true, opacity: 1 });
      var m = new T.Mesh(geo, mat); m.add(edges(geo, 0.4)); m.position.y = i * (TH + 0.02) + TH / 2;
      b.root.add(m);
      var a = new T.Object3D(); a.position.set(2.45, 0, 1.5); m.add(a);
      var d = b.label('<b>' + L[i][0] + '</b> · ' + L[i][1], 'side', a); d.style.opacity = 0;
      slabs.push({ m: m, mat: mat, d: d });
    }
    var t0 = 0, step = 0;
    return {
      enter: function () { t0 = performance.now(); step = 0; },
      step: function (k) { step = k; },
      frame: function (now) {
        var t = (now - t0) / 1000, gap = step >= 1 ? 0.85 : 0.02;
        for (var i = 0; i < slabs.length; i++) {
          var s = slabs[i], ty = i * (TH + gap) + TH / 2;
          s.m.position.y += (ty - s.m.position.y) * 0.08;
          var keep = step < 2 || i === 0 || i === 5;
          s.mat.opacity += ((keep ? 1 : 0.22) - s.mat.opacity) * 0.1;
          s.d.style.opacity = step >= 1 ? (keep ? 1 : 0.35) : 0;
        }
        b.root.rotation.y = Math.sin(t * 0.3) * 0.22 - 0.5 + b.st.yaw;
        b.draw();
      }
    };
  }

  /* Vòng lặp agent: chấm vàng chạy vòng, lỗi thì đỏ và quay lại */
  function loop(el) {
    var b = base(el, [0, 7.2, 7.4], [0, -0.6, 0.5]);
    var R = 2.3;
    var ring = new T.Mesh(new T.TorusGeometry(R, 0.05, 16, 160), new T.MeshStandardMaterial({ color: '#8A94A6' }));
    ring.rotation.x = Math.PI / 2; b.root.add(ring);
    var ang = [Math.PI, Math.PI + 2 * Math.PI / 3, Math.PI + 4 * Math.PI / 3];
    function P(a) { return new T.Vector3(R * Math.cos(a), 0, R * Math.sin(a)); }
    function node(pos, color, r, txt, cls) {
      var m = new T.Mesh(new T.SphereGeometry(r, 32, 16), new T.MeshStandardMaterial({ color: color, roughness: 0.35, emissive: color, emissiveIntensity: 0 }));
      m.position.copy(pos); b.root.add(m);
      var a = new T.Object3D(); if (cls === 'top') a.position.set(0, r + 0.15, 0); else a.position.set(0, -r - 0.15, 0);
      m.add(a); b.label(txt, cls || 'under', a);
      return m;
    }
    function line(p, q) { b.root.add(new T.Line(new T.BufferGeometry().setFromPoints([p, q]), new T.LineBasicMaterial({ color: '#8A94A6' }))); }
    var entry = new T.Vector3(-5.8, 0, 0), exit = new T.Vector3(5.8, 0, 0);
    node(P(ang[0]), '#1F7A8C', 0.3, '2 · Lập kế hoạch', 'top');
    node(P(ang[1]), '#1F7A8C', 0.3, '3 · Hành động', 'top');
    var check = node(P(ang[2]), '#1F7A8C', 0.3, '4 · Xem kết quả');
    node(entry, '#13233A', 0.36, '1 · Nhận mục tiêu');
    node(exit, '#C8323C', 0.36, '5 · Báo lại người nghiệm thu');
    line(entry, P(ang[0])); line(P(ang[2]), exit);
    var dotMat = new T.MeshStandardMaterial({ color: '#F2B84B', emissive: '#F2B84B', emissiveIntensity: 0.6 });
    var dot = new T.Mesh(new T.SphereGeometry(0.17, 24, 12), dotMat); b.root.add(dot);
    var status = document.createElement('div'); el.appendChild(status);
    var tA = 1.2, tT = 1.0, tOut = 1.2, pause = 2.0, cycle = tA + 8 * tT + tOut + pause;
    var red = new T.Color('#C8323C'), teal = new T.Color('#1F7A8C'), gold = new T.Color('#F2B84B');
    var t0 = 0;
    return {
      enter: function () { t0 = performance.now(); },
      frame: function (now) {
        var t = ((now - t0) / 1000) % cycle, txt = '', mode = 'run', loopN = 1;
        if (t < tA) { dot.position.copy(entry).lerp(P(ang[0]), ease(t / tA)); txt = 'Nhận mục tiêu'; }
        else if (t < tA + 8 * tT) {
          var k = (t - tA) / tT; loopN = Math.floor(k / 3) + 1; var local = k - (loopN - 1) * 3;
          dot.position.copy(P(ang[0] + k * 2 * Math.PI / 3));
          txt = 'Vòng ' + loopN;
          if (loopN < 3 && local >= 2 && local < 2.7) { mode = 'err'; txt = 'Vòng ' + loopN + ' · lỗi → quay lại lập kế hoạch'; }
          if (loopN === 3 && local >= 1.95) { mode = 'ok'; txt = 'Vòng 3 · đạt → báo lại'; }
        } else if (t < tA + 8 * tT + tOut) { dot.position.copy(P(ang[2])).lerp(exit, ease((t - tA - 8 * tT) / tOut)); mode = 'ok'; txt = 'Đạt → báo lại'; }
        else { dot.position.copy(exit); mode = 'done'; txt = 'Người nghiệm thu kiểm lại'; }
        var col = mode === 'err' ? red : (mode === 'ok' ? teal : gold);
        dotMat.color.copy(col); dotMat.emissive.copy(col);
        check.material.emissive.copy(mode === 'err' ? red : teal);
        check.material.emissiveIntensity += ((mode === 'err' ? 0.9 : 0) - check.material.emissiveIntensity) * 0.2;
        status.textContent = txt; status.className = 'lbl status ' + mode;
        b.root.rotation.y = Math.sin(now / 1000 * 0.25) * 0.12 + b.st.yaw;
        b.draw();
      }
    };
  }

  var factories = { stairs: stairs, layers: layers, loop: loop };
  function visibleFragments(slide) { return slide.querySelectorAll('.fragment.visible').length; }
  function activate(slide) {
    active = scenes[slide.id] || null;
    if (active) active.forEach(function (s) { s.enter(); if (s.step) s.step(visibleFragments(slide)); });
  }
  function tick(now) { if (active) active.forEach(function (s) { s.frame(now); }); requestAnimationFrame(tick); }

  window.Scenes3D = {
    start: function (Reveal) {
      document.querySelectorAll('.scene3d').forEach(function (el) {
        var sec = el.closest('section');
        try { (scenes[sec.id] = scenes[sec.id] || []).push(factories[el.getAttribute('data-scene')](el)); }
        catch (e) { el.innerHTML = '<p class="no3d">Máy này chưa hiển thị được 3D</p>'; }
      });
      Reveal.on('slidechanged', function (e) { activate(e.currentSlide); });
      var upd = function () { var s = Reveal.getCurrentSlide(); if (active) active.forEach(function (x) { if (x.step) x.step(visibleFragments(s)); }); };
      Reveal.on('fragmentshown', upd); Reveal.on('fragmenthidden', upd);
      activate(Reveal.getCurrentSlide());
      requestAnimationFrame(tick);
    }
  };
})();
