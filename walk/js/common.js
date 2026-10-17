// Shared client code: storage, BSB rendering, static safety cards, quick exit, passcode crypto.
import { CONFIG, previewAllowed } from './config.js';
export { CONFIG };
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export function esc(s) { const p = document.createElement('p'); p.textContent = s == null ? '' : String(s); return p.innerHTML; }
export function localDate(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };
export const ss = { get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} }, del(k) { try { sessionStorage.removeItem(k); } catch {} } };

// ---------- data ----------
let _bsb, _idx, _lex;
export async function data() {
  if (!_bsb) [_bsb, _idx, _lex] = await Promise.all(['bsb-walk.json', 'index.json', 'lexicon.json'].map((f) => fetch('/walk/data/' + f).then((r) => r.json())));
  return { bsb: _bsb, index: _idx, lexicon: _lex };
}
export function verseHTML(bsb, id, { copy = true } = {}) {
  const v = bsb[id]; if (!v) return ''; // never render anything not in the dataset
  return `<figure class="w-verse"><blockquote>“${esc(v.text)}” <cite>${esc(v.ref)} <span class="bsb">BSB</span></cite></blockquote>${copy ? `<button type="button" class="btn-sm w-copy" data-copy="${esc(`“${v.text}” ${v.ref} BSB`)}">Copy</button>` : ''}</figure>`;
}
document.addEventListener('click', (e) => { const b = e.target.closest('.w-copy'); if (!b) return; navigator.clipboard?.writeText(b.dataset.copy).then(() => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1500); }); });

// ---------- age band (only the derived band is stored; never the birthdate) ----------
export function ageState() {
  const cookie = document.cookie;
  if (ls.get('walk_age_block') || /(?:^|; )walk_age_block=1/.test(cookie)) return { band: 'u13' };
  const band = ls.get('walk_age_band') || (/(?:^|; )walk_age_band=13-15/.test(cookie) ? '13-15' : null);
  if (band && band.v && band.until && band.until < Date.now()) { ls.del('walk_age_band'); return { band: null }; }
  return { band: band && band.v ? band.v : band, token: ls.get('truli_walk_consent') };
}
function cookieSet(name, val) { document.cookie = `${name}=${val}; Max-Age=${CONFIG.AGE_FLAG_DAYS * 86400}; Path=/walk/; SameSite=Lax` + (location.protocol === 'https:' ? '; Secure' : ''); }
export function setBlock() { ls.set('walk_age_block', { until: Date.now() + CONFIG.AGE_FLAG_DAYS * 864e5 }); cookieSet('walk_age_block', '1'); ss.del('truli_walk_session'); }
export function setBand(v) {
  if (v === '13-15') { ls.set('walk_age_band', { v, until: Date.now() + CONFIG.AGE_FLAG_DAYS * 864e5 }); cookieSet('walk_age_band', '13-15'); }
  else ls.set('walk_age_band', { v });
}
export const isMinor = (band) => band !== '18+';

// ---------- crisis counter (same local day; no content stored) ----------
export function crisisCount() { const c = ls.get('truli_walk_crisis'); return c && c.d === localDate() ? c.n : 0; }
export function crisisBump() { const n = crisisCount() + 1; ls.set('truli_walk_crisis', { d: localDate(), n }); return n; }

