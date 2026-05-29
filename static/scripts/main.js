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

      // Cierra el menú hamburguesa si está abierto
      const collapse = document.querySelector(".navbar-collapse");
      const bsCollapse = bootstrap.Collapse.getInstance(collapse);
      if (bsCollapse) bsCollapse.hide();
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