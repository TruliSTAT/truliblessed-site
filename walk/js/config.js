// The Walk: launch flags. Everything ships OFF. Flip only per walk-worker/LAUNCH.md.
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
export const CONFIG = {
  LIVE: false,                 // master flag. false => /walk/* shows "coming soon" on the real site unless ?beta=1 (localhost always previews)
  CONSENT_TIER_13_15: false,   // phase 1.5: 13-15 "parent permission (honor system)" tier. Off in phase 1.
  API_BASE: local ? 'http://localhost:8787' : 'https://walk-api.truliblessed.com',
  TURNSTILE_SITEKEY: '',       // set at launch; empty => no Turnstile widget (Worker skips it only in development)
  AGE_FLAG_DAYS: 30,           // open question (spec L1): how long the under-13 / 13-15 speed bump lasts
  REMINDER_MS: 3 * 60 * 60 * 1000, // AI + break reminder at least every 3 hours of continuous use (M5)
  EXIT_URL: 'https://www.weather.gov/', // neutral page for "Exit now" (S5)
  local,
};
export function previewAllowed() {
  if (CONFIG.LIVE || CONFIG.local) return true;
  const q = new URLSearchParams(location.search);
  if (q.get('beta') === '1') { try { sessionStorage.setItem('truli_walk_beta', '1'); } catch {} return true; }
  try { return sessionStorage.getItem('truli_walk_beta') === '1'; } catch { return false; }
}
