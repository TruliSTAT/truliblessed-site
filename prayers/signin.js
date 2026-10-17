/* Sign-in: passwordless email link. Shares The Walk's age gate (same localStorage keys). No trackers. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var ls = { get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  var DAYS30 = 30 * 864e5, API;
  var q = new URLSearchParams(location.search);
  var ret = (q.get('r') || '/prayers/'); if (ret[0] !== '/' || ret[1] === '/') ret = '/prayers/';
  function show(step) { document.querySelectorAll('[data-step]').forEach(function (s) { s.hidden = s.dataset.step !== step; }); $('.pl-err').hidden = true; }
  function err(m) { var e = $('.pl-err'); e.textContent = m; e.hidden = false; }
  function band() {
    if (ls.get('walk_age_block')) return 'u13';
    var b = ls.get('walk_age_band'); if (!b) return null; if (b.until && b.until < Date.now()) return null; return b.v || b;
  }
  function setBand(v) { // mirrors /walk/js/common.js so one age check covers both
    if (v === 'u13') { ls.set('walk_age_block', { until: Date.now() + DAYS30 }); return; }
    if (v === '13-15') ls.set('walk_age_band', { v: v, until: Date.now() + DAYS30 }); else ls.set('walk_age_band', { v: v });
  }
  function route() {
    var b = band();
    if (b === 'u13') return show('u13');
    if (b === '13-15') return ls.get('truli_walk_consent') ? (setBand('13-15c'), show('email')) : show('teen');
    if (b === '16-17' || b === '18+' || b === '13-15c') return show('email');
    show('age');
  }
  function post(path, body) { return fetch(API + path, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json().then(function (j) { j.status = r.status; return j; }); }); }
  fetch('/prayers/data/config.json').then(function (r) { return r.json(); }).then(function (cfg) {
    API = LOCAL ? cfg.API_BASE_LOCAL : cfg.API_BASE;
    $('#pl-continue').href = ret;
    if (q.get('t')) {
      show('verify');
      post('/v1/auth/verify', { token: q.get('t') }).then(function (j) {
        if (!j.signedIn) return show('error');
        if (j.band && !band()) setBand(j.band);
        history.replaceState(null, '', location.pathname + '?r=' + encodeURIComponent(ret)); // drop the token from the address bar
        show('done');
      }, function () { show('error'); });
    } else route();
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-band]'); if (b) { setBand(b.dataset.band); route(); }
    if (e.target.closest('[data-reset-age]')) { ls.del('walk_age_band'); show('age'); }
    if (e.target.closest('[data-restart]')) { history.replaceState(null, '', location.pathname + '?r=' + encodeURIComponent(ret)); route(); }
  });
  $('#pl-email-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var bb = band();
    post('/v1/auth/start', { email: $('#pl-email').value, ageBand: bb, consentToken: bb === '13-15c' ? ls.get('truli_walk_consent') : undefined, returnTo: ret, turnstile: window.__turnstileToken || 'dev' }).then(function (j) {
      if (j.sent) { $('#pl-email').value = ''; show('sent'); $('.pl-dev').hidden = !LOCAL; return; }
      if (j.error === 'under_13') { setBand('u13'); return show('u13'); }
      if (j.error === 'parent_permission_needed') { setBand('13-15'); return show('teen'); }
      err(j.error === 'slow_down' ? 'Too many links requested. Please wait a bit and try again.' : j.error === 'bad_email' ? 'That email doesn’t look right.' : 'Something went wrong. Please try again.');
    }, function () { err('We couldn’t reach the sign-in service. Please try again.'); });
  });
  $('#pl-devmail').addEventListener('click', function () {
    fetch(API + '/v1/auth/dev-outbox', { credentials: 'include' }).then(function (r) { return r.json(); }).then(function (m) {
      var pre = $('.pl-mail'); pre.hidden = false;
      pre.innerHTML = 'MOCK EMAIL (local dev only, not sent)\nTo: ' + m.to.replace(/[<>&]/g, '') + '\nSubject: Your Truli Blessed sign-in link\n\n<a id="pl-devlink" href="' + m.link.replace(/"/g, '') + '">Sign in to Truli Blessed</a>\n\nIt works once and expires in 15 minutes.';
    });
  });
})();
