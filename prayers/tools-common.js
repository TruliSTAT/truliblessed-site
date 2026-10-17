// Shared by /prayers/request/ and /prayers/write/. ES module. No trackers; stores nothing on our servers.
import { compileLexicon, classify, decide, normalize } from '/walk/js/safety-core.js';
import { crisisCard, safetyCard, crisisCount, crisisBump, esc, ls } from '/walk/js/common.js';
export { esc, ls };
export const $ = (s, r = document) => r.querySelector(s);
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
let CFG, API, LEX;
export async function init() {
  CFG = await (await fetch('/prayers/data/config.json')).json(); API = LOCAL ? CFG.API_BASE_LOCAL : CFG.API_BASE;
  LEX = compileLexicon(await (await fetch('/walk/data/lexicon.json')).json());
}
export function band() { if (ls.get('walk_age_block')) return 'u13'; const b = ls.get('walk_age_band'); if (!b || (b.until && b.until < Date.now())) return null; return b.v || b; }
export const gateOff = () => !CFG || CFG.GATE_MODE !== 'signin';
export async function me() { if (gateOff()) return { signedIn: false }; try { const r = await fetch(API + '/v1/auth/me', { credentials: 'include' }); return await r.json(); } catch { return { signedIn: false }; } }
export async function post(path, body) {
  if (gateOff()) return { status: 503, type: 'off' };
  const r = await fetch(API + path, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, crisisCountToday: crisisCount(), localHour: new Date().getHours(), turnstile: window.__turnstileToken || 'dev' }) });
  const j = await r.json().catch(() => ({})); j.status = r.status; return j;
}
export const signinHref = () => '/prayers/signin/?r=' + encodeURIComponent(location.pathname);
// Layer 1 (device): same lexicon as The Walk + third-person patterns. The server repeats this (Layer 2) before any LLM call.
const THIRD = [/\b(kill|hurt|harm|cut)\w* (him|her|them) ?sel(f|ves)\b/, /\b(wants?|talks? about|talking about|threaten\w*|tried|trying|going|plans?|planning) (to )?(die|end (his|her|their) (own )?life|kill (him|her|them) ?sel(f|ves))\b/, /\boverdos\w*\b/, /\bend(ing|ed|s)? (his|her|their) (own )?life\b/];
const ABUSE3 = [/\b(abus\w*|molest\w*)\b/, /\b(hits|beats|chokes) (me|him|her|them)\b/];
export function localSafety(text, ageBand) {
  if (!text || !LEX) return null; const c = classify(LEX, text); const n = normalize(text);
  if (THIRD.some((r) => r.test(n))) c.crisis = true; if (ABUSE3.some((r) => r.test(n))) c.abuse = true;
  const d = decide(c, { ageBand: ageBand || '18+', crisisCountToday: crisisCount() });
  return d && (d.card || d.type === 'age_block') ? d : null;
}
export function cardHTML(resp, ageBand) {
  const young = ageBand === '13-15c' || ageBand === '13-15' || ageBand === 'u13';
  if (resp.card === 'crisis') { crisisBump(); return crisisCard({ young, ended: resp.type === 'crisis_end' }); }
  return safetyCard(resp.card);
}
document.addEventListener('click', (e) => { const b = e.target.closest('.js-safe'); if (b) b.closest('.w-card')?.remove(); });
export function accountBar(st) {
  document.querySelectorAll('[data-acct]').forEach((el) => { el.innerHTML = st.signedIn ? '✦ Signed in' : ((band() === 'u13' || gateOff()) ? '' : `<a href="${signinHref()}">Sign in</a>`); });
}
export function shareMenu(box, getText, title) {
  const enc = encodeURIComponent;
  box.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]'); if (!a) return; const t = getText();
    if (a.dataset.a === 'copy') navigator.clipboard?.writeText(t).then(() => toast('Copied'), () => window.prompt('Copy this:', t));
    if (a.dataset.a === 'share') {
      if (navigator.share && !box.dataset.forceMenu) return navigator.share({ title, text: t }).catch(() => {});
      let m = box.querySelector('.pl-menu');
      if (!m) { m = document.createElement('div'); m.className = 'pl-menu'; m.setAttribute('role', 'menu'); box.appendChild(m); }
      m.innerHTML = `<a role="menuitem" href="sms:?&body=${enc(t)}">Text message</a><a role="menuitem" href="mailto:?subject=${enc(title)}&body=${enc(t)}">Email</a><a role="menuitem" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${enc(t)}">WhatsApp</a>`;
      m.hidden = !m.hidden && m.dataset.open === '1'; m.dataset.open = m.hidden ? '0' : '1';
    }
  });
}
export function toast(msg) { let t = $('#pl-toast'); if (!t) { t = document.createElement('div'); t.id = 'pl-toast'; t.className = 'pl-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 1600); }
export async function saveToJournal(entry, passEl) {
  const { writeEntry, lock, localDate } = await import('/walk/js/common.js');
  const b = band(); if (b === 'u13' || b === '13-15') return { ok: false, why: 'age' };
  if (lock.info() && !lock.key) { if (!passEl || !passEl.value) return { ok: false, why: 'locked' }; if (!(await lock.unlock(passEl.value))) return { ok: false, why: 'badpass' }; }
  await writeEntry({ id: crypto.randomUUID(), v: 1, createdAt: new Date().toISOString(), localDate: localDate(), takeaway: '', themes: [], hardDay: false, safetyFlag: 'none', ...entry });
  return { ok: true };
}
export function verseHTML(v) { return v ? `<blockquote class="pl-verse">“${esc(v.text)}” <cite>${esc(v.ref)} (BSB)</cite></blockquote>` : ''; }
