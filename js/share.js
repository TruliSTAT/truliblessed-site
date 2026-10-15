/* Share a verse card: native Web Share API, or download a PNG drawn on a canvas. Nothing is uploaded or tracked. */
(function(){
function wrap(ctx,text,maxW){var w=text.split(' '),lines=[],l='';w.forEach(function(x){var t=l?l+' '+x:x;if(ctx.measureText(t).width>maxW&&l){lines.push(l);l=x}else l=t});if(l)lines.push(l);return lines}
function card(text,ref){var c=document.createElement('canvas');c.width=1080;c.height=1080;var x=c.getContext('2d');
var g=x.createLinearGradient(0,0,0,1080);g.addColorStop(0,'#1E2A4A');g.addColorStop(1,'#0E1428');x.fillStyle=g;x.fillRect(0,0,1080,1080);
var r=x.createRadialGradient(540,0,10,540,0,700);r.addColorStop(0,'rgba(227,168,58,.45)');r.addColorStop(1,'rgba(227,168,58,0)');x.fillStyle=r;x.fillRect(0,0,1080,1080);
x.fillStyle='#E3A83A';x.font='700 30px "DM Sans",sans-serif';x.textAlign='center';x.fillText("✦ LUMI'S SPARK",540,150);
var size=text.length>220?44:text.length>140?52:60,lines;do{x.font='italic 500 '+size+'px Lora,Georgia,serif';lines=wrap(x,'“'+text+'”',880);size-=2}while(lines.length*size*1.45>620&&size>28);
var lh=(size+2)*1.45,y=540-(lines.length*lh)/2+lh/2;x.fillStyle='#F4E9D3';lines.forEach(function(l,i){x.fillText(l,540,y+i*lh)});
x.fillStyle='#FFD66B';x.font='700 34px "DM Sans",sans-serif';x.fillText(ref.toUpperCase(),540,y+lines.length*lh+40);
x.fillStyle='#1F5F6B';x.beginPath();x.ellipse(540,1180,800,220,0,0,Math.PI*2);x.fill();
x.fillStyle='#F4E9D3';x.font='800 34px "Bricolage Grotesque","DM Sans",sans-serif';x.fillText('TRULI BLESSED · truliblessed.com',540,1035);return c}
function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-')}
document.addEventListener('click',function(ev){var b=ev.target.closest('.js-share,.js-png');if(!b)return;var w=b.closest('.share'),t=w.dataset.text,ref=w.dataset.ref;
 if(b.classList.contains('js-png')){var a=document.createElement('a');a.download='truli-blessed-'+slug(ref)+'.png';a.href=card(t,ref).toDataURL('image/png');a.click();return}
 var msg='“'+t+'” ('+ref+')',url=location.href.split('#')[0];
 if(navigator.share){navigator.share({title:'Truli Blessed',text:msg,url:url}).catch(function(){});}
 else if(navigator.clipboard){navigator.clipboard.writeText(msg+' '+url).then(function(){b.textContent='Copied!';setTimeout(function(){b.textContent='Share'},1800)})}
});
window.TBShareCard=card;})();