// ---------- static safety cards (reviewed copy; NEVER model-written). Numbers per spec §7.3.1, verified Oct 15, 2026 ----------
const EXIT_BTN = '<button type="button" class="w-exit js-exit">Exit now</button><p class="fine">Exit now opens a weather page and replaces this one, so Back won’t return here. On a shared device, also clear your browsing history.</p>';
export function crisisCard({ young = false, ended = false } = {}) {
  const texts = `<a class="btn w-tel" href="sms:988">Text 988</a><a class="btn w-tel" href="sms:741741?&body=HOME">Text HOME to 741741</a>`;
  const calls = `<a class="btn w-tel" href="tel:988">Call 988</a><a class="btn w-tel ghost" href="tel:911">Call 911</a>`;
  return `<section class="w-card w-crisis" role="alert" aria-labelledby="crisis-h">
  <h2 id="crisis-h">${young ? 'You’re not in trouble. Let’s get you someone to talk to right now.' : 'You matter, and you don’t have to carry this alone.'}</h2>
  ${ended ? `<p><strong>${young ? 'Let’s pause here. Please talk to someone now.' : 'Let’s pause Lumi for today. Please reach out to a person now.'}</strong></p>` : ''}
  <p>If you might hurt yourself or you’re in danger, please reach out now:</p>
  <ul>
   <li><strong>Call or text 988</strong> (Suicide &amp; Crisis Lifeline, 24/7, US; text and chat also in Spanish)</li>
   <li><strong>Text HOME to 741741</strong> (Crisis Text Line, 24/7, US)</li>
   <li><strong>Call 911</strong> if you’re in immediate danger</li>
   <li>Tell a trusted adult right now: a parent, youth pastor, teacher or school counselor.</li>
  </ul>
  <div class="w-actions">${young ? texts + calls : '<a class="btn w-tel" href="tel:988">Call 988</a>' + texts + '<a class="btn w-tel ghost" href="tel:911">Call 911</a>'}</div>
  <p class="fine">Outside the US? <a href="https://findahelpline.com/" rel="noopener">Find a helpline near you</a>.</p>
  <p>Lumi is an AI, not a person, and can’t help in an emergency. <a href="/walk/safety/">How we keep you safe →</a></p>
  ${ended ? '' : '<button type="button" class="btn ghost js-safe">I’m safe, continue</button>'}
  ${EXIT_BTN}
 </section>`;
}
export function safetyCard(kind) {
  if (kind === 'ed') return `<section class="w-card w-crisis" role="alert"><h2>You deserve real support.</h2><ul>
   <li><strong>ANAD Eating Disorders Helpline: <a href="tel:18883757767">1-888-375-7767</a></strong> (Mon–Fri, 9 am–9 pm CT; not 24/7)</li>
   <li>Any time, day or night: <strong>call or text <a href="tel:988">988</a></strong></li>
   <li>Talk to a trusted adult, school counselor or doctor.</li></ul>${EXIT_BTN}<button type="button" class="btn ghost js-safe">Continue</button></section>`;
  if (kind === 'substance') return `<section class="w-card w-crisis" role="alert"><h2>Asking for help is wise.</h2><ul>
   <li><strong>SAMHSA National Helpline: <a href="tel:18006624357">1-800-662-4357 (HELP)</a></strong>, 24/7, English and Spanish (treatment referral). TTY 1-800-487-4889.</li>
   <li>In crisis: <strong>call or text <a href="tel:988">988</a></strong></li></ul>${EXIT_BTN}<button type="button" class="btn ghost js-safe">Continue</button></section>`;
  return `<section class="w-card w-crisis" role="alert" aria-labelledby="abuse-h"><h2 id="abuse-h">What’s happening is not your fault, and you deserve to be safe.</h2><ul>
   <li><strong>Childhelp National Child Abuse Hotline:</strong> call <a href="tel:18004224453">(800) 422-4453</a>, or text “GO” to 800-422-4453 (counseling)</li>
   <li><strong>RAINN National Sexual Assault Hotline:</strong> call <a href="tel:18006564673">800-656-HOPE (4673)</a>, or text “HOPE” to 64673</li>
   <li><strong>National Domestic Violence Hotline:</strong> <a href="tel:18007997233">1-800-799-SAFE (7233)</a>, or text START to 88788</li>
   <li><strong>Report it:</strong> in Texas, the Texas Abuse Hotline <a href="tel:18002525400">1-800-252-5400</a> or txabusehotline.org; elsewhere, your state’s child-abuse reporting line (Childhelp lists them)</li>
   <li><strong>Call 911</strong> if you’re in immediate danger</li>
   <li>Tell a trusted adult who is not hurting you.</li></ul>
   <p class="fine">Lumi is an AI, not a person. The Walk can’t see who you are and doesn’t contact anyone. <a href="/walk/safety/">How we keep you safe →</a></p>
   ${EXIT_BTN}<button type="button" class="btn ghost js-safe">Continue</button></section>`;
}
export function quickExit() { try { sessionStorage.clear(); } catch {} location.replace(CONFIG.EXIT_URL); }
document.addEventListener('click', (e) => { if (e.target.closest('.js-exit')) quickExit(); });

