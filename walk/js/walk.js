// /walk/: age gate -> acknowledgement -> session (<=4 turns) -> recap -> save to on-device journal.
import { CONFIG, $, $$, esc, ls, ss, data, verseHTML, ageState, setBlock, setBand, isMinor, crisisCount, crisisBump, crisisCard, safetyCard, db, writeEntry, lock, localDate, gate } from './common.js';
import { compileLexicon, classify } from './safety-core.js';

if (gate()) init();

const MOODS = ['anxious', 'sad', 'lonely', 'grateful', 'angry', 'confused', 'hopeful', 'tired', 'big decision'];
const TOPICS = ['anxiety', 'courage', 'fear', 'friendship', 'gratitude', 'grief', 'hope', 'identity', 'school', 'sleep'];
const FROM_TODAY = { anxious: ['anxious', 'anxious'], thankful: ['grateful', 'thankful'], tired: ['tired', 'tired'], brave: ['hopeful', 'brave'] }; // §2.1 whitelist
const THEMES = ["peace/anxiety","fear/courage","grief/loss","loneliness/friendship","identity/worth","forgiveness","anger","family","school/work","purpose/decisions","gratitude","hope","doubt/faith","temptation","rest/sleep","healing","patience/waiting","love","guilt/shame","joy","trust","strength","change","serving others"];
const HARD_THEMES = new Set(['grief/loss', 'loneliness/friendship', 'fear/courage']);
let K, IDX, LEX, band, S; // S = session state (memory + sessionStorage; never past sessions, M8)

