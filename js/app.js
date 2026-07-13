const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const welcome=$('#welcome'),intro=$('#intro'),world=$('#world'),hud=$('#hud'),panel=$('#panel'),panelContent=$('#panelContent'),sideMenu=$('#sideMenu'),audio=$('#backgroundAudio');
let scale=1,tx=0,ty=0,dragging=false,startX=0,startY=0,openedReasons=new Set(),micStream=null,audioCtx=null,analyser=null,micRaf=null;

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function enterIntro(full=false){if(full) document.documentElement.requestFullscreen?.().catch(()=>{});welcome.classList.remove('active');intro.classList.add('active');audio.volume=.35;audio.play().catch(()=>toast('Add assets/music/background.mp3 to enable music.'))}
$('#fullscreenStart').onclick=()=>enterIntro(true);$('#regularStart').onclick=()=>enterIntro(false);
$('#beginStory').onclick=()=>{intro.classList.remove('active');world.classList.remove('hidden');hud.classList.remove('hidden');animateEntrance()};
$('#fullscreenToggle').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();
$('#musicToggle').onclick=()=>{audio.paused?audio.play().catch(()=>toast('Add your background MP3 first.')):audio.pause();$('#musicToggle').textContent=audio.paused?'♪':'♫'};

function fadeAudioOut(duration=900){
  if(audio.paused)return;
  const start=audio.volume, begun=performance.now();
  const step=now=>{const p=Math.min(1,(now-begun)/duration);audio.volume=start*(1-p);if(p<1)requestAnimationFrame(step);else audio.pause()};
  requestAnimationFrame(step);
}
function enterBirthdayPlanet(){
  if(document.body.classList.contains('planet-transitioning'))return;
  document.body.classList.add('planet-transitioning');
  sideMenu.classList.remove('open');closePanel();fadeAudioOut();
  const planet=document.querySelector('.planet-birthday');
  planet?.animate([{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(2.7)',filter:'brightness(2.4) blur(1px)'}],{duration:1200,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
  const overlay=document.createElement('div');overlay.className='birthday-transition';overlay.innerHTML='<div><p class="eyebrow">The final destination</p><h2>The final celebration is waiting.</h2><span>Entering Birthday Planet…</span></div>';document.body.appendChild(overlay);
  requestAnimationFrame(()=>overlay.classList.add('show'));
  setTimeout(()=>location.href='birthday-scene.html',1550);
}
function returnNearBirthdayPlanet(){
  welcome.classList.remove('active');intro.classList.remove('active');world.classList.remove('hidden');hud.classList.remove('hidden');
  scale=1.28;tx=-innerWidth*.12;ty=innerHeight*.05;updateWorld();
  $('#locationLabel').textContent='Birthday Planet';
  setTimeout(()=>toast('Welcome back to the universe.'),500);
}
if(location.hash==='#birthday-planet')returnNearBirthdayPlanet();

function animateEntrance(){world.animate([{opacity:0,transform:'scale(.75)'},{opacity:1,transform:'scale(1)'}],{duration:1700,easing:'cubic-bezier(.2,.7,.2,1)'})}
function updateWorld(){world.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`}
world.addEventListener('pointerdown',e=>{if(e.target.closest('.planet,.secret'))return;dragging=true;world.classList.add('dragging');startX=e.clientX-tx;startY=e.clientY-ty;world.setPointerCapture(e.pointerId)});
world.addEventListener('pointermove',e=>{if(!dragging)return;tx=e.clientX-startX;ty=e.clientY-startY;updateWorld()});
world.addEventListener('pointerup',()=>{dragging=false;world.classList.remove('dragging')});
world.addEventListener('wheel',e=>{e.preventDefault();scale=Math.min(1.65,Math.max(.55,scale-e.deltaY*.001));updateWorld()},{passive:false});

$('#menuBtn').onclick=()=>{sideMenu.classList.add('open');sideMenu.setAttribute('aria-hidden','false')};$('#closeMenu').onclick=()=>{sideMenu.classList.remove('open');sideMenu.setAttribute('aria-hidden','true')};
DESTINATIONS.forEach(([id,label])=>{const b=document.createElement('button');b.className='nav-item';b.textContent=label;b.onclick=()=>{id==='birthday'?enterBirthdayPlanet():openSection(id);sideMenu.classList.remove('open')};$('#destinationList').appendChild(b)});
$$('.planet').forEach(p=>p.onclick=()=>p.dataset.section==='birthday'?enterBirthdayPlanet():openSection(p.dataset.section));$('#closePanel').onclick=closePanel;
function openSection(id){$('#locationLabel').textContent=DESTINATIONS.find(d=>d[0]===id)?.[1]||'Our Little Universe';panelContent.innerHTML=renderSection(id);panel.classList.add('open');panel.setAttribute('aria-hidden','false');bindSection(id)}
function closePanel(){panel.classList.remove('open');panel.setAttribute('aria-hidden','true');$('#locationLabel').textContent='Our Little Universe';stopMic()}
const title=(h,p)=>`<header class="section-title"><p class="eyebrow">A place in our universe</p><h2>${h}</h2><p>${p}</p></header>`;
function renderSection(id){
 if(id==='memories')return title('Memory Constellation','Nine moments, ready for your photos, dates, and stories.')+`<div class="grid memory-grid">${MEMORIES.map((m,i)=>`<article class="card memory-card"><button data-memory="${i}"><p class="meta">Memory ${i+1}</p><h3>${m.title}</h3><div class="placeholder">Photo placeholder</div><p>${m.description}</p></button></article>`).join('')}</div>`;
 if(id==='photos')return title('Photo Planet','Replace these frames with your favourite photos later.')+`<div class="grid photo-grid">${Array.from({length:12},(_,i)=>`<div class="photo-frame" style="--r:${(i%2?2:-2)+(i%3)}deg"><div class="placeholder">Photo ${i+1}</div></div>`).join('')}</div>`;
 if(id==='music')return title('Music Planet','Add legally obtained audio files inside assets/music, or connect your preferred music links.')+`<div class="grid song-list">${SONGS.map((s,i)=>`<article class="card song-card"><div class="song-icon">♫</div><button data-song="${i}"><p class="meta">${s[2]}</p><h3>${s[0]}</h3><p>${s[1]}</p></button></article>`).join('')}</div>`;
 if(id==='laughter')return title('Laughing Planet','The place for all the little things only we understand.')+`<div class="grid memory-grid"><article class="card"><p class="meta">Nickname</p><h3>Pookie</h3><p>One small word that somehow carries a whole world.</p></article><article class="card"><p class="meta">Something you always say</p><h3>“Bagshaa”</h3><p>A tiny phrase that always sounds like you.</p></article>${['Inside jokes','Funny screenshots','Embarrassing moments','Playful arguments'].map(x=>`<article class="card"><p class="meta">Add later</p><h3>${x}</h3><div class="placeholder">Future memory</div></article>`).join('')}</div>`;
 if(id==='reasons')return title('100 Reasons I Love You','Every star holds one reason. Open them in any order.')+`<div class="reason-progress"><span id="reasonCount">${openedReasons.size}</span> of 100 reasons discovered</div><div class="reasons-wrap">${REASONS.map((r,i)=>`<button class="reason-star ${openedReasons.has(i)?'opened':''}" data-reason="${i}" aria-label="Reason ${i+1}"><span>${i+1}</span></button>`).join('')}</div>`;
 if(id==='future')return title('Future Planet','A home for the dreams we have not lived yet.')+`<div class="grid future-grid">${['Places we will visit','A perfect date','Our next anniversary','Small everyday dreams','A future pet','A promise for this year'].map(x=>`<article class="card future-card"><div><p class="meta">Add later</p><h3>${x}</h3></div></article>`).join('')}</div>`;
 if(id==='letter')return title('Love Letter Moon','This space is ready for the words you will add later.')+`<article class="letter-paper">My love,<br><br>This letter is waiting for the words only you can write. Replace this placeholder when you are ready.<small>— Always yours</small></article>`;
 if(id==='birthday')return title('Happy 19th Birthday','You make my universe brighter simply by being in it.')+`<div class="cake-scene"><p>I hope this year brings you the same happiness, love, and warmth that you bring into my life every day.</p><div class="cake"><div class="candles">${Array.from({length:19},()=>`<span class="candle"><i class="flame"></i></span>`).join('')}</div></div><p id="wishText">Make a wish, then blow out the candles.</p><div class="birthday-actions"><button id="micBtn" class="primary-btn">Use Microphone</button><button id="blowBtn" class="ghost-btn">Tap to Blow Out</button></div></div>`;
}
function bindSection(id){
 if(id==='memories')$$('[data-memory]').forEach(b=>b.onclick=()=>toast('Edit this memory inside js/data.js.'));
 if(id==='music')$$('[data-song]').forEach((b,i)=>b.onclick=()=>toast(`Add track ${i+1} to assets/music and connect it in app.js.`));
 if(id==='reasons')$$('[data-reason]').forEach(b=>b.onclick=()=>{const i=+b.dataset.reason;openedReasons.add(i);b.classList.add('opened');$('#reasonCount').textContent=openedReasons.size;toast(REASONS[i]);if(openedReasons.size===100)toast('And somehow, this still is not every reason.')});
 if(id==='birthday'){setTimeout(()=>{$('#blowBtn').onclick=celebrate;$('#micBtn').onclick=startMic},0)}
}
async function startMic(){
 try{micStream=await navigator.mediaDevices.getUserMedia({audio:true});audioCtx=new AudioContext();analyser=audioCtx.createAnalyser();analyser.fftSize=512;audioCtx.createMediaStreamSource(micStream).connect(analyser);const data=new Uint8Array(analyser.frequencyBinCount);let strong=0;const tick=()=>{analyser.getByteFrequencyData(data);const avg=data.reduce((a,b)=>a+b,0)/data.length;strong=avg>42?strong+1:Math.max(0,strong-1);if(strong>6){celebrate();stopMic();return}micRaf=requestAnimationFrame(tick)};tick();toast('Microphone ready. Blow toward it.')}catch{toast('Microphone access was blocked. Use the button instead.')}
}
function stopMic(){if(micRaf)cancelAnimationFrame(micRaf);micStream?.getTracks().forEach(t=>t.stop());audioCtx?.close?.();micStream=audioCtx=analyser=null}
function celebrate(){const candles=$$('.candle');candles.forEach((c,i)=>setTimeout(()=>c.classList.add('out'),i*55));setTimeout(()=>{$('#wishText').textContent='Your wish is on its way. Happy 19th Birthday!';launchConfetti();launchFireworks();launchBalloons()},1100)}
function launchConfetti(){for(let i=0;i<120;i++){const e=document.createElement('i');e.className='confetti';e.style.left=Math.random()*100+'vw';e.style.background=`hsl(${Math.random()*360} 90% 70%)`;e.style.setProperty('--d',2+Math.random()*3+'s');e.style.setProperty('--x',(Math.random()*220-110)+'px');document.body.appendChild(e);setTimeout(()=>e.remove(),5200)}}
function launchFireworks(){for(let i=0;i<8;i++)setTimeout(()=>{const e=document.createElement('i');e.className='firework';e.style.left=15+Math.random()*70+'vw';e.style.top=12+Math.random()*55+'vh';document.body.appendChild(e);setTimeout(()=>e.remove(),1500)},i*260)}
function launchBalloons(){for(let i=0;i<18;i++){const e=document.createElement('i');e.className='balloon';e.style.left=Math.random()*95+'vw';e.style.setProperty('--d',4+Math.random()*4+'s');e.style.filter=`hue-rotate(${Math.random()*180}deg)`;document.body.appendChild(e);setTimeout(()=>e.remove(),8500)}}

$('#secretCapy').onclick=()=>toast('You found the space capybara.');$('#secretDog').onclick=()=>toast('A tiny guardian is watching over this universe.');$('#secretTulip').onclick=()=>toast('A tulip for the brightest person in this universe.');

(function initSpace(){if(!window.THREE)return;const canvas=$('#universe'),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,2000),renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);camera.position.z=7;const geo=new THREE.BufferGeometry(),count=2600,pos=new Float32Array(count*3),col=new Float32Array(count*3);for(let i=0;i<count;i++){const r=80*Math.cbrt(Math.random()),t=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1);pos[i*3]=r*Math.sin(p)*Math.cos(t);pos[i*3+1]=r*Math.sin(p)*Math.sin(t);pos[i*3+2]=r*Math.cos(p);const purple=Math.random()>.7;col[i*3]=purple?.8:1;col[i*3+1]=purple?.55:.92;col[i*3+2]=1}geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));const pts=new THREE.Points(geo,new THREE.PointsMaterial({size:.095,vertexColors:true,transparent:true,opacity:.92,sizeAttenuation:true}));scene.add(pts);function animate(){requestAnimationFrame(animate);pts.rotation.y+=.00022;pts.rotation.x+=.00004;renderer.render(scene,camera)}animate();addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)})})();
