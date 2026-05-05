// Toggle contact icons
const contact = document.querySelector('.contact');
if (contact) {
  const instagram = document.querySelector('.instagram');
  const whatsapp = document.querySelector('.whatsapp');
  const mail = document.querySelector('.mail');
  const menuToggle = document.querySelector('.menu-toggle');
  contact.addEventListener('click', () => {
    contact.classList.toggle('active');
    instagram.classList.toggle('active');
    mail.classList.toggle('active');
    whatsapp.classList.toggle('active');
    menuToggle.classList.toggle('active');
  });
}

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
  const reveals = document.querySelectorAll('.about-img, .about_text');

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
  const speed = 100; // Velocidad del contador (menor es más rápido)

  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counter = entry.target;
        // Extraemos solo los números por si tienes signos como "+"
        const target = +counter.innerText.replace(/\D/g, '');
        let count = 0;
        const inc = target / speed;

        const updateCount = () => {
          count += inc;
          if (count < target) {
            counter.innerText = Math.ceil(count);
            requestAnimationFrame(updateCount);
          } else {
            // Aseguramos que termine en el número exacto
            counter.innerText = target;
          }
        };

        // Iniciamos la animación
        updateCount();
        observer.unobserve(counter);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => counterObserver.observe(counter));
});