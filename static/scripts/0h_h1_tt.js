let n = 4;
let cells;
let solved = false;
let boards_solved = 0;
let first_seen = true;
let timerInterval = null;
let validateTimeout = null;
let centisecondsElapsed = 4500;
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
const recharge = document.getElementById('recharge');
const s_boards = document.getElementById('s_boards');
const overlay = document.getElementById('countdown-overlay');

document.addEventListener('DOMContentLoaded', function () {
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
    const matrix = document.getElementById('matrix')
    for (let i = 0; i < n; i++) {
        const mtr = document.createElement('tr')
        for (let j = 0; j < n; j++) {
            const mtd = document.createElement('td')
            mtd.classList.add('grey')
            mtd.id = `cell-${i}-${j}`;
            mtd.addEventListener('click', () => toggle_color(i, j, mtd))
            mtr.appendChild(mtd)
        }
        matrix.appendChild(mtr)
    }
    matrix.classList.add('matrix')
    cells = document.querySelectorAll('td');
    startGame();
})

function updateTimerDisplay() {
    const minutes = Math.floor(centisecondsElapsed / 6000).toString().padStart(2, '0');
    const seconds = Math.floor((centisecondsElapsed % 6000) / 100).toString().padStart(2, '0');
    const milliseconds = (centisecondsElapsed % 100).toString().padStart(2, '0');
    timer.textContent = `${minutes}:${seconds}.${milliseconds}`;
}

function start_timer() {
    if (timerInterval !== null) return;

    centisecondsElapsed = 4500;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        centisecondsElapsed--; // Incrementar tiempo
        if (centisecondsElapsed >= 0) {
            updateTimerDisplay();
        } else {
            stop_timer();
            sendRecord();
        }
    }, 10); // Actualizar cada 10 ms (centésima de segundo)
}

function stop_timer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);  // ← Detiene el cronómetro
        timerInterval = null;          // ← Limpia el ID para poder reiniciarlo
    }
}

function toggle_color(row, col, td) {
    if (game_matrix[row][col] === -1) {
        game_matrix[row][col] = 0;
        td.classList.remove('grey');
        td.classList.add('red');
    } else if (game_matrix[row][col] === 0) {
        game_matrix[row][col] = 1;
        td.classList.remove('red');
        td.classList.add('blue');
    } else {
        game_matrix[row][col] = -1;
        td.classList.remove('blue');
        td.classList.add('grey');
    }

    if (validateTimeout) clearTimeout(validateTimeout);

    validateTimeout = setTimeout(() => valid_solution(), 200);

}

function startGame() {
    fetch('/0h_h1/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n: n })
    })
        .then(response => response.json())
        .then(data => {
            const cond_ini = data.matrix;
            game_matrix = cond_ini.map(row => [...row]);

            for (let i = 0; i < game_matrix.length; i++) {
                for (let j = 0; j < game_matrix[i].length; j++) {
                    const cell = document.getElementById(`cell-${i}-${j}`);
                    cell.classList.remove('grey')
                    const color = game_matrix[i][j] === 0 ? ['red', 'blocked'] :
                        game_matrix[i][j] === 1 ? ['blue', 'blocked'] :
                            ['grey'];
                    for (let k = 0; k < color.length; k++) {
                        cell.classList.add(color[k])
                    }

                }
            }
            if (first_seen) {
                first_seen = false;
                let cuenta = 3;
                overlay.textContent = cuenta;

                const contador = setInterval(() => {
                    cuenta--;
                    if (cuenta > 0) {
                        overlay.textContent = cuenta;
                    } else {
                        clearInterval(contador);
                        overlay.classList.add('fade-out');
                        setTimeout(start_timer, 200);
                    }
                }, 800);
            }
        })
}

function valid_solution() {
    let num = Math.floor(Math.random() * messages.length)
    title.textContent = 'Contrareloj';
    cells.forEach(cell => cell.classList.remove('cell_alert'))

    if (solved || game_matrix.some(row => row.includes(-1))) return;
    let game_matrix_t = game_matrix[0].map((_, col) =>
        game_matrix.map(row => row[col])
    );

    // Validar tres consecutivos
    for (let r = 0; r < n; r++) {

        const row = game_matrix[r];
        const col = game_matrix_t[r];

        let row_prev = null, row_count = 0;
        let col_prev = null, col_count = 0;

        for (let c = 0; c < n; c++) {

            if (row_prev === row[c]) {
                row_count++;
                if (row_count === 3) {
                    title.textContent = messages[num];
                    for (let consec = 0; consec < 3; consec++) {
                        const mtd = document.getElementById(`cell-${r}-${c - consec}`)
                        mtd.classList.add('cell_alert')
                    }
                    return;
                }
            } else {
                row_prev = row[c];
                row_count = 1;
            }

            if (col_prev === col[c]) {
                col_count++;
                if (col_count === 3) {
                    title.textContent = messages[num];
                    for (let consec = 0; consec < 3; consec++) {
                        const mtd = document.getElementById(`cell-${c - consec}-${r}`)
                        mtd.classList.add('cell_alert')
                    }
                    return;
                }
            } else {
                col_prev = col[c];
                col_count = 1;
            }
        }

        // Validar cantidad de 0s y 1s
        let row_sum = row.reduce((a, b) => a + b, 0);
        let col_sum = col.reduce((a, b) => a + b, 0);

        if (row_sum !== n / 2) {
            title.textContent = messages[num];
            for (let consec = 0; consec < n; consec++) {
                const mtd = document.getElementById(`cell-${r}-${consec}`)
                mtd.classList.add('cell_alert')
            }
            return;
        }
        if (col_sum !== n / 2) {
            title.textContent = messages[num];
            for (let consec = 0; consec < n; consec++) {
                const mtd = document.getElementById(`cell-${consec}-${r}`)
                mtd.classList.add('cell_alert')
            }
            return;
        }
    }

    // Revisar unicidad de filas y columnas
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (game_matrix[i].every((v, k) => v === game_matrix[j][k])) {
                title.textContent = messages[num];
                for (let consec = 0; consec < n; consec++) {
                    const mtd_1 = document.getElementById(`cell-${i}-${consec}`)
                    const mtd_2 = document.getElementById(`cell-${j}-${consec}`)
                    mtd_1.classList.add('cell_alert')
                    mtd_2.classList.add('cell_alert')
                }
                return;
            }
        }
    }

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (game_matrix_t[i].every((v, k) => v === game_matrix_t[j][k])) {
                title.textContent = messages[num];
                for (let consec = 0; consec < n; consec++) {
                    const mtd_1 = document.getElementById(`cell-${consec}-${i}`)
                    const mtd_2 = document.getElementById(`cell-${consec}-${j}`)
                    mtd_1.classList.add('cell_alert')
                    mtd_2.classList.add('cell_alert')
                }
                return;
            }
        }
    }

    boards_solved++;
    centisecondsElapsed += Math.max(Math.floor(1000 * Math.pow(0.8, boards_solved)))
    s_boards.textContent = `Tableros resueltos: ${boards_solved}`;
    setTimeout(() => {
        cells.forEach(cell => cell.className = 'grey');
        startGame();
    }, 250);
    return;
}

function sendRecord() {
    fetch('/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            game: `TContrareloj`,
            record: boards_solved,
            userid: localStorage.getItem('userId')
        })
    })
        .then(response => response.json())
        .then(data => {
            window.location.href = `/leaderboard?game=TContrareloj&name=0hh1 Contrareloj&better=${data.better}&type=3&record=${boards_solved}`
        })
}