function show(id) { $$('.w-screen').forEach((el) => (el.hidden = el.id !== id)); const h = $('#' + id + ' h1, #' + id + ' h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } window.scrollTo(0, 0); }

async function init() {
  ({ bsb: K, index: IDX, lexicon: LEX } = await data()); LEX = compileLexicon(LEX);
  // carry ?mood= from /today/ (URL only; held in sessionStorage for the age-gate hop; never sent as a URL value)
  const q = new URLSearchParams(location.search); const m = q.get('mood');
  if (m && FROM_TODAY[m]) ss.set('truli_walk_mood', FROM_TODAY[m]);
  const start = q.get('start'); if (start && TOPICS.includes(start)) ss.set('truli_walk_topic', start);
  if (q.has('mood') || q.has('start') || q.has('from')) history.replaceState(null, '', location.pathname + (q.get('beta') ? '?beta=1' : '')); // strip mood from the address bar
  buildChips(); wire();
  route();
}

function route() {
  const a = ageState(); band = a.band;
  if (band === 'u13') return show('w-blocked');
  if (band === '13-15') return teenScreen();
  if (band === '13-15c' && !(CONFIG.CONSENT_TIER_13_15 && a.token)) { setBand('13-15'); return teenScreen(); }
  if (!band) return show('w-gate');
  if (!ls.get('truli_walk_ack')) return show('w-ack');
  startSession();
}

function teenScreen() { $('#w-consent').hidden = !CONFIG.CONSENT_TIER_13_15; show('w-teen'); }

// ---------- age screen: neutral, no default, no cutoff hint (FTC COPPA FAQ H.3) ----------
function onAge(e) {
  e.preventDefault();
  const mo = +$('#age-m').value, yr = +$('#age-y').value; if (!mo || !yr) { $('#age-err').hidden = false; return; }
  const now = new Date(); let age = now.getFullYear() - yr - (now.getMonth() + 1 < mo ? 1 : 0); // month precision; birthdate discarded right here
  $('#age-m').value = ''; $('#age-y').value = '';
  if (age < 13) { setBlock(); return show('w-blocked'); }
  if (age <= 15) { setBand('13-15'); return teenScreen(); }
  setBand(age <= 17 ? '16-17' : '18+'); band = age <= 17 ? '16-17' : '18+';
  show('w-ack');
}

// ---------- session ----------
function startSession() {
  S = ss.get('truli_walk_session') || { turns: [], moodChip: null, topicChip: null, resources: false, startedAt: Date.now() };
  const fromToday = ss.get('truli_walk_mood'); const topic = ss.get('truli_walk_topic');
  if (fromToday && !S.turns.length) { S.moodChip = fromToday[0]; $('#w-opening').textContent = `You said you’re feeling ${fromToday[1]} today. Want to tell Lumi a little more?`; }
  if (topic && !S.turns.length) S.topicChip = topic;
  ss.del('truli_walk_mood'); ss.del('truli_walk_topic');
  $('#w-teen-note').hidden = !isMinor(band);
  db.settings().then((st) => { S.saveT = band === '18+' && st.saveTranscript; });
  syncChips(); renderTurns(); show('w-session'); startReminder();
  if (crisisCount() >= 2 || (band === '13-15c' && crisisCount() >= 1)) endForToday();
  if (band === '13-15c') usageGuard();
}
function save() { ss.set('truli_walk_session', { ...S, turns: S.turns.filter((t) => t.kind !== 'user') }); } // raw text stays in memory only
function maxTurns() { return band === '13-15c' ? 3 : 4; }
function replies() { return S.turns.filter((t) => t.kind === 'reply'); }

function buildChips() {
  $('#chips-mood').innerHTML = MOODS.map((m) => `<button type="button" class="chip" data-mood="${m}" aria-pressed="false">${m === 'hopeful' ? 'hopeful' : m}</button>`).join('');
  $('#chips-topic').innerHTML = TOPICS.map((t) => `<button type="button" class="chip" data-topic="${t}" aria-pressed="false">${t}</button>`).join('');
}
function syncChips() {
  $$('[data-mood]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mood === S.moodChip));
  $$('[data-topic]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.topic === S.topicChip));
}

function wire() {
  $('#age-form').addEventListener('submit', onAge);
  $('#gate-go').addEventListener('click', () => { show('w-age'); });
  $('#ack-form').addEventListener('submit', (e) => { e.preventDefault(); if (!$('#ack-box').checked) return; ls.set('truli_walk_ack', { at: localDate() }); startSession(); });
  $('#chips-mood').addEventListener('click', (e) => { const b = e.target.closest('[data-mood]'); if (!b) return; S.moodChip = S.moodChip === b.dataset.mood ? null : b.dataset.mood; syncChips(); save(); });
  $('#chips-topic').addEventListener('click', (e) => { const b = e.target.closest('[data-topic]'); if (!b) return; S.topicChip = S.topicChip === b.dataset.topic ? null : b.dataset.topic; syncChips(); save(); });
  const ta = $('#w-msg'); ta.addEventListener('input', () => { $('#w-count').textContent = `${ta.value.length}/600`; });
  $('#w-form').addEventListener('submit', onSend);
  $('#w-turns').addEventListener('click', onTurnClick);
  $('#w-end').addEventListener('click', toRecap);
  $('#prayer-close').addEventListener('click', () => { $('#prayer-view').hidden = true; });
  $('#recap-form').addEventListener('submit', onSaveRecap);
  $('#recap-discard').addEventListener('click', () => { if (confirm('Discard this walk? Nothing will be saved.')) { ss.del('truli_walk_session'); S = null; location.href = '/walk/'; } });
  $('#w-new').addEventListener('click', () => { ss.del('truli_walk_session'); location.reload(); });
  $('#consent-form')?.addEventListener('submit', onRedeem);
}

function addTurn(t) { S.turns.push(t); save(); renderTurns(); }
function lumiHTML(t) {
  if (t.kind === 'user') return `<div class="w-you"><p class="w-who">You</p><p>${esc(t.text)}</p></div>`;
  if (t.kind === 'card') return t.card === 'crisis' ? crisisCard({ young: band === '13-15c', ended: !!t.ended }) : safetyCard(t.card);
  const v = (t.verse_ids || []).map((id) => verseHTML(K, id)).join('');
  const story = t.story ? (() => { const st = IDX.stories.find((x) => x.id === t.story.id); return st ? `<div class="w-story"><p class="w-label">A retelling · ${esc(st.ref)}</p><p>${esc(t.story.summary)}</p></div>` : ''; })() : '';
  const q = t.questions ? `<div class="w-reflect"><p class="w-label">Reflect</p><ol>${t.questions.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>` : '';
  const pr = t.prayer ? `<div class="w-prayer"><p class="w-label">A prayer you can pray</p><p>${esc(t.prayer)}</p></div>` : '';
  const btns = t.kind === 'reply' && t.prayer ? `<div class="w-actions"><button type="button" class="btn-sm js-more">Tell Lumi more</button><button type="button" class="btn-sm js-pray" data-i="${S.turns.indexOf(t)}">Pray this with me</button><button type="button" class="btn-sm js-end">End &amp; save</button></div>` : '';
  return `<article class="w-lumi${t.kind === 'note' ? ' w-note' : ''}"><p class="w-who"><img src="/assets/lumi_the_firefly.webp" alt="" width="28" height="28"> Lumi</p><p>${esc(t.ack)}</p>${v}${story}${q}${pr}${btns}<p class="w-foot">Lumi is an AI guide, not a pastor or professional. In crisis: call/text 988 · text HOME to 741741.</p></article>`;
}
function renderTurns() {
  $('#w-turns').innerHTML = S.turns.map(lumiHTML).join('');
  const n = replies().length, done = n >= maxTurns();
  $('#w-form').hidden = done || S.ended; $('#w-closing').hidden = !done || S.ended;
  $('#w-end').hidden = !n || S.ended; $('#w-resources').classList.toggle('w-pinned', !!S.resources);
  const last = $('#w-turns').lastElementChild; if (last && last.classList.contains('w-card')) last.scrollIntoView({ block: 'start' });
  $('#w-turnnote').textContent = done ? '' : n ? `Turn ${n + 1} of ${maxTurns()}` : '';
}
function onTurnClick(e) {
  if (e.target.closest('.js-more')) { $('#w-msg').focus(); }
  if (e.target.closest('.js-end')) toRecap();
  const p = e.target.closest('.js-pray'); if (p) { const t = S.turns[+p.dataset.i]; $('#prayer-text').textContent = t.prayer; $('#prayer-view').hidden = false; $('#prayer-close').focus(); }
  if (e.target.closest('.js-safe')) { const c = e.target.closest('.w-card'); c.querySelector('.js-safe')?.remove(); $('#w-msg').focus(); }
}

function endForToday() { S.ended = true; S.resources = true; if (!S.turns.some((t) => t.ended)) S.turns.push({ kind: 'card', card: 'crisis', ended: true }); save(); renderTurns(); }

async function onSend(e) {
  e.preventDefault();
  const ta = $('#w-msg'); const text = ta.value.trim(); if (!text || text.length > 600) return;
  // ---- Layer 1: instant, offline, before any network call ----
  const c = classify(LEX, text);
  if (c.age && c.age.band === 'u13') { setBlock(); S = null; ss.del('truli_walk_session'); if (c.crisis) $('#w-blocked-crisis').innerHTML = crisisCard({}); return show('w-blocked'); } // M2: nothing saved, nothing sent
  if (c.age && c.age.band === '13-15' && band !== '13-15c') { setBand('13-15'); S = null; ss.del('truli_walk_session'); return teenScreen(); }
  ta.value = ''; $('#w-count').textContent = '0/600';
  if (c.crisis) { // crisis turns are never kept as text (S4)
    S.resources = true; const n = crisisBump();
    if (n >= 2 || band === '13-15c') return endForToday();
    return addTurn({ kind: 'card', card: 'crisis' });
  }
  if (c.abuse) { S.resources = true; return addTurn({ kind: 'card', card: 'abuse' }); }
  addTurn({ kind: 'user', text, transient: true });
  $('#w-loading').hidden = false; $('#w-send').disabled = true;
  let r;
  try {
    const res = await fetch(CONFIG.API_BASE + '/v1/turn', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      turnstile: window.__turnstileToken || 'dev', ageBand: band, consentToken: band === '13-15c' ? ls.get('truli_walk_consent') : undefined,
      sessionTurn: replies().length + 1, message: text, chips: { mood: S.moodChip, topic: S.topicChip },
      history: replies().slice(-3).map((t) => ({ ack: t.ack, verse_ids: t.verse_ids, themes: t.themes })), // THIS session only (M8)
      crisisCountToday: crisisCount(), localHour: new Date().getHours() }) });
    r = await res.json();
  } catch { r = localFallback(); }
  $('#w-loading').hidden = true; $('#w-send').disabled = false;
  handle(r, text);
}

function localFallback() { // LLM/Worker unreachable: static curated response from the on-page dataset (§2.6)
  const th = (S.topicChip && IDX.chipThemes[S.topicChip]?.[0]) || (S.moodChip && IDX.chipThemes[S.moodChip]?.[0]) || 'hope';
  return { type: 'fallback', ack: 'Lumi couldn’t connect just now, so here are a few verses to sit with.', verse_ids: IDX.themes[th].slice(0, 2), questions: ['Which words stand out to you right now?', 'Who is one trusted person you could talk to?'], prayer: 'Lord, You know what’s on my heart. Help me trust You with it today. Amen.', themes: [th] };
}

function handle(r, text) {
  switch (r.type) {
    case 'age_block': setBlock(); S = null; ss.del('truli_walk_session'); if (r.card === 'crisis') $('#w-blocked-crisis').innerHTML = crisisCard({}); return show('w-blocked');
    case 'teen_static': setBand('13-15'); S = null; ss.del('truli_walk_session'); return teenScreen();
    case 'crisis': S.resources = true; crisisBump(); return addTurn({ kind: 'card', card: 'crisis' });
    case 'crisis_end': crisisBump(); return endForToday();
    case 'safety': S.resources = true; addTurn({ kind: 'card', card: r.card }); return addTurn({ kind: 'note', ack: r.ack, verse_ids: r.verse_ids });
    case 'reply': case 'fallback':
      addTurn({ kind: 'reply', ack: r.ack, verse_ids: r.verse_ids, story: r.story, questions: r.questions, prayer: r.prayer, themes: r.themes, userText: S.saveT ? text : undefined });
      if (r.card === 'crisis') { S.resources = true; const n = crisisBump(); if (n >= 2 || band === '13-15c') return endForToday(); addTurn({ kind: 'card', card: 'crisis' }); }
      if (replies().length >= maxTurns()) $('#w-closing').hidden = false;
      return;
    case 'limit': return addTurn({ kind: 'note', ack: r.ack || 'Lumi needs a little rest. Try again in a few minutes. Here’s a verse for now.', verse_ids: r.verse_ids || [] });
    default: return addTurn({ kind: 'note', ack: r.ack || 'Let’s try that a different way. What’s on your heart today?', verse_ids: r.verse_ids || [] }); // identity, poem, redirect, restricted
  }
}

// ---------- recap ----------
async function toRecap() {
  const rs = replies(); if (!rs.length) return;
  let rec;
  try {
    const res = await fetch(CONFIG.API_BASE + '/v1/recap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ageBand: band, consentToken: band === '13-15c' ? ls.get('truli_walk_consent') : undefined, turns: rs.map((t) => ({ ack: t.ack, verse_ids: t.verse_ids, themes: t.themes, prayer: t.prayer })) }) });
    rec = await res.json(); if (!rec.title) throw 0;
  } catch { rec = { title: 'A quiet moment with Scripture', takeaway: '', themes: [...new Set(rs.flatMap((t) => t.themes || []))].slice(0, 3), verse_ids: [...new Set(rs.flatMap((t) => t.verse_ids || []))].slice(0, 3), prayer: rs.at(-1).prayer }; }
  S.recap = rec; save();
  $('#r-title').value = rec.title; $('#r-takeaway').value = rec.takeaway || ''; $('#r-prayer').value = rec.prayer || '';
  $('#r-themes').innerHTML = THEMES.map((t) => `<label class="chip"><input type="checkbox" value="${t}" ${rec.themes.includes(t) ? 'checked' : ''}> ${t}</label>`).join('');
  $('#r-verses').innerHTML = rec.verse_ids.map((id) => verseHTML(K, id, { copy: false })).join('');
  $('#r-moodbefore').textContent = S.moodChip ? `Mood before: ${S.moodChip}` : '';
  $('#r-resources').hidden = !S.resources;
  const st = await db.settings(); $('#r-transcript').hidden = !(band === '18+' && st.saveTranscript);
  $('#r-lock').hidden = !lock.info() || !!lock.key;
  show('w-recap');
}
async function onSaveRecap(e) {
  e.preventDefault(); if (!S || !S.recap) return;
  if (lock.info() && !lock.key) { const ok = await lock.unlock($('#r-pass').value); if (!ok) { $('#r-passerr').hidden = false; return; } }
  const themes = $$('#r-themes input:checked').map((i) => i.value);
  const mAfter = $('#r-after-on').checked ? +$('#r-after').value : undefined;
  const hard = $('#r-hard').checked || !!S.resources || ['sad', 'lonely'].includes(S.moodChip) || themes.some((t) => HARD_THEMES.has(t)) || (mAfter && mAfter <= 2);
  const st = await db.settings();
  const entry = { id: crypto.randomUUID(), v: 1, createdAt: new Date().toISOString(), localDate: localDate(), title: $('#r-title').value.trim().slice(0, 80) || 'My walk', takeaway: $('#r-takeaway').value.trim().slice(0, 200),
    themes, moodBefore: S.moodChip || undefined, moodAfter: mAfter, verseIds: S.recap.verse_ids, storyId: replies().find((t) => t.story)?.story.id, prayer: $('#r-prayer').value.trim().slice(0, 600),
    note: $('#r-note').value.trim().slice(0, 2000) || undefined, hardDay: hard, safetyFlag: S.resources ? 'resources_shown' : 'none',
    // full transcript: adults only, opt-in, default off, never crisis/abuse turns (S4)
    transcript: band === '18+' && st.saveTranscript ? replies().map((t) => ({ you: t.userText, lumi: t.ack, verse_ids: t.verse_ids })) : undefined };
  await writeEntry(entry);
  let line = '';
  if (band === '18+' && st.streak) line = await bumpStreak(); // adults only, opt-in (M6)
  const n = (await db.all()).length;
  $('#saved-count').textContent = `${n} walk${n === 1 ? '' : 's'} on your trail.` + (line ? ' ' + line : '');
  ss.del('truli_walk_session'); S = null; show('w-saved');
}
async function bumpStreak() { // one grace day per week; a missed day shows nothing special
  const m = (await db.getMeta('streak')) || { current: 0, longest: 0, lastDate: null, graceWeek: null };
  const today = localDate(); if (m.lastDate === today) return `Glow: ${m.current} day${m.current === 1 ? '' : 's'}.`;
  const d = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5); const wk = today.slice(0, 4) + '-' + Math.floor(new Date(today).getDate() / 7);
  if (m.lastDate && d(m.lastDate, today) === 1) m.current++;
  else if (m.lastDate && d(m.lastDate, today) === 2 && m.graceWeek !== wk) { m.current++; m.graceWeek = wk; }
  else m.current = 1;
  m.longest = Math.max(m.longest, m.current); m.lastDate = today; await db.setMeta('streak', m);
  return `Glow: ${m.current} day${m.current === 1 ? '' : 's'}.`;
}

// ---------- AI + break reminder every 3 hours of continuous use (M5), all ages ----------
function startReminder() {
  const q = new URLSearchParams(location.search); const ms = CONFIG.local && q.get('remindMs') ? +q.get('remindMs') : CONFIG.REMINDER_MS;
  let since = Date.now();
  document.addEventListener('visibilitychange', () => { if (document.hidden) since = null; else since = Date.now(); });
  setInterval(() => { if (since && Date.now() - since >= ms) { $('#w-reminder').hidden = false; since = Date.now(); } }, Math.min(ms / 2, 30000));
  $('#w-reminder-ok').addEventListener('click', () => { $('#w-reminder').hidden = true; });
}
// ---------- 13-15c limits (phase 1.5): 15-min nudge, 30-min daily lock ----------
function usageGuard() {
  setInterval(() => { const u = ls.get('truli_walk_usage'); const cur = u && u.d === localDate() ? u.ms : 0; const ms = cur + 60000; ls.set('truli_walk_usage', { d: localDate(), ms });
    if (ms >= 30 * 60000) { S.ended = true; save(); renderTurns(); addTurn({ kind: 'note', ack: 'That’s enough for today. Time for a break.', verse_ids: [] }); }
    else if (ms >= 15 * 60000) $('#w-reminder').hidden = false; }, 60000);
}
// ---------- consent tier (behind CONFIG.CONSENT_TIER_13_15) ----------
async function onRedeem(e) {
  e.preventDefault();
  try { const r = await fetch(CONFIG.API_BASE + '/v1/consent/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: $('#consent-code').value, turnstile: window.__turnstileToken || 'dev' }) }); const j = await r.json();
    if (!j.consentToken) throw 0; ls.set('truli_walk_consent', j.consentToken); setBand('13-15c'); ls.del('walk_age_band'); ls.set('walk_age_band', { v: '13-15c' }); document.cookie = 'walk_age_band=; Max-Age=0; Path=/walk/'; band = '13-15c'; show('w-ack');
  } catch { $('#consent-err').hidden = false; }
}
