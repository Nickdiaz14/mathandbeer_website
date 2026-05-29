/**
 * Countdown animado con instrucción rápida del juego.
 * Muestra la instrucción con fade-in y luego cuenta 3-2-1 con animación pop.
 * @param {HTMLElement} overlay - El elemento #countdown-overlay
 * @param {string} instruction - Texto breve de instrucción del juego
 * @param {Function} onComplete - Función a llamar cuando el countdown termina
 */
function showAnimatedCountdown(overlay, instruction, onComplete) {
    overlay.classList.remove('fade-out');
    overlay.innerHTML = `
        <p class="countdown-instruction">${instruction}</p>
        <div class="countdown-number">3</div>
    `;

    const instrEl = overlay.querySelector('.countdown-instruction');
    const numEl = overlay.querySelector('.countdown-number');

    // Fade-in de la instrucción (doble RAF para que el browser aplique el estado inicial antes de la transición)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => instrEl.classList.add('visible'));
    });

    let cuenta = 3;

    function showNumber(n) {
        numEl.classList.remove('pop');
        void numEl.offsetWidth; // forzar reflow para reiniciar la animación
        numEl.textContent = n;
        numEl.classList.add('pop');
    }

    showNumber(3);

    const contador = setInterval(() => {
        cuenta--;
        if (cuenta > 0) {
            showNumber(cuenta);
        } else {
            clearInterval(contador);
            overlay.classList.add('fade-out');
            setTimeout(onComplete, 500);
        }
    }, 800);
}

/**
 * Formatea y actualiza el display del cronómetro.
 * @param {number} centiseconds - Tiempo en centésimas de segundo
 * @param {HTMLElement} timerEl - Elemento del DOM donde mostrar el tiempo
 */
function updateTimerDisplay(centiseconds, timerEl) {
    const minutes = Math.floor(centiseconds / 6000).toString().padStart(2, '0');
    const seconds = Math.floor((centiseconds % 6000) / 100).toString().padStart(2, '0');
    const milliseconds = (centiseconds % 100).toString().padStart(2, '0');
    timerEl.textContent = `${minutes}:${seconds}.${milliseconds}`;
}

/**
 * Retorna true si la URL tiene el parámetro ?daily=true.
 */
function isDailyMode() {
    return new URLSearchParams(window.location.search).get('daily') === 'true';
}

/**
 * Configura los controles comunes de todos los juegos:
 * botón volver, botón recargar y el handler de pageshow para bfcache.
 */
function setupGameControls() {
    document.getElementById('back').addEventListener('click', () => window.history.back());
    const recharge = document.getElementById('recharge');
    if (recharge) recharge.addEventListener('click', () => window.location.reload());
    window.addEventListener('pageshow', (e) => { if (e.persisted) window.location.reload(); });
}

/**
 * Sistema global de notificaciones (Toasts) para Math & Beer Games.
 * Proporciona notificaciones efímeras consistentes en todo el sitio.
 */
function showToast(msg, type = 'info') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    document.body.appendChild(toast);
  }

  // Limpiar clases previas
  toast.className = '';

  // Asignar texto
  toast.textContent = msg;

  // Asignar clases de tipo
  toast.classList.add('global-toast-base');
  if (type === 'error') {
    toast.classList.add('toast-error');
  } else if (type === 'success') {
    toast.classList.add('toast-success');
  } else {
    toast.classList.add('toast-info');
  }

  // Mostrar el toast
  toast.classList.add('show');

  // Limpiar y programar ocultamiento automático
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
