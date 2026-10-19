/* Truli Blessed: "Write one together" prayer builder for the /prayers/ search (STAGING MOCKUP).
   Composes a prayer IN THE BROWSER from vetted template fragments. No network calls, no storage
   (no localStorage/sessionStorage/cookies), no counters, no free text. Answers live only in memory
   and vanish when the page is closed or "Start over" is pressed.
   Fragments and verse map are DRAFT pending Vatican review; privacy design pending Geneva review. */
(function () {
  'use strict';
  var VERSES = {
 "Psalm 73:26": "My flesh and my heart may fail, but God is the strength of my heart and my portion forever.",
 "Psalm 46:1": "God is our refuge and strength, an ever-present help in times of trouble.",
 "Psalm 23:4": "Even though I walk through the valley of the shadow of death, I will fear no evil, for You are with me; Your rod and Your staff, they comfort me.",
 "2 Corinthians 1:4": "Who comforts us in all our troubles, so that we can comfort those in any trouble with the comfort we ourselves have received from God.",
 "Philippians 4:7": "And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.",
 "Psalm 94:19": "When anxiety overwhelms me, Your consolation delights my soul.",
 "James 1:5": "Now if any of you lacks wisdom, he should ask God, who gives generously to all without finding fault, and it will be given to him.",
 "Proverbs 19:21": "Many plans are in a man’s heart, but the purpose of the LORD will prevail.",
 "Isaiah 12:2": "Surely God is my salvation; I will trust and not be afraid. For the LORD GOD is my strength and my song, and He also has become my salvation.",
 "Proverbs 2:6": "For the LORD gives wisdom; from His mouth come knowledge and understanding.",
 "Colossians 3:17": "And whatever you do, in word or deed, do it all in the name of the Lord Jesus, giving thanks to God the Father through Him.",
 "Galatians 6:9": "Let us not grow weary in well-doing, for in due time we will reap a harvest if we do not give up.",
 "John 14:27": "Peace I leave with you; My peace I give to you. I do not give to you as the world gives. Do not let your hearts be troubled; do not be afraid.",
 "Psalm 133:1": "Behold, how good and pleasant it is when brothers live together in harmony!",
 "Romans 15:13": "Now may the God of hope fill you with all joy and peace as you believe in Him, so that you may overflow with hope by the power of the Holy Spirit.",
 "Mark 9:24b": "I do believe; help my unbelief!",
 "Psalm 121:8": "The LORD will watch over your coming and going, both now and forevermore.",
 "2 Corinthians 5:17": "Therefore if anyone is in Christ, he is a new creation. The old has passed away. Behold, the new has come!",
 "Deuteronomy 31:6": "Be strong and courageous; do not be afraid or terrified of them, for it is the LORD your God who goes with you; He will never leave you nor forsake you.",
 "Psalm 136:1": "Give thanks to the LORD, for He is good. His loving devotion endures forever.",
 "1 Thessalonians 5:18": "Give thanks in every circumstance, for this is God’s will for you in Christ Jesus.",
 "Psalm 3:3": "But You, O LORD, are a shield around me, my glory, and the One who lifts my head.",
 "2 Thessalonians 3:16": "Now may the Lord of peace Himself give you peace at all times and in every way. The Lord be with all of you.",
 "Psalm 23:2": "He makes me lie down in green pastures; He leads me beside quiet waters.",
 "Proverbs 18:10": "The name of the LORD is a strong tower; the righteous run to it and are safe."
};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  // ---------- Question bank (presets only; no free-text fields at all) ----------
  var AGES = [{ v: 'u13', l: 'Under 13' }, { v: '13-17', l: '13 to 17' }, { v: '18+', l: '18 or older' }];
  // who: as said in the prayer; poss/obj: pronouns; adult: 18+ only (spouse); notKid: hidden for under 13
  var FOR = [
    { v: 'self', l: 'Myself', who: 'me', poss: 'my', obj: 'me', self: true },
    { v: 'mom', l: 'My mom', who: 'my mom', poss: 'her', obj: 'her' },
    { v: 'dad', l: 'My dad', who: 'my dad', poss: 'his', obj: 'him' },
    { v: 'parents', l: 'My parents', who: 'my parents', poss: 'their', obj: 'them' },
    { v: 'sister', l: 'My sister', who: 'my sister', poss: 'her', obj: 'her' },
    { v: 'brother', l: 'My brother', who: 'my brother', poss: 'his', obj: 'him' },
    { v: 'grandma', l: 'My grandma', who: 'my grandma', poss: 'her', obj: 'her' },
    { v: 'grandpa', l: 'My grandpa', who: 'my grandpa', poss: 'his', obj: 'him' },
    { v: 'child', l: 'My child', who: 'my child', poss: 'their', obj: 'them', notKid: true },
    { v: 'grandchild', l: 'My grandchild', who: 'my grandchild', poss: 'their', obj: 'them', notKid: true },
    { v: 'friend', l: 'My friend', who: 'my friend', poss: 'their', obj: 'them' },
    { v: 'classmate', l: 'My classmate', who: 'my classmate', poss: 'their', obj: 'them' },
    { v: 'teacher', l: 'My teacher', who: 'my teacher', poss: 'their', obj: 'them' },
    { v: 'coach', l: 'My coach', who: 'my coach', poss: 'their', obj: 'them' },
    { v: 'coworker', l: 'My coworker', who: 'my coworker', poss: 'their', obj: 'them', notKid: true },
    { v: 'neighbor', l: 'My neighbor', who: 'my neighbor', poss: 'their', obj: 'them' },
    { v: 'church', l: 'My church family', who: 'my church family', poss: 'their', obj: 'them' },
    { v: 'family', l: 'Our family', who: 'our family', poss: 'our', obj: 'us', ours: true },
    { v: 'husband', l: 'My husband', who: 'my husband', poss: 'his', obj: 'him', adult: true },
    { v: 'wife', l: 'My wife', who: 'my wife', poss: 'her', obj: 'her', adult: true },
    { v: 'spouse', l: 'My spouse', who: 'my spouse', poss: 'their', obj: 'them', adult: true }
  ];
  var BY = [
    { v: 'me', l: 'Just me' },
    { v: 'family', l: 'Our family, together', we: true },
    { v: 'friends', l: 'My friends and I', we: true },
    { v: 'church', l: 'Our church', we: true },
    { v: 'couple', l: 'My spouse and I', we: true, adult: true }
  ];
  var CIRC = [
    { v: 'health', l: 'A health worry' }, { v: 'grief', l: 'Grief or loss' }, { v: 'worry', l: 'Worry or anxiety' },
    { v: 'decision', l: 'A big decision' }, { v: 'hard', l: 'A hard season' }, { v: 'school', l: 'School or exams' },
    { v: 'work', l: 'Work' }, { v: 'money', l: 'Money worries' }, { v: 'family', l: 'Tension at home' },
    { v: 'faith', l: 'Faith questions' }, { v: 'new', l: 'A new start' }, { v: 'lonely', l: 'Feeling lonely' },
    { v: 'celebrate', l: 'Something to celebrate' },
    { v: 'crisis', l: 'A crisis, or thoughts of self-harm', crisis: true }
  ];
  var ASK = [
    { v: 'peace', l: 'Peace' }, { v: 'healing', l: 'Healing, as God wills' }, { v: 'guidance', l: 'Guidance' },
    { v: 'strength', l: 'Strength' }, { v: 'provision', l: 'Provision' }, { v: 'comfort', l: 'Comfort' },
    { v: 'protection', l: 'Protection' }, { v: 'rest', l: 'Rest' }, { v: 'joy', l: 'Joy' }, { v: 'thanks', l: 'To say thank You' }
  ];
  var TONE = [
    { v: 'comfort', l: 'Gentle and comforting' }, { v: 'hope', l: 'Hopeful and encouraging' },
    { v: 'joy', l: 'Joyful and thankful' }, { v: 'simple', l: 'Short and simple' }
  ];

  // ---------- Vetted fragment bank (DRAFT for Vatican review) ----------
  // {poss} {obj} {who} are filled from the "for whom" chip only. Never a name; no free text exists.
  var F = {
    open: { me: 'Father, I lift up {who} to You.', we: 'Father, we lift up {who} to You.', self: 'Father, I come to You just as I am.' },
    circ: {
      health: 'You know {poss} health worry; hold {obj} close.',
      grief: 'You see {poss} grief; stay close in the sorrow.',
      worry: 'You know {poss} worry; hold {obj} close.',
      decision: 'You see the choice ahead; light {poss} way.',
      hard: 'This season is heavy; carry {obj} through it.',
      school: 'You see the tests and the pressure; steady {obj}.',
      work: 'You know {poss} work and all it asks.',
      money: 'You see the money worries; You know every need.',
      family: 'You see the strain at home; mend what is frayed.',
      faith: 'You know {poss} questions; draw {obj} near to You.',
      'new': 'Go ahead of {obj} into this new start.',
      lonely: 'When it feels lonely, remind {obj} You are near.',
      celebrate: 'Thank You for this good gift in {poss} life.',
      crisis: 'You see this pain, and You are close to {obj}.'
    },
    gift: { peace: 'Your peace', healing: 'healing as You will', guidance: 'Your guidance', strength: 'Your strength',
      comfort: 'Your comfort', protection: 'Your protection', rest: 'deep rest', joy: 'Your joy' },
    provide: 'provide what is needed',
    tone: { comfort: 'Let {obj} feel You near, today and every day.', hope: 'Remind {obj} that You are faithful and good.',
      joy: 'Fill {obj} with gladness in You.', simple: '' },
    crisisLine: 'Surround {obj} with people who can help.',
    trust: { me: 'I trust You with what I cannot carry.', we: 'We trust You with what we cannot carry.' },
    praise: { me: 'I praise You for every good gift.', we: 'We praise You for every good gift.' },
    thanks: { other: 'Thank You for {obj}, and for Your faithful care.', self: 'Thank You for Your faithful care for me.', ours: 'Thank You for our family and Your faithful care.' },
    amen: 'In Jesus’ name, Amen.'
  };
  // Verse picks by circumstance (first match on an ask tag wins, else first). Refs only; text injected
  // at build time from verses already used in the site's prayer library and checked against BSB.
  var VMAP = {
    health: [['Psalm 73:26', 'strength'], ['Psalm 46:1', '']], grief: [['Psalm 23:4', ''], ['2 Corinthians 1:4', 'comfort']],
    worry: [['Philippians 4:7', 'peace'], ['Psalm 94:19', '']], decision: [['James 1:5', 'guidance'], ['Proverbs 19:21', '']],
    hard: [['Isaiah 12:2', 'strength'], ['Psalm 46:1', '']], school: [['Proverbs 2:6', 'guidance'], ['Colossians 3:17', '']],
    work: [['Galatians 6:9', 'strength'], ['Colossians 3:17', '']], money: [['Psalm 46:1', '']],
    family: [['John 14:27', 'peace'], ['Psalm 133:1', '']], faith: [['Romans 15:13', 'joy'], ['Mark 9:24b', '']],
    'new': [['Psalm 121:8', 'protection'], ['2 Corinthians 5:17', '']], lonely: [['Deuteronomy 31:6', '']],
    celebrate: [['Psalm 136:1', ''], ['1 Thessalonians 5:18', 'thanks']], crisis: [['Psalm 3:3', ''], ['Psalm 46:1', '']]
  };
  var ASKV = { peace: '2 Thessalonians 3:16', rest: 'Psalm 23:2', protection: 'Proverbs 18:10', thanks: '1 Thessalonians 5:18' };
  var HELP = {
    adult: 'If you or someone you love is in crisis, call or text 988 (Suicide & Crisis Lifeline, US), anytime. If someone is in danger right now, call 911.',
    kid: 'If you or someone you love feels really sad or unsafe, tell a grown-up you trust right away. They can call or text 988 (US) anytime. If someone is in danger, call 911.'
  };

  // ---------- Prefill from search words and dropdowns ----------
  var KW = {
    circ: [[/self[- ]?harm|suicid|kill (my|him|her|them)sel|hurt(ing)? (my|him|her|them)sel|cutting|crisis|want(s)? to die/, 'crisis'],
      [/anxi|worr|fear|afraid|panic|stress|nervous/, 'worry'], [/heal|sick|ill|health|cancer|surgery|hospital|diagnos/, 'health'],
      [/grie|loss|lost|death|died|funeral|miscarr|passed away/, 'grief'], [/decision|decide|direction|choice|wisdom|guid/, 'decision'],
      [/school|exam|test|study|college|class/, 'school'], [/\bwork|job|career|boss/, 'work'], [/money|bills|debt|financ|rent/, 'money'],
      [/lonel|alone|left out/, 'lonely'], [/new beginning|new start|fresh start|moving|move away|new job|new school/, 'new'],
      [/birthday|anniversar|celebrat|graduat|wedding|gratitude|grateful|thank/, 'celebrate'], [/faith|doubt|believ/, 'faith'],
      [/conflict|fight|argu|divorce|tension|blended/, 'family'], [/hard|struggl|tough|depress|sad/, 'hard']],
    ask: [[/peace/, 'peace'], [/heal/, 'healing'], [/strength|strong|courage/, 'strength'], [/protect|safe/, 'protection'],
      [/\brest|sleep|tired/, 'rest'], [/\bjoy/, 'joy'], [/provi|money|bills|financ/, 'provision'], [/guid|wisdom|direction/, 'guidance'],
      [/comfort/, 'comfort'], [/thank|gratitude|grateful/, 'thanks']],
    who: [[/\bmy ?self\b|\bfor me\b/, 'self'], [/\bmoms?\b|mother|mama|mommy/, 'mom'], [/\bdads?\b|father\b|daddy/, 'dad'],
      [/parents/, 'parents'], [/sister/, 'sister'], [/brother/, 'brother'], [/grandma|grandmother|nana/, 'grandma'],
      [/grandpa|grandfather/, 'grandpa'], [/grandchild|grandson|granddaughter|grandkid/, 'grandchild'],
      [/\bson\b|daughter|\bchild|\bkids?\b|baby|toddler|\bteen/, 'child'], [/friend/, 'friend'], [/classmate/, 'classmate'],
      [/teacher|mentor/, 'teacher'], [/coach/, 'coach'], [/cowork|colleague/, 'coworker'], [/neighbo/, 'neighbor'],
      [/husband/, 'husband'], [/\bwife\b/, 'wife'], [/spouse|marriage|married/, 'spouse'], [/church/, 'church'], [/family/, 'family']]
  };
  var TOPIC = { anxiety: ['circ', 'worry'], healing: ['circ', 'health', 'ask', 'healing'], grief: ['circ', 'grief'], peace: ['ask', 'peace'],
    strength: ['ask', 'strength'], courage: ['ask', 'strength'], protection: ['ask', 'protection'], rest: ['ask', 'rest'], joy: ['ask', 'joy'],
    gratitude: ['circ', 'celebrate', 'ask', 'thanks'], loneliness: ['circ', 'lonely'], 'new-beginnings': ['circ', 'new'],
    'school-and-exams': ['circ', 'school'], work: ['circ', 'work'], faith: ['circ', 'faith'], hope: ['circ', 'hard'],
    mom: ['who', 'mom'], dad: ['who', 'dad'], sister: ['who', 'sister'], brother: ['who', 'brother'], parents: ['who', 'parents'],
    friendship: ['who', 'friend'], 'teachers-and-mentors': ['who', 'teacher'], 'marriage/money-stress': ['who', 'spouse', 'circ', 'money'],
    'marriage/illness-of-a-spouse': ['who', 'spouse', 'circ', 'health'], marriage: ['who', 'spouse'], 'aging-parents': ['who', 'parents'],
    'aging-parents/health-decline': ['who', 'parents', 'circ', 'health'], 'well-being/anxiety': ['circ', 'worry'], 'well-being/peace': ['ask', 'peace'] };
  var FROM = { parent: ['who', 'child'], stepparent: ['who', 'child'], grandparent: ['who', 'grandchild'], grandma: ['who', 'grandchild'],
    grandpa: ['who', 'grandchild'], child: ['who', 'parents'], 'adult-child': ['who', 'parents'], spouse: ['who', 'spouse'],
    friend: ['who', 'friend'], coworker: ['who', 'coworker'], self: ['who', 'self'], 'self-kid': ['who', 'self'], 'self-teen': ['who', 'self'],
    'self-young-adult': ['who', 'self'], church: ['by', 'church'], couple: ['by', 'couple'] };

  function prefillFrom(q, topic, from) {
    var p = {}, t = String(q || '').toLowerCase();
    function set(k, v) { if (k === 'ask') { p.ask = p.ask || []; if (p.ask.indexOf(v) < 0 && p.ask.length < 2) p.ask.push(v); } else if (!p[k]) p[k] = v; }
    if (t) ['circ', 'ask', 'who'].forEach(function (k) { KW[k].forEach(function (r) { if (r[0].test(t)) set(k, r[1]); }); });
    var tp = TOPIC[topic] || TOPIC[String(topic || '').split('/')[0]];
    if (tp) for (var i = 0; i < tp.length; i += 2) set(tp[i], tp[i + 1]);
    var fr = FROM[from]; if (fr) set(fr[0], fr[1]);
    return p;
  }

  // ---------- Composition ----------
  function find(list, v) { for (var i = 0; i < list.length; i++) if (list[i].v === v) return list[i]; return null; }
  function fill(s, w, our) {
    var who = w.who; if (our && /^my /.test(who)) who = 'our ' + who.slice(3);
    return s.replace(/\{who\}/g, who).replace(/\{poss\}/g, w.poss).replace(/\{obj\}/g, w.obj);
  }
  function compose(a) {
    var w = find(FOR, a.who), by = find(BY, a.by || 'me') || BY[0];
    if (w.adult) by = BY[0]; // spouse prayers are always "just me"
    var byWe = !w.self && !w.ours && !!by.we, ourWho = byWe && (by.v === 'family' || by.v === 'couple' || w.v === 'church'), voice = (byWe || w.ours) ? 'we' : 'me';
    var asks = ASK.map(function (o) { return o.v; }).filter(function (v) { return (a.ask || []).indexOf(v) >= 0; }).slice(0, 2), gifts = asks.filter(function (k) { return F.gift[k]; }).map(function (k) { return F.gift[k]; });
    var L = [];
    L.push(w.self ? F.open.self : fill(byWe || w.ours ? F.open.we : F.open.me, w, ourWho));
    L.push(fill(F.circ[a.circ], w, ourWho));
    if (gifts.length === 2 && /^Your /.test(gifts[0]) && /^Your /.test(gifts[1])) gifts = [gifts[0] + ' and ' + gifts[1].slice(5)];
    var g = gifts.length ? 'Give ' + w.obj + ' ' + gifts.join(', and ') : '';
    if (asks.indexOf('provision') >= 0) g = g ? g + ', and ' + F.provide : 'Please ' + F.provide;
    if (g) {
      g += '.';
      var i = g.indexOf(', and ');
      if (g.length > 48 && i > 0) { L.push(g.slice(0, i + 1)); L.push(g.slice(i + 2)); } else L.push(g);
    }
    var crisis = a.circ === 'crisis';
    var tone = crisis ? F.crisisLine : (F.tone[a.tone] || '');
    var last = asks.indexOf('thanks') >= 0 ? (w.self ? F.thanks.self : (w.ours ? F.thanks.ours : F.thanks.other)) : (a.circ === 'celebrate' ? F.praise[voice] : F.trust[voice]);
    var toneL = tone ? fill(tone, w, ourWho) : '', lastL = fill(last, w, ourWho);
    if (toneL) L.push(toneL);
    L.push(lastL);
    // Crawl limits: 6 lines or fewer incl. Amen, 45 words or fewer. Drop the tone line first (never the crisis line), then the closing line.
    var over = function () { return L.length + 1 > 6 || (L.join(' ') + ' ' + F.amen).split(/\s+/).length > 45; };
    if (over() && toneL && !crisis) L.splice(L.indexOf(toneL), 1);
    if (over()) L.splice(L.indexOf(lastL), 1);
    L.push(F.amen);
    L = L.map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); });
    // verse
    var ref = null, cands = VMAP[a.circ] || [];
    for (var j = 0; j < cands.length && !ref; j++) if (cands[j][1] && asks.indexOf(cands[j][1]) >= 0) ref = cands[j][0];
    if (!ref && a.circ !== 'crisis') for (var k = 0; k < asks.length && !ref; k++) if (ASKV[asks[k]]) ref = ASKV[asks[k]];
    if (!ref) ref = cands[0][0];
    var title = 'A Prayer for ' + (w.self ? 'Me' : (ourWho && /^my /.test(w.who) ? 'our ' + w.who.slice(3) : w.who)).replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    return { title: title, lines: L, verse: { ref: ref, text: VERSES[ref] }, help: a.circ === 'crisis' ? (a.age === 'u13' ? HELP.kid : HELP.adult) : '' };
  }

  // ---------- UI ----------
  var slot, grid, qEl, tpEl, frEl, state = null, dismissedMany = '', lastTier = '', timer;
  function steps(a) {
    var s = ['age', 'who'];
    var w = a.who && find(FOR, a.who);
    if (!(w && (w.self || w.ours || w.adult))) s.push('by');
    s.push('circ', 'ask', 'tone');
    return s;
  }
  function allowed(list, a) { return list.filter(function (o) { if (a.age !== '18+' && o.adult) return false; if (a.age === 'u13' && o.notKid) return false; return true; }); }
  var Q = {
    age: { h: 'First, how old are you?', n: 'This only changes the choices you see. It isn’t saved or sent.', opts: function () { return AGES; } },
    who: { h: 'Who is this prayer for?', n: 'We use relationships, never names, so your prayer is safe to share.', opts: function (a) { return allowed(FOR, a); } },
    by: { h: 'Who is praying?', opts: function (a) { var w = find(FOR, a.who); return allowed(BY, a).filter(function (o) { return !(o.v === 'couple' && w && w.adult); }); } },
    circ: { h: 'What’s going on?', n: 'Pick the one that fits best.', opts: function () { return CIRC; } },
    ask: { h: 'What are you asking God for?', n: 'Pick one or two.', multi: 2, opts: function () { return ASK; } },
    tone: { h: 'How should it sound?', opts: function () { return TONE; } }
  };
  function tier(n) { return n === 0 ? 'zero' : (n <= 3 ? 'few' : 'many'); }
  function active() { return !!((qEl.value || '').trim() || tpEl.value || frEl.value); }
  function searchKey() { return [(qEl.value || '').trim().toLowerCase(), tpEl.value, frEl.value].join('|'); } // "No thanks" lasts until the search changes
  function readable() { return grid.querySelectorAll('li.pl-card:not(.is-locked)').length; }

  function update() {
    if (state) return; // flow open: leave it alone
    if (!active()) { slot.innerHTML = ''; lastTier = ''; return; }
    var t = tier(readable());
    var k = t + '#' + (t === 'many' ? searchKey() : ''); if (k === lastTier) return;
    lastTier = k;
    if (t === 'many') {
      slot.innerHTML = dismissedMany === searchKey() ? '' : '<div class="pb-nudge" data-pb="many"><p><span aria-hidden="true">✦</span> Would you prefer a more personalized one today?</p>' +
        '<button type="button" class="pl-btn pl-btn--gold" data-pb-open>Yes, let’s write one</button> <button type="button" class="pl-link" data-pb-nothanks>No thanks</button></div>';
    } else {
      slot.innerHTML = '<section class="pb-invite pl-card" data-pb="' + t + '" aria-labelledby="pb-inv-h"><p class="eyebrow">' + (t === 'few' ? 'Only a few match' : (grid.querySelector('li.pl-card') ? 'These open soon' : 'Nothing quite matches')) + '</p>' +
        '<h2 id="pb-inv-h">Can’t find quite the right one? Let’s write one together.</h2><p class="pb-sub">It takes about a minute. A few taps, no typing, and nothing is saved.</p>' +
        '<button type="button" class="pl-btn pl-btn--gold" data-pb-open>Write my prayer</button></section>';
    }
  }

  function open() {
    var pf = prefillFrom(qEl.value, tpEl.value, frEl.value);
    state = { a: {}, pf: pf, i: 0 };
    render(true);
  }
  function applyPrefill() { // runs once, after age is known, so 18+-only answers are never prefilled for minors
    var a = state.a, pf = state.pf; if (state.prefilled) return; state.prefilled = true;
    ['who', 'by', 'circ'].forEach(function (k) { if (pf[k] && !a[k] && find(Q[k].opts(a), pf[k])) { a[k] = pf[k]; a[k + '_pf'] = true; } });
    if (pf.ask && pf.ask.length && !(a.ask && a.ask.length)) { a.ask = pf.ask.slice(); a.ask_pf = true; }
  }
  function dots(list, i) {
    return '<ol class="pb-dots" aria-label="Step ' + (i + 1) + ' of ' + list.length + '">' + list.map(function (_, j) {
      return '<li class="' + (j < i ? 'done' : (j === i ? 'on' : '')) + '"' + (j === i ? ' aria-current="step"' : '') + '><span class="sr">Step ' + (j + 1) + '</span></li>'; }).join('') + '</ol>';
  }
  function render(focus) {
    var a = state.a, list = steps(a);
    if (state.i >= list.length) return result(focus);
    var key = list[state.i], q = Q[key], opts = q.opts(a), sel = a[key];
    if (key === 'ask') sel = a.ask || [];
    var multi = !!q.multi, has = multi ? sel.length > 0 : !!sel;
    var pfNote = a[key + '_pf'] ? '<p class="pb-pf">✦ Picked from your search. Change it if you like.</p>' : '';
    var crisisNote = (key === 'circ' && a.circ === 'crisis') ? '<aside class="pl-help pb-help" role="note"><p class="pl-help-h">You are not alone</p><p>' + esc(a.age === 'u13' ? HELP.kid : HELP.adult) + ' <a href="tel:988">Call 988</a> · <a href="sms:988">Text 988</a></p></aside>' : '';
    slot.innerHTML = '<section class="pb-flow pl-card" data-step="' + key + '" aria-labelledby="pb-h">' +
      '<div class="pb-top">' + dots(list, state.i) + '<button type="button" class="pl-link pb-x" data-pb-close>Close</button></div>' +
      '<h2 id="pb-h" tabindex="-1">' + esc(q.h) + '</h2>' + (q.n ? '<p class="pb-sub">' + esc(q.n) + '</p>' : '') + pfNote +
      '<div class="pb-chips" role="group" aria-labelledby="pb-h">' + opts.map(function (o) {
        var on = multi ? sel.indexOf(o.v) >= 0 : sel === o.v;
        return '<button type="button" class="pb-chip' + (o.crisis ? ' pb-chip--care' : '') + '" data-v="' + o.v + '" aria-pressed="' + on + '">' + esc(o.l) + '</button>'; }).join('') + '</div>' +
      crisisNote +
      '<div class="pb-nav">' + (state.i > 0 ? '<button type="button" class="pl-btn" data-pb-back>Back</button>' : '<span></span>') +
      '<button type="button" class="pl-btn pl-btn--gold" data-pb-next' + (has ? '' : ' disabled') + '>' + (state.i === list.length - 1 ? 'Write my prayer' : 'Next') + '</button></div>' +
      '<p class="fine pb-fine">Nothing you pick is saved or sent. It stays on this page.</p></section>';
    if (focus) { var h = $('#pb-h', slot); h.focus({ preventScroll: true }); slot.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  }

  // ---------- video Short (made in this browser; see prayer-video.js) ----------
  var vid = null; // { url, blob, ext, ctrl }
  function canVideo() { return !!(window.MediaRecorder && window.HTMLCanvasElement && HTMLCanvasElement.prototype.captureStream && (window.AudioContext || window.webkitAudioContext) && window.FontFace); }
  function videoHTML(kid) {
    if (kid) return '<div class="pb-video" data-pb-video="kid"><p class="fine">Prayer videos are for ages 13 and up. You can copy or print your prayer anytime.</p></div>';
    if (!canVideo()) return '<div class="pb-video" data-pb-video="unsupported"><p class="fine">This browser can’t make videos. Copy the prayer text instead.</p></div>';
    return '<div class="pb-video" data-pb-video="idle"><h3>Make it a video Short</h3><p class="fine">A 9:16 video of your prayer with the verse and the Truli Blessed sound. It’s made right here on your device in about ' + Math.round(videoLen()) + ' seconds and is never uploaded. Keep this tab open while it records.</p>' +
      '<button type="button" class="pl-btn pl-btn--gold" data-pb-mkvideo>Make my video</button></div>';
  }
  function videoLen() { var n = state && state.p ? state.p.lines.length : 6; return 0.6 + (n - 1) * 3 + 4 + 10 + 0.2 + 3.6 + 0.3 + 10; }
  function loadPV() {
    if (window.TB_PV) return Promise.resolve(window.TB_PV);
    return new Promise(function (res, rej) { var sc = document.createElement('script'); sc.src = '/prayers/try-builder/prayer-video.js'; sc.onload = function () { res(window.TB_PV); }; sc.onerror = rej; document.head.appendChild(sc); });
  }
  function clearVideo() { if (vid) { if (vid.ctrl) vid.ctrl.abort(); if (vid.url) URL.revokeObjectURL(vid.url); if (vid.purl) URL.revokeObjectURL(vid.purl); } vid = null; }
  function fileName() { return (state.p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'prayer') + '-truli-blessed.' + vid.ext; }
  function makeVideo() {
    var box = $('[data-pb-video]', slot); clearVideo(); vid = { ctrl: new AbortController() };
    box.dataset.pbVideo = 'recording';
    box.innerHTML = '<h3>Making your video…</h3><progress class="pb-prog" max="100" value="0" aria-label="Video progress"></progress>' +
      '<p class="fine" data-pb-vstat aria-live="polite">Getting ready…</p><button type="button" class="pl-btn" data-pb-vcancel>Cancel</button>';
    var bar = $('progress', box), stat = $('[data-pb-vstat]', box), lastS = -1, my = vid;
    loadPV().then(function (PV) {
      return PV.render(state.p, { signal: my.ctrl.signal, onProgress: function (t, d) {
        bar.value = Math.round(t / d * 100); var s = Math.floor(t);
        if (s !== lastS) { lastS = s; stat.textContent = 'Recording in real time: ' + s + ' of ' + Math.round(d) + ' seconds. Keep this tab open.'; }
      } });
    }).then(function (r) {
      if (vid !== my) return;
      my.blob = r.blob; my.ext = r.ext; my.url = URL.createObjectURL(r.blob); my.ctrl = null; my.purl = r.poster ? URL.createObjectURL(r.poster) : '';
      var file = null; try { file = new File([r.blob], fileName(), { type: r.mime }); } catch (e) {}
      var canShareFile = !!(file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
      box.dataset.pbVideo = 'done'; box.dataset.ext = r.ext; box.dataset.size = r.size;
      box.innerHTML = '<h3>Your video is ready</h3><video class="pb-vplayer" controls playsinline preload="metadata"' + (my.purl ? ' poster="' + my.purl + '"' : '') + ' src="' + my.url + '"></video>' +
        '<div class="pl-actions"><a class="pl-btn pl-btn--gold" data-pb-vdl href="' + my.url + '" download="' + esc(fileName()) + '">Download video</a>' +
        (canShareFile ? '<button type="button" class="pl-btn" data-pb-vshare>Share video</button>' : '') +
        '<button type="button" class="pl-btn" data-pb-mkvideo>Make it again</button></div>' +
        '<p class="fine">' + r.ext.toUpperCase() + ' · ' + (r.size / 1048576).toFixed(1) + ' MB · ' + Math.round(r.duration) + ' s. Made on this device and never uploaded. It disappears when you leave this page unless you download it.</p>';
      my.file = file;
    }).catch(function (err) {
      if (vid !== my) return;
      box.dataset.pbVideo = 'error';
      box.innerHTML = '<p class="fine">' + (err && err.message === 'cancelled' ? 'Video cancelled.' : 'Sorry, this browser couldn’t make the video. You can still copy or print the prayer.') + '</p><button type="button" class="pl-btn" data-pb-mkvideo>Try again</button>';
      clearVideo();
    });
  }
  function prayerText(p) { return p.title + '\n\n' + p.lines.join('\n') + '\n\n“' + p.verse.text + '” (' + p.verse.ref + ', BSB)' + (p.help ? '\n\n' + p.help : '') + '\n\nTruli Blessed · Into the light.'; }
  function result(focus) {
    var p = compose(state.a); state.p = p;
    var kid = state.a.age === 'u13';
    slot.innerHTML = '<section class="pb-result pl-card pl-card--big" aria-labelledby="pb-h">' +
      '<p class="eyebrow">Your prayer · written just now, just for you</p><h2 id="pb-h" tabindex="-1">' + esc(p.title) + '</h2>' +
      '<div class="pl-body">' + p.lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div>' +
      '<blockquote class="pl-verse">“' + esc(p.verse.text) + '” <cite>' + esc(p.verse.ref) + ' (BSB)</cite></blockquote>' +
      (p.help ? '<aside class="pl-help" role="note" aria-label="If you need support"><p class="pl-help-h">If you need support</p><p>' + esc(p.help) + ' <a href="tel:988">Call 988</a> · <a href="sms:988">Text 988</a></p></aside>' : '') +
      '<div class="pl-actions pb-actions"><button type="button" class="pl-btn pl-btn--gold" data-pb-copy>Copy</button>' +
      (kid ? '' : '<button type="button" class="pl-btn" data-pb-share>Share</button>') +
      '<button type="button" class="pl-btn" data-pb-print>Print</button><button type="button" class="pl-btn" data-pb-back>Change answers</button><button type="button" class="pl-btn" data-pb-restart>Start over</button></div>' +
      '<p class="fine">Nothing is saved. This prayer lives only on this page, and it’s gone when you leave.</p>' +
      videoHTML(kid) +
      '<div class="pb-soon" role="note"><button type="button" class="pl-btn pb-soon-btn" disabled aria-disabled="true" aria-describedby="pb-soon-d">Add to the library</button>' +
      '<p id="pb-soon-d" class="fine"><strong>Coming soon, pending privacy review.</strong> Sharing prayers with the library is not available yet. This button does nothing and nothing is sent.</p></div></section>';
    if (focus) { $('#pb-h', slot).focus({ preventScroll: true }); slot.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  }
  function toast(m) { var t = $('#pl-toast') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'pl-toast', className: 'pl-toast', role: 'status' })); t.textContent = m; t.classList.add('on'); setTimeout(function () { t.classList.remove('on'); }, 1600); }
  function copyText(s) {
    function legacy() { var ta = document.createElement('textarea'); ta.value = s; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove(); toast(ok ? 'Prayer copied' : 'Select the prayer text to copy it'); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(function () { toast('Prayer copied'); }, legacy); else legacy();
  }

  function onClick(e) {
    var t = e.target; if (!slot.contains(t)) return;
    if (t.closest('[data-pb-open]')) return open();
    if (t.closest('[data-pb-nothanks]')) { dismissedMany = searchKey(); slot.innerHTML = ''; return; }
    if (!state) return;
    var a = state.a, list = steps(a), key = list[state.i];
    if (t.closest('[data-pb-close]')) { clearVideo(); state = null; lastTier = ''; update(); return; }
    var chip = t.closest('.pb-chip');
    if (chip) {
      var v = chip.dataset.v;
      if (key === 'ask') { var arr = (a.ask || []).slice(), ix = arr.indexOf(v); if (ix >= 0) arr.splice(ix, 1); else { if (arr.length >= 2) arr.shift(); arr.push(v); } a.ask = arr; a.ask_pf = false; }
      else {
        a[key] = v; a[key + '_pf'] = false;
        if (key === 'age') { if (v !== '18+') { var w = find(FOR, a.who); if (w && w.adult) delete a.who; if (a.by === 'couple') delete a.by; } applyPrefill(); if (v === 'u13') { var w2 = find(FOR, a.who); if (w2 && w2.notKid) delete a.who; } }
        if (key === 'who') { var ww = find(FOR, v); if (ww.adult && a.by === 'couple') delete a.by; }
      }
      render(false); var again = slot.querySelector('.pb-chip[data-v="' + v + '"]'); if (again) again.focus(); return;
    }
    if (t.closest('[data-pb-next]')) { state.i++; return render(true); }
    if (t.closest('[data-pb-back]')) { clearVideo(); state.i = Math.min(state.i, steps(a).length) - 1; return render(true); }
    if (t.closest('[data-pb-restart]')) { clearVideo(); state = { a: {}, pf: {}, i: 0 }; return render(true); }
    if (t.closest('[data-pb-mkvideo]')) return makeVideo();
    if (t.closest('[data-pb-vcancel]')) { if (vid && vid.ctrl) vid.ctrl.abort(); return; }
    if (t.closest('[data-pb-vshare]')) { if (vid && vid.file) navigator.share({ files: [vid.file], title: state.p.title }).catch(function () {}); return; }
    if (t.closest('[data-pb-copy]')) return copyText(prayerText(state.p));
    if (t.closest('[data-pb-share]')) {
      var p = state.p, txt = prayerText(p);
      if (navigator.share) navigator.share({ title: p.title, text: txt }).catch(function (err) { if (err && err.name !== 'AbortError') copyText(txt); });
      else copyText(txt);
      return;
    }
    if (t.closest('[data-pb-print]')) { document.documentElement.classList.add('pb-printing'); window.print(); setTimeout(function () { document.documentElement.classList.remove('pb-printing'); }, 500); }
  }

  function init() {
    slot = $('#pb-slot'); grid = $('#pl-grid'); qEl = $('#pl-q'); tpEl = $('#pl-topic'); frEl = $('#pl-from');
    if (!slot || !grid || !qEl) return;
    new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(update, 350); }).observe(grid, { childList: true });
    [qEl, tpEl, frEl].forEach(function (el) { el && el.addEventListener('change', function () { clearTimeout(timer); timer = setTimeout(update, 350); }); });
    slot.addEventListener('click', onClick);
    setTimeout(update, 400);
  }
  window.TB_PB = { compose: compose, prefillFrom: prefillFrom, _lists: { FOR: FOR, BY: BY, CIRC: CIRC, ASK: ASK, TONE: TONE, AGES: AGES } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
