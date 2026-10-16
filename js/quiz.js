/* Client-side quiz: answers are tallied in memory only. No storage, no network. */
(function(){var Q=window.TB_QUIZ,f=document.getElementById('quiz'),out=document.getElementById('result');
function esc(s){var p=document.createElement('p');p.textContent=s;return p.innerHTML}
f.addEventListener('submit',function(){var tally={},order=Object.keys(Q.heroes);
 for(var i=0;i<Q.qs.length;i++){var c=f.querySelector('input[name=q'+i+']:checked');if(!c){f.querySelector('input[name=q'+i+']').focus();return}tally[c.value]=(tally[c.value]||0)+1}
 var best=order.reduce(function(a,b){return (tally[b]||0)>(tally[a]||0)?b:a}),h=Q.heroes[best];
 out.innerHTML='<div class="spark-card"><p class="spark-kicker">✦ Your Bible hero</p><h2>'+esc(h.name)+': '+esc(h.tag)+'</h2><p>'+esc(h.blurb)+'</p><blockquote>“'+esc(h.text)+'” <cite>'+esc(h.ref)+' BSB</cite></blockquote></div>'+
 '<div class="share" data-ref="'+esc(h.ref)+' BSB" data-text="'+esc(h.text)+'"><button type="button" class="btn-sm js-share">Share</button> <button type="button" class="btn-sm js-png">Download card</button> <button type="button" class="btn-sm" id="again">Take it again</button></div>';
 document.getElementById('again').onclick=function(){f.reset();out.innerHTML='';window.scrollTo(0,0)};out.scrollIntoView({behavior:'smooth'})});})();
