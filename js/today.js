/* /today/: rotate the 30-day Spark by local date; gentle "Lumi's Glow" streak in localStorage only. */
(function(){
var D=window.TB_DAYS,M=window.TB_MOODS;if(!D)return;
function key(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
var now=new Date(),base=new Date(2026,9,19),n=Math.round((new Date(now.getFullYear(),now.getMonth(),now.getDate())-base)/864e5),day=D[((n%30)+30)%30];
function esc(s){var p=document.createElement('p');p.textContent=s;return p.innerHTML}
function q(v){return '<blockquote>“'+esc(v.text)+'” <cite>'+esc(v.ref)+' BSB</cite></blockquote>'}
document.getElementById('today-date').textContent=now.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
document.getElementById('today-theme').textContent=day.theme;
var ver='teen';
function spark(){var v=day[ver],c=document.getElementById('spark');c.querySelector('blockquote').outerHTML=q(v);var note=document.getElementById('spark-note');
 if(v.note){note.textContent=v.note;note.hidden=false}else note.hidden=true;
 var s=c.parentNode.querySelector('.share');s.dataset.text=v.text;s.dataset.ref=v.ref+' BSB';
 document.querySelectorAll('[role=tab]').forEach(function(t){t.setAttribute('aria-selected',t.dataset.v===ver)})}
document.querySelectorAll('[role=tab]').forEach(function(t){t.addEventListener('click',function(){ver=t.dataset.v;spark()})});
spark();document.getElementById('story').textContent=day.story;document.getElementById('night').innerHTML=q(day.night)+'<p class="spark-note">'+esc(day.night.note)+'</p>';
document.getElementById('prayer').textContent=day.prayer;
// Lumi's Glow: shown only AFTER today's Spark, never shames a missed day.
var K='tb_glow',g=document.getElementById('glow');
function load(){try{return JSON.parse(localStorage.getItem(K))||{}}catch(e){return {}}}
function show(st,msg){g.hidden=false;var pct=Math.min(100,st.streak*100/7);
 g.innerHTML='<p><strong>'+msg+'</strong></p><div class="meter" role="img" aria-label="Glow '+st.streak+' days"><span style="width:'+pct+'%"></span></div><p class="fine">Current glow: '+st.streak+' day'+(st.streak==1?'':'s')+' · Brightest: '+st.best+'</p>'}
document.getElementById('amen').addEventListener('click',function(){var st=load(),t=key(now),y=new Date(now);y.setDate(y.getDate()-1);var msg;
 if(st.last===t){msg='Already glowing today. See you tomorrow! ✦'}
 else if(st.last===key(y)){st.streak=(st.streak||0)+1;msg='Your glow is growing! ✦'}
 else if(st.last){st.streak=1;msg='Welcome back. Lumi saved your spot. ✦'}
 else{st.streak=1;msg='First spark lit! ✦'}
 st.last=t;st.best=Math.max(st.best||0,st.streak);try{localStorage.setItem(K,JSON.stringify(st))}catch(e){}show(st,msg)});
document.getElementById('glow-reset').addEventListener('click',function(){try{localStorage.removeItem(K)}catch(e){}g.hidden=true});
document.querySelectorAll('.mood').forEach(function(b){b.addEventListener('click',function(){var m=M.filter(function(x){return x.id===b.dataset.m})[0];
 document.querySelectorAll('.mood').forEach(function(o){o.setAttribute('aria-pressed',o===b)});
 document.getElementById('mood-out').innerHTML='<div class="vcard">'+q(m)+'<p>'+esc(m.note)+'</p></div>'})});
})();
