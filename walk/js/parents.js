// /walk/parents/: parent permission (honor system) code, shown only when the 13-15 tier flag is on (phase 1.5).
import { CONFIG, $ } from './common.js';
const sec = $('#p-consent'); if (sec) sec.hidden = !CONFIG.CONSENT_TIER_13_15;
$('#p-issue')?.addEventListener('submit', async (e) => {
  e.preventDefault(); if (!$('#p-attest').checked) return;
  try { const r = await fetch(CONFIG.API_BASE + '/v1/consent/issue', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ attest: true, turnstile: window.__turnstileToken || 'dev' }) }); const j = await r.json(); if (!j.code) throw 0;
    $('#p-code').textContent = j.code.replace(/(.{4})/, '$1 '); $('#p-out').hidden = false; } catch { $('#p-err').hidden = false; }
});
$('#p-revoke')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await fetch(CONFIG.API_BASE + '/v1/consent/revoke', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: $('#p-rcode').value }) }); $('#p-rdone').hidden = false; } catch { $('#p-err').hidden = false; }
});
