let n;
let cells;
let matrix;
let game_name;
let game_matrix;
let user_matrix;
let timerInterval = null;
let centisecondsElapsed = 0;

const timer = document.getElementById('timer');
const title = document.getElementById('title');
const back = document.getElementById('back');
const recharge = document.getElementById('recharge');
const overlay = document.getElementById('countdown-overlay');

document.addEventListener('DOMContentLoaded', function () {
    n = Number(document.body.dataset.n)
    game_name = n === 3 ? "CuentaManía - S" : n === 4 ? "CuentaManía - M" : "CuentaManía - L";
    game_matrix = Array.from({ length: n }, () => Array(n).fill(0));
    user_matrix = Array.from({ length: n }, () => Array(n).fill(0));
    back.addEventListener('click', () => {
        window.history.back();
    });

    recharge.addEventListener('click', () => {
        window.location.reload();
    });

    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            window.location.reload();
        }
    });
    const cell_size = n === 3 ? 'z-3' : n === 5 ? 'grey' : 'z-5';
    matrix = document.getElementById('matrix');
    for (let i = 0; i < n; i++) {
        const mtr = document.createElement('tr')
        for (let j = 0; j < n; j++) {
            const mtd = document.createElement('td')
            mtd.classList.add('grey')
            mtd.classList.add(cell_size)
            mtd.id = `cell-${i}-${j}`;
            mtd.addEventListener('click', () => toggle_color(i, j, mtd))
            mtr.appendChild(mtd)
        }
        matrix.appendChild(mtr)
    }
    matrix.classList.add('matrix')
    cells = document.querySelectorAll('td');
    startGame()
})

function updateTimerDisplay() {
    const minutes = Math.floor(centisecondsElapsed / 6000).toString().padStart(2, '0');
    const seconds = Math.floor((centisecondsElapsed % 6000) / 100).toString().padStart(2, '0');
    const milliseconds = (centisecondsElapsed % 100).toString().padStart(2, '0');
    timer.textContent = `${minutes}:${seconds}.${milliseconds}`;
}

function start_timer() {
    if (timerInterval !== null) return;

    centisecondsElapsed = 0;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        centisecondsElapsed++; // Incrementar tiempo
        updateTimerDisplay();
    }, 10); // Actualizar cada 10 ms (centésima de segundo)
}

function stop_timer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);  // ← Detiene el cronómetro
        timerInterval = null;          // ← Limpia el ID para poder reiniciarlo
    }
}

function toggle_color(row, col, td) {
    if (game_matrix[row][col] === max_value(user_matrix) + 1) {
        user_matrix[row][col] = game_matrix[row][col];
        td.textContent = '';
        td.classList.remove('grey');
        td.classList.add(game_matrix[row][col] % 2 === 0 ? 'red' : 'blue');
        td.classList.add('blocked');
        if (max_value(user_matrix) === n * n) {
            sendRecord();
        }
    } else {
        matrix.classList.add('shake-it');
        cells.forEach(cell => cell.classList.add('cells_no_hit'));
        setTimeout(() => { sendRecord(); }, 200);
    }

}

async function startGame() {
    const isDaily = new URLSearchParams(window.location.search).get('daily') === 'true';
    const userId = localStorage.getItem('userId');

    if (isDaily) {
        const rechargeBtn = document.getElementById('recharge');
        if (rechargeBtn) rechargeBtn.style.display = 'none';
        try {
            const response = await fetch(`/api/daily?userid=${userId}`);
            const data = await response.json();
            game_matrix = data.board_data;
        } catch (error) {
            console.error("Error fetching daily cuentamania board:", error);
            game_matrix = random_board();
        }
    } else {
        game_matrix = random_board();
    }

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const td = document.getElementById(`cell-${i}-${j}`);
            td.textContent = game_matrix[i][j];
        }
    }
    showAnimatedCountdown(overlay, "Toca los números en orden: 1, 2, 3…", start_timer);
}

function random_board() {
    const numbers = Array.from({ length: n * n }, (_, i) => i + 1);
    const board = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < game_matrix.length; i++) {
        for (let j = 0; j < game_matrix[i].length; j++) {
            const randomIndex = Math.floor(Math.random() * numbers.length);
            board[i][j] = numbers.splice(randomIndex, 1)[0];
        }
    }
    return board;
}


function max_value(matrix) {
    let max = -Infinity;
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            if (matrix[i][j] > max) {
                max = matrix[i][j];
            }
        }
    }
    return max;
}

function sendRecord() {
    stop_timer();
    const isDaily = new URLSearchParams(window.location.search).get('daily') === 'true';

    if (max_value(user_matrix) !== n * n) {
        if (isDaily) {
            window.location.href = '/daily';
        } else {
            window.location.href = `/leaderboard?game=TS${n}&name=${game_name}&better=false&type=1`;
        }
        return;
    }

    const submitUrl = isDaily ? '/api/daily/submit' : '/leaderboard/submit';

    fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            game: `TS${n}`,
            record: centisecondsElapsed,
            userid: localStorage.getItem('userId')
        })
    })
        .then(response => response.json())
        .then(data => {
            if (isDaily) {
                window.location.href = '/daily';
            } else {
                window.location.href = `/leaderboard?game=TS${n}&name=${game_name}&better=${data.better}&type=1&record=${centisecondsElapsed}`
            }
        })
}