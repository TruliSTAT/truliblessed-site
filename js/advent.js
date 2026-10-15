/* Advent doors unlock by the visitor's local date. Add ?preview to see every door. No storage. */
(function(){var now=new Date(),t=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0'),pv=/[?&]preview/.test(location.search),open=0;
document.querySelectorAll('.door').forEach(function(d){if(pv||d.dataset.date<=t){open++;if(d.dataset.date===t){d.open=true;d.classList.add('today')}}
 else{d.classList.add('locked');d.querySelector('summary').setAttribute('aria-disabled','true');d.querySelector('summary').addEventListener('click',function(e){e.preventDefault()});d.querySelector('.door-body').innerHTML='<p>Opens '+d.querySelector('.dd').textContent+'.</p>'}});
var l=document.getElementById('adv-label'),start=new Date(2026,10,26),days=Math.ceil((start-now)/864e5);
if(pv)l.innerHTML='<strong>Preview mode:</strong> every door is open.';
else if(days>0)l.innerHTML='The first door opens in <strong>'+days+' day'+(days==1?'':'s')+'</strong>, on <strong>Thanksgiving Day, Thursday, Nov 26</strong>.';
else if(open<30)l.innerHTML='<strong>Day '+open+' of 30.</strong> Today\u2019s door is open below.';
else l.innerHTML='<strong>Merry Christmas!</strong> All 30 doors are open.';})();
