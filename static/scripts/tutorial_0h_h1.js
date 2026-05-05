let n = 4;
let cells;
let matrix = Array.from({ length: n }, () => Array(n).fill(-1));
const table = document.getElementById('matrix');

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

const title = document.getElementById('title');
const timer = document.getElementById('timer');
const back = document.getElementById('back');

document.addEventListener('DOMContentLoaded', function () {
    back.addEventListener('click', () => {
        window.history.back();
    });

    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            window.location.reload();
        }
    });
    const matrix = document.getElementById('matrix');
    for (let i = 0; i < n; i++) {
        const mtr = document.createElement('tr')
        for (let j = 0; j < n; j++) {
            const mtd = document.createElement('td')
            mtd.classList.add('grey')
            mtd.id = `cell-${i}-${j}`;
            mtd.addEventListener('click', () => {
                toggle_color(i, j, mtd)
                steps()
            })
            mtr.appendChild(mtd)
        }
        matrix.appendChild(mtr)
    }
    matrix.classList.add('matrix')
    cells = document.querySelectorAll('td');
    startGame()
})


function toggle_color(row, col, td) {
    if (matrix[row][col] === -1) {
        matrix[row][col] = 0;
        td.classList.remove('grey');
        td.classList.add('red');
    } else if (matrix[row][col] === 0) {
        matrix[row][col] = 1;
        td.classList.remove('red');
        td.classList.add('blue');
    } else {
        matrix[row][col] = -1;
        td.classList.remove('blue');
        td.classList.add('grey');
    }
}

function startGame() {
    matrix = [
        [-1, 0, -1, -1],
        [-1, -1, 1, -1],
        [-1, -1, -1, -1],
        [-1, -1, -1, 1]
    ];

    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            const cell = document.getElementById(`cell-${i}-${j}`);
            cell.classList.remove('grey')
            const color = matrix[i][j] === 0 ? ['red', 'blocked'] :
                matrix[i][j] === 1 ? ['blue', 'blocked'] :
                    ['grey', 'locked'];
            for (let k = 0; k < color.length; k++) {
                cell.classList.add(color[k])
            }
        }
        table.rows[0].cells[0].classList.remove('locked');
        table.rows[0].cells[0].classList.add('cell_alert');
        timer.textContent = `Presiona la celda una vez para volverla roja.`
    }
}

