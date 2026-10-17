// /walk/journal/: the trail. Everything here stays on this device (IndexedDB). No network calls.
import { $, $$, esc, ls, data, verseHTML, ageState, isMinor, db, readAll, writeEntry, lock, sealWithPass, openWithPass, localDate, gate } from './common.js';
let K, IDX, band, entries = [];
if (gate()) init();

async function init() {
  ({ bsb: K, index: IDX } = await data()); band = ageState().band || '18+';
  if (band === 'u13' || band === '13-15') { $('#j-main').innerHTML = '<p>The journal is part of The Walk, which is for older visitors. <a href="/today/">Here’s today’s Spark →</a></p>'; return; }
  wire();
  if (lock.info() && !lock.key) { $('#j-locked').hidden = false; $('#j-content').hidden = true; return; }
  await render();
}
function wire() {
  $('#j-locked').addEventListener('submit', async (e) => { e.preventDefault(); if (await lock.unlock($('#j-pass').value)) { $('#j-locked').hidden = true; $('#j-content').hidden = false; render(); } else $('#j-passerr').hidden = false; });
  $('#j-reset').addEventListener('click', async () => { if (confirm('Forgot your passcode? The only option is to erase this journal. Erase everything?')) { await wipe(); location.reload(); } });
  $('#j-export').addEventListener('click', exportJSON);
  $('#j-export-enc').addEventListener('click', exportEncrypted);
  $('#j-print').addEventListener('click', () => window.print());
  $('#j-import').addEventListener('change', importFile);
  $('#j-delall').addEventListener('click', async () => { if (confirm('Delete everything? This erases your whole journal and Walk settings from this browser. It can’t be undone.')) { await wipe(); location.href = '/walk/journal/'; } });
  $('#j-list').addEventListener('click', async (e) => { const b = e.target.closest('.js-del'); if (b && confirm('Delete this entry?')) { await db.del(b.dataset.id); render(); } });
  $('#j-trail').addEventListener('click', (e) => { const p = e.target.closest('[data-entry]'); if (p) openEntry(p.dataset.entry); });
  $('#j-trail').addEventListener('keydown', (e) => { const p = e.target.closest('[data-entry]'); if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openEntry(p.dataset.entry); } });
  $('#j-lockform').addEventListener('submit', async (e) => { e.preventDefault(); const p = $('#j-newpass').value; if (!/^\d{6,}$/.test(p)) { $('#j-lockerr').hidden = false; return; } if (p !== $('#j-newpass2').value) { $('#j-lockerr').textContent = 'Those don’t match.'; $('#j-lockerr').hidden = false; return; } await lock.enable(p); render(); });
  $('#j-unlockoff').addEventListener('click', async () => { if (confirm('Remove the passcode? Entries will be stored unlocked on this device.')) { await lock.disable(); render(); } });
  $('#j-settings').addEventListener('change', async (e) => { const st = await db.settings(); const i = e.target; if (!i.name) return; st[i.name] = i.checked; if (i.name === 'streak' && !i.checked) await db.setMeta('streak', { current: 0, longest: 0, lastDate: null }); await db.setSettings(st); render(); });
  $('#j-remind-btn').addEventListener('click', exportJSON);
  window.addEventListener('beforeprint', () => $$('.w-entry').forEach((d) => (d.open = true)));
  $('#j-caption-x')?.addEventListener('click', () => { $('#j-caption').hidden = true; });
}
async function wipe() { // "Delete everything": IndexedDB + truli_walk* keys (local + session). The age speed-bump flags are kept on purpose.
  await db.clear(); lock.key = null;
  for (const st of [localStorage, sessionStorage]) for (const k of Object.keys(st)) if (k.startsWith('truli_walk')) st.removeItem(k);
}
function hard(e) { return e.hardDay || e.safetyFlag === 'resources_shown'; }
function openEntry(id) { const el = document.getElementById('e-' + id); if (el) { el.open = true; el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); el.querySelector('summary').focus(); } }

