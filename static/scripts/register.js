let message;
const user_id = localStorage.getItem('userId');

const start = document.getElementById('start');
const user_name = document.getElementById('nickname');
const message_case = document.getElementById('case');

document.addEventListener('DOMContentLoaded', function () {
    message = document.body.dataset.m
    if (message) {
        message_case.style.display = 'flex';
        message_case.textContent = message;
    } else {
        message_case.style.display = 'none';
    }
    start.addEventListener('click', () => generateUser());

    const restoreBtn = document.getElementById('restore-btn');
    const restoreInput = document.getElementById('restore-userid');
    const restoreError = document.getElementById('restore-error');

    restoreBtn.addEventListener('click', () => restoreAccount());
    restoreInput.addEventListener('keydown', e => { if (e.key === 'Enter') restoreAccount(); });

    function restoreAccount() {
        const inputId = restoreInput.value.trim();
        restoreError.style.display = 'none';
        if (!inputId) {
            restoreError.textContent = 'Ingresa tu ID de usuario';
            restoreError.style.display = 'block';
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
                window.location.href = '/menu_games';
            } else {
                restoreError.textContent = 'No encontramos ninguna cuenta con ese ID';
                restoreError.style.display = 'block';
                restoreBtn.disabled = false;
            }
        })
        .catch(() => {
            restoreError.textContent = 'Error de conexión, intenta de nuevo';
            restoreError.style.display = 'block';
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
                window.location.href = `/menu_games`
            }
            else {
                window.location.href = `/register?m=${data.message}`
            }
        })
}

function validateUserId() {
    fetch('/seeUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: user_id
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.valid) {
                window.location.href = `/menu_games`
            }
            else {
                localStorage.setItem('userId', crypto.randomUUID());
            }
        })
}

validateUserId();