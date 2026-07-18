const user_id = localStorage.getItem('userId');

const start = document.getElementById('start');
const user_name = document.getElementById('nickname');

document.addEventListener('DOMContentLoaded', function () {
    // Mostrar el UUID encontrado con mensaje contextual
    const actualUUIDElement = document.getElementById('actual_UUID');
    if (user_id && actualUUIDElement) {
        actualUUIDElement.textContent = `✅ Cuenta encontrada: ${user_id}`;
    }

    start.addEventListener('click', () => generateUser());
    user_name.addEventListener('keydown', e => { if (e.key === 'Enter') generateUser(); });
});

function generateUser() {
    const nickname = user_name.value.trim();

    if (!nickname) {
        showToast('Ingresa un nombre o apodo', 'error');
        return;
    }

    if (!user_id) {
        showToast('No se encontró tu ID de usuario', 'error');
        return;
    }

    start.disabled = true;

    fetch('/generateUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: user_id,
            nickname: nickname
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.valid) {
                showToast('¡Nombre registrado con éxito!', 'success');
                setTimeout(() => {
                    window.location.href = '/menu_games';
                }, 1000);
            } else {
                showToast(data.message, 'error');
                start.disabled = false;
            }
        })
        .catch(() => {
            showToast('Error de conexión, intenta de nuevo', 'error');
            start.disabled = false;
        });
}
