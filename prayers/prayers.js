/* Truli Blessed Prayer Library (staging). No trackers. Network: same-origin JSON + the Truli API (walk-worker) for
   sign-in prayers. Sign-in prayer text is never in the static site; it is fetched with the session cookie. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var slug = function (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  var tslug = function (t) { return t.split('/').map(slug).join('/'); };
  var tlabel = function (t) { return t.replace('/', ' › '); };
  function readLS(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  // kid-facing pages and under-13 readers: no sign-in, AI or sign-up CTAs (CSS hides [data-adult-only])
  function kidMode() { var b = null; try { b = localStorage.getItem('walk_age_block') ? 'u13' : localStorage.getItem('walk_age_band'); } catch (e) {} return b === 'u13' || !!document.querySelector('.pl-kid'); }
  if (kidMode()) document.documentElement.classList.add('pl-kidmode');
  var FROM_MATCH = { brother: ['brother', 'sibling'], sister: ['sister', 'sibling'], sibling: ['brother', 'sister', 'sibling', 'step-sibling'], parent: ['parent', 'stepparent'], grandparent: ['grandparent', 'grandma', 'grandpa'], self: ['self', 'self-kid', 'self-teen', 'self-young-adult'] };

  function walkBand() { // The Walk's on-device age band (only the band; never a birthdate)
    if (readLS('walk_age_block')) return 'u13';
    var b = readLS('walk_age_band'); if (!b) return null;
    if (b.until && b.until < Date.now()) return null;
    return b.v || b;
  }
  var CFG, API;
  function api(path, opt) { opt = opt || {}; opt.credentials = 'include'; return fetch(API + path, opt).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }); }
  // Kids pages (main.pl-kid): no sign-in API call at all, and Copy-only sharing (no social share links or share sheet).
  function isKid() { return !!document.querySelector('main.pl-kid'); }
  function me() { if (isKid()) return Promise.resolve({ signedIn: false }); return CFG.GATE_MODE === 'signin' ? api('/v1/auth/me').catch(function () { return { signedIn: false }; }) : Promise.resolve({ signedIn: false }); }
  function signinHref() { return '/prayers/signin/?r=' + encodeURIComponent(location.pathname + location.search); }

  function lockHTML() {
    if (CFG.GATE_MODE !== 'signin') return '<h2>Member prayers are coming soon</h2><p>Prayers written for a specific person or situation will open for members soon. Every free prayer is yours to pray anytime.</p><a class="tb-cta" href="/prayers/?free=1">See free prayers</a>';
    var b = walkBand();
    if (b === 'u13') return '<h2>This one is for older readers</h2><p>Every free prayer in the library is yours to pray anytime.</p><a class="tb-cta" href="/prayers/?free=1">See free prayers</a>';
    if (b === '13-15') return '<h2>This one opens with a parent’s OK</h2><p>Ages 13–15 can sign in once a parent or guardian says yes in The Walk. The free prayers are open to you now.</p><a class="tb-cta" href="/walk/">Go to The Walk</a> <a class="pl-ghost" href="/prayers/?free=1">See free prayers</a>';
    return '<h2>Sign in to read this prayer</h2><p>Prayers written for a specific person or situation are for signed-in members. Sign-in is free with a one-time email link: no password, no ads, no trackers.</p><a class="tb-cta" href="' + signinHref() + '">Sign in free</a> <a class="pl-ghost" href="/prayers/?free=1">See free prayers</a>';
  }
  function acctBar(st) {
    document.querySelectorAll('[data-acct]').forEach(function (el) {
      if (st.signedIn) { el.innerHTML = '✦ Signed in · <button type="button" class="pl-link" data-signout>Sign out</button>'; }
      else if (walkBand() === 'u13' || CFG.GATE_MODE !== 'signin') el.innerHTML = '';
      else el.innerHTML = '<a href="' + signinHref() + '">Sign in</a> to open every prayer, including ones for a specific person or situation.';
    });
    document.addEventListener('click', function (e) { if (e.target.closest('[data-signout]')) api('/v1/auth/signout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).finally(function () { location.reload(); }); });
  }

  // ---- sharing
  function shareText(p) {
    var v = (p.verses || [])[0];
    return p.title + '\n\n' + (p.body || []).join('\n') + (v ? '\n\n“' + (v.display || v.text) + '” (' + v.ref + ', BSB)' : '') + (p.help_note && String(p.help_note).trim() ? '\n\nIf you need support: ' + String(p.help_note).trim() : '') + '\n\nTruli Blessed · Into the light.';
  }
  function toast(msg) { var t = $('#pl-toast') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'pl-toast', className: 'pl-toast', role: 'status' })); t.textContent = msg; t.classList.add('on'); setTimeout(function () { t.classList.remove('on'); }, 1600); }
  function copy(txt, msg) { (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast(msg); }, function () { window.prompt('Copy this:', txt); }); }
  function actions(p, box) {
    var url = location.origin + '/prayers/' + p.slug + '/';
    var enc = encodeURIComponent, short = p.title + ' ' + url;
    if (isKid()) {
      box.innerHTML = '<button type="button" class="pl-btn" data-a="text">Copy prayer</button><button type="button" class="pl-btn" data-a="link">Copy link</button>';
      box.addEventListener('click', function (e) { var a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'text') copy(shareText(p) + '\n' + url, 'Prayer copied');
        if (a.dataset.a === 'link') copy(url, 'Link copied'); });
      return;
    }
    box.innerHTML =
      '<button type="button" class="pl-btn" data-a="text">Copy prayer</button>' +
      '<button type="button" class="pl-btn" data-a="link">Copy link</button>' +
      '<button type="button" class="pl-btn pl-btn--gold" data-a="share" aria-haspopup="true" aria-expanded="false">Share…</button>' +
      (p.video_url ? '<button type="button" class="pl-btn" data-a="video">Share video</button>' : '') +
      '<div class="pl-menu" hidden role="menu">' +
        '<a role="menuitem" href="sms:?&body=' + enc(short) + '">Text message</a>' +
        '<a role="menuitem" href="mailto:?subject=' + enc(p.title) + '&body=' + enc(shareText(p) + '\n\n' + url) + '">Email</a>' +
        '<a role="menuitem" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=' + enc(short) + '">WhatsApp</a>' +
        '<a role="menuitem" target="_blank" rel="noopener noreferrer" href="https://x.com/intent/post?text=' + enc(p.title) + '&url=' + enc(url) + '">X</a>' +
        '<a role="menuitem" target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/sharer/sharer.php?u=' + enc(url) + '">Facebook</a>' +
        (p.video_url ? '<a role="menuitem" href="' + p.video_url + '" download>Download video</a>' : '') +
      '</div>';
    var menu = $('.pl-menu', box), sbtn = $('[data-a=share]', box);
    box.addEventListener('click', function (e) {
      var a = e.target.closest('[data-a]'); if (!a) return;
      var k = a.dataset.a;
      if (k === 'text') copy(shareText(p) + '\n' + url, 'Prayer copied');
      if (k === 'link') copy(url, 'Link copied');
      if (k === 'share') {
        if (navigator.share && !box.dataset.forceMenu) navigator.share({ title: p.title, text: shareText(p), url: url }).catch(function () {});
        else { menu.hidden = !menu.hidden; sbtn.setAttribute('aria-expanded', String(!menu.hidden)); }
      }
      if (k === 'video') {
        fetch(p.video_url).then(function (r) { return r.blob(); }).then(function (b) {
          var f = new File([b], p.slug + '.mp4', { type: 'video/mp4' });
          if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: p.title, text: p.title + ' ' + url });
          var l = document.createElement('a'); l.href = p.video_url; l.download = p.slug + '.mp4'; l.click();
        }).catch(function () {});
      }
    });
    document.addEventListener('click', function (e) { if (!box.contains(e.target)) { menu.hidden = true; sbtn.setAttribute('aria-expanded', 'false'); } });
  }
  function contentHTML(p) {
    return '<div class="pl-body">' + p.body.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div>' +
      (p.verses || []).map(function (v) { return '<blockquote class="pl-verse">“' + esc(v.display || v.text) + '” <cite>' + esc(v.ref) + ' (BSB)</cite></blockquote>'; }).join('') +
      (p.help_note && String(p.help_note).trim() ? '<aside class="pl-help" role="note" aria-label="If you need support"><p class="pl-help-h">If you need support</p><p>' + esc(String(p.help_note).trim()) + '</p></aside>' : '') +
      (p.video_url ? '<video class="pl-video" controls preload="none" playsinline poster="' + esc(p.video_url.replace(/\.mp4$/, '.jpg')) + '" src="' + esc(p.video_url) + '"></video>' : '');
  }

  // ---- single prayer page
  function single(st) {
    var p = window.TB_PRAYER, main = $('.pl-single');
    if (p.gate === 'free') return actions(p, $('.pl-actions', main));
    var lock = $('.pl-lock', main), box = $('.pl-gated-content', main);
    if (!st.signedIn) { lock.innerHTML = lockHTML(); main.classList.add('is-locked'); return; }
    api('/v1/prayers/' + encodeURIComponent(p.id)).then(function (full) {
      Object.assign(p, full); box.innerHTML = contentHTML(p); box.hidden = false; lock.remove();
      var t = $('.pl-teaser--big', main); if (t) t.remove();
      main.classList.add('is-unlocked'); actions(p, $('.pl-actions', main));
    }, function () { lock.innerHTML = lockHTML(); });
  }

  // ---- library index
  function library(st, data, lockedFull) {
    var ps = data.prayers, byId = {};
    ps.forEach(function (p) { byId[p.id] = p; });
    (lockedFull || []).forEach(function (f) { if (byId[f.id]) Object.assign(byId[f.id], f, { unlocked: true }); });
    var ms = new MiniSearch({ idField: 'id', fields: ['title', 'text', 'topics', 'who', 'rel', 'refs', 'verse'], storeFields: ['id'],
      searchOptions: { boost: { title: 3, topics: 3, who: 2, rel: 2 }, prefix: true, fuzzy: 0.2 } });
    ms.addAll(ps.map(function (p) { return { id: p.id, title: p.title, text: (p.body || []).join(' ') || p.teaser, topics: p.topics.map(tlabel).join(' '), who: (p.who || '') + ' ' + p.relationship_for, rel: (p.relationship_from_detail || '') + ' ' + p.relationship_from, refs: (p.verses || []).map(function (v) { return v.ref; }).join(' '), verse: (p.verses || []).map(function (v) { return v.text; }).join(' ') }; }));
    var q = $('#pl-q'), tp = $('#pl-topic'), fr = $('#pl-from'), fo = $('#pl-freeonly'), grid = $('#pl-grid'), count = $('#pl-count');
    var u = new URLSearchParams(location.search);
    q.value = u.get('q') || ''; tp.value = u.get('topic') || ''; fr.value = u.get('from') || ''; fo.checked = u.get('free') === '1';
    if (st.signedIn) fo.parentNode.hidden = true;
    function render() {
      var list = q.value.trim() ? ms.search(q.value.trim()).map(function (r) { return byId[r.id]; }) : ps.slice();
      var fm = FROM_MATCH[fr.value] || [fr.value];
      list = list.filter(function (p) {
        return (!tp.value || p.topics.some(function (t) { var s = tslug(t); return s === tp.value || s.indexOf(tp.value + '/') === 0; })) &&
               (!fr.value || fm.indexOf(p.relationship_from) >= 0) &&
               (!fo.checked || p.gate === 'free');
      });
      grid.innerHTML = list.map(function (p) {
        var locked = p.gate !== 'free' && !p.unlocked;
        var badge = p.gate === 'free' ? '' : (p.unlocked ? '<span class="pl-badge pl-badge--on">Member prayer</span>' : (CFG.GATE_MODE !== 'signin' ? '<span class="pl-badge">Member prayer · coming soon</span>' : '<span class="pl-badge">🔒 Sign-in prayer</span>'));
        var teaser = locked ? p.teaser : (p.body && p.body[0] ? p.body[0] + '…' : p.teaser);
        return '<li class="pl-card' + (locked ? ' is-locked' : '') + '"><a href="/prayers/' + p.slug + '/"><span class="eyebrow">' + esc(p.topics.map(tlabel).join(' · ')) + '</span>' + badge + '<h2>' + esc(p.title) + '</h2>' +
          '<p class="pl-teaser">' + esc(teaser) + '</p><span class="pl-ref">' + (!locked && p.verses && p.verses[0] ? esc(p.verses[0].ref) + ' (BSB)' : '') + (p.video_url ? ' · ▶ video' : '') + '</span></a></li>';
      }).join('') || '<li class="pl-empty">' + (tp.selectedOptions[0] && /coming soon/.test(tp.selectedOptions[0].textContent) ? 'Prayers for this are being written now. Check back soon.' : 'No prayers match yet. Try a different word or filter.') + '</li>';
      var nf = list.filter(function (p) { return p.gate === 'free'; }).length;
      count.textContent = list.length + (list.length === 1 ? ' prayer' : ' prayers') + (st.signedIn ? '' : ' · ' + nf + ' free, ' + (list.length - nf) + (CFG.GATE_MODE !== 'signin' ? ' coming soon' : ' with sign-in'));
      var n = new URLSearchParams(); if (q.value) n.set('q', q.value); if (tp.value) n.set('topic', tp.value); if (fr.value) n.set('from', fr.value); if (fo.checked) n.set('free', '1');
      history.replaceState(null, '', location.pathname + (n.toString() ? '?' + n : ''));
    }
    [q, tp, fr, fo].forEach(function (el) { el.addEventListener('input', render); el.addEventListener('change', render); });
    render();
  }

  fetch('/prayers/data/config.json').then(function (r) { return r.json(); }).then(function (cfg) {
    CFG = cfg; API = LOCAL ? cfg.API_BASE_LOCAL : cfg.API_BASE;
    return me();
  }).then(function (st) {
    acctBar(st);
    if (window.TB_PRAYER) return single(st);
    return Promise.all([fetch('/prayers/data/prayers.json').then(function (r) { return r.json(); }),
      st.signedIn ? api('/v1/prayers').then(function (j) { return j.prayers; }, function () { return []; }) : []]).then(function (r) { library(st, r[0], r[1]); });
  });
})();
