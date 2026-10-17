// The Walk: deterministic safety layer shared by the browser (Layer 1) and the Worker (Layer 2).
// Pure ES module, no dependencies. The lexicon is DRAFT and must be clinician-reviewed before launch (M4).
// This file is copied verbatim to site/walk/js/safety-core.js by scripts/sync_site.sh.

const NUM = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17 };
const ORD = { first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10 };

export function normalize(text) {
  let s = String(text || '').toLowerCase().normalize('NFKC');
  s = s.replace(/[\u2018\u2019\u02bc`´]/g, "'").replace(/[\u201c\u201d]/g, '"');
  s = s.replace(/(?<=[a-z])0(?=[a-z])/g, 'o').replace(/(?<=[a-z])1(?=[a-z])/g, 'i').replace(/(?<=[a-z])3(?=[a-z])/g, 'e')
       .replace(/@/g, 'a').replace(/\$(?=[a-z])/g, 's');
  s = s.replace(/([a-z])\1{2,}/g, '$1$1');           // "soooo" -> "soo"
  s = s.replace(/[^a-z0-9'%/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

export function compileLexicon(lex) {
  const out = {};
  for (const [k, v] of Object.entries(lex)) if (Array.isArray(v)) out[k] = v.map((p) => new RegExp(p, 'i'));
  out.version = lex.version;
  return out;
}

function any(list, s) { for (const re of list || []) { if (re.test(s)) return true; } return false; }

// Returns {age, band} for the YOUNGEST age stated in the text, or null. Never used to raise a band.
export function statedAge(compiled, norm) {
  let youngest = null;
  for (const re of compiled.statedAge || []) {
    const g = new RegExp(re.source, 'gi'); let m;
    while ((m = g.exec(norm))) {
      const t = m[0];
      let age = null;
      const grade = t.match(/(\d{1,2})(st|nd|rd|th)? grade|(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth) grade|(fifth|sixth|seventh|eighth|5th|6th|7th|8th) grader/);
      if (/elementary|primary/.test(t)) age = 10;
      else if (grade) {
        const gnum = grade[1] ? +grade[1] : ORD[grade[3]] || ORD[grade[4]] || parseInt(grade[4], 10);
        if (gnum && gnum <= 12) age = gnum <= 6 ? gnum + 5 : gnum <= 7 ? 12 : gnum + 5; // 7th grade treated as 12 (cautious)
      } else {
        const n = t.match(/\b(\d{1,2})\b/); const w = t.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)\b/);
        age = n ? +n[1] : w ? NUM[w[1]] : null;
      }
      if (age != null && age >= 3 && age <= 17 && (youngest == null || age < youngest)) youngest = age;
    }
  }
  if (youngest == null) return null;
  return { age: youngest, band: youngest < 13 ? 'u13' : youngest <= 15 ? '13-15' : '16-17' };
}

// Main classifier. Order of precedence is applied by the caller (see decide()).
export function classify(compiled, text) {
  const norm = normalize(text);
  return {
    norm,
    crisis: any(compiled.crisis, norm),
    abuse: any(compiled.abuse, norm),
    ed: any(compiled.ed, norm),
    substance: any(compiled.substance, norm),
    sexual: any(compiled.sexual, norm),
    age: statedAge(compiled, norm),
    identity: any(compiled.identity, norm),
    poem: any(compiled.poem, norm),
    roleplay: any(compiled.roleplay, norm),
    offTopic: any(compiled.offTopic, norm),
    companion: any(compiled.companion, norm),
    restricted13: any(compiled.restricted13, norm),
    sensitive: any(compiled.sensitive, norm),
  };
}

// Deterministic pre-LLM decision. Returns {type, card?, reason} or null (= safe to call the LLM).
// ageBand: '13-15c' | '16-17' | '18+'.  crisisCountToday: trusted only to TIGHTEN (M4).
export function decide(c, { ageBand, crisisCountToday = 0 }) {
  if (c.age && c.age.band === 'u13') return { type: 'age_block', reason: 'stated_age_u13' };            // M2: wins over everything
  if (c.crisis) {
    if (ageBand === '13-15c' || crisisCountToday >= 1) return { type: 'crisis_end', card: 'crisis', reason: 'crisis_repeat_or_13_15' }; // M4, §7.8
    return { type: 'crisis', card: 'crisis', reason: 'crisis' };
  }
  if (c.abuse || (c.sexual && ageBand !== '18+')) return { type: 'safety', card: 'abuse', reason: 'abuse' };
  if (c.age && c.age.band === '13-15' && ageBand !== '13-15c') return { type: 'teen_static', reason: 'stated_age_13_15' };
  if (c.ed) return { type: 'safety', card: 'ed', reason: 'ed' };
  if (c.substance) return { type: 'safety', card: 'substance', reason: 'substance' };
  if (c.identity || c.companion) return { type: 'identity', reason: c.identity ? 'identity' : 'companion' };
  if (c.poem) return { type: 'poem', reason: 'poem' };
  if (c.roleplay || c.offTopic) return { type: 'redirect', reason: c.roleplay ? 'roleplay' : 'off_topic' };
  if (c.sexual) return { type: 'redirect', reason: 'sexual' };
  if (ageBand === '13-15c' && c.restricted13) return { type: 'restricted', reason: 'restricted_13_15' };
  return null;
}
