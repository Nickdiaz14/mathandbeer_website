let n;
let cells;
let solved = false;
let timerInterval = null;
let validateTimeout = null;
let centisecondsElapsed = 0;
let game_matrix = Array.from({ length: n }, () => Array(n).fill(-1));

const messages = [
    'Mira esto',
    'Ojo aquí',
    'Verifica',
    'Revísalo',
    'Pilas aquí',
    'Algo raro',
    'Detalle aquí',
    'Corrige esto',
    'Valida esto',
    'Revisa bien',
    'Mira bien',
    'Ojo con eso'
]

const timer = document.getElementById('timer');
const title = document.getElementById('title');
const back = document.getElementById('back');
const overlay = document.getElementById('countdown-overlay');

document.addEventListener('DOMContentLoaded', function () {
    n = Number(document.body.dataset.n)
    setupGameControls();
    const cell_size = n === 4 ? 'grey' : 'z-5';
    const matrix = document.getElementById('matrix');
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

function start_timer() {
    if (timerInterval !== null) return;

    centisecondsElapsed = 0;
    updateTimerDisplay(centisecondsElapsed, timer);

    timerInterval = setInterval(() => {
        centisecondsElapsed++;
        updateTimerDisplay(centisecondsElapsed, timer);
    }, 10);
}

function stop_timer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);  // ← Detiene el cronómetro
        timerInterval = null;          // ← Limpia el ID para poder reiniciarlo
    }
}

function toggle_color(row, col, td) {
    if (game_matrix[row][col] === -2) {
        game_matrix[row][col] = 0;
        td.classList.remove('grey');
        td.classList.add('red');
    } else if (game_matrix[row][col] === 0) {
        game_matrix[row][col] = -1;
        td.classList.remove('red');
        td.classList.add('blue');
    } else {
        game_matrix[row][col] = -2;
        td.classList.remove('blue');
        td.classList.add('grey');
    }

    if (validateTimeout) clearTimeout(validateTimeout);

    validateTimeout = setTimeout(() => valid_solution(), 200);

}

function startGame() {
    const isDaily = isDailyMode();
    const userId = localStorage.getItem('userId');
    const fetchUrl = isDaily ? `/api/daily?userid=${userId}` : '/0h_n0/play';
    const fetchBody = isDaily ? null : JSON.stringify({ n: n });
    const fetchMethod = isDaily ? 'GET' : 'POST';

    if (isDaily) {
        const rechargeBtn = document.getElementById('recharge');
        if (rechargeBtn) rechargeBtn.style.display = 'none';
    }

    fetch(fetchUrl, {
        method: fetchMethod,
        headers: { 'Content-Type': 'application/json' },
        body: fetchBody
    })
        .then(response => response.json())
        .then(data => {
            const cond_ini = isDaily ? data.board_data : data.matrix;
            game_matrix = cond_ini.map(row => [...row]);

            for (let i = 0; i < game_matrix.length; i++) {
                for (let j = 0; j < game_matrix[i].length; j++) {
                    const cell = document.getElementById(`cell-${i}-${j}`);
                    cell.classList.remove('grey')
                    const color = game_matrix[i][j] > 0 ? ['red', 'locked'] :
                        game_matrix[i][j] === -1 ? ['blue', 'blocked'] :
                            ['grey'];
                    cell.innerText = game_matrix[i][j] > 0 ? game_matrix[i][j] : '';
                    for (let k = 0; k < color.length; k++) {
                        cell.classList.add(color[k])
                    }

                }
            }
            showAnimatedCountdown(overlay, "Cada celda 🔴 ve tantas rojas como su número indica", start_timer);
        })
}

function valid_solution() {
    let num = Math.floor(Math.random() * messages.length)
    title.textContent = '0h-n0';
    cells.forEach(cell => cell.classList.remove('cell_alert'))

    if (solved || game_matrix.some(row => row.includes(-2))) return;

    let valid_matrix = Array.from({ length: n }, () => Array(n).fill(false));

    for (let i = 0; i < game_matrix.length; i++) {
        for (let j = 0; j < game_matrix[i].length; j++) {
            if (game_matrix[i][j] >= 0) {
                let viewedCells = 0;
                let up = true;
                let down = true;
                let left = true;
                let right = true;
                for (let k = 1; k < game_matrix.length; k++) {
                    if (up && i - k >= 0 && game_matrix[i - k][j] > -1) {
                        viewedCells += 1;
                    } else { up = false; }
                    if (right && j + k < game_matrix[0].length && game_matrix[i][j + k] > -1) {
                        viewedCells += 1;
                    } else { right = false; }
                    if (left && j - k >= 0 && game_matrix[i][j - k] > -1) {
                        viewedCells += 1;
                    } else { left = false; }
                    if (down && i + k < game_matrix.length && game_matrix[i + k][j] > -1) {
                        viewedCells += 1;
                    } else { down = false; }
                }
                if (game_matrix[i][j] === 0 && viewedCells === 0) {
                    title.textContent = messages[num];
                    document.getElementById(`cell-${i}-${j}`).classList.add('cell_alert');
                    return;
                }
                valid_matrix[i][j] = viewedCells;
                if (game_matrix[i][j] > 0) {
                    const control = viewedCells === game_matrix[i][j];
                    if (!control && game_matrix[i][j] > 0) {
                        document.getElementById(`cell-${i}-${j}`).classList.add('cell_alert');
                        if (viewedCells < game_matrix[i][j]) {
                            title.textContent = "Esta ve pocas celdas";
                        } else {
                            title.textContent = "Esta ve muchas celdas";
                        }
                        return;
                    }
                }
            }
        }
    }

    for (let i = 0; i < game_matrix.length; i++) {
        for (let j = 0; j < game_matrix[i].length; j++) {
            if (game_matrix[i][j] === 0){
                document.getElementById(`cell-${i}-${j}`).innerText = valid_matrix[i][j];
            }
        }
    }

    solved = true;
    title.textContent = '¡Felicidades!';
    stop_timer();
    sendRecord();
    return;
}

function sendRecord() {
    const isDaily = isDailyMode();
    const submitUrl = isDaily ? '/api/daily/submit' : '/leaderboard/submit';

    fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            game: `T0${n}`,
            record: centisecondsElapsed,
            userid: localStorage.getItem('userId')
        })
    })
        .then(response => response.json())
        .then(data => {
            if (isDaily) {
                window.location.href = '/daily';
            } else {
                window.location.href = `/leaderboard?game=T0${n}&name=0h-n0 - ${n}&better=${data.better}&type=1&record=${centisecondsElapsed}`
            }
        })
}