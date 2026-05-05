// =============================================
// blog.js — Comentarios, Reacciones, Suscripción y Q&A
// Math & Beer Games
// =============================================

const userId = localStorage.getItem('userId');

// ─── Badge cache ──────────────────────────────────────────────
let _badgesCache = null;
async function getUserBadges() {
  if (!userId) return [];
  if (_badgesCache !== null) return _badgesCache;
  try {
    const res = await fetch(`/api/badges/${userId}`);
    const data = await res.json();
    _badgesCache = data.badges;
    return _badgesCache;
  } catch { return []; }
}

// ─── Utilidades ───────────────────────────────────────────────
function formatDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Renderizado de comentarios (con badges) ────────────────
function renderComment(c, container) {
  const div = document.createElement('div');
  div.className = 'blog-comment';
  div.innerHTML = `
    <div class="blog-comment-header">
      <span class="blog-nick">
        <i class="fa-solid fa-user-astronaut me-1"></i>${c.nickname}
        <span class="comment-badges" data-userid="${c.userid}"></span>
      </span>
      <span class="blog-time">${formatDate(c.created_at)}</span>
    </div>
    <p class="blog-comment-text">${c.content}</p>
  `;
  container.appendChild(div);
}

// Global badge cache for comments
const _allUserBadges = {};

// ─── Carga de comentarios ──────────────────────────────────
async function loadComments(eventId, container) {
  container.innerHTML = '<p class="blog-loading">Cargando comentarios...</p>';
  try {
    const res = await fetch(`/api/comments/${eventId}`);
    const data = await res.json();
    container.innerHTML = '';
    if (data.comments.length === 0) {
      container.innerHTML = '<p class="blog-empty">Sé el primero en comentar 🍻</p>';
    } else {
      data.comments.forEach(c => renderComment(c, container));
      // Fetch badges for unique authors
      const uniqueUsers = [...new Set(data.comments.map(c => c.userid))];
      uniqueUsers.forEach(async uid => {
        if (!_allUserBadges[uid]) {
          try {
            const bRes = await fetch(`/api/badges/${uid}`);
            const bData = await bRes.json();
            _allUserBadges[uid] = bData.badges;
          } catch { _allUserBadges[uid] = []; }
        }
        // inject icons
        const iconsHtml = _allUserBadges[uid].map(b => `<span class="comment-badge" title="${b.desc}">${b.icon}</span>`).join('');
        container.querySelectorAll(`.comment-badges[data-userid="${uid}"]`).forEach(el => {
            el.innerHTML = iconsHtml;
        });
      });
    }
  } catch {
    container.innerHTML = '<p class="blog-empty text-danger">Error al cargar comentarios</p>';
  }
}

// ─── Carga de reacciones ───────────────────────────────────
async function loadReactions(eventId, btn) {
  try {
    const url = userId ? `/api/reactions/${eventId}?userid=${userId}` : `/api/reactions/${eventId}`;
    const res = await fetch(url);
    const data = await res.json();
    btn.dataset.reacted = data.reacted ? '1' : '0';
    btn.querySelector('.blog-react-count').textContent = data.total;
    btn.classList.toggle('blog-reacted', data.reacted);
  } catch { /* silencioso */ }
}

// ─── Toggle Reacción ──────────────────────────────────────
async function toggleReaction(eventId, btn) {
  if (!userId) {
    showBlogToast('Crea un Nickname primero para reaccionar 🍺');
    return;
  }
  try {
    const res = await fetch('/api/reactions/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userid: userId, event_id: eventId })
    });
    const data = await res.json();
    if (data.success) {
      btn.dataset.reacted = data.reacted ? '1' : '0';
      btn.querySelector('.blog-react-count').textContent = data.total;
      btn.classList.toggle('blog-reacted', data.reacted);
      btn.classList.add('blog-react-pop');
      setTimeout(() => btn.classList.remove('blog-react-pop'), 400);
    }
  } catch { /* silencioso */ }
}

// ─── Enviar comentario ─────────────────────────────────────
async function submitComment(eventId, textarea, container) {
  const content = textarea.value.trim();
  if (!content) return;
  if (!userId) {
    showBlogToast('Crea un Nickname primero para comentar 🍺');
    return;
  }

  textarea.disabled = true;
  try {
    const res = await fetch('/api/comments/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userid: userId, event_id: eventId, content })
    });
    const data = await res.json();
    if (data.success) {
      const emptyMsg = container.querySelector('.blog-empty');
      if (emptyMsg) emptyMsg.remove();
      // Use the returned data to render
      const commentData = { ...data, userid: userId };
      renderComment(commentData, container);
      
      // Inject badges immediately if user just commented
      setTimeout(async () => {
         if (!_allUserBadges[userId]) {
             try {
                 const bRes = await fetch(`/api/badges/${userId}`);
                 const bData = await bRes.json();
                 _allUserBadges[userId] = bData.badges;
             } catch { _allUserBadges[userId] = []; }
         }
         const iconsHtml = _allUserBadges[userId].map(b => `<span class="comment-badge" title="${b.desc}">${b.icon}</span>`).join('');
         container.querySelectorAll(`.comment-badges[data-userid="${userId}"]`).forEach(el => {
             el.innerHTML = iconsHtml;
         });
      }, 10);

      textarea.value = '';
      container.scrollTop = container.scrollHeight;
    } else {
      showBlogToast(data.message || 'Error al comentar');
    }
  } catch {
    showBlogToast('Error de conexión');
  } finally {
    textarea.disabled = false;
    textarea.focus();
  }
}

