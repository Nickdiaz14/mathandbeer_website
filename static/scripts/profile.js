// =============================================
// profile.js — Lógica del Perfil de Usuario
// Math & Beer Games
// =============================================

const userId = localStorage.getItem('userId');

const ALL_BADGES = [
  { id: 'novato', name: 'Cervecero Novato', icon: '🍺', desc: 'Crea tu cuenta' },
  { id: 'tertuliano', name: 'Tertuliano', icon: '💬', desc: 'Comenta en 3+ charlas' },
  { id: 'fan', name: 'Fan #1', icon: '🍻', desc: 'Brinda por 10+ charlas' },
  { id: 'calculadora', name: 'Calculadora Humana', icon: '🧮', desc: 'Ten récord en un juego' },
  { id: 'leyenda', name: 'Leyenda', icon: '⭐', desc: 'Top 3 en un leaderboard' },
];

document.addEventListener('DOMContentLoaded', async () => {
  if (!userId) {
    document.getElementById('profile-loading').style.display = 'none';
    document.getElementById('profile-no-account').style.display = 'flex';
    return;
  }

  try {
    const [profileRes, badgesRes] = await Promise.all([
      fetch(`/api/profile/${userId}`),
      fetch(`/api/badges/${userId}`)
    ]);
    const profile = await profileRes.json();
    const badgesData = await badgesRes.json();

    if (!profile.nickname) {
      document.getElementById('profile-loading').style.display = 'none';
      document.getElementById('profile-no-account').style.display = 'flex';
      return;
    }

    // Render profile
    document.getElementById('profile-loading').style.display = 'none';
    document.getElementById('profile-content').style.display = 'flex';

    document.getElementById('profile-nick').textContent = profile.nickname;

    // Stats
    document.getElementById('stat-comments').textContent = profile.stats.comments;
    document.getElementById('stat-brindis').textContent = profile.stats.brindis;
    document.getElementById('stat-games').textContent = profile.stats.games;

    // Badges
    renderBadges(badgesData.badges);

    // Records
    const recordsEl = document.getElementById('profile-records');
    if (profile.records.length === 0) {
      recordsEl.innerHTML = '<p class="profile-empty">Aún no tienes récords. ¡Juega para desbloquear!</p>';
    } else {
      recordsEl.innerHTML = profile.records.map(r => `
        <div class="profile-record-row">
          <span class="profile-record-game">${getGameName(r.game)}</span>
          <span class="profile-record-value"><span style="color: rgba(182, 189, 231, 0.6); font-size: 0.8em; margin-right: 5px;">#${r.position}</span> ${r.record}</span>
        </div>
      `).join('');
    }

    // RSVPs
    if (profile.rsvps.length > 0) {
      const rsvpSection = document.getElementById('profile-rsvps-section');
      rsvpSection.style.display = 'block';
      document.getElementById('profile-rsvps').innerHTML = profile.rsvps.map(r => `
        <div class="profile-list-item">
          <span class="item-title">${r.title}</span>
          <span class="item-sub">${r.city} · ${new Date(r.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
        </div>
      `).join('');
    }

    // Liked talks
    const likedEl = document.getElementById('profile-liked');
    if (profile.liked_talks.length === 0) {
      likedEl.innerHTML = '<p class="profile-empty">Aún no le has dado brindis a ninguna charla 🍺</p>';
    } else {
      likedEl.innerHTML = profile.liked_talks.map(t => `
        <div class="profile-list-item">
          <span class="item-title">${t.title}</span>
          <span class="item-sub">${t.speaker}</span>
        </div>
      `).join('');
    }

    // Edit nickname
    setupNicknameEdit(profile.nickname);

  } catch (err) {
    console.error('Error loading profile:', err);
    document.getElementById('profile-loading').innerHTML = '<p class="text-danger">Error al cargar el perfil</p>';
  }
});

function getGameName(gameCode) {
  switch (gameCode) {
    case "T4": return "0h-h1 - 4";
    case "T6": return "0h-h1 - 6";
    case "T8": return "0h-h1 - 8";
    case "T10": return "0h-h1 - 10";
    case "TContrareloj": return "Contrareloj";
    case "TKnight": return "Salto Real";
    case "TUnicolor": return "Unicolor";
    case "TBicolor": return "Bicolor";
    case "TS3": return "CuentaManía - S";
    case "TS4": return "CuentaManía - M";
    case "TS5": return "CuentaManía - L";
    default: return gameCode.replace('T', ''); // Fallback por si no coincide
  }
}

function renderBadges(unlockedBadges) {
  const container = document.getElementById('profile-badges');
  const unlockedIds = unlockedBadges.map(b => b.id);

  container.innerHTML = ALL_BADGES.map(b => {
    const unlocked = unlockedIds.includes(b.id);
    return `
      <span class="profile-badge ${unlocked ? '' : 'badge-locked'}" title="${b.desc}">
        <span class="badge-icon">${b.icon}</span>
        ${b.name}
      </span>
    `;
  }).join('');
}

function setupNicknameEdit(currentNick) {
  const editBtn = document.getElementById('edit-nick-btn');
  const editForm = document.getElementById('edit-nick-form');
  const input = document.getElementById('new-nick-input');
  const saveBtn = document.getElementById('save-nick-btn');
  const cancelBtn = document.getElementById('cancel-nick-btn');
  const errorEl = document.getElementById('nick-error');

  editBtn.addEventListener('click', () => {
    editBtn.style.display = 'none';
    editForm.style.display = 'flex';
    input.value = currentNick;
    input.focus();
    errorEl.style.display = 'none';
  });

  cancelBtn.addEventListener('click', () => {
    editForm.style.display = 'none';
    editBtn.style.display = 'inline-flex';
    errorEl.style.display = 'none';
  });

  const doSave = async () => {
    const newNick = input.value.trim();
    if (!newNick) return;
    if (newNick === currentNick) {
      editForm.style.display = 'none';
      editBtn.style.display = 'inline-flex';
      return;
    }

    saveBtn.disabled = true;
    try {
      const res = await fetch('/api/profile/update-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid: userId, nickname: newNick })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('profile-nick').textContent = data.nickname;
        currentNick = data.nickname;
        editForm.style.display = 'none';
        editBtn.style.display = 'inline-flex';
        errorEl.style.display = 'none';
      } else {
        errorEl.textContent = data.message;
        errorEl.style.display = 'block';
      }
    } catch {
      errorEl.textContent = 'Error de conexión';
      errorEl.style.display = 'block';
    } finally {
      saveBtn.disabled = false;
    }
  };

  saveBtn.addEventListener('click', doSave);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSave(); });
}