async function render() {
  entries = await readAll(); const st = await db.settings(); const minor = isMinor(band);
  const n = entries.length, h = entries.filter(hard).length;
  $('#j-summary').textContent = n ? `${n} walk${n === 1 ? '' : 's'}, ${h} of them on hard days.` : 'Your trail starts with your first walk.';
  $('#j-trail').innerHTML = trailSVG([...entries].reverse());
  // single-trail caption: once, original words (spec §2.7; never the poem)
  if (h && !ls.get('truli_walk_caption_seen')) { $('#j-caption').hidden = false; $('#j-caption-verse').innerHTML = verseHTML(K, IDX.hardDay[0], { copy: false }); ls.set('truli_walk_caption_seen', 1); }
  // list (accessible equivalent of the trail)
  $('#j-list').innerHTML = entries.map((e) => `<details class="w-entry${hard(e) ? ' hard' : ''}" id="e-${e.id}"><summary><span class="d">${new Date(e.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span> ${esc(e.title)}${hard(e) ? ' <span class="tag">hard day</span>' : ''}</summary>
   ${e.safetyFlag === 'resources_shown' ? '<p class="fine">Resources are always here: call or text 988 · text HOME to 741741 · <a href="/walk/safety/">How we keep you safe</a></p>' : ''}
   ${e.takeaway ? `<p><strong>${esc(e.takeaway)}</strong></p>` : ''}${(e.verseIds || []).map((id) => verseHTML(K, id, { copy: false })).join('')}
   ${e.prayer ? `<p class="w-label">Prayer</p><p class="prayer">${esc(e.prayer)}</p>` : ''}${e.note ? `<p class="w-label">My note</p><p>${esc(e.note)}</p>` : ''}
   <p class="fine">${e.themes.map(esc).join(' · ')}${e.moodBefore ? ` · mood before: ${esc(e.moodBefore)}` : ''}${e.moodAfter ? ` · after: ${e.moodAfter}/5` : ''}</p>
   <button type="button" class="btn-sm js-del" data-id="${e.id}">Delete this entry</button></details>`).join('') || '<p>No walks saved yet. <a href="/walk/">Start a walk →</a></p>';
  // themes (30 days + all time)
  const since = Date.now() - 30 * 864e5; const tally = (list) => { const t = {}; for (const e of list) for (const x of e.themes) t[x] = (t[x] || 0) + 1; return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 5); };
  const bars = (rows) => rows.length ? rows.map(([k, v]) => `<li><span>${esc(k)}</span><span class="bar" style="--w:${Math.round((v * 100) / rows[0][1])}%"></span><span>${v}</span></li>`).join('') : '<li class="fine">Nothing yet</li>';
  $('#j-themes30').innerHTML = bars(tally(entries.filter((e) => new Date(e.createdAt) > since))); $('#j-themesall').innerHTML = bars(tally(entries));
  // how far you've come
  const kept = {}; for (const e of entries) for (const id of e.verseIds || []) kept[id] = (kept[id] || 0) + 1;
  const keptTop = Object.entries(kept).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const moods = entries.filter((e) => e.moodAfter).reverse();
  $('#j-far').innerHTML = n ? `<p>First walk: <strong>${esc(entries.at(-1).title)}</strong> (${new Date(entries.at(-1).createdAt).toLocaleDateString()}). Most recent: <strong>${esc(entries[0].title)}</strong>.</p>
    ${moods.length >= 2 ? `<p>How you felt after: ${moods.map((e) => e.moodAfter).join(' → ')} (out of 5)</p>` : ''}
    <p class="w-label">Verses you’ve kept</p>${keptTop.map(([id]) => verseHTML(K, id, { copy: false })).join('')}` : '';
  // streak: adults only, opt-in, shown here as secondary (M6). Never rendered for under-18 bands.
  $('#j-streakrow').hidden = minor; $('#j-transcriptrow').hidden = minor;
  if (!minor && st.streak) { const m = (await db.getMeta('streak')) || { current: 0, longest: 0 }; $('#j-streak').hidden = false; $('#j-streak').textContent = `Lumi’s Glow: ${m.current} day${m.current === 1 ? '' : 's'} · longest ${m.longest}`; } else $('#j-streak').hidden = true;
  $$('#j-settings input').forEach((i) => (i.checked = !!st[i.name]));
  $('#j-locked-on').hidden = !lock.info(); $('#j-lockform').hidden = !!lock.info(); $('#j-lockoffer').classList.toggle('w-emph', minor);
  // gentle in-app export reminder (opt-in)
  const last = ls.get('truli_walk_lastexport'); $('#j-remind').hidden = !(st.exportReminders && n && (!last || Date.now() - last > 14 * 864e5));
}

