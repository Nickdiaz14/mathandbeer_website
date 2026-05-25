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
