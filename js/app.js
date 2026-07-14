(() => {
  const data = window.BIRTHDAY_DATA;
  const body = document.body;
  const welcome = document.getElementById('welcome');
  const intro = document.getElementById('intro');
  const fullscreenStart = document.getElementById('fullscreenStart');
  const regularStart = document.getElementById('regularStart');
  const beginStory = document.getElementById('beginStory');
  const hud = document.getElementById('hud');
  const worldViewport = document.getElementById('worldViewport');
  const world = document.getElementById('world');
  const panel = document.getElementById('panel');
  const panelContent = document.getElementById('panelContent');
  const closePanel = document.getElementById('closePanel');
  const starModal = document.getElementById('starModal');
  const starContent = document.getElementById('starContent');
  const closeStarModal = document.getElementById('closeStarModal');
  const menuBtn = document.getElementById('menuBtn');
  const sideMenu = document.getElementById('sideMenu');
  const closeMenu = document.getElementById('closeMenu');
  const destinationList = document.getElementById('destinationList');
  const musicToggle = document.getElementById('musicToggle');
  const fullscreenToggle = document.getElementById('fullscreenToggle');
  const backgroundAudio = document.getElementById('backgroundAudio');
  const locationLabel = document.getElementById('locationLabel');
  const toast = document.getElementById('toast');
  const transition = document.getElementById('planetTransition');
  const starCounter = document.getElementById('starCounter');
  const starsLayer = document.getElementById('starsLayer');

  let musicEnabled = false;
  let openedStars = new Set(JSON.parse(localStorage.getItem('openedStars') || '[]'));
  let view = { x: 0, y: 0, scale: 1 };
  const minScale = 0.7;
  const maxScale = 1.65;
  let dragging = false;
  let dragStartedOnButton = false;
  let startPointer = { x: 0, y: 0 };
  let lastPointer = { x: 0, y: 0 };
  let moved = 0;
  let activePointers = new Map();
  let pinchDist = 0;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function clamp(num, min, max) { return Math.min(max, Math.max(min, num)); }

  function updateCounter() {
    starCounter.textContent = `${openedStars.size} / 100 stars`;
  }

  function openWelcomeToIntro(requestFullscreen = false) {
    if (requestFullscreen && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    welcome.classList.remove('active');
    setTimeout(() => intro.classList.add('active'), 250);
    startMusic();
  }

  function startMusic() {
    if (musicEnabled) return;
    musicEnabled = true;
    backgroundAudio.volume = 0.45;
    backgroundAudio.play().catch(() => {});
  }

  function fadeOutMusic(cb) {
    const step = () => {
      if (backgroundAudio.volume > 0.03) {
        backgroundAudio.volume = Math.max(0, backgroundAudio.volume - 0.04);
        requestAnimationFrame(step);
      } else {
        backgroundAudio.pause();
        cb && cb();
      }
    };
    step();
  }

  function beginWorld() {
    intro.classList.remove('active');
    hud.classList.remove('hidden');
    worldViewport.classList.remove('hidden');
    setTimeout(() => applyTransform(), 50);
  }

  fullscreenStart.addEventListener('click', () => openWelcomeToIntro(true));
  regularStart.addEventListener('click', () => openWelcomeToIntro(false));
  beginStory.addEventListener('click', beginWorld);

  function applyTransform() {
    world.style.transform = `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`;
  }

  function isInteractiveTarget(target) {
    return target.closest('button, a, .content-panel, .side-menu');
  }

  worldViewport.addEventListener('pointerdown', (e) => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 2) {
      const pts = [...activePointers.values()];
      pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      return;
    }
    dragging = true;
    dragStartedOnButton = !!isInteractiveTarget(e.target);
    startPointer = { x: e.clientX, y: e.clientY };
    lastPointer = { x: e.clientX, y: e.clientY };
    moved = 0;
    worldViewport.classList.add('dragging');
  }, { passive: true });

  worldViewport.addEventListener('pointermove', (e) => {
    if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 2) {
      const pts = [...activePointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDist) {
        const delta = (dist - pinchDist) * 0.0025;
        view.scale = clamp(view.scale + delta, minScale, maxScale);
        applyTransform();
      }
      pinchDist = dist;
      return;
    }
    if (!dragging || dragStartedOnButton) return;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    moved += Math.abs(dx) + Math.abs(dy);
    lastPointer = { x: e.clientX, y: e.clientY };
    view.x += dx;
    view.y += dy;
    applyTransform();
  }, { passive: true });

  function endPointer(e) {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) pinchDist = 0;
    dragging = false;
    worldViewport.classList.remove('dragging');
  }
  worldViewport.addEventListener('pointerup', endPointer, { passive: true });
  worldViewport.addEventListener('pointercancel', endPointer, { passive: true });
  worldViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    view.scale = clamp(view.scale + delta, minScale, maxScale);
    applyTransform();
  }, { passive: false });

  const sections = {
    memories: {
      title: 'Memory Constellation',
      subtitle: 'Nine stars ready for your most important moments.',
      html: () => `<div class="memory-grid">${data.memories.map(m => `<article class="card"><h3>${m.title}</h3><p><strong>Date:</strong> ${m.date || 'Add later'}</p><p><strong>Location:</strong> ${m.location || 'Add later'}</p><p>${m.description}</p></article>`).join('')}</div>`
    },
    photos: {
      title: 'Photo Planet',
      subtitle: 'Add your favorite pictures later.',
      html: () => `<div class="photo-grid">${data.photos.map((p, i) => `<article class="card"><div class="photo-slot">Photo ${i + 1}</div><p>${p.caption}</p></article>`).join('')}</div>`
    },
    music: {
      title: 'Music Planet',
      subtitle: 'Songs connected to your story.',
      html: () => `<div class="song-list">${data.songs.map(([song, artist], i) => `<article class="card"><strong>${i + 1}. ${song}</strong><p>${artist}</p></article>`).join('')}</div><p class="constellation-note">Add actual audio files inside assets/music later.</p>`
    },
    laughter: {
      title: 'Laughing Planet',
      subtitle: 'The playful side of your story.',
      html: () => `<div class="laugh-grid">${data.laughter.map(item => `<article class="card"><h3>${item.title}</h3><p>${item.description}</p></article>`).join('')}</div>`
    },
    future: {
      title: 'Future Planet',
      subtitle: 'The dreams still waiting for both of you.',
      html: () => `<div class="future-grid">${data.future.map(item => `<article class="card"><h3>${item}</h3><p>Add your notes later.</p></article>`).join('')}</div>`
    },
    letter: {
      title: 'Love Letter Moon',
      subtitle: 'A place for your letter.',
      html: () => `<article class="card"><h3>${data.letterTitle}</h3><p>${data.letterBody}</p></article>`
    }
  };

  function openPanel(key) {
    const section = sections[key];
    if (!section) return;
    locationLabel.textContent = section.title;
    panelContent.innerHTML = `<h2 class="panel-title">${section.title}</h2><p class="panel-subtitle">${section.subtitle}</p>${section.html()}`;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
  }
  function closeContentPanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    locationLabel.textContent = 'Our Little Universe';
  }
  closePanel.addEventListener('click', closeContentPanel);

  function openStar(index) {
    const reason = data.reasons[index];
    openedStars.add(index);
    localStorage.setItem('openedStars', JSON.stringify([...openedStars]));
    updateCounter();
    const starEl = starsLayer.querySelector(`[data-star-index="${index}"]`);
    if (starEl) starEl.classList.add('opened');
    starContent.innerHTML = `
      <div class="reason-body">
        <p class="reason-number">Star ${index + 1} of 100</p>
        <h2 class="reason-text">${reason}</h2>
        <p class="reason-foot">A little reason written among the stars.</p>
      </div>
    `;
    starModal.classList.add('open');
    starModal.setAttribute('aria-hidden', 'false');
    if (openedStars.size === 100) showToast('And somehow, this still is not every reason.');
  }
  function closeStar() {
    starModal.classList.remove('open');
    starModal.setAttribute('aria-hidden', 'true');
  }
  closeStarModal.addEventListener('click', closeStar);

  function generateStars() {
    const positions = [];
    const planets = [...document.querySelectorAll('.planet')].map(p => ({
      x: parseFloat(p.style.getPropertyValue('--x')),
      y: parseFloat(p.style.getPropertyValue('--y')),
      r: parseFloat(p.style.getPropertyValue('--size')) / 14
    }));
    for (let i = 0; i < 100; i++) {
      let attempts = 0;
      let x, y, okay;
      do {
        x = 4 + Math.random() * 92;
        y = 4 + Math.random() * 92;
        okay = planets.every(pl => Math.hypot(x - pl.x, y - pl.y) > pl.r + 3) && positions.every(pos => Math.hypot(x - pos.x, y - pos.y) > 5.4);
        attempts++;
      } while (!okay && attempts < 200);
      positions.push({ x, y });
      const btn = document.createElement('button');
      btn.className = 'star-point';
      btn.style.left = `${x}%`;
      btn.style.top = `${y}%`;
      const size = 36 + Math.round(Math.random() * 18);
      btn.style.setProperty('--size', `${size}px`);
      btn.dataset.starIndex = i;
      if (openedStars.has(i)) btn.classList.add('opened');
      btn.setAttribute('aria-label', `Open star message ${i + 1}`);
      btn.innerHTML = '<span class="star-halo"></span><span class="star-core"></span><span class="star-label-small">Click me</span>';
      btn.addEventListener('click', (e) => {
        if (moved > 9) return;
        e.stopPropagation();
        openStar(i);
      });
      starsLayer.appendChild(btn);
    }
  }

  function enterBirthdayPlanet() {
    transition.classList.add('active');
    fadeOutMusic(() => {});
    setTimeout(() => window.location.href = 'birthday-scene.html', 1700);
  }

  function buildDestinations() {
    const items = [
      ['memories', 'Memory Constellation'],
      ['photos', 'Photo Planet'],
      ['music', 'Music Planet'],
      ['laughter', 'Laughing Planet'],
      ['future', 'Future Planet'],
      ['letter', 'Love Letter Moon'],
      ['birthday', 'Birthday Planet']
    ];
    destinationList.innerHTML = '';
    items.forEach(([key, label]) => {
      const btn = document.createElement('button');
      btn.className = 'nav-link';
      btn.innerHTML = `<span>${label}</span><span>→</span>`;
      btn.addEventListener('click', () => {
        sideMenu.classList.remove('open');
        if (key === 'birthday') enterBirthdayPlanet();
        else openPanel(key);
      });
      destinationList.appendChild(btn);
    });
  }

  document.querySelectorAll('.planet').forEach(planet => {
    planet.addEventListener('click', (e) => {
      if (moved > 9) return;
      const key = planet.dataset.section;
      if (key === 'birthday') enterBirthdayPlanet();
      else openPanel(key);
      e.stopPropagation();
    });
  });

  menuBtn.addEventListener('click', () => sideMenu.classList.add('open'));
  closeMenu.addEventListener('click', () => sideMenu.classList.remove('open'));
  musicToggle.addEventListener('click', () => {
    if (backgroundAudio.paused) {
      backgroundAudio.play().catch(() => showToast('Add assets/music/background.mp3 first.'));
      musicToggle.textContent = '♫';
    } else {
      backgroundAudio.pause();
      musicToggle.textContent = '♬';
    }
  });
  fullscreenToggle.addEventListener('click', () => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeContentPanel(); closeStar(); sideMenu.classList.remove('open');
    }
    if (e.key === '+' || e.key === '=') { view.scale = clamp(view.scale + 0.06, minScale, maxScale); applyTransform(); }
    if (e.key === '-' || e.key === '_') { view.scale = clamp(view.scale - 0.06, minScale, maxScale); applyTransform(); }
    if (e.key === 'ArrowLeft') { view.x += 30; applyTransform(); }
    if (e.key === 'ArrowRight') { view.x -= 30; applyTransform(); }
    if (e.key === 'ArrowUp') { view.y += 30; applyTransform(); }
    if (e.key === 'ArrowDown') { view.y -= 30; applyTransform(); }
  });

  updateCounter();
  generateStars();
  buildDestinations();

  if (window.location.hash === '#birthday-planet') {
    welcome.classList.remove('active');
    intro.classList.remove('active');
    hud.classList.remove('hidden');
    worldViewport.classList.remove('hidden');
    view = { x: -180, y: 60, scale: 1.12 };
    applyTransform();
    startMusic();
    showToast('Welcome back to the Birthday Planet.');
  }

  // lightweight background star canvas
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  let stars = [];
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.4);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: innerWidth < 700 ? 160 : 240 }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: Math.random() * 1.8 + 0.2,
      a: Math.random(),
      s: Math.random() * 0.008 + 0.002
    }));
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let lastFrame = 0;
  function animateBg(ts) {
    requestAnimationFrame(animateBg);
    if (document.hidden) return;
    if (ts - lastFrame < 40) return; // ~25 fps for less lag
    lastFrame = ts;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const star of stars) {
      star.a += star.s;
      if (star.a >= 1 || star.a <= 0.2) star.s *= -1;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${star.a})`;
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  requestAnimationFrame(animateBg);
})();