function trailSVG(list) { // shoreline + prints; hard stretches drawn as a single, deeper set
  const SP = Math.max(70, Math.floor(560 / Math.max(list.length, 1))), W = Math.max(680, 120 + list.length * SP), H = 200;
  const y = (i) => 100 + Math.sin(i * 0.9) * 22;
  const print = (x, yy, rot, deep) => `<g transform="translate(${x} ${yy}) rotate(${rot}) scale(1.5)"><ellipse rx="${deep ? 7 : 5.5}" ry="${deep ? 12 : 10}" class="${deep ? 'pd' : 'pl'}"/><circle cx="0" cy="${deep ? -16 : -14}" r="${deep ? 3.4 : 2.6}" class="${deep ? 'pd' : 'pl'}"/></g>`;
  let g = '';
  list.forEach((e, i) => {
    const x = 60 + i * SP, yy = y(i), deep = hard(e), rot = 80;
    const steps = deep ? print(x, yy, rot, true) + print(x + 36, yy + 2, rot, true) : print(x, yy - 12, rot, false) + print(x + 30, yy + 12, rot, false);
    const label = `${new Date(e.createdAt).toLocaleDateString()}: ${e.title}${deep ? ' (hard day)' : ''}`;
    const marker = (i + 1 === 1 || (i + 1) % 7 === 0) ? `<g class="shell" transform="translate(${x + 12} ${yy + 44})"><path d="M0 0c-6-8 6-14 9-6 3-8 15-2 9 6z"/><text y="16" x="9" text-anchor="middle">${i + 1} walk${i ? 's' : ''}</text></g>` : '';
    g += `<g data-entry="${e.id}" role="button" tabindex="0" aria-label="${esc(label)}" class="step${deep ? ' deep' : ''}"><title>${esc(label)}</title><rect x="${x - 20}" y="${yy - 36}" width="76" height="72" fill="transparent"/>${steps}</g>${marker}`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-label="Your trail along the shoreline"><defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F5F6B"/><stop offset="1" stop-color="#16445a"/></linearGradient></defs>
   <path d="M0 0H${W}V34C${W * 0.75} 50 ${W * 0.5} 22 ${W * 0.25} 40S0 30 0 30Z" fill="url(#sea)" opacity=".85"/><path d="M0 34C${W * 0.25} 46 ${W * 0.5} 26 ${W * 0.75} 46S${W} 36 ${W} 36" stroke="#F4E9D3" stroke-opacity=".35" fill="none"/>${g}
   ${list.length ? `<circle class="lumi" cx="${Math.min(W - 20, 60 + list.length * SP)}" cy="${y(list.length) - 20}" r="6"/>` : ''}</svg>`;
}

function download(name, text, type = 'application/json') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); ls.set('truli_walk_lastexport', Date.now()); }
function bundle() { return { format: 'truli-walk-journal', v: 1, exportedAt: new Date().toISOString(), entries: entries.map((e) => ({ ...e, verseText: Object.fromEntries((e.verseIds || []).map((id) => [id, K[id] ? `${K[id].ref} BSB: ${K[id].text}` : ''])) })) }; }
function exportJSON() { if (!confirm('This file isn’t locked. Anyone with this device or file can read it. Export anyway?')) return; download(`truli-walk-journal-${localDate()}.json`, JSON.stringify(bundle(), null, 1)); }
async function exportEncrypted() { const p = prompt('Choose a passphrase for this export (8+ characters). If you lose it, the file can’t be opened.'); if (!p || p.length < 8) return; download(`truli-walk-journal-${localDate()}.locked.json`, JSON.stringify(await sealWithPass(p, bundle()))); }
async function importFile(e) {
  const f = e.target.files[0]; if (!f) return; let j = JSON.parse(await f.text());
  if (j.format === 'truli-walk-encrypted-v1') { const p = prompt('Passphrase for this file:'); try { j = await openWithPass(p || '', j); } catch { alert('That passphrase didn’t work.'); return; } }
  if (j.format !== 'truli-walk-journal' || j.v !== 1 || !Array.isArray(j.entries)) { alert('That doesn’t look like a Walk journal export.'); return; }
  let added = 0; const have = new Set(entries.map((x) => x.id));
  for (const x of j.entries) { if (!x.id || have.has(x.id) || typeof x.title !== 'string') continue; const { verseText, ...clean } = x; if (isMinor(band)) delete clean.transcript; clean.verseIds = (clean.verseIds || []).filter((id) => K[id]); await writeEntry(clean); added++; }
  alert(`Imported ${added} entr${added === 1 ? 'y' : 'ies'}.`); e.target.value = ''; render();
}