// ─── Suscripción ───────────────────────────────────────────
async function handleSubscribe(form) {
  const emailInput = form.querySelector('#subscribe-email');
  const nameInput = form.querySelector('#subscribe-name');
  const btn = form.querySelector('#subscribe-btn');
  const email = emailInput.value.trim();
  const name = nameInput ? nameInput.value.trim() : '';

  if (!email) { showBlogToast('Ingresa tu correo 📧'); return; }

  btn.disabled = true;
  btn.textContent = 'Suscribiendo...';
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name })
    });
    const data = await res.json();
    if (data.success) {
      form.innerHTML = `<p class="blog-subscribe-ok"><i class="fa-solid fa-circle-check me-2"></i>¡Ya estás suscrito/a! Te notificaremos sobre los próximos eventos 🎉</p>`;
    } else {
      showBlogToast(data.message || 'Error al suscribirse');
      btn.disabled = false;
      btn.textContent = '¡Suscribirme!';
    }
  } catch {
    showBlogToast('Error de conexión');
    btn.disabled = false;
    btn.textContent = '¡Suscribirme!';
  }
}

// ─── Q&A: Preguntas para ponentes ─────────────────────────
function renderQuestion(q, container) {
  const div = document.createElement('div');
  div.className = 'qa-item';
  div.innerHTML = `
    <div class="qa-item-header">
      <span class="qa-item-nick"><i class="fa-solid fa-user-astronaut me-1"></i>${q.nickname}</span>
      <button class="qa-vote-btn ${q.voted ? 'qa-voted' : ''}" data-qid="${q.id}">
        <i class="fa-solid fa-arrow-up"></i>
        <span class="qa-vote-count">${q.votes}</span>
      </button>
    </div>
    <p class="qa-item-text">${q.content}</p>
  `;
  // Vote button listener
  div.querySelector('.qa-vote-btn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!userId) { showBlogToast('Crea un Nickname para votar 🍺'); return; }
    try {
      const res = await fetch('/api/questions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid: userId, question_id: q.id })
      });
      const data = await res.json();
      if (data.success) {
        btn.querySelector('.qa-vote-count').textContent = data.votes;
        btn.classList.toggle('qa-voted', data.voted);
      }
    } catch { /* silencioso */ }
  });
  container.appendChild(div);
}

async function loadQuestions(eventId, container) {
  container.innerHTML = '<p class="blog-loading">Cargando preguntas...</p>';
  try {
    const url = userId ? `/api/questions/${eventId}?userid=${userId}` : `/api/questions/${eventId}`;
    const res = await fetch(url);
    const data = await res.json();
    container.innerHTML = '';
    if (data.questions.length === 0) {
      container.innerHTML = '<p class="blog-empty">Sé el primero en preguntar 🎤</p>';
    } else {
      data.questions.forEach(q => renderQuestion(q, container));
    }
  } catch {
    container.innerHTML = '<p class="blog-empty text-danger">Error al cargar preguntas</p>';
  }
}

async function submitQuestion(eventId, textarea, container) {
  const content = textarea.value.trim();
  if (!content) return;
  if (!userId) { showBlogToast('Crea un Nickname primero 🍺'); return; }

  textarea.disabled = true;
  try {
    const res = await fetch('/api/questions/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userid: userId, event_id: eventId, content })
    });
    const data = await res.json();
    if (data.success) {
      const emptyMsg = container.querySelector('.blog-empty');
      if (emptyMsg) emptyMsg.remove();
      renderQuestion(data, container);
      textarea.value = '';
      container.scrollTop = container.scrollHeight;
    } else {
      showBlogToast(data.message || 'Error al preguntar');
    }
  } catch {
    showBlogToast('Error de conexión');
  } finally {
    textarea.disabled = false;
    textarea.focus();
  }
}

// ─── Toast ─────────────────────────────────────────────────
function showBlogToast(msg) {
  let toast = document.getElementById('blog-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'blog-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─── Init: adjuntar listeners ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Suscripción
  const subForm = document.getElementById('subscribe-form');
  if (subForm) {
    subForm.addEventListener('submit', e => { e.preventDefault(); handleSubscribe(subForm); });
  }

  // Modales de charlas pasadas (comentarios + reacciones)
  document.querySelectorAll('[data-event-id]').forEach(modalEl => {
    if (!modalEl.classList.contains('modal')) return; // Solo modales
    const eventId = parseInt(modalEl.dataset.eventId);

    // Reacción
    const reactBtn = modalEl.querySelector('.blog-react-btn');
    if (reactBtn) {
      loadReactions(eventId, reactBtn);
      reactBtn.addEventListener('click', () => toggleReaction(eventId, reactBtn));
    }

    // Comentarios
    const commentsContainer = modalEl.querySelector('.blog-comments-list');
    const textarea = modalEl.querySelector('.blog-comment-input');
    const sendBtn = modalEl.querySelector('.blog-send-btn');

    modalEl.addEventListener('shown.bs.modal', () => {
      if (commentsContainer) loadComments(eventId, commentsContainer);
    });

    if (sendBtn && textarea && commentsContainer) {
      sendBtn.addEventListener('click', () => submitComment(eventId, textarea, commentsContainer));
      textarea.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitComment(eventId, textarea, commentsContainer);
        }
      });
    }

    // Q&A (if present in modal)
    const qaList = modalEl.querySelector('.qa-list');
    const qaTextarea = modalEl.querySelector('.qa-input');
    const qaSendBtn = modalEl.querySelector('.qa-send-btn');

    if (qaList) {
      modalEl.addEventListener('shown.bs.modal', () => {
        loadQuestions(eventId, qaList);
      });
    }

    if (qaSendBtn && qaTextarea && qaList) {
      qaSendBtn.addEventListener('click', () => submitQuestion(eventId, qaTextarea, qaList));
      qaTextarea.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitQuestion(eventId, qaTextarea, qaList);
        }
      });
    }
  });
});
