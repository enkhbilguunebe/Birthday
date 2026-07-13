import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas=document.querySelector('#birthdayCanvas');
const loading=document.querySelector('#loading');
const loadingBar=document.querySelector('#loadingBar');
const loadingText=document.querySelector('#loadingText');
const toastEl=document.querySelector('#toast');
const birthday=document.querySelector('#birthdayMusic');
const effects=document.querySelector('#effects');
const frameEditor=document.querySelector('#frameEditor');
const photoInput=document.querySelector('#photoInput');
const micMeter=document.querySelector('#micMeter span');
let selectedFrame=-1, micStream=null, audioCtx=null, analyser=null, micRAF=null, blowFrames=0, uiHidden=false, celebration=false;

function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastEl._t);toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),2500)}
function progress(n){loadingBar.style.width=`${n}%`;loadingText.textContent=`${Math.round(n)}%`}
progress(12);

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x090310,0.012);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,300);
camera.position.set(0,5.4,12.5);
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<800?1:1.25));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=false;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
progress(25);

const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.065;controls.target.set(0,1.6,0);controls.minDistance=6;controls.maxDistance=20;controls.minPolarAngle=Math.PI*.29;controls.maxPolarAngle=Math.PI*.53;controls.enablePan=false;controls.rotateSpeed=.58;controls.zoomSpeed=.8;

scene.add(new THREE.HemisphereLight(0x6e73ff,0x170711,1.1));
const key=new THREE.SpotLight(0xffd8bd,85,35,Math.PI/5,.4,1.4);key.position.set(-5,10,7);key.target.position.set(0,0,0);key.castShadow=false;scene.add(key,key.target);
const purpleLight=new THREE.PointLight(0xa85cff,28,24,2);purpleLight.position.set(5,6,-2);scene.add(purpleLight);

function roundedBox(w,h,d,color,rough=.6,metal=.02){const g=new THREE.BoxGeometry(w,h,d,6,3,3);const m=new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});const mesh=new THREE.Mesh(g,m);mesh.castShadow=false;mesh.receiveShadow=false;return mesh}
function addStars(){const count=innerWidth<800?260:420,p=new Float32Array(count*3);for(let i=0;i<count;i++){const r=80+Math.random()*80,a=Math.random()*Math.PI*2,y=12+Math.random()*70;p[i*3]=Math.cos(a)*r;p[i*3+1]=y;p[i*3+2]=Math.sin(a)*r}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));scene.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xe7ddff,size:.28,transparent:true,opacity:.8,sizeAttenuation:true})))}
addStars();

// Night sky dome
const sky=new THREE.Mesh(new THREE.SphereGeometry(180,20,12),new THREE.MeshBasicMaterial({color:0x07030e,side:THREE.BackSide}));scene.add(sky);

// Water and skyline
const water=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x050915,roughness:.22,metalness:.65}));water.rotation.x=-Math.PI/2;water.position.y=-1.22;water.receiveShadow=true;scene.add(water);
const skyline=new THREE.Group();
const cityColors=[0x2b2360,0x242b5f,0x442055,0x17345b,0x52213f];
for(let i=0;i<(innerWidth<800?28:44);i++){
  const buildingCount=innerWidth<800?28:44; const angle=(i/buildingCount)*Math.PI*2; const radius=35+Math.random()*10; const h=4+Math.random()*16; const w=.9+Math.random()*2.2;
  const b=roundedBox(w,h,w*.75,cityColors[i%cityColors.length],.65,.08);b.position.set(Math.cos(angle)*radius,h/2-1.1,Math.sin(angle)*radius);b.rotation.y=-angle+Math.PI/2;skyline.add(b);
  const windows=new THREE.Mesh(new THREE.PlaneGeometry(w*.7,h*.82),new THREE.MeshBasicMaterial({color:i%3===0?0xff4d94:0x7ac8ff,transparent:true,opacity:.45,side:THREE.DoubleSide}));windows.position.copy(b.position);windows.position.y+=.2;windows.position.x-=Math.cos(angle)*w*.39;windows.position.z-=Math.sin(angle)*w*.39;windows.rotation.y=-angle+Math.PI/2;skyline.add(windows)
}
scene.add(skyline);
progress(38);

