/* Truli Blessed header v2: shrink on scroll + accessible mobile sheet. No dependencies. */
(function(){
  var hdr=document.querySelector('.tb-header'); if(!hdr) return;
  var btn=hdr.querySelector('.tb-burger'), sheet=document.getElementById('tb-sheet'), last=null;
  // shrink on scroll (rAF-throttled, with hysteresis)
  var ticking=false;
  function onScroll(){ if(ticking) return; ticking=true; requestAnimationFrame(function(){
    var y=window.scrollY; if(y>32) hdr.classList.add('is-scrolled'); else if(y<8) hdr.classList.remove('is-scrolled'); ticking=false; }); }
  window.addEventListener('scroll',onScroll,{passive:true}); onScroll();
  if(!btn||!sheet) return;
  function focusables(){ return [btn].concat([].slice.call(sheet.querySelectorAll('a[href],button:not([disabled])'))); }
  function open(){ last=document.activeElement; sheet.hidden=false; void sheet.offsetWidth; sheet.classList.add('is-open');
    btn.setAttribute('aria-expanded','true'); btn.setAttribute('aria-label','Close menu'); document.body.classList.add('tb-locked');
    var first=sheet.querySelector('a'); if(first) first.focus({preventScroll:true}); }
  function close(restore){ sheet.classList.remove('is-open'); btn.setAttribute('aria-expanded','false'); btn.setAttribute('aria-label','Open menu');
    document.body.classList.remove('tb-locked');
    setTimeout(function(){ if(!sheet.classList.contains('is-open')) sheet.hidden=true; },280);
    if(restore!==false) (last||btn).focus({preventScroll:true}); }
  btn.addEventListener('click',function(){ btn.getAttribute('aria-expanded')==='true'?close():open(); });
  sheet.addEventListener('click',function(e){ if(e.target.closest('a')) close(false); });
  document.addEventListener('keydown',function(e){
    if(btn.getAttribute('aria-expanded')!=='true') return;
    if(e.key==='Escape'){ e.preventDefault(); close(); return; }
    if(e.key==='Tab'){ var f=focusables(), i=f.indexOf(document.activeElement);
      if(e.shiftKey&&i<=0){ e.preventDefault(); f[f.length-1].focus(); }
      else if(!e.shiftKey&&i===f.length-1){ e.preventDefault(); f[0].focus(); } }
  });
  window.matchMedia('(min-width:900px)').addEventListener('change',function(m){ if(m.matches&&btn.getAttribute('aria-expanded')==='true') close(false); });
  // mockup hooks: ?state=scrolled | ?menu=open (prototype only; harmless in production)
  var q=new URLSearchParams(location.search);
  if(q.get('state')==='scrolled'){ hdr.classList.add('is-scrolled'); window.removeEventListener('scroll',onScroll); }
  if(q.get('menu')==='open') open();
})();
