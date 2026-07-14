(() => {
  const loading = document.getElementById('loading');
  const loadingBar = document.getElementById('loadingBar');
  const loadingText = document.getElementById('loadingText');
  const sceneViewport = document.getElementById('sceneViewport');
  const sceneRoot = document.getElementById('sceneRoot');
  const sceneSpace = document.querySelector('.scene-space');
  const birthdayMusic = document.getElementById('birthdayMusic');
  const message = document.getElementById('birthdayMessage');
  const closeMessage = document.getElementById('closeMessage');
  const musicToggle = document.getElementById('musicToggle');
  const fullscreenToggle = document.getElementById('fullscreenToggle');
  const resetView = document.getElementById('resetView');
  const focusCake = document.getElementById('focusCake');
  const hideUi = document.getElementById('hideUi');
  const hud = document.getElementById('sceneHud');
  const candleStatus = document.getElementById('candleStatus');
  const micButton = document.getElementById('micButton');
  const blowButton = document.getElementById('blowButton');
  const relightButton = document.getElementById('relightButton');
  const micMeter = document.querySelector('#micMeter span');
  const candlesContainer = document.getElementById('candles');
  const effects = document.getElementById('effects');
  const toast = document.getElementById('toast');
  const sparkles = document.getElementById('sparkles');
  const frameEditor = document.getElementById('frameEditor');
  const frameTitle = document.getElementById('frameTitle');
  const closeFrameEditor = document.getElementById('closeFrameEditor');
  const replacePhoto = document.getElementById('replacePhoto');
  const removePhoto = document.getElementById('removePhoto');
  const photoInput = document.getElementById('photoInput');
  const frames = [...document.querySelectorAll('.frame')];

  let uiHidden = false;
  let view = { rx: -2, ry: 0, zoom: 1 };
  let dragging = false;
  let moved = 0;
  let start = { x: 0, y: 0 };
  let pointers = new Map();
  let pinchDist = 0;
  let selectedFrameIndex = 0;
  let stream = null, analyser = null, audioCtx = null, micData = null;
  let blowing = false;
  let blownCount = 0;
  let celebrationDone = false;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function applyView() {
    sceneSpace.style.setProperty('--rx', `${view.rx}deg`);
    sceneSpace.style.setProperty('--ry', `${view.ry}deg`);
    sceneSpace.style.setProperty('--zoom', view.zoom);
  }
  applyView();

  function populateSparkles() {
    for (let i = 0; i < 38; i++) {
      const s = document.createElement('div');
      s.className = 'sparkle';
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = `${Math.random() * 55}%`;
      s.style.animationDelay = `${Math.random() * 2.2}s`;
      s.style.transform = `scale(${0.6 + Math.random() * 1.1})`;
      sparkles.appendChild(s);
    }
  }
  populateSparkles();

  // Loading simulation
  let p = 0;
  const loadTimer = setInterval(() => {
    p += 8 + Math.random() * 17;
    if (p >= 100) {
      p = 100;
      clearInterval(loadTimer);
      setTimeout(() => loading.classList.remove('active'), 280);
    }
    loadingBar.style.width = `${p}%`;
    loadingText.textContent = `${Math.round(p)}%`;
  }, 120);

  closeMessage.addEventListener('click', () => {
    message.style.display = 'none';
    birthdayMusic.volume = 0.6;
    birthdayMusic.play().catch(() => showToast('Add assets/music/birthday.mp3 to hear the music.'));
  });

  musicToggle.addEventListener('click', () => {
    if (birthdayMusic.paused) {
      birthdayMusic.play().catch(() => showToast('Music file has not been added yet.'));
    } else birthdayMusic.pause();
  });
  fullscreenToggle.addEventListener('click', () => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  });
  resetView.addEventListener('click', () => { view = { rx: -2, ry: 0, zoom: 1 }; applyView(); });
  focusCake.addEventListener('click', () => { view = { rx: -1, ry: 0, zoom: 1.08 }; applyView(); });
  hideUi.addEventListener('click', () => {
    uiHidden = !uiHidden;
    document.querySelector('.candle-panel').style.display = uiHidden ? 'none' : 'block';
    document.querySelector('.instructions').style.display = uiHidden ? 'none' : 'block';
    hud.style.opacity = uiHidden ? '0.25' : '1';
  });

  sceneViewport.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      return;
    }
    dragging = true; moved = 0; start = { x: e.clientX, y: e.clientY };
  }, { passive: true });
  sceneViewport.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDist) { view.zoom = clamp(view.zoom + (d - pinchDist) * 0.0016, 0.84, 1.22); applyView(); }
      pinchDist = d;
      return;
    }
    if (!dragging) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    moved += Math.abs(dx) + Math.abs(dy);
    start = { x: e.clientX, y: e.clientY };
    view.ry = clamp(view.ry + dx * 0.08, -24, 24);
    view.rx = clamp(view.rx - dy * 0.06, -10, 8);
    applyView();
  }, { passive: true });
  function endPointer(e) { pointers.delete(e.pointerId); if (pointers.size < 2) pinchDist = 0; dragging = false; }
  sceneViewport.addEventListener('pointerup', endPointer, { passive: true });
  sceneViewport.addEventListener('pointercancel', endPointer, { passive: true });
  sceneViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    view.zoom = clamp(view.zoom + (e.deltaY < 0 ? 0.04 : -0.04), 0.84, 1.22);
    applyView();
  }, { passive: false });
  sceneViewport.addEventListener('dblclick', () => { view = { rx: -1, ry: 0, zoom: 1.08 }; applyView(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') view.ry = clamp(view.ry - 2, -24, 24);
    if (e.key === 'ArrowRight') view.ry = clamp(view.ry + 2, -24, 24);
    if (e.key === 'ArrowUp') view.rx = clamp(view.rx - 1.5, -10, 8);
    if (e.key === 'ArrowDown') view.rx = clamp(view.rx + 1.5, -10, 8);
    if (e.key === '+') view.zoom = clamp(view.zoom + 0.03, 0.84, 1.22);
    if (e.key === '-') view.zoom = clamp(view.zoom - 0.03, 0.84, 1.22);
    if (e.key === 'Escape') frameEditor.classList.remove('open');
    applyView();
  });

  function buildCandles() {
    candlesContainer.innerHTML = '';
    const positions = [16, 28, 40, 52, 64, 76, 88, 100, 112, 124, 136, 148, 160, 172, 184, 196, 208, 220, 232];
    positions.forEach((x, i) => {
      const c = document.createElement('div');
      c.className = 'candle';
      c.style.left = `${x - 4}px`;
      c.style.bottom = `${156 + (i % 3 === 0 ? 5 : i % 3 === 1 ? 0 : 10)}px`;
      c.innerHTML = '<span class="flame"></span><span class="smoke"></span>';
      candlesContainer.appendChild(c);
    });
    blownCount = 0;
    celebrationDone = false;
    relightButton.classList.add('hidden');
    candleStatus.textContent = 'Make a wish, then blow out the 19 candles.';
  }
  buildCandles();

  function getCandles() { return [...candlesContainer.querySelectorAll('.candle:not(.out)')]; }

  function blowOneCandle() {
    const remaining = getCandles();
    if (!remaining.length) return;
    remaining[0].classList.add('out');
    blownCount += 1;
    candleStatus.textContent = `${blownCount} of 19 candles blown out.`;
    if (blownCount >= 19) completeCelebration();
  }
  blowButton.addEventListener('click', () => blowOneCandle());
  relightButton.addEventListener('click', () => buildCandles());

  async function enableMic() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      micData = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      blowing = true;
      micButton.disabled = true;
      micButton.textContent = 'Listening…';
      sampleMic();
    } catch (err) {
      showToast('Microphone denied. You can still use Tap to Blow Out.');
    }
  }
  micButton.addEventListener('click', enableMic);

  function stopMic() {
    blowing = false;
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (audioCtx) audioCtx.close().catch(() => {});
    stream = analyser = audioCtx = micData = null;
    micButton.disabled = false;
    micButton.textContent = 'Allow Microphone';
    micMeter.style.width = '0%';
  }

  let highFrames = 0;
  function sampleMic() {
    if (!blowing || !analyser) return;
    requestAnimationFrame(sampleMic);
    analyser.getByteFrequencyData(micData);
    const avg = micData.reduce((a,b) => a+b, 0) / micData.length;
    const pct = clamp((avg / 110) * 100, 0, 100);
    micMeter.style.width = `${pct}%`;
    if (pct > 54) highFrames += 1; else highFrames = Math.max(0, highFrames - 1);
    if (highFrames > 10) {
      highFrames = 0;
      blowOneCandle();
      if (blownCount >= 19) stopMic();
    }
  }

  function completeCelebration() {
    if (celebrationDone) return;
    celebrationDone = true;
    stopMic();
    candleStatus.textContent = 'Happy 19th Birthday. I hope this year brings you the same happiness, love, and warmth that you bring into my life every day.';
    relightButton.classList.remove('hidden');
    launchConfetti(); launchBalloons(); launchFireworks();
  }

  function launchConfetti() {
    for (let i = 0; i < 70; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `-${Math.random() * 40}px`;
      el.style.background = ['#ffd7ed','#c9a8ff','#ffe0b8','#ffffff','#ff92cb'][i % 5];
      el.style.transform = `rotate(${Math.random() * 360}deg)`;
      el.style.animationDelay = `${Math.random() * .6}s`;
      effects.appendChild(el);
      setTimeout(() => el.remove(), 3900);
    }
  }
  function launchBalloons() {
    for (let i = 0; i < 12; i++) {
      const el = document.createElement('div');
      el.className = 'balloon';
      el.style.left = `${8 + Math.random() * 84}%`;
      el.style.bottom = '-60px';
      el.style.background = ['#ffd7ed','#c9a8ff','#ffe0b8','#ff9fd6'][i % 4];
      el.style.animationDelay = `${Math.random() * .8}s`;
      effects.appendChild(el);
      setTimeout(() => el.remove(), 6200);
    }
  }
  function launchFireworks() {
    for (let i = 0; i < 8; i++) {
      const el = document.createElement('div');
      el.className = 'firework';
      el.style.left = `${10 + Math.random() * 80}%`;
      el.style.top = `${8 + Math.random() * 32}%`;
      el.style.animationDelay = `${i * .16}s`;
      effects.appendChild(el);
      setTimeout(() => el.remove(), 1400);
    }
  }

  // Photo frames with localStorage
  const frameState = JSON.parse(localStorage.getItem('birthdayFrameState') || '{}');
  function renderFrames() {
    frames.forEach((frame, idx) => {
      const img = frame.querySelector('img');
      const span = frame.querySelector('span');
      if (frameState[idx]) {
        img.src = frameState[idx];
        frame.classList.add('has-photo');
        img.style.display = 'block';
        span.style.display = 'none';
      } else {
        img.removeAttribute('src');
        frame.classList.remove('has-photo');
        img.style.display = 'none';
        span.style.display = 'grid';
      }
    });
  }
  renderFrames();

  frames.forEach((frame, idx) => {
    frame.addEventListener('click', (e) => {
      if (moved > 10) return;
      selectedFrameIndex = idx;
      frameTitle.textContent = `Photo Frame ${idx + 1}`;
      frameEditor.classList.add('open');
      frameEditor.setAttribute('aria-hidden', 'false');
      e.stopPropagation();
    });
  });
  closeFrameEditor.addEventListener('click', () => frameEditor.classList.remove('open'));
  replacePhoto.addEventListener('click', () => photoInput.click());
  removePhoto.addEventListener('click', () => {
    delete frameState[selectedFrameIndex];
    localStorage.setItem('birthdayFrameState', JSON.stringify(frameState));
    renderFrames();
    frameEditor.classList.remove('open');
  });
  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      frameState[selectedFrameIndex] = reader.result;
      localStorage.setItem('birthdayFrameState', JSON.stringify(frameState));
      renderFrames();
      frameEditor.classList.remove('open');
    };
    reader.readAsDataURL(file);
    photoInput.value = '';
  });
})();
