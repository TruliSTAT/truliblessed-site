import { gateOff, init, band, me, post, signinHref, localSafety, cardHTML, accountBar, shareMenu, saveToJournal, verseHTML, esc, $, ls } from './tools-common.js';
const STEPS = ['thanks', 'heart', 'others', 'self', 'closing'];
const KEY = 'truli_prayer_draft'; // device only (sessionStorage), cleared on "Start over"
let st, verse = null, warned = false;
await init(); st = await me(); accountBar(st);
const draft = (() => { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch { return {}; } })();
STEPS.forEach((k) => { const t = $('#wr-t-' + k); t.value = draft[k] || ''; t.addEventListener('input', update); t.addEventListener('blur', () => check(t.value)); });
function text() { return STEPS.map((k) => $('#wr-t-' + k).value.trim()).filter(Boolean); }
function update() {
  const d = {}; STEPS.forEach((k) => (d[k] = $('#wr-t-' + k).value)); try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch {}
  const parts = text(); $('#wr-preview').innerHTML = parts.length ? parts.map((p) => `<p>${esc(p)}</p>`).join('') : '<p class="fine">Start writing above and your prayer appears here.</p>';
  $('#wr-verse').innerHTML = verse ? verseHTML(verse) + '<button type="button" class="btn-sm" id="wr-noverse">Remove verse</button>' : '';
}
function check(t) { if (warned) return; const d = localSafety(t, st.band || band()); if (d) { warned = true; $('#wr-safety').innerHTML = cardHTML(d, st.band || band()); $('#wr-safety').scrollIntoView({ block: 'start' }); } }
update();
document.addEventListener('click', async (e) => {
  if (e.target.id === 'wr-noverse') { verse = null; update(); }
  const b = e.target.closest('.wr-suggest'); if (!b) return;
  const k = b.dataset.step, box = document.querySelector(`.wr-sugg[data-for="${k}"]`);
  if (band() === 'u13') { box.innerHTML = '<p class="fine">Lumi’s suggestions are for older readers. The examples above are yours to use anytime.</p>'; return; }
  if (gateOff()) { box.innerHTML = ''; return; }
  if (!st.signedIn) { box.innerHTML = `<p class="fine">Lumi’s suggestions need a free sign-in. <a href="${signinHref()}">Sign in</a>, or use the examples above.</p>`; return; }
  const t = $('#wr-t-' + k).value.trim(); const local = localSafety(t, st.band); if (local) { box.innerHTML = cardHTML(local, st.band); return; }
  box.innerHTML = '<p class="fine">Lumi is thinking…</p>';
  const r = await post('/v1/prayers/suggest-line', { step: k, text: t });
  if (r.card) { box.innerHTML = cardHTML(r, st.band); return; }
  if (r.type !== 'suggestion') { box.innerHTML = `<p class="fine">${esc(r.ack || 'No suggestion right now. Your own words are enough.')}</p>`; return; }
  box.innerHTML = `<div class="wr-sug"><p class="w-label">Lumi suggests (AI, optional)</p><p class="pl-teaser">“${esc(r.line)}”</p>${r.verse ? verseHTML(r.verse) : ''}<div class="w-actions"><button type="button" class="btn-sm" data-add>Add this line</button>${r.verse ? '<button type="button" class="btn-sm" data-verse>Add verse</button>' : ''}<button type="button" class="btn-sm" data-dismiss>No thanks</button></div></div>`;
  box.querySelector('[data-add]').onclick = () => { const ta = $('#wr-t-' + k); ta.value = (ta.value.trim() ? ta.value.trim() + ' ' : '') + r.line; update(); box.innerHTML = ''; };
  box.querySelector('[data-dismiss]').onclick = () => { box.innerHTML = ''; };
  const vb = box.querySelector('[data-verse]'); if (vb) vb.onclick = () => { verse = r.verse; update(); vb.remove(); };
});
const full = () => text().join('\n') + (verse ? `\n\n“${verse.text}” (${verse.ref}, BSB)` : '');
const box = document.querySelector('.wr-final .w-actions'); box.querySelectorAll('#wr-copy,#wr-share').forEach((b) => (b.dataset.a = b.id === 'wr-copy' ? 'copy' : 'share'));
shareMenu(box, full, 'My prayer');
const save = async () => {
  if (!text().length) { $('#wr-msg').textContent = 'Write a few words first.'; return; }
  const r = await saveToJournal({ title: 'My prayer', prayer: text().join('\n').slice(0, 2000), verseIds: verse ? [verse.id] : [], source: 'prayer-builder' }, $('#wr-pass'));
  if (r.ok) $('#wr-msg').innerHTML = 'Saved to your journal on this device. <a href="/walk/journal/">Open journal →</a>';
  else if (r.why === 'locked' || r.why === 'badpass') { $('#wr-lock').hidden = false; $('#wr-msg').textContent = r.why === 'badpass' ? 'That passcode didn’t work.' : 'Your journal is locked. Enter your passcode.'; }
  else $('#wr-msg').textContent = 'The journal is for ages 16+ (or 13–15 with a parent’s OK). You can copy your prayer or print it instead.';
};
$('#wr-save').addEventListener('click', save); $('#wr-unlock').addEventListener('click', save);
$('#wr-clear').addEventListener('click', () => { if (!confirm('Clear your prayer and start over?')) return; STEPS.forEach((k) => ($('#wr-t-' + k).value = '')); verse = null; try { sessionStorage.removeItem(KEY); } catch {} update(); });
