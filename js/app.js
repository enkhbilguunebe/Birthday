(() => {
  const D = window.BIRTHDAY_DATA;
  const q = (s) => document.querySelector(s),
    qa = (s) => [...document.querySelectorAll(s)];
  const welcome = q("#welcome"),
    intro = q("#intro"),
    hud = q("#hud"),
    viewport = q("#worldViewport"),
    world = q("#world"),
    panel = q("#panel"),
    panelContent = q("#panelContent"),
    starModal = q("#starModal"),
    starContent = q("#starContent"),
    side = q("#sideMenu"),
    transition = q("#planetTransition"),
    audio = q("#backgroundAudio"),
    toast = q("#toast"),
    starsLayer = q("#starsLayer"),
    counter = q("#starCounter");
  let view = { x: 0, y: 0, scale: 1 },
    renderQueued = false,
    drag = false,
    moved = 0,
    last = { x: 0, y: 0 },
    pointers = new Map(),
    pinch = 0,
    navLocked = false;
  const opened = new Set(
    JSON.parse(localStorage.getItem("openedStars") || "[]")
  );
  function showToast(t) {
    toast.textContent = t;
    toast.classList.add("show");
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => toast.classList.remove("show"), 1800);
  }
  function apply() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      world.style.transform = `translate3d(${view.x}px,${view.y}px,0) scale(${view.scale})`;
      renderQueued = false;
    });
  }
  function start(full) {
    if (full && document.documentElement.requestFullscreen)
      document.documentElement.requestFullscreen().catch(() => {});
    welcome.classList.remove("active");
    setTimeout(() => intro.classList.add("active"), 180);
    audio.volume = 0.45;
    audio.play().catch(() => {});
  }
  q("#fullscreenStart").onclick = () => start(true);
  q("#regularStart").onclick = () => start(false);
  q("#beginStory").onclick = () => {
    intro.classList.remove("active");
    hud.classList.remove("hidden");
    viewport.classList.remove("hidden");
    apply();
  };
  q("#menuBtn").onclick = () => side.classList.add("open");
  q("#closeMenu").onclick = () => side.classList.remove("open");
  q("#closePanel").onclick = () => panel.classList.remove("open");
  q("#closeStarModal").onclick = () => starModal.classList.remove("open");
  q("#fullscreenToggle").onclick = () =>
    document.fullscreenElement
      ? document.exitFullscreen?.()
      : document.documentElement.requestFullscreen?.();
  q("#musicToggle").onclick = () => {
    if (audio.paused)
      audio
        .play()
        .catch(() => showToast("Add assets/music/background.mp3 first."));
    else audio.pause();
  };
  function section(key) {
    if (navLocked) return;
    let html = "",
      title = "";
    if (key === "memories") {
      title = "Memory Planet";
      html = `<div class="memory-grid">${(D.memories || [])
        .map(
          (m, i) =>
            `<article class="card memory-card"><button class="memory-photo-button" data-full-image="${
              m.image || ""
            }" aria-label="Open ${m.title}"><img class="memory-image" src="${
              m.image || ""
            }" alt="${m.title}" loading="lazy"></button><h3>${m.title}</h3>${
              m.date
                ? `<p class="memory-meta"><strong>Date:</strong> ${m.date}</p>`
                : ""
            }${
              m.location
                ? `<p class="memory-meta"><strong>Location:</strong> ${m.location}</p>`
                : ""
            }`
        )
        .join("")}</div>`;
    }
    if (key === "photos") {
      title = "Photo Planet";
      html = `<div class="photo-grid">${(D.photos || [])
        .map(
          (p, i) =>
            `<article class="card photo-card"><button class="photo-open-button" data-full-image="${
              p.image || ""
            }" aria-label="Open photo ${i + 1}"><img src="${
              p.image || ""
            }" alt="${
              p.caption || `Photo ${i + 1}`
            }" loading="lazy"></button><p class="photo-caption">${
              p.caption || ""
            }</p>${
              p.date ? `<p class="photo-date">${p.date}</p>` : ""
            }</article>`
        )
        .join("")}</div>`;
    }
    if (key === "music") {
      title = "Music Planet";
      html = `<div class="song-list">${D.songs
        .map(
          ([s, a, d], i) =>
            `<article class="card song-card"><div class="song-index">${String(
              i + 1
            ).padStart(
              2,
              "0"
            )}</div><div><strong>${s} — ${a} — ${d}</strong></div></article>`
        )
        .join("")}</div>`;
    }
    if (key === "laughter") {
      title = "Laughing Planet";
      html =
        '<div class="laugh-grid"><article class="card"><h3>Pookie</h3><p>Our embarrassing nickname.</p></article><article class="card"><h3>Bagshaa</h3><p>Allergic from G letter.</p></article><article class="card"><h3>Inside jokes</h3><p>WE NEED INSIDE JOKES MORE BABY!!!</p></article></div>';
    }
    if (key === "letter") {
      title = "Love Letter Moon";
      html = `<article class="card"><h3>Happy Sweet 19th Birthday didken mama ❤️</h3>${(
        D.loveLetter || []
      )
        .map((par) => `<p>${par}</p>`)
        .join("")}</article>`;
    }
    panelContent.innerHTML = `<h2 class="panel-title">${title}</h2>${html}`;
    panel.classList.add("open");
    panelContent.querySelectorAll("[data-full-image]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const src = btn.dataset.fullImage;
        if (!src) return;
        const overlay = document.createElement("div");
        overlay.className = "image-lightbox";
        overlay.innerHTML = `<button class="image-lightbox-close" aria-label="Close image">×</button><img src="${src}" alt="Full-size memory">`;
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay || e.target.closest(".image-lightbox-close"))
            overlay.remove();
        });
        document.body.appendChild(overlay);
      })
    );
  }
  qa(".planet").forEach(
    (p) =>
      (p.onclick = (e) => {
        if (moved > 8 || navLocked) return;
        e.stopPropagation();
        p.dataset.section === "birthday"
          ? enterBirthdayPlanet()
          : section(p.dataset.section);
      })
  );
  function enterBirthdayPlanet() {
    if (navLocked) return;
    navLocked = true;
    viewport.style.pointerEvents = "none";
    const planet = q("#birthdayPlanet");
    const r = planet.getBoundingClientRect();
    const cx = innerWidth / 2 - (r.left + r.width / 2),
      cy = innerHeight / 2 - (r.top + r.height / 2);
    world.style.transition = "transform 1s cubic-bezier(.2,.75,.2,1)";
    view = {
      x: view.x + cx,
      y: view.y + cy,
      scale: Math.min(2.6, view.scale * 1.85),
    };
    apply();
    const fade = () => {
      audio.volume = Math.max(0, audio.volume - 0.035);
      if (audio.volume > 0.02) requestAnimationFrame(fade);
      else audio.pause();
    };
    fade();
    setTimeout(() => {
      transition.classList.add("active");
      requestAnimationFrame(() => transition.classList.add("zooming"));
    }, 550);
    setTimeout(() => (location.href = "birthday-scene.html"), 1800);
  }
  function buildMenu() {
    const list = q("#destinationList");
    [
      ["memories", "Memory Planet"],
      ["photos", "Photo Planet"],
      ["music", "Music Planet"],
      ["laughter", "Laughing Planet"],
      ["letter", "Love Letter Moon"],
      ["birthday", "Birthday Planet"],
    ].forEach(([k, n]) => {
      const b = document.createElement("button");
      b.className = "nav-link";
      b.innerHTML = `<span>${n}</span><span>→</span>`;
      b.onclick = () => {
        side.classList.remove("open");
        k === "birthday" ? enterBirthdayPlanet() : section(k);
      };
      list.appendChild(b);
    });
  }
  function buildStars() {
    const pos = [];
    const planets = qa(".planet").map((p) => ({
      x: parseFloat(p.style.getPropertyValue("--x")),
      y: parseFloat(p.style.getPropertyValue("--y")),
      r: parseFloat(p.style.getPropertyValue("--size")) / 13,
    }));
    const cols = 10,
      rows = 10;
    for (let i = 0; i < 100; i++) {
      const col = i % cols,
        row = Math.floor(i / cols);
      let x = 6 + col * 8.9 + (Math.random() * 2.4 - 1.2),
        y = 8 + row * 8.1 + (Math.random() * 2.6 - 1.3);
      x = Math.max(4, Math.min(96, x));
      y = Math.max(5, Math.min(95, y));
      let attempt = 0;
      while (
        (planets.some((p) => Math.hypot(x - p.x, y - p.y) < p.r + 3.2) ||
          pos.some((p) => Math.hypot(x - p.x, y - p.y) < 4.8)) &&
        attempt < 40
      ) {
        x += (attempt % 2 ? 1 : -1) * (1.2 + Math.random() * 1.5);
        y += (attempt % 3 ? 1 : -1) * (0.8 + Math.random() * 1.2);
        x = Math.max(4, Math.min(96, x));
        y = Math.max(5, Math.min(95, y));
        attempt++;
      }
      pos.push({ x, y });
      const b = document.createElement("button");
      b.className = "star-point" + (opened.has(i) ? " opened" : "");
      b.style.left = x + "%";
      b.style.top = y + "%";
      b.style.setProperty("--size", 42 + Math.random() * 14 + "px");
      b.dataset.i = i;
      b.innerHTML = `<span class="star-halo"></span><span class="star-core"></span><span class="star-label-small">✦ ${
        i + 1
      }</span>`;
      b.onclick = (e) => {
        if (moved > 8 || navLocked) return;
        e.stopPropagation();
        opened.add(i);
        localStorage.setItem("openedStars", JSON.stringify([...opened]));
        b.classList.add("opened");
        counter.textContent = `${opened.size} / 100 stars`;
        starContent.innerHTML = `<div class="reason-body"><p class="reason-number">Star ${
          i + 1
        } of 100</p><h2 class="reason-text">${
          D.reasons[i]
        }</h2><p>Another star holding something I love about you.</p></div>`;
        starModal.classList.add("open");
      };
      starsLayer.appendChild(b);
    }
  }
  viewport.addEventListener(
    "pointerdown",
    (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const a = [...pointers.values()];
        pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        return;
      }
      drag = true;
      moved = 0;
      last = { x: e.clientX, y: e.clientY };
      viewport.classList.add("dragging");
    },
    { passive: true }
  );
  viewport.addEventListener(
    "pointermove",
    (e) => {
      if (pointers.has(e.pointerId))
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const a = [...pointers.values()],
          d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        view.scale = Math.max(
          0.72,
          Math.min(1.65, view.scale + (d - pinch) * 0.002)
        );
        pinch = d;
        apply();
        return;
      }
      if (!drag) return;
      const dx = e.clientX - last.x,
        dy = e.clientY - last.y;
      moved += Math.abs(dx) + Math.abs(dy);
      last = { x: e.clientX, y: e.clientY };
      view.x += dx;
      view.y += dy;
      apply();
    },
    { passive: true }
  );
  function end(e) {
    pointers.delete(e.pointerId);
    drag = false;
    pinch = 0;
    viewport.classList.remove("dragging");
  }
  viewport.addEventListener("pointerup", end, { passive: true });
  viewport.addEventListener("pointercancel", end, { passive: true });
  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      view.scale = Math.max(
        0.72,
        Math.min(1.65, view.scale + (e.deltaY < 0 ? 0.08 : -0.08))
      );
      apply();
    },
    { passive: false }
  );
  const c = q("#bgCanvas"),
    ctx = c.getContext("2d"),
    bg = [];
  function resize() {
    const d = Math.min(devicePixelRatio || 1, 1.25);
    c.width = innerWidth * d;
    c.height = innerHeight * d;
    c.style.width = innerWidth + "px";
    c.style.height = innerHeight + "px";
    ctx.setTransform(d, 0, 0, d, 0, 0);
    bg.length = 0;
    for (let i = 0; i < (innerWidth < 700 ? 70 : 110); i++)
      bg.push({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        r: 0.3 + Math.random() * 1.3,
        a: 0.35 + Math.random() * 0.65,
        s: (Math.random() - 0.5) * 0.006,
      });
  }
  resize();
  addEventListener(
    "resize",
    () => {
      resize();
      drawBackground();
    },
    { passive: true }
  );
  function drawBackground() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const s of bg) {
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawBackground();
  buildMenu();
  buildStars();
  counter.textContent = `${opened.size} / 100 stars`;
  if (location.hash === "#birthday-planet") {
    welcome.classList.remove("active");
    intro.classList.remove("active");
    hud.classList.remove("hidden");
    viewport.classList.remove("hidden");
    view = { x: -80, y: 10, scale: 1.02 };
    apply();
    audio.volume = 0.45;
    audio.play().catch(() => {});
    showToast("Welcome back near the Birthday Planet.");
  }
})();