// Table and cloth
const tableTop=new THREE.Mesh(new THREE.CylinderGeometry(6.4,6.4,.42,32),new THREE.MeshStandardMaterial({color:0x5a352d,roughness:.72}));tableTop.position.y=-.05;tableTop.castShadow=true;tableTop.receiveShadow=true;scene.add(tableTop);
const clothCanvas=document.createElement('canvas');clothCanvas.width=512;clothCanvas.height=512;const cctx=clothCanvas.getContext('2d');const s=64;for(let y=0;y<8;y++)for(let x=0;x<8;x++){cctx.fillStyle=(x+y)%2? '#b8a9bd':'#34303a';cctx.fillRect(x*s,y*s,s,s)}cctx.globalAlpha=.3;cctx.fillStyle='#6a3b83';for(let i=0;i<8;i++)cctx.fillRect(i*s,0,5,512);const clothTex=new THREE.CanvasTexture(clothCanvas);clothTex.wrapS=clothTex.wrapT=THREE.RepeatWrapping;clothTex.repeat.set(1.3,1.3);clothTex.colorSpace=THREE.SRGBColorSpace;
const cloth=new THREE.Mesh(new THREE.CylinderGeometry(6.18,6.18,.12,32),new THREE.MeshStandardMaterial({map:clothTex,roughness:.88}));cloth.position.y=.2;cloth.receiveShadow=true;scene.add(cloth);

// Cake stand
const stand=new THREE.Mesh(new THREE.CylinderGeometry(2.62,2.9,.22,32),new THREE.MeshPhysicalMaterial({color:0xf3e9ef,roughness:.18,metalness:.05,clearcoat:.75}));stand.position.y=.47;stand.castShadow=true;stand.receiveShadow=true;scene.add(stand);

const cake=new THREE.Group();cake.position.y=.78;scene.add(cake);
function cakeLayer(y,h,color,rough=.58){const m=roundedBox(4.2,h,3.65,color,rough,.02);m.position.y=y;m.geometry.translate(0,0,0);cake.add(m);return m}
cakeLayer(.3,.52,0x5a2f20,.72);cakeLayer(.68,.28,0xf3dfbd,.52);cakeLayer(1.04,.5,0x70402b,.72);cakeLayer(1.42,.3,0xffe8c8,.5);cakeLayer(1.78,.48,0x603522,.72);cakeLayer(2.13,.34,0xffe9c8,.5);
const cocoa=roundedBox(4.25,.12,3.7,0x4b2418,.92,0);cocoa.position.y=2.37;cake.add(cocoa);
// Cocoa crumbs
const crumbGeo=new THREE.SphereGeometry(.035,4,3),crumbMat=new THREE.MeshStandardMaterial({color:0x2d140d,roughness:1});for(let i=0;i<28;i++){const crumb=new THREE.Mesh(crumbGeo,crumbMat);crumb.position.set((Math.random()-.5)*4.05,2.46,(Math.random()-.5)*3.5);cake.add(crumb)}
// plaque
const plaque=roundedBox(1.7,.52,.12,0x4a2118,.45,.04);plaque.position.set(0,2.83,.25);plaque.rotation.x=-.25;cake.add(plaque);
// chocolate sticks
for(const x of [-.42,.42]){const stick=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,1.6,14),new THREE.MeshStandardMaterial({color:0x542214,roughness:.45}));stick.position.set(x,3.1,.1);stick.rotation.z=x<0?-.16:.14;cake.add(stick)}

