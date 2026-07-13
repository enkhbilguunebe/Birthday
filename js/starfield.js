/*
 * starfield.js
 * ---------------------------------------------------------------------------
 * Renders the deep-space backdrop:
 *   1. A cheap CSS "star dust" layer (always present, zero dependencies).
 *   2. A WebGL starfield with two depth layers and true per-star twinkle,
 *      plus a soft procedural nebula plane, rendered with Three.js.
 *   3. A tiny parallax hook so dragging the foreground world nudges the
 *      background very slightly, selling the sense of depth.
 *
 * Everything here degrades gracefully: if Three.js failed to load or WebGL
 * is unavailable, layer 1 alone still reads as a night sky.
 * ---------------------------------------------------------------------------
 */
const Starfield = (() => {

  /* ---- Layer 0: static CSS star dust -------------------------------- */
  function paintStaticStars(){
    const layer = document.getElementById('staticStars');
    if (!layer) return;

    const makeShadowList = (count, minSize, maxSize, colorFn) => {
      const shadows = [];
      for (let i = 0; i < count; i++){
        const x = (Math.random() * 100).toFixed(2);
        const y = (Math.random() * 100).toFixed(2);
        const size = (minSize + Math.random() * (maxSize - minSize)).toFixed(1);
        shadows.push(`${x}vw ${y}vh 0 ${size}px ${colorFn()}`);
      }
      return shadows.join(',');
    };

    const warm = () => `rgba(255,${210 + Math.floor(Math.random()*30)},${180 + Math.floor(Math.random()*40)},${(0.5+Math.random()*0.4).toFixed(2)})`;
    const cool = () => `rgba(${190+Math.floor(Math.random()*30)},${200+Math.floor(Math.random()*30)},255,${(0.4+Math.random()*0.4).toFixed(2)})`;
    const white = () => `rgba(255,255,255,${(0.5+Math.random()*0.5).toFixed(2)})`;

    const dim = makeShadowList(220, 0, .6, () => Math.random() < .15 ? cool() : white());
    const mid = makeShadowList(90, .6, 1.2, () => Math.random() < .2 ? warm() : white());

    const style = document.createElement('style');
    style.textContent = `
      .static-stars::before{box-shadow:${dim};width:2px;height:2px;border-radius:50%}
      .static-stars::after{box-shadow:${mid};width:2px;height:2px;border-radius:50%}
    `;
    document.head.appendChild(style);
  }

  /* ---- Layer 1: WebGL starfield + nebula ----------------------------- */
  let renderer, scene, camera, nearStars, farStars, nebula, raf;
  let parallaxX = 0, parallaxY = 0, targetX = 0, targetY = 0;

  function buildStarLayer({ count, radiusMin, radiusMax, size, warmShare }){
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++){
      const r = radiusMin + (radiusMax - radiusMin) * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);

      // realistic-ish star colour temperature: mostly white, some warm, some blue
      const roll = Math.random();
      if (roll < warmShare){ colors[i*3]=1; colors[i*3+1]=.82; colors[i*3+2]=.68; }
      else if (roll < warmShare + .18){ colors[i*3]=.75; colors[i*3+1]=.85; colors[i*3+2]=1; }
      else { colors[i*3]=1; colors[i*3+1]=1; colors[i*3+2]=1; }

      phase[i] = Math.random() * Math.PI * 2;
      sizes[i] = size * (0.5 + Math.random());
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(devicePixelRatio, 2) } },
      vertexShader: `
        attribute float aPhase;
        attribute float aSize;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uTime;
        uniform float uPixelRatio;
        void main(){
          vColor = color;
          vTwinkle = 0.55 + 0.45 * sin(uTime * 1.6 + aPhase * 6.2831);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (280.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float core = smoothstep(0.5, 0.0, d);
          float glow = smoothstep(0.5, 0.05, d) * 0.5;
          float alpha = (core + glow) * vTwinkle;
          gl_FragColor = vec4(vColor, alpha);
        }
      `
    });

    return new THREE.Points(geo, material);
  }

  function buildNebulaTexture(){
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);

    const blobs = [
      { x:.35, y:.4, r:.42, color:'rgba(124,58,183,.55)' },
      { x:.62, y:.55, r:.36, color:'rgba(255,116,190,.35)' },
      { x:.5, y:.65, r:.48, color:'rgba(73,72,202,.4)' },
      { x:.4, y:.5, r:.22, color:'rgba(255,255,255,.12)' },
    ];
    blobs.forEach(b => {
      const g = ctx.createRadialGradient(b.x*512, b.y*512, 0, b.x*512, b.y*512, b.r*512);
      g.addColorStop(0, b.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
    });

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function init(){
    paintStaticStars();

    const canvas = document.getElementById('universe');
    if (!canvas || !window.THREE) return; // graceful fallback: CSS stars only

    try{
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, .1, 2000);
      camera.position.z = 7;

      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(innerWidth, innerHeight);

      farStars  = buildStarLayer({ count: 2200, radiusMin: 60, radiusMax: 140, size: 1.1, warmShare: .12 });
      nearStars = buildStarLayer({ count: 900,  radiusMin: 20, radiusMax: 60,  size: 1.9, warmShare: .18 });
      scene.add(farStars, nearStars);

      const nebulaGeo = new THREE.PlaneGeometry(160, 160);
      const nebulaMat = new THREE.MeshBasicMaterial({
        map: buildNebulaTexture(), transparent: true, opacity: .55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
      nebula.position.z = -70;
      scene.add(nebula);

      const clock = new THREE.Clock();
      const animate = () => {
        raf = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        farStars.material.uniforms.uTime.value = t;
        nearStars.material.uniforms.uTime.value = t;
        farStars.rotation.y += 0.00016;
        nearStars.rotation.y += 0.00034;
        nebula.rotation.z = t * 0.004;

        // gentle parallax easing toward the drag-driven target
        parallaxX += (targetX - parallaxX) * 0.04;
        parallaxY += (targetY - parallaxY) * 0.04;
        camera.position.x = parallaxX;
        camera.position.y = parallaxY;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      };
      animate();

      addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
      });
    } catch (err){
      // WebGL not available or context creation failed — CSS star layer
      // and CSS nebula wash already provide a full fallback background.
      console.warn('Starfield: WebGL unavailable, using CSS-only background.', err);
    }
  }

  /** Called by app.js while the world is being dragged, in normalised
   *  [-1, 1]-ish units, so the background drifts slightly opposite the
   *  drag for a subtle sense of depth. */
  function setParallax(nx, ny){
    targetX = nx * 1.4;
    targetY = ny * 1.4;
  }

  function destroy(){
    if (raf) cancelAnimationFrame(raf);
  }

  return { init, setParallax, destroy };
})();