function steps() {
    if (matrix[0][0] === 0) {
        table.rows[0].cells[0].classList.remove('cell_alert')
        table.rows[0].cells[0].classList.add('locked');
        table.rows[1].cells[0].classList.remove('locked');
        table.rows[1].cells[0].classList.add('cell_alert');
        timer.textContent = `Presiona la celda dos veces para volverla azul.`;
    }
    if (matrix[1][0] === 1) {
        table.rows[1].cells[0].classList.remove('cell_alert')
        table.rows[1].cells[0].classList.add('locked');
        table.rows[0].cells[2].classList.remove('locked');
        table.rows[0].cells[2].classList.add('cell_alert');
        timer.textContent = "No puede haber tres celdas del mismo color juntas en una fila.";
    }
    if (matrix[0][2] === 1) {
        table.rows[0].cells[2].classList.remove('cell_alert')
        table.rows[0].cells[2].classList.add('locked');
        table.rows[1].cells[1].classList.remove('locked');
        table.rows[1].cells[1].classList.add('cell_alert');
        timer.textContent = "¿Recuerdas la anterior regla?";
    }
    if (matrix[1][1] === 0) {
        table.rows[1].cells[1].classList.remove('cell_alert')
        table.rows[1].cells[1].classList.add('locked');
        table.rows[2].cells[1].classList.remove('locked');
        table.rows[2].cells[1].classList.add('cell_alert');
        table.rows[2].cells[2].classList.remove('locked');
        table.rows[2].cells[2].classList.add('cell_alert');
        timer.textContent = "No puede haber tres celdas del mismo color juntas en una columna.";
    }
    if (matrix[2][1] === 1 && matrix[2][2] === 0) {
        table.rows[2].cells[1].classList.remove('cell_alert')
        table.rows[2].cells[1].classList.add('locked');
        table.rows[2].cells[2].classList.remove('cell_alert')
        table.rows[2].cells[2].classList.add('locked');
        table.rows[1].cells[0].classList.add('cell_alert');
        table.rows[1].cells[1].classList.add('cell_alert');
        table.rows[1].cells[2].classList.add('cell_alert');
        table.rows[1].cells[3].classList.remove('locked');
        table.rows[1].cells[3].classList.add('cell_alert');
        timer.textContent = "Cada fila debe tener la misma cantidad de celdas de cada color.";
    }
    if (matrix[1][3] === 0) {
        table.rows[1].cells[3].classList.remove('cell_alert')
        table.rows[1].cells[3].classList.add('locked');
        table.rows[1].cells[0].classList.remove('cell_alert')
        table.rows[1].cells[1].classList.remove('cell_alert')
        table.rows[1].cells[2].classList.remove('cell_alert')
        table.rows[0].cells[1].classList.add('cell_alert');
        table.rows[1].cells[1].classList.add('cell_alert');
        table.rows[2].cells[1].classList.add('cell_alert');
        table.rows[3].cells[1].classList.remove('locked');
        table.rows[3].cells[1].classList.add('cell_alert');
        timer.textContent = "Las columnas también cumplen la anterior regla.";
    }
    if (matrix[3][1] === 1) {
        table.rows[3].cells[1].classList.remove('cell_alert')
        table.rows[3].cells[1].classList.add('locked');
        table.rows[0].cells[1].classList.remove('cell_alert')
        table.rows[1].cells[1].classList.remove('cell_alert')
        table.rows[2].cells[1].classList.remove('cell_alert')
        table.rows[3].cells[2].classList.remove('locked');
        table.rows[3].cells[2].classList.add('cell_alert');
        timer.textContent = "Sabes cual va aquí ¿verdad?";
    }
    if (matrix[3][2] === 0) {
        table.rows[2].cells[0].classList.remove('locked');
        table.rows[2].cells[0].classList.add('cell_alert');
        table.rows[2].cells[1].classList.add('cell_alert');
        table.rows[2].cells[2].classList.add('cell_alert');
        table.rows[2].cells[3].classList.remove('locked');
        table.rows[2].cells[3].classList.add('cell_alert');
        table.rows[3].cells[0].classList.remove('locked');
        table.rows[3].cells[0].classList.add('cell_alert');
        table.rows[3].cells[1].classList.add('cell_alert');
        table.rows[3].cells[2].classList.add('locked');
        table.rows[3].cells[2].classList.add('cell_alert');
        table.rows[3].cells[3].classList.add('cell_alert');
        timer.textContent = "No puede haber dos filas o columnas iguales.";
    }
    if (matrix[2][0] === 1 && matrix[2][3] === 0 && matrix[3][0] === 0) {
        table.rows[2].cells[0].classList.add('locked');
        table.rows[2].cells[0].classList.remove('cell_alert')
        table.rows[2].cells[1].classList.remove('cell_alert')
        table.rows[2].cells[2].classList.remove('cell_alert')
        table.rows[2].cells[3].classList.add('locked');
        table.rows[2].cells[3].classList.remove('cell_alert')
        table.rows[3].cells[0].classList.add('locked');
        table.rows[3].cells[0].classList.remove('cell_alert')
        table.rows[3].cells[1].classList.remove('cell_alert')
        table.rows[3].cells[2].classList.remove('cell_alert')
        table.rows[3].cells[3].classList.remove('cell_alert')
        table.rows[0].cells[3].classList.remove('locked');
        table.rows[0].cells[3].classList.add('cell_alert');
        timer.textContent = "Solo falta esta y sabes cual es.";
    }
    if (matrix[0][3] == 1) {
        table.rows[0].cells[3].classList.add('locked');
        table.rows[0].cells[3].classList.remove('cell_alert')
        timer.textContent = "¡Buen trabajo!";
        window.setTimeout(() => {
            window.history.back();
        }, 2000);
    }
}