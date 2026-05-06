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
                window.location.href = `/register?m=${data.message_id}`
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