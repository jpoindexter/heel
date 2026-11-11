/** Deliberately lacks text-input DOM or accessible submit buttons: the agent must use the screenshot. */
export const CANVAS_FORM = `<!doctype html><html><head><title>Custom application page</title></head><body>
<canvas id="form" width="1000" height="600" tabindex="0"></canvas><input id="cv" name="cv" type="file" hidden>
<script>
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),cv=document.querySelector('#cv');
let name='',editing=false;const shift=Math.floor(Math.random()*80);
function draw(){ctx.fillStyle='white';ctx.fillRect(0,0,1000,600);ctx.font='24px sans-serif';ctx.fillStyle='#111';ctx.fillText('Researcher application',40+shift,40);ctx.font='18px sans-serif';ctx.fillText('Full name',40+shift,85);ctx.strokeStyle=editing?'#237a50':'#555';ctx.strokeRect(40+shift,100,420,48);ctx.fillText(name||'Click here to enter your name',52+shift,130);ctx.fillStyle='#e0e8ef';ctx.fillRect(40+shift,180,420,44);ctx.fillStyle='#111';ctx.fillText(cv.files[0]?'CV: '+cv.files[0].name:'Attach CV',52+shift,209);ctx.fillStyle='#286746';ctx.fillRect(40+shift,260,280,48);ctx.fillStyle='white';ctx.fillText('Submit application',52+shift,291);}
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(x<40+shift||x>460+shift)return;if(y>=100&&y<=148){editing=true;canvas.focus();draw();}else if(y>=180&&y<=224){cv.click();}else if(y>=260&&y<=308){if(!name||!cv.files[0])return;const data=new FormData();data.append('name',name);data.append('cv',cv.files[0]);fetch('/submit',{method:'POST',body:data}).then(r=>r.text()).then(t=>document.body.innerHTML=t);}});
canvas.addEventListener('keydown',e=>{if(!editing)return;e.preventDefault();if(e.key==='Backspace')name=name.slice(0,-1);else if(e.key.length===1)name+=e.key;draw();});cv.addEventListener('change',draw);draw();
</script></body></html>`;
