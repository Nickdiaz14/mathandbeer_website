let message;
const user_id = localStorage.getItem('userId');

const start = document.getElementById('start');
const user_name = document.getElementById('nickname');
const message_case = document.getElementById('case');

document.addEventListener('DOMContentLoaded', function () {
    if (user_id) {
        const actualUUIDElement = document.getElementById('actual_UUID');
        actualUUIDElement.textContent = `Tu ID de usuario actual es: ${user_id}`;
    }
    message = document.body.dataset.m
    if (message) {
        if (message != 'None') {
            showToast(message, 'info');
        }
    }
    start.addEventListener('click', () => generateUser());

    const restoreBtn = document.getElementById('restore-btn');
    const restoreInput = document.getElementById('restore-userid');

    restoreBtn.addEventListener('click', () => restoreAccount());
    restoreInput.addEventListener('keydown', e => { if (e.key === 'Enter') restoreAccount(); });

    function restoreAccount() {
        const inputId = restoreInput.value.trim();
        if (!inputId) {
            showToast('Ingresa tu ID de usuario', 'error');
            return;
        }
        restoreBtn.disabled = true;
        fetch('/seeUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: inputId })
        })
            .then(r => r.json())
            .then(data => {
                if (data.valid) {
                    localStorage.setItem('userId', inputId);
                    showToast('Cuenta restaurada con éxito', 'success');
                    setTimeout(() => {
                        window.location.href = '/menu_games';
                    }, 1000);
                } else {
                    showToast('No encontramos ninguna cuenta con ese ID', 'error');
                    restoreBtn.disabled = false;
                }
            })
            .catch(() => {
                showToast('Error de conexión, intenta de nuevo', 'error');
                restoreBtn.disabled = false;
            });
    }
})

function generateUser() {
    const new_user_id = localStorage.getItem('userId');
    fetch('/generateUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: new_user_id,
            nickname: user_name.value
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.valid) {
                showToast('¡Cuenta creada con éxito!', 'success');
                setTimeout(() => {
                    window.location.href = `/menu_games`;
                }, 1000);
            }
            else {
                showToast(data.message, 'error');
            }
        })
}

function validateUserId() {
    // Si no hay UUID en localStorage, generar uno nuevo directamente
    if (!user_id) {
        localStorage.setItem('userId', crypto.randomUUID());
        return;
    }

    // Si hay UUID, verificar si tiene nickname en la BD
    fetch('/seeUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user_id })
    })
        .then(response => response.json())
        .then(data => {
            if (data.nickname) {
                // UUID encontrado y tiene nickname → ir al menú
                window.location.href = `/menu_games`;
            } else {
                // UUID existe en localStorage pero SIN nickname en la BD → re-register
                window.location.href = `/re-register`;
            }
        })
        .catch(() => {
            // Error de red: dejar al usuario registrarse normalmente
        });
}

validateUserId();