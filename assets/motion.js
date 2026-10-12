// Motion layer: pointer light, scroll reveal, hero radar, data-flow pulses.
// Moving parts only run when <html class="motion"> is set (see the inline
// script in <head>, which skips it for prefers-reduced-motion).
(function () {
  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ── Pointer light: grid seams (and blog cards) glow around the cursor ──
  if (finePointer) {
    document.querySelectorAll('.services, .wwd-marks, .posts-grid').forEach((grid) => {
      let frame = 0;
      let lastCard = null;
      grid.addEventListener('pointermove', (e) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const r = grid.getBoundingClientRect();
          grid.style.setProperty('--mx', `${e.clientX - r.left}px`);
          grid.style.setProperty('--my', `${e.clientY - r.top}px`);
          const card = e.target.closest && e.target.closest('.post-card');
          if (lastCard && lastCard !== card) lastCard.style.removeProperty('--mx');
          if (card) {
            const c = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - c.left}px`);
            card.style.setProperty('--my', `${e.clientY - c.top}px`);
          }
          lastCard = card;
        });
      });
      grid.addEventListener('pointerleave', () => {
        grid.style.removeProperty('--mx');
        if (lastCard) lastCard.style.removeProperty('--mx');
        lastCard = null;
      });
    });
  }

  if (!motion) return;

  // ── Loops pause while off screen ──
  const loopWatch = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-paused', !e.isIntersecting));
  });

  // ── Scroll reveal: once, staggered among siblings ──
  const REVEAL = [
    '.sec-label', '.sec-title', '.wwd-body', '.wwd-marks .cell', '.wwd-visual',
    '.services-head .lede', '.service', '.value', '.about-card', '.about-body',
    '.about-more', '.cta h2', '.cta p', '.cta-actions', '.cta-visual',
  ].join(',');

  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      reveal.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });

  document.querySelectorAll(REVEAL).forEach((el) => {
    // Already on screen (e.g. arriving via #contact): never hide what's been seen
    if (el.getBoundingClientRect().top < window.innerHeight * 0.88) el.classList.add('is-visible');
    const group = [...el.parentElement.children].filter((c) => c.matches(REVEAL));
    el.style.setProperty('--i', Math.min(group.indexOf(el), 6));
    el.setAttribute('data-reveal', '');
    reveal.observe(el);
  });

  // ── Hero radar: each dot pings as the sweep's leading edge passes ──
  const hero = document.querySelector('.hero-visual');
  if (hero) {
    const styles = getComputedStyle(root);
    const period = parseFloat(styles.getPropertyValue('--sweep')) || 8;
    const start = parseFloat(styles.getPropertyValue('--sweep-delay')) || 1.6;
    const CX = 300;
    const CY = 300;

    hero.querySelectorAll('.hv-dots circle').forEach((dot, i) => {
      dot.style.setProperty('--i', i);
      const cx = +dot.getAttribute('cx');
      const cy = +dot.getAttribute('cy');
      if (cx === CX && cy === CY) return;
      // Clockwise angle from 12 o'clock, matching the conic sweep
      const angle = (Math.atan2(cx - CX, CY - cy) * 180 / Math.PI + 360) % 360;
      const ping = document.createElementNS(SVG_NS, 'circle');
      ping.setAttribute('class', 'hv-ping');
      ping.setAttribute('cx', cx);
      ping.setAttribute('cy', cy);
      ping.setAttribute('r', dot.getAttribute('r'));
      ping.style.animationDelay = `${(start + (angle / 360) * period).toFixed(3)}s`;
      dot.parentNode.insertBefore(ping, dot);
    });
    loopWatch.observe(hero);

    // Depth parallax: layers drift toward the cursor, nearer layers further
    if (finePointer) {
      const section = hero.closest('section') || hero;
      const sweep = hero.querySelector('.hv-sweep');
      const svg = hero.querySelector('svg');
      const layers = [...hero.querySelectorAll('.hv-layer')].map((el) => ({ el, depth: +el.dataset.depth || 0 }));
      const RANGE = 18; // viewBox units at depth 1
      let tx = 0, ty = 0, x = 0, y = 0, frame = 0;

      const tick = () => {
        // Exponential approach: settles smoothly and retargets mid-flight
        x += (tx - x) * 0.08;
        y += (ty - y) * 0.08;
        layers.forEach(({ el, depth }) => {
          el.style.transform = `translate(${(x * depth * RANGE).toFixed(2)}px, ${(y * depth * RANGE).toFixed(2)}px)`;
        });
        if (sweep) {
          const scale = svg.getBoundingClientRect().width / 600;
          sweep.style.translate = `${(x * 0.4 * RANGE * scale).toFixed(2)}px ${(y * 0.4 * RANGE * scale).toFixed(2)}px`;
        }
        frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0;
      };
      const aim = (nx, ny) => {
        tx = Math.max(-1, Math.min(1, nx));
        ty = Math.max(-1, Math.min(1, ny));
        if (!frame) frame = requestAnimationFrame(tick);
      };
      section.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        aim((e.clientX - (r.left + r.width / 2)) / r.width, (e.clientY - (r.top + r.height / 2)) / r.height);
      });
      section.addEventListener('pointerleave', () => aim(0, 0));
    }
  }

  // ── "What we do": pulses travel down each line into the insight ──
  const flow = document.querySelector('.wwd-visual');
  if (flow) {
    const lines = flow.querySelectorAll('.flow-lines line');
    const groups = flow.querySelectorAll('.flow-lines');
    if (lines.length && groups.length) {
      const pulses = document.createElementNS(SVG_NS, 'g');
      pulses.setAttribute('fill', 'none');
      lines.forEach((line, i) => {
        const p = line.cloneNode();
        p.removeAttribute('stroke');
        p.setAttribute('class', 'flow-pulse');
        p.setAttribute('pathLength', '1');
        // Deterministic spread (golden ratio) so pulses never march in step
        const f = (i * 0.618034) % 1;
        p.style.animationDuration = `${(2.4 + f * 1.6).toFixed(2)}s`;
        p.style.animationDelay = `${(-f * 4).toFixed(2)}s`;
        pulses.appendChild(p);
      });
      groups[groups.length - 1].after(pulses);
      loopWatch.observe(flow);
    }
  }

  const cta = document.querySelector('.cta-visual');
  if (cta) loopWatch.observe(cta);
})();