// Candles
const candles=[];
const candleGroup=new THREE.Group();cake.add(candleGroup);
const flameGeo=new THREE.SphereGeometry(.09,10,8);
for(let i=0;i<19;i++){
  const row=i<10?0:1, idx=row===0?i:i-10, count=row===0?10:9;
  const x=(idx-(count-1)/2)*.37, z=row===0?-.72:.68;
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.045,.05,.58,10),new THREE.MeshStandardMaterial({color:i%2?0xe8d8ff:0xc58aff,roughness:.55}));body.position.set(x,2.74,z);body.castShadow=true;candleGroup.add(body);
  const flameMat=new THREE.MeshBasicMaterial({color:0xffc45c,transparent:true,opacity:.95});const flame=new THREE.Mesh(flameGeo,flameMat);flame.scale.set(.75,1.65,.75);flame.position.set(x,3.12,z);candleGroup.add(flame);
  const light=i%7===0?new THREE.PointLight(0xff9a35,.34,2.8,2):null;if(light){light.position.copy(flame.position);candleGroup.add(light);}
  candles.push({body,flame,light,out:false,phase:Math.random()*10})
}
progress(53);

// Tulips and decor
function flower(x,z,color=0xb461e8){const g=new THREE.Group();const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.03,.7,8),new THREE.MeshStandardMaterial({color:0x3d7d43,roughness:.8}));stem.position.y=.35;g.add(stem);for(let i=0;i<5;i++){const petal=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),new THREE.MeshStandardMaterial({color,roughness:.55}));petal.scale.set(.65,1.2,.65);petal.position.set(Math.cos(i*1.256)*.1,.79,Math.sin(i*1.256)*.1);g.add(petal)}g.position.set(x,.35,z);scene.add(g)}
flower(-3.7,1.9);flower(-4.1,1.55,0xd88cf2);flower(3.8,1.6,0xc669f0);flower(4.15,1.95,0x9f5fda);
function smallCandle(x,z){const g=new THREE.Group();const cup=new THREE.Mesh(new THREE.CylinderGeometry(.18,.2,.16,18),new THREE.MeshPhysicalMaterial({color:0xf2d6ff,transparent:true,opacity:.72,roughness:.25}));const flame=new THREE.Mesh(new THREE.SphereGeometry(.06,8,6),new THREE.MeshBasicMaterial({color:0xffbb62}));flame.scale.y=1.6;flame.position.y=.2;g.add(cup,flame);g.position.set(x,.38,z);scene.add(g)}
[[-4.8,-.5],[4.9,-.6],[-3.1,-3.1],[3.25,-3.15]].forEach(p=>smallCandle(...p));

// 3D photo frames
const frameMeshes=[];const rayTargets=[];
function placeholderTexture(index){const cv=document.createElement('canvas');cv.width=600;cv.height=800;const x=cv.getContext('2d');const grad=x.createLinearGradient(0,0,600,800);grad.addColorStop(0,'#3b1d54');grad.addColorStop(1,'#12081e');x.fillStyle=grad;x.fillRect(0,0,600,800);x.strokeStyle='#b78ada';x.lineWidth=8;x.strokeRect(34,34,532,732);x.fillStyle='#f4deff';x.textAlign='center';x.font='600 46px Georgia';x.fillText('Add a memory',300,385);x.font='30px Arial';x.fillStyle='#c5b0d0';x.fillText(`Photo ${index+1}`,300,440);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t}
function frame(index,x,z,rotY,scale=.92){const g=new THREE.Group();g.position.set(x,.52,z);g.rotation.y=rotY;g.scale.setScalar(scale);
  const border=roundedBox(1.72,2.18,.16,0xd3a5c7,.34,.18);border.position.y=1.1;g.add(border);
  const photo=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.78),new THREE.MeshBasicMaterial({map:placeholderTexture(index),side:THREE.DoubleSide}));photo.position.set(0,1.1,.091);photo.userData.frameIndex=index;g.add(photo);rayTargets.push(photo);
  const stand=roundedBox(.16,1.12,.16,0x9d6c8f,.45,.15);stand.position.set(0,.33,-.55);stand.rotation.x=-.42;g.add(stand);
  scene.add(g);frameMeshes[index]={group:g,photo};restorePhoto(index);return g}
