/* Truli Blessed: in-browser prayer video Short (STAGING MOCKUP).
   Renders a 1080x1920 prayer Short on a <canvas> in the visitor's browser and records it with MediaRecorder.
   Audio is made on the device with WebAudio: pad + air (audio_v4.py math), live binaural oscillators
   (L 200 Hz, R 206 -> 210 Hz at the lift), plus the sound-mark stem (wave + up-chime) from a same-origin file.
   No upload, no server, no storage, no third-party requests. The finished file only exists as a Blob in memory. */
(function () {
  'use strict';
  var A = '/prayers/try-builder/video/';
  var W = 1080, H = 1920, FPS = 30, SR = 48000;
  var C = { cream: '#F4E9D3', gold: '#F2C05A', glow: '#FFD66B', amber: '#E3A83A', navy: '#1E2A4A', midnight: '#0E1428' };
  var ready = null;

  // ---------- assets (all same-origin) ----------
  function img(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }
  function loadFonts() {
    var F = [['TBPV Cormorant', 'cormorant-600.woff', '600'], ['TBPV Cormorant', 'cormorant-500.woff', '500'],
      ['TBPV Cormorant SC', 'cormorant-sc-600.woff', '600'], ['TBPV Noto Italic', 'noto-serif-italic.woff', '400']];
    return Promise.all(F.map(function (f) { var ff = new FontFace(f[0], 'url(' + A + f[1] + ')', { weight: f[2] }); return ff.load().then(function (x) { document.fonts.add(x); }); }));
  }
  function loadVideo() {
    return new Promise(function (res, rej) {
      var v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
      v.src = A + (v.canPlayType('video/webm; codecs="vp9"') ? 'bg-morning.webm' : 'bg-morning.mp4');
      v.addEventListener('canplaythrough', function () { res(v); }, { once: true }); v.addEventListener('error', rej, { once: true }); v.load();
    });
  }
  function loadStem(ctx) { return fetch(A + 'soundmark-stem.wav').then(function (r) { return r.arrayBuffer(); }).then(function (b) { return new Promise(function (res, rej) { ctx.decodeAudioData(b, res, rej); }); }); }
  function prepare() {
    if (!ready) ready = Promise.all([loadFonts(), img(A + 'wordmark-950.png'), img(A + 'wordmark-600.png'), img(A + 'lfs_heart_full.png')])
      .then(function (r) { return { logo: r[1], logoSm: r[2], heart: r[3] }; });
    return ready;
  }

  // ---------- timeline (same as build-a-prayer/render/build_example.py) ----------
  function timeline(n) {
    var STEP = 3.0, T0 = 0.6, st = []; for (var i = 0; i < n; i++) st.push(T0 + i * STEP);
    var PEND = st[n - 1] + 4.0, V0 = PEND - 0.2, V1 = PEND + 10.0, LG0 = V1 + 0.2, LG1 = V1 + 3.6;
    var LIFT = Math.round((LG1 + 0.3) * 100) / 100, DUR = Math.round((LIFT + 10.0) * 100) / 100;
    return { STEP: STEP, st: st, PEND: PEND, V0: V0, V1: V1, LG0: LG0, LG1: LG1, LIFT: LIFT, DUR: DUR };
  }
  function ss(x, a, b) { x = Math.min(Math.max((x - a) / (b - a), 0), 1); return x * x * (3 - 2 * x); }
  function fadewin(t, a, b, fi, fo) { fi = fi == null ? 0.9 : fi; fo = fo == null ? 0.7 : fo; return Math.min(Math.max((t - a) / fi, 0), 1) * Math.min(Math.max((b - t) / fo, 0), 1); }
  function interp(x, xs, ys) { if (x <= xs[0]) return ys[0]; for (var i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]); return ys[ys.length - 1]; }

  // ---------- text sprites (pre-rendered once; drop shadow like build_example.py) ----------
  var meas = document.createElement('canvas').getContext('2d');
  function fitwrap(txt, font, maxw) { // balanced wrap (fewest lines, then narrowest widest line)
    meas.font = font; var ws = txt.split(' ');
    if (meas.measureText(txt).width <= maxw || ws.length < 2) return [txt];
    for (var n = 2; n <= ws.length; n++) {
      var best = null;
      (function rec(start, left, parts) {
        if (left === 1) { var p = parts.concat([ws.slice(start).join(' ')]); var m = Math.max.apply(null, p.map(function (s) { return meas.measureText(s).width; })); if (m <= maxw && (!best || m < best[0])) best = [m, p]; return; }
        for (var c = start + 1; c <= ws.length - left + 1; c++) rec(c, left - 1, parts.concat([ws.slice(start, c).join(' ')]));
      })(0, n, []);
      if (best) return best[1];
    }
    return [txt];
  }
  function sprite(lines, font, size, col, shadow) {
    var lh = Math.round(size * 1.22), pad = 60; meas.font = font;
    var w = Math.ceil(Math.max.apply(null, lines.map(function (l) { return meas.measureText(l).width; }))) + pad * 2, h = lh * lines.length + pad * 2;
    var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d');
    x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
    function draw() { lines.forEach(function (l, i) { x.fillText(l, w / 2, pad + lh * i + lh / 2); }); }
    if (shadow !== false) {
      x.fillStyle = 'rgba(8,10,24,0.78)';
      x.shadowColor = 'rgba(8,10,24,0.78)'; x.shadowBlur = 36; draw(); x.shadowBlur = 12; draw(); x.shadowBlur = 0;
      x.globalCompositeOperation = 'source-over';
    }
    x.fillStyle = col; draw();
    return c;
  }

  // ---------- audio: audio_v4.py, made on the device ----------
  function padBuffer(ctx, DUR, LIFT) { // warm pad (sus4 -> major) + airy pad, mono, scaled like audio_v4 (pad/max*0.55 + air*0.6)
    var N = Math.round(SR * DUR), O = LIFT - 14.8, R = 110.0;
    var sus = [R, R * 4 / 3, R * 3 / 2, R * 2], maj = [R, R * 5 / 4, R * 3 / 2, R * 2, R * 3];
    var pad = new Float32Array(N), air = new Float32Array(N), TWO = 2 * Math.PI, mx = 0;
    var ps = [], pm = []; sus.forEach(function (f) { [-0.6, 0.6].forEach(function (d) { ps.push(TWO * (f + d) / SR); }); });
    maj.forEach(function (f) { [-0.6, 0.6].forEach(function (d) { pm.push(TWO * (f + d) / SR); }); });
    var af = [R * 4, R * 5, R * 6], aph = [0, 0, 0], i, k;
    for (i = 0; i < N; i++) {
      var t = i / SR, n1 = i + 1, X = ss(t, 14.55 + O, 15.3 + O), a = 0, b = 0, ph;
      if (X < 1) for (k = 0; k < ps.length; k++) { ph = ps[k] * n1; a += Math.sin(ph) + 0.18 * Math.sin(2 * ph); }
      if (X > 0) for (k = 0; k < pm.length; k++) { ph = pm[k] * n1; b += Math.sin(ph) + 0.18 * Math.sin(2 * ph); }
      var p = (a * (1 - X) + b * X * 0.85) * (1 + 0.12 * Math.sin(TWO * 0.15 * t));
      pad[i] = p; if (Math.abs(p) > mx) mx = Math.abs(p);
      var e = ss(t, 14.8 + O, 16.2 + O), s = 0;
      for (k = 0; k < 3; k++) { aph[k] += TWO * af[k] * (1 + 0.003 * Math.sin(TWO * 5.2 * t + k)) / SR; s += Math.sin(aph[k]); }
      air[i] = s * e * 0.10;
    }
    var buf = ctx.createBuffer(1, N, SR), out = buf.getChannelData(0), peak = 0;
    for (i = 0; i < N; i++) { out[i] = pad[i] / mx * 0.55 + air[i] * 0.6; if (Math.abs(out[i]) > peak) peak = Math.abs(out[i]); }
    return { buf: buf, peak: peak };
  }
  function curve(fn, n) { var c = new Float32Array(n); for (var i = 0; i < n; i++) c[i] = fn(i / (n - 1)); return c; }

  // ---------- recorder format ----------
  var TYPES = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1,opus',
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  function pickType() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
    for (var i = 0; i < TYPES.length; i++) if (MediaRecorder.isTypeSupported(TYPES[i])) return TYPES[i];
    return '';
  }
  function supported() { return pickType() !== null && !!(window.AudioContext || window.webkitAudioContext); }

  // ---------- WebM: add the Duration that MediaRecorder leaves out (so players can seek) ----------
  function fixWebmDuration(blob, ms) {
    return blob.slice(0, Math.min(blob.size, 65536)).arrayBuffer().then(function (ab) {
      var u = new Uint8Array(ab), p = 0;
      function vint(pos, keep) { var b = u[pos], len = 1, m = 0x80; while (len <= 8 && !(b & m)) { len++; m >>= 1; } var v = keep ? b : (b & (m - 1)); for (var i = 1; i < len; i++) v = v * 256 + u[pos + i]; return { len: len, v: v, unknown: !keep && v === Math.pow(2, 7 * len) - 1 }; }
      var id = vint(p, true); if (id.v !== 0x1A45DFA3) return blob;
      var sz = vint(p + id.len); p += id.len + sz.len + sz.v;
      id = vint(p, true); if (id.v !== 0x18538067) return blob;
      sz = vint(p + id.len); p += id.len + sz.len;
      while (p < u.length - 12) {
        id = vint(p, true); sz = vint(p + id.len);
        if (id.v === 0x114D9B74 || id.v === 0x1F43B675) return blob; // SeekHead or Cluster first: leave untouched
        if (id.v === 0x1549A966) {
          var ds = p + id.len + sz.len, de = ds + sz.v, q = ds;
          while (q < de) { var cid = vint(q, true), csz = vint(q + cid.len); if (cid.v === 0x4489) return blob; q += cid.len + csz.len + csz.v; }
          var data = u.slice(ds, de), add = new Uint8Array(11); add[0] = 0x44; add[1] = 0x89; add[2] = 0x88;
          new DataView(add.buffer).setFloat64(3, ms);
          var len = data.length + 11, head = new Uint8Array(4 + 8); head.set(u.slice(p, p + 4), 0); head[4] = 0x01;
          for (var i = 0; i < 7; i++) head[5 + i] = Math.floor(len / Math.pow(256, 6 - i)) % 256;
          return new Blob([blob.slice(0, p), head, data, add, blob.slice(de)], { type: blob.type });
        }
        if (sz.unknown) return blob;
        p += id.len + sz.len + sz.v;
      }
      return blob;
    });
  }

  // ---------- render ----------
  function render(pr, opt) {
    opt = opt || {};
    var type = pickType(); if (type === null) return Promise.reject(new Error('unsupported'));
    var tl = timeline(pr.lines.length), AC = window.AudioContext || window.webkitAudioContext;
    var actx = new AC({ sampleRate: SR, latencyHint: 'playback' });
    return Promise.all([prepare(), loadVideo(), loadStem(actx)]).then(function (r) {
      var as = r[0], vid = r[1], stem = r[2];
      // canvas + sprites
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var g = cv.getContext('2d');
      var fPr = '600 94px "TBPV Cormorant"', fHead = '600 70px "TBPV Cormorant SC"', fTl = '400 60px "TBPV Noto Italic"';
      var fVerse = '600 76px "TBPV Cormorant"', fVref = '600 60px "TBPV Cormorant"', fLfs = '500 58px "TBPV Cormorant"', fEv = '600 56px "TBPV Cormorant"', fEvref = '600 50px "TBPV Cormorant"';
      var vref = pr.verse.ref + ' (BSB)';
      var S = {
        head: sprite([pr.title], fHead, 70, C.gold), vhead: sprite(['The verse behind this prayer'], fHead, 70, C.gold),
        lines: pr.lines.map(function (l) { return sprite(fitwrap(l, fPr, 960), fPr, 94, C.cream); }),
        verse: sprite(fitwrap(pr.verse.text, fVerse, 900), fVerse, 76, C.cream), vref: sprite([vref], fVref, 60, C.glow),
        tl: sprite(['Into the light'], fTl, 60, C.cream)
      };
      // scrim (build_example.py: clip(1-|y-820|/800)*0.78)
      var scrim = g.createLinearGradient(0, 20, 0, 1620); scrim.addColorStop(0, 'rgba(0,0,0,0)'); scrim.addColorStop(0.5, 'rgba(0,0,0,0.78)'); scrim.addColorStop(1, 'rgba(0,0,0,0)');
      // end card background, pre-rendered
      var ec = document.createElement('canvas'); ec.width = W; ec.height = H; var e = ec.getContext('2d');
      var bg = e.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, C.navy); bg.addColorStop(1, C.midnight); e.fillStyle = bg; e.fillRect(0, 0, W, H);
      e.save(); e.translate(W / 2, 820); e.scale(1, 300 / 380); var gl = e.createRadialGradient(0, 0, 0, 0, 0, 640);
      gl.addColorStop(0, 'rgba(227,168,58,0.20)'); gl.addColorStop(0.55, 'rgba(227,168,58,0.10)'); gl.addColorStop(1, 'rgba(227,168,58,0)'); e.fillStyle = gl; e.fillRect(-W, -H, 2 * W, 2 * H); e.restore();
      var ecfC = document.createElement('canvas'); ecfC.width = W; ecfC.height = H; var ecf = ecfC.getContext('2d');
      var evLines = fitwrap(pr.verse.text, fEv, 880);
      var hw = Math.round(as.heart.naturalWidth * 0.6), hh = Math.round(as.heart.naturalHeight * 0.6);
      var lsW = 600, lsH = Math.round(as.logoSm.naturalHeight * 600 / as.logoSm.naturalWidth), lW = 950, lH = Math.round(as.logo.naturalHeight * 950 / as.logo.naturalWidth);
      function ctext(txt, font, y, col, a) { if (a <= 0) return; g.globalAlpha = a; g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(txt, W / 2, y); g.globalAlpha = 1; }
      function put(sp, x, y, a, sc) { if (a <= 0.003) return; sc = sc || 1; g.globalAlpha = Math.min(1, a); g.drawImage(sp, x, y, sp.width * sc, sp.height * sc); g.globalAlpha = 1; }
      var Y0 = 1400, YTOP = 560, VEL = 80.0 * 3.0 / tl.STEP;
      function endcard(t) {
        g.drawImage(ec, 0, 0);
        var wy = 470; put(as.logoSm, (W - lsW) / 2, wy, ss(t, tl.LIFT - 0.1, tl.LIFT + 0.5), lsW / as.logoSm.naturalWidth);
        var hy = wy + lsH + 70; put(as.heart, (W - hw) / 2, hy, ss(t, tl.LIFT + 0.35, tl.LIFT + 0.9), 0.6);
        var y = hy + hh + 44; ctext('Like \u2022 Follow \u2022 Subscribe', fLfs, y, C.cream, ss(t, tl.LIFT + 0.8, tl.LIFT + 1.4));
        var a = ss(t, tl.LIFT + 1.3, tl.LIFT + 2.1); y += Math.round(58 * 1.2) + 56;
        if (a > 0) { g.globalAlpha = a; g.strokeStyle = C.amber; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 60, y); g.lineTo(W / 2 + 60, y); g.stroke(); g.globalAlpha = 1; }
        y += 40; evLines.forEach(function (l) { ctext(l, fEv, y, C.cream, a); y += Math.round(56 * 1.3); });
        y += 14; ctext(vref, fEvref, y, C.glow, a);
        if (pr.help) ctext('Need support? Call or text 988 (US), anytime.', '500 44px "TBPV Cormorant"', y + 110, C.cream, ss(t, tl.LIFT + 2.0, tl.LIFT + 2.6));
      }
      function frame(t) {
        var x = ss(t, tl.LIFT - 0.5, tl.LIFT + 0.2); // logo scene -> end card crossfade, centred on the lift (wave + chime timing unchanged)
        if (x < 1) {
          // footage + scrim + fade-in
          var vw = vid.videoWidth || 720, vh = vid.videoHeight || 1280, s = Math.max(W / vw, H / vh);
          g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
          g.globalAlpha = Math.min(1, t / 0.8); g.drawImage(vid, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s); g.globalAlpha = 1;
          g.fillStyle = scrim; g.fillRect(0, 0, W, H);
          var extra = 0.30 * fadewin(t, tl.V0, tl.V1, 0.9, 0.6); if (extra > 0) { g.fillStyle = 'rgba(0,0,0,' + extra + ')'; g.fillRect(0, 0, W, H); }
          // 1) heading + crawl
          var aAll = fadewin(t, 0.0, tl.PEND, 0.01, 0.6), ah = fadewin(t, 0.4, tl.PEND, 0.9, 0.6);
          put(S.head, (W - S.head.width) / 2, 300 - 60, ah);
          if (aAll > 0) S.lines.forEach(function (sp, i) {
            var age = t - tl.st[i]; if (age < 0) return; var y = Y0 - VEL * age; if (y < YTOP) return;
            var u = (Y0 - y) / (Y0 - YTOP), sc = 1.0 - 0.42 * u;
            var op = Math.min(1, age / 0.9) * interp(y, [YTOP, 700, 1150, Y0], [0, 0.28, 1, 1]) * aAll;
            put(sp, (W - sp.width * sc) / 2, y - sp.height * sc / 2, op, sc);
          });
          // 2) verse hold
          var av = fadewin(t, tl.V0, tl.V1, 0.9, 0.6);
          if (av > 0) {
            put(S.vhead, (W - S.vhead.width) / 2, 300 - 60, av);
            var vy = 980 - (S.verse.height + S.vref.height) / 2 + 40, dy = (1 - Math.min(1, (t - tl.V0) / 0.9)) * 14;
            put(S.verse, (W - S.verse.width) / 2, vy + dy, av); put(S.vref, (W - S.vref.width) / 2, vy + S.verse.height - 80 + dy, av);
          }
          // 3) logo beat
          var al = Math.min(1, Math.max(0, (t - tl.LG0) / 0.7)); // logo fades in, then holds until the end card crossfades over it (no empty gap)
          if (al > 0) { put(as.logo, (W - lW) / 2, 660, al, lW / as.logo.naturalWidth); put(S.tl, (W - S.tl.width) / 2, 660 + lH + 50 - 60, al); }
        }
        if (x >= 1) endcard(t);
        else if (x > 0) { var main = g; g = ecf; endcard(t); g = main; g.globalAlpha = x; g.drawImage(ecfC, 0, 0); g.globalAlpha = 1; }
        var fo = ss(t, tl.DUR - 1.0, tl.DUR); if (fo > 0) { g.fillStyle = 'rgba(0,0,0,' + fo + ')'; g.fillRect(0, 0, W, H); }
      }
      // ---- audio graph ----
      var pad = padBuffer(actx, tl.DUR, tl.LIFT), O = tl.LIFT - 14.8;
      // audio_v4: st *= 0.5 / max|st|. Peak of pad + air + stem as actually mixed, plus the binaural amplitude (0.06).
      var peak = pad.peak, sd = stem.getChannelData(0), pd = pad.buf.getChannelData(0), off = Math.round((tl.LIFT - 0.8) * SR);
      for (var i = 0; i < sd.length && off + i < pd.length; i++) { var v = Math.abs(pd[off + i] + sd[i]); if (v > peak) peak = v; }
      var k = 0.5 / (peak + 0.06);
      var LOUD = Math.pow(10, 4.6 / 20);               // build_example.py loudness pass (~+5 dB toward -14 LUFS); 0.35 dB headroom for the device encoder
      var dest = actx.createMediaStreamDestination(); dest.channelCount = 2;
      var master = actx.createGain(); master.channelCount = 2; master.channelCountMode = 'explicit'; master.channelInterpretation = 'speakers'; master.connect(dest);
      var fade = actx.createGain(); fade.channelCount = 2; fade.channelCountMode = 'explicit'; fade.connect(master);
      master.gain.value = k * LOUD;
      var src = actx.createBufferSource(); src.buffer = pad.buf; src.connect(fade);
      var st = actx.createBufferSource(); st.buffer = stem; st.connect(fade);
      var merge = actx.createChannelMerger(2); merge.connect(fade);
      var oL = actx.createOscillator(), oR = actx.createOscillator(), gL = actx.createGain(), gR = actx.createGain();
      oL.frequency.value = 200; oR.frequency.value = 206; gL.gain.value = 0.06; gR.gain.value = 0.06;
      oL.connect(gL); oR.connect(gR); gL.connect(merge, 0, 0); gR.connect(merge, 0, 1);
      var rec, chunks = [], raf = 0, t0 = 0, cancelled = false, frames = 0, poster = null, posterAsked = false;
      var vstream = cv.captureStream(FPS);
      var stream = new MediaStream([vstream.getVideoTracks()[0], dest.stream.getAudioTracks()[0]]);
      return actx.resume().then(function () {
        vid.currentTime = 0; vid.playbackRate = Math.min(1, 28.0 / tl.LIFT); return vid.play();
      }).then(function () {
        return new Promise(function (resolve, reject) {
          rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 8000000, audioBitsPerSecond: 192000 } : { videoBitsPerSecond: 8000000 });
          rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunks.push(ev.data); };
          rec.onerror = function (ev) { reject(ev.error || new Error('recorder')); };
          rec.onstop = function () {
            cancelAnimationFrame(raf); try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (x) {}
            stream.getTracks().forEach(function (tr) { tr.stop(); }); actx.close();
            if (cancelled) return reject(new Error('cancelled'));
            var mime = (rec.mimeType || type || 'video/webm').split(';')[0], blob = new Blob(chunks, { type: mime });
            var ext = /mp4/.test(mime) ? 'mp4' : 'webm';
            (ext === 'webm' ? fixWebmDuration(blob, tl.DUR * 1000) : Promise.resolve(blob)).then(function (b) {
              resolve({ blob: b, poster: poster, mime: mime, ext: ext, duration: tl.DUR, frames: frames, size: b.size, type: rec.mimeType || type });
            });
          };
          frame(0);
          var now = actx.currentTime + 0.15; t0 = now;
          // schedule audio on the AudioContext clock; video frames read the same clock, so they stay in sync
          src.start(now); st.start(now + tl.LIFT - 0.8); oL.start(now); oR.start(now);
          oR.frequency.setValueCurveAtTime(curve(function (u) { return 206 + 4 * u * u * (3 - 2 * u); }, 64), now + 14.3 + O, 0.7);
          fade.gain.setValueAtTime(0, now); fade.gain.setValueCurveAtTime(curve(function (u) { return u * u * (3 - 2 * u); }, 64), now, 2.0);
          fade.gain.setValueCurveAtTime(curve(function (u) { u = 1 - u; return u * u * (3 - 2 * u); }, 64), now + tl.DUR - 3.0, 2.99);
          var stopAt = now + tl.DUR; oL.stop(stopAt + 0.1); oR.stop(stopAt + 0.1);
          rec.start(1000);
          (function loop() {
            var t = actx.currentTime - t0;
            if (opt.signal && opt.signal.aborted && !cancelled) { cancelled = true; rec.stop(); return; }
            if (t >= tl.DUR) { frame(tl.DUR); setTimeout(function () { if (rec.state !== 'inactive') rec.stop(); }, 150); return; }
            frame(Math.max(0, t)); frames++;
            if (!posterAsked && t >= tl.V0 + 2.5) { posterAsked = true; cv.toBlob(function (b) { poster = b; }, 'image/jpeg', 0.82); }
            if (opt.onProgress) opt.onProgress(Math.max(0, t), tl.DUR);
            raf = requestAnimationFrame(loop);
          })();
        });
      });
    });
  }
  window.TB_PV = { render: render, supported: supported, pickType: pickType, timeline: timeline, prepare: prepare, _fixWebmDuration: fixWebmDuration };
})();
