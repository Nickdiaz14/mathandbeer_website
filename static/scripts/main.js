// ── Menú hamburguesa: GPU-accelerated (opacity+transform, sin Bootstrap collapse) ──
(function () {
  const toggler = document.querySelector('.navbar-toggler');
  const menu    = document.getElementById('navbarNavDropdown');
  if (!toggler || !menu) return;

  // Desconectar Bootstrap para que no interfiera con nuestra animación
  toggler.removeAttribute('data-bs-toggle');
  toggler.removeAttribute('data-bs-target');

  const openMenu  = () => { menu.classList.add('nav-open');    toggler.setAttribute('aria-expanded', 'true');  };
  const closeMenu = () => { menu.classList.remove('nav-open'); toggler.setAttribute('aria-expanded', 'false'); };
  const toggleMenu = () => menu.classList.contains('nav-open') ? closeMenu() : openMenu();

  toggler.addEventListener('click', toggleMenu);

  // Cerrar al tocar un link del menú
  menu.querySelectorAll('a.nav-link').forEach(a => a.addEventListener('click', closeMenu));

  // Cerrar al tocar fuera del menú
  document.addEventListener('click', e => {
    if (menu.classList.contains('nav-open') && !menu.contains(e.target) && !toggler.contains(e.target)) {
      closeMenu();
    }
  });
})();

// Smooth scroll for internal links
document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector(".navbar");
  const buttons = document.querySelectorAll(".navbar-nav button");

  buttons.forEach(btn => {
    btn.addEventListener("click", e => {
      const href = btn.getAttribute("onclick").match(/#\w+/);
      if (!href) return;
      const target = document.querySelector(href[0]);
      if (!target) return;

      e.preventDefault();
      const navbarHeight = navbar.offsetHeight;
      const elementPosition = target.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });

      // Cerrar menú si está abierto
      document.getElementById('navbarNavDropdown')?.classList.remove('nav-open');
    });
  });
  const reveals = document.querySelectorAll('.about-img, .about_text, .reveal');

  // Les añadimos la clase base oculta
  reveals.forEach(el => el.classList.add('reveal'));

  // Usamos IntersectionObserver para detectar el scroll
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // Solo se anima la primera vez que se ve
      }
    });
  }, { threshold: 0.15 }); // Se activa cuando el 15% del elemento es visible

  reveals.forEach(reveal => revealObserver.observe(reveal));

  const counters = document.querySelectorAll('.counter');
  const COUNTER_DURATION = 900; // ms — siempre igual sin importar el FPS del dispositivo

  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const counter = entry.target;
      const target = +counter.innerText.replace(/\D/g, '');
      observer.unobserve(counter);

      // Dispositivos con preferencia de movimiento reducido: mostrar número directo
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        counter.innerText = target;
        return;
      }

      const startTime = performance.now();
      const animate = (now) => {
        const progress = Math.min((now - startTime) / COUNTER_DURATION, 1);
        // Ease-out cúbico: empieza rápido, desacelera al final
        const eased = 1 - Math.pow(1 - progress, 3);
        counter.innerText = Math.ceil(eased * target);
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    });
  }, { threshold: 0.3 });

  counters.forEach(counter => counterObserver.observe(counter));
});

// ── Floating Math Particles ──────────────────────
(function () {
  const container = document.querySelector('.math-particles');
  if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const symbols = ['∑','π','∞','√','∫','Δ','θ','λ','φ','±','∂','ℕ','ℝ','×','∈'];
  const colors  = [
    'rgba(0,242,255,0.55)',
    'rgba(255,183,0,0.48)',
    'rgba(182,189,231,0.42)',
  ];
  const n = 15;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('span');
    el.className = 'math-particle';
    el.textContent = symbols[i % symbols.length];
    const left     = ((i / n) * 95 + (i % 5)).toFixed(1);
    const size     = (1.1 + (i % 4) * 0.45).toFixed(1);
    const duration = 14 + (i % 5) * 5;
    const delay    = i % 2 === 0 ? -(i * 1.8).toFixed(1) : (i * 0.9).toFixed(1);
    el.style.cssText = `left:${left}%;color:${colors[i % colors.length]};font-size:${size}rem;animation-duration:${duration}s;animation-delay:${delay}s`;
    container.appendChild(el);
  }
})();