frame(0,-4.7,-.15,.55,.95);frame(1,-3.15,-2.6,.25,.9);frame(2,0,-3.55,0,.76);frame(3,3.15,-2.6,-.25,.9);frame(4,4.7,-.15,-.55,.95);
progress(70);

function applyPhoto(index,dataUrl){const img=new Image();img.onload=()=>{const cv=document.createElement('canvas');cv.width=800;cv.height=1000;const x=cv.getContext('2d');const scale=Math.max(cv.width/img.width,cv.height/img.height),w=img.width*scale,h=img.height*scale;x.fillStyle='#111';x.fillRect(0,0,cv.width,cv.height);x.drawImage(img,(cv.width-w)/2,(cv.height-h)/2,w,h);const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const mesh=frameMeshes[index].photo;mesh.material.map?.dispose();mesh.material.map=tex;mesh.material.needsUpdate=true};img.src=dataUrl}
function restorePhoto(index){const data=localStorage.getItem(`birthday-frame-${index}`);if(data)applyPhoto(index,data)}

// Card notes / hidden surprises
const noteData=[['Pookie',-2.8,2.9,'For my favourite Pookie.'],['Bagshaa',2.8,2.9,'Bagshaa made it all the way to the Birthday Planet.'],['🐕',-5.15,2.6,'Reserved for the person with the biggest heart for animals.'],['capybara',5.05,2.55,'You found the calmest guest at the party.']];
const noteTargets=[];
function makeTextTexture(text){const cv=document.createElement('canvas');cv.width=512;cv.height=256;const x=cv.getContext('2d');x.fillStyle='#efe1ea';x.fillRect(0,0,512,256);x.strokeStyle='#a76ac7';x.lineWidth=10;x.strokeRect(10,10,492,236);x.fillStyle='#4b2858';x.textAlign='center';x.font=text.length>8?'700 54px Georgia':'700 78px Georgia';x.fillText(text,256,145);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t}
noteData.forEach(([label,x,z,msg],i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.55),new THREE.MeshBasicMaterial({map:makeTextTexture(label),side:THREE.DoubleSide}));m.position.set(x,.55,z);m.rotation.x=-Math.PI/2+.18;m.rotation.z=i<2?0:(i===2?.25:-.25);m.userData.message=msg;scene.add(m);noteTargets.push(m)});

// City glow is baked into emissive window planes for better performance.
progress(84);

const clock=new THREE.Clock();let paused=false;
let lastFrame=0;function animate(now=0){requestAnimationFrame(animate);if(paused||now-lastFrame<22)return;lastFrame=now;const t=clock.getElapsedTime();candles.forEach(c=>{if(!c.out){const k=.88+Math.sin(t*15+c.phase)*.13;c.flame.scale.set(.75*k,1.55*k,.75*k);if(c.light)c.light.intensity=.28+Math.random()*.08}});skyline.rotation.y=Math.sin(t*.025)*.015;controls.update();renderer.render(scene,camera)}
animate();

setTimeout(()=>{progress(100);setTimeout(()=>loading.classList.add('done'),350)},450);

function resetView(){camera.position.set(0,5.4,12.5);controls.target.set(0,1.6,0);controls.update()}
function focusCake(){camera.position.set(0,4.4,8.4);controls.target.set(0,1.8,0);controls.update()}
document.querySelector('#resetView').onclick=resetView;document.querySelector('#focusCake').onclick=focusCake;
document.querySelector('#fullscreenToggle').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();
document.querySelector('#closeMessage').onclick=()=>{document.querySelector('#birthdayMessage').classList.add('closed');birthday.volume=.55;birthday.play().catch(()=>toast('Add assets/music/birthday.mp3 to enable the birthday song.'))};
document.querySelector('#musicToggle').onclick=()=>{if(!birthday.paused){birthday.pause();toast('Music muted.')}else birthday.play().catch(()=>toast('Add assets/music/birthday.mp3 first.'))};
document.querySelector('#hideUi').onclick=()=>{uiHidden=!uiHidden;document.body.classList.toggle('ui-hidden',uiHidden);if(uiHidden)toast('Press H to show controls again.')};

const pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster();let down={x:0,y:0};canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY}});canvas.addEventListener('pointerup',e=>{if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)return;pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects([...rayTargets,...noteTargets],false)[0];if(!hit)return;if(hit.object.userData.message){toast(hit.object.userData.message);return}selectedFrame=hit.object.userData.frameIndex;document.querySelector('#frameTitle').textContent=`Photo Frame ${selectedFrame+1}`;frameEditor.classList.add('open');frameEditor.setAttribute('aria-hidden','false')});
function closeEditor(){frameEditor.classList.remove('open');frameEditor.setAttribute('aria-hidden','true')}
document.querySelector('#closeFrameEditor').onclick=closeEditor;document.querySelector('#replacePhoto').onclick=()=>photoInput.click();document.querySelector('#removePhoto').onclick=()=>{if(selectedFrame<0)return;localStorage.removeItem(`birthday-frame-${selectedFrame}`);const mesh=frameMeshes[selectedFrame].photo;mesh.material.map?.dispose();mesh.material.map=placeholderTexture(selectedFrame);mesh.material.needsUpdate=true;toast('Photo removed.')};
photoInput.onchange=()=>{const file=photoInput.files?.[0];if(!file||selectedFrame<0)return;const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const cv=document.createElement('canvas');const max=1000,scale=Math.min(1,max/Math.max(img.width,img.height));cv.width=Math.max(1,Math.round(img.width*scale));cv.height=Math.max(1,Math.round(img.height*scale));cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);const data=cv.toDataURL('image/jpeg',.84);try{localStorage.setItem(`birthday-frame-${selectedFrame}`,data)}catch{toast('This photo is too large to save, but it will work for this visit.')}applyPhoto(selectedFrame,data);toast('Your photo is now inside the frame.');closeEditor()};img.src=reader.result};reader.readAsDataURL(file);photoInput.value=''};

function setCandlesOut(progressCount=19){candles.forEach((c,i)=>{if(i<progressCount&&!c.out){c.out=true;c.flame.visible=false;if(c.light)c.light.visible=false;const smoke=new THREE.Mesh(new THREE.SphereGeometry(.055,7,5),new THREE.MeshBasicMaterial({color:0xb9acbd,transparent:true,opacity:.45}));smoke.position.copy(c.flame.getWorldPosition(new THREE.Vector3()));scene.add(smoke);const start=performance.now();function rise(now){const p=Math.min(1,(now-start)/1400);smoke.position.y+=.008;smoke.scale.setScalar(1+p*2.4);smoke.material.opacity=.45*(1-p);if(p<1)requestAnimationFrame(rise);else{scene.remove(smoke);smoke.geometry.dispose();smoke.material.dispose()}}requestAnimationFrame(rise)}})}
function celebrate(){if(celebration)return;celebration=true;let n=0;const timer=setInterval(()=>{n++;setCandlesOut(n);document.querySelector('#candleStatus').textContent=`${19-n} candles remaining…`;if(n>=19){clearInterval(timer);finishCelebration()}},65)}
function finishCelebration(){stopMic();document.querySelector('#candleStatus').textContent='Happy 19th Birthday. Your wish is on its way.';document.querySelector('#micButton').classList.add('hidden');document.querySelector('#blowButton').classList.add('hidden');document.querySelector('#relightButton').classList.remove('hidden');birthday.volume=.7;birthday.play().catch(()=>toast('Add assets/music/birthday.mp3 to play the birthday song.'));launchEffects()}
function relight(){celebration=false;candles.forEach(c=>{c.out=false;c.flame.visible=true;if(c.light)c.light.visible=true});document.querySelector('#candleStatus').textContent='Make a wish, then blow out the 19 candles.';document.querySelector('#micButton').classList.remove('hidden');document.querySelector('#blowButton').classList.remove('hidden');document.querySelector('#relightButton').classList.add('hidden');birthday.pause();birthday.currentTime=0}
document.querySelector('#blowButton').onclick=celebrate;document.querySelector('#relightButton').onclick=relight;

