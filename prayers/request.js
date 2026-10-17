import { gateOff, init, band, me, post, signinHref, localSafety, cardHTML, accountBar, shareMenu, saveToJournal, verseHTML, esc, $ } from './tools-common.js';
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’-]{0,19}$/;
let st, B, last;
await init(); st = await me(); B = st.band || band(); accountBar(st);
const gate = $('#rq-gate'), form = $('#rq-form'), out = $('#rq-out');
if (gateOff()) { gate.hidden = false; /* static coming-soon card from the build */ }
else if (band() === 'u13') { gate.hidden = false; gate.innerHTML = '<h2>This one is for older readers</h2><p>You can still pray in your own words anytime. <a href="/prayers/write/">Help me write my own prayer</a> is free and stays on your device.</p><a class="tb-cta" href="/prayers/how-to-pray/">How to pray</a>'; }
else if (!st.signedIn) { gate.hidden = false; gate.innerHTML = `<h2>Sign in to request a prayer</h2><p>It’s free with a one-time email link. No password, no ads, no trackers. Ages 16+, or 13–15 with a parent’s OK.</p><a class="tb-cta" href="${signinHref()}">Sign in free</a> <a class="pl-ghost" href="/prayers/write/">Write my own instead</a>`; }
else { form.hidden = false; if (B !== '18+') { $('#rq-adult').remove(); $('#rq-rel option[value=spouse]').remove(); } }
const sendBox = $('#rq-send'); const mode = () => form.querySelector('input[name=mode]:checked').value;
form.addEventListener('change', () => { sendBox.hidden = mode() !== 'to_send'; });
const p = new URLSearchParams(location.search); if (p.get('mode') === 'to_send') { form.querySelector('input[value=to_send]').checked = true; sendBox.hidden = false; }
$('#rq-details').addEventListener('input', (e) => { $('#rq-count').textContent = e.target.value.length; });
form.addEventListener('submit', async (e) => {
  e.preventDefault(); out.innerHTML = '';
  const name = mode() === 'to_send' ? $('#rq-name').value.trim() : '';
  if (name && !NAME_RE.test(name)) { out.innerHTML = '<p class="pl-err">Please use a first name only (letters, up to 20).</p>'; return; }
  const details = $('#rq-details').value.trim();
  const local = localSafety(details, B);                    // Layer 1 on the device: show the card right away
  if (local) { out.innerHTML = cardHTML(local, B); out.querySelector('.w-card')?.scrollIntoView({ block: 'start' }); return; }
  out.innerHTML = '<p class="fine">Lumi is writing…</p>';
  const body = { mode: mode(), need: $('#rq-need').value, details, tone: $('#rq-tone').value, length: $('#rq-length').value, faith: $('#rq-faith').value, hasName: !!name };
  if (body.mode === 'to_send') body.relationship = $('#rq-rel').value;
  const r = await post('/v1/prayers/request', body);
  if (r.card) { out.innerHTML = cardHTML(r, B); return; }
  if (r.type !== 'prayer') { out.innerHTML = `<p class="pl-err">${esc(r.ack || (r.status === 401 ? 'Please sign in again.' : 'Something went wrong. Please try again.'))}</p>`; return; }
  const fill = (s) => s.replace(/\{name\}/g, name || 'friend');
  last = { ...r, title: fill(r.title), note: fill(r.note || ''), prayer: fill(r.prayer) };
  render();
});
function shareText() { return (last.note ? last.note + '\n\n' : '') + last.prayer + '\n\n“' + last.verse.text + '” (' + last.verse.ref + ', BSB)\n\nWritten with Lumi (AI) at Truli Blessed.'; }
function render() {
  out.innerHTML = `<section class="rq-result pl-card"><p class="w-label">${last.mode === 'to_send' ? 'Ready to send' : 'Your prayer'}</p><h2>${esc(last.title)}</h2>
  ${last.note ? `<p class="rq-note">${esc(last.note)}</p>` : ''}<div class="pl-body">${last.prayer.split(/(?<=[.!?])\s+/).map((l) => `<p>${esc(l)}</p>`).join('')}</div>${verseHTML(last.verse)}
  <p class="fine">Written with Lumi, an AI guide${last.source === 'static' ? ' (a ready-made prayer this time)' : ''}. Change any words you like before you pray or send it.</p>
  <div class="pl-actions" id="rq-actions"><button type="button" class="pl-btn" data-a="copy">Copy</button><button type="button" class="pl-btn pl-btn--gold" data-a="share">${last.mode === 'to_send' ? 'Send…' : 'Share…'}</button><button type="button" class="pl-btn" id="rq-save">Save to my journal</button><button type="button" class="pl-btn" id="rq-again">Write another</button></div>
  <div id="rq-lock" hidden><label for="rq-pass">Journal passcode</label> <input id="rq-pass" type="password" inputmode="numeric"> <button type="button" class="btn-sm" id="rq-unlock">Unlock &amp; save</button></div><p class="fine" id="rq-msg" aria-live="polite"></p>
  ${last.card === 'crisis' ? cardHTML({ card: 'crisis', type: 'crisis' }, B) : ''}</section>`;
  const box = $('#rq-actions'); if (/[?&]menu=1/.test(location.search)) box.dataset.forceMenu = '1';
  shareMenu(box, shareText, last.title);
  const save = async () => { const r = await saveToJournal({ title: last.title.slice(0, 80), prayer: last.prayer, note: last.note || undefined, verseIds: [last.verse.id], source: 'prayer-request' }, $('#rq-pass'));
    if (r.ok) $('#rq-msg').innerHTML = 'Saved to your journal on this device. <a href="/walk/journal/">Open journal →</a>'; else if (r.why === 'locked' || r.why === 'badpass') { $('#rq-lock').hidden = false; $('#rq-msg').textContent = r.why === 'badpass' ? 'That passcode didn’t work.' : 'Your journal is locked. Enter your passcode.'; } else $('#rq-msg').textContent = 'The journal is for ages 16+ (or 13–15 with a parent’s OK). You can copy the prayer instead.'; };
  $('#rq-save').addEventListener('click', save); $('#rq-unlock').addEventListener('click', save);
  $('#rq-again').addEventListener('click', () => { out.innerHTML = ''; form.scrollIntoView(); });
  out.scrollIntoView({ block: 'start' });
}