// ---------- IndexedDB journal (never leaves the device) ----------
function idb() { return new Promise((res, rej) => { const r = indexedDB.open('truli_walk', 1); r.onupgradeneeded = () => { const db = r.result; db.createObjectStore('entries', { keyPath: 'id' }); db.createObjectStore('meta', { keyPath: 'key' }); db.createObjectStore('settings', { keyPath: 'key' }); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function tx(store, mode, fn) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction(store, mode); const s = t.objectStore(store); const out = fn(s); t.oncomplete = () => res(out && 'result' in out ? out.result : out); t.onerror = () => rej(t.error); }); }
export const db = {
  all: () => tx('entries', 'readonly', (s) => s.getAll()),
  put: (e) => tx('entries', 'readwrite', (s) => s.put(e)),
  del: (id) => tx('entries', 'readwrite', (s) => s.delete(id)),
  clear: async () => { for (const s of ['entries', 'meta', 'settings']) await tx(s, 'readwrite', (x) => x.clear()); },
  getMeta: async (key) => (await tx('meta', 'readonly', (s) => s.get(key))) || null,
  setMeta: (key, v) => tx('meta', 'readwrite', (s) => s.put({ key, ...v })),
  settings: async () => ({ saveTranscript: false, streak: false, exportReminders: false, ...((await tx('settings', 'readonly', (s) => s.get('settings'))) || {}) }),
  setSettings: (v) => tx('settings', 'readwrite', (s) => s.put({ ...v, key: 'settings' })),
};

// ---------- passcode lock (S3, §6.6): PBKDF2-SHA256 -> AES-GCM. Forgotten passcode => journal can only be reset. ----------
const te = new TextEncoder(), td = new TextDecoder();
const b64 = (u) => btoa(String.fromCharCode(...new Uint8Array(u))); const ub64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export async function deriveKey(pass, saltB64) { const base = await crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: ub64(saltB64), iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
export async function seal(key, obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(obj))); return { iv: b64(iv), ct: b64(ct) }; }
export async function open_(key, box) { return JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64(box.iv) }, key, ub64(box.ct)))); }
export const lock = {
  info: () => ls.get('truli_walk_lock'),
  key: null,
  async unlock(pass) { const i = this.info(); if (!i) return true; const k = await deriveKey(pass, i.salt); try { await open_(k, i.check); this.key = k; return true; } catch { return false; } },
  async enable(pass) {
    const salt = b64(crypto.getRandomValues(new Uint8Array(16))); const k = await deriveKey(pass, salt);
    const plain = await readAll(); ls.set('truli_walk_lock', { salt, check: await seal(k, { ok: 1 }) }); this.key = k;
    for (const e of plain) await writeEntry(e);
  },
  async disable() { const plain = await readAll(); ls.del('truli_walk_lock'); this.key = null; for (const e of plain) await db.put(e); },
};
export async function readAll() { const rows = await db.all(); const out = []; for (const r of rows) { if (r.enc) { if (!lock.key) throw new Error('locked'); out.push(await open_(lock.key, r.enc)); } else out.push(r); } return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export async function writeEntry(e) { if (lock.info()) { if (!lock.key) throw new Error('locked'); return db.put({ id: e.id, createdAt: e.createdAt, enc: await seal(lock.key, e) }); } return db.put(e); }
export async function sealWithPass(pass, obj) { const salt = b64(crypto.getRandomValues(new Uint8Array(16))); return { format: 'truli-walk-encrypted-v1', salt, ...(await seal(await deriveKey(pass, salt), obj)) }; }
export async function openWithPass(pass, box) { return open_(await deriveKey(pass, box.salt), box); }

// ---------- preview gate: keep /walk/ dark on the real site until launch ----------
export function gate() {
  if (previewAllowed()) return true;
  const m = document.getElementById('main');
  m.innerHTML = '<p class="eyebrow">The Walk</p><h1>Coming soon</h1><p class="lead">A quiet moment with Scripture, with Lumi lighting the path. It isn’t open yet.</p><p>For now, try <a href="/today/">today’s Spark</a> or <a href="/verses/">Bible verses by topic</a>.</p><p class="fine">In crisis? Call or text 988 · Text HOME to 741741.</p>';
  return false;
}