async function startMic(){try{micStream=await navigator.mediaDevices.getUserMedia({audio:true});audioCtx=new AudioContext();analyser=audioCtx.createAnalyser();analyser.fftSize=512;const src=audioCtx.createMediaStreamSource(micStream);src.connect(analyser);const data=new Uint8Array(analyser.frequencyBinCount);document.querySelector('#candleStatus').textContent='Microphone ready. Blow steadily toward it.';function tick(){analyser.getByteFrequencyData(data);let sum=0;for(let i=5;i<Math.min(70,data.length);i++)sum+=data[i];const avg=sum/65;micMeter.style.width=`${Math.min(100,avg*2.1)}%`;blowFrames=avg>34?blowFrames+1:Math.max(0,blowFrames-2);const count=Math.floor(Math.min(19,blowFrames/2.4));if(count>0)setCandlesOut(count);if(blowFrames>46){celebration=true;setCandlesOut(19);finishCelebration();return}micRAF=requestAnimationFrame(tick)}tick()}catch{toast('Microphone access was blocked. Use “Tap to Blow Out”.')}}
function stopMic(){if(micRAF)cancelAnimationFrame(micRAF);micStream?.getTracks().forEach(t=>t.stop());audioCtx?.close?.();micStream=audioCtx=analyser=null;micMeter.style.width='0'}
document.querySelector('#micButton').onclick=startMic;

function launchEffects(){for(let i=0;i<55;i++){const e=document.createElement('i');e.className='confetti';e.style.left=Math.random()*100+'vw';e.style.background=`hsl(${Math.random()*360} 90% 70%)`;e.style.setProperty('--duration',2.4+Math.random()*3+'s');e.style.setProperty('--drift',Math.random()*240-120+'px');effects.appendChild(e);setTimeout(()=>e.remove(),6000)}for(let i=0;i<9;i++){const b=document.createElement('i');b.className='balloon';b.style.left=Math.random()*95+'vw';b.style.filter=`hue-rotate(${Math.random()*220}deg)`;b.style.setProperty('--duration',5+Math.random()*4+'s');b.style.setProperty('--drift',Math.random()*180-90+'px');effects.appendChild(b);setTimeout(()=>b.remove(),9500)}for(let i=0;i<6;i++)setTimeout(()=>{const f=document.createElement('i');f.className='firework';f.style.left=12+Math.random()*76+'vw';f.style.top=8+Math.random()*48+'vh';effects.appendChild(f);setTimeout(()=>f.remove(),1500)},i*240)}

addEventListener('keydown',e=>{if(e.key==='h'||e.key==='H')document.querySelector('#hideUi').click();if(e.key==='Escape')closeEditor();if(e.key==='ArrowLeft')controls.rotateLeft(.08);if(e.key==='ArrowRight')controls.rotateLeft(-.08);if(e.key==='ArrowUp')controls.rotateUp(.06);if(e.key==='ArrowDown')controls.rotateUp(-.06);if(e.key==='+'||e.key==='=')camera.position.multiplyScalar(.94);if(e.key==='-')camera.position.multiplyScalar(1.06)});
document.addEventListener('visibilitychange',()=>paused=document.hidden);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<800?1:1.25));renderer.setSize(innerWidth,innerHeight)});
