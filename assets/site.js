// Shared behaviour for every page: mobile menu and copy-email.
(function () {
  // ── Mobile menu ──
  const btn = document.getElementById('menuBtn');
  const links = document.getElementById('navLinks');

  if (btn && links) {
    const isOpen = () => links.classList.contains('open');
    const setOpen = (open) => {
      links.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    btn.addEventListener('click', () => setOpen(!isOpen()));
    links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));

    // Never trap the visitor: Escape and a tap outside both close it
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) {
        setOpen(false);
        btn.focus();
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (isOpen() && !links.contains(e.target) && !btn.contains(e.target)) setOpen(false);
    });

    // Rotating to a desktop-width layout shouldn't leave it stuck open
    window.matchMedia('(min-width: 881px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false);
    });
  }

  // ── Copy email (for visitors without a mail app) ──
  document.querySelectorAll('[data-copy]').forEach((el) => {
    const label = el.querySelector('.copy-label');
    const idle = label ? label.textContent : '';
    let timer;
    el.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(el.dataset.copy);
        el.dataset.state = 'copied';
        if (label) label.textContent = 'Copied';
      } catch (e) {
        // Clipboard blocked: select the address so it can be copied by hand
        if (label) label.textContent = 'Selected';
        const range = document.createRange();
        range.selectNodeContents(document.querySelector('.cta-mail .addr') || el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        delete el.dataset.state;
        if (label) label.textContent = idle;
      }, 2000);
    });
  });
})();
