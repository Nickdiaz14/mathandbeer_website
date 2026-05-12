let n = 4;
let cells;
let matrix = Array.from({ length: n }, () => Array(n).fill(-1));
let step = 0;
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
            mtd.classList.add('grey');
            mtd.classList.add('locked');
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
    if (matrix[row][col] === -2) {
        matrix[row][col] = 0;
        td.classList.remove('grey');
        td.classList.add('red');
    } else if (matrix[row][col] === 0) {
        matrix[row][col] = -1;
        td.classList.remove('red');
        td.classList.add('blue');
    } else {
        matrix[row][col] = -2;
        td.classList.remove('blue');
        td.classList.add('grey');
    }
}

function startGame() {
    matrix = [
        [2, -2, -2, -2],[-1, 3, -2, 1],[-2, -2, -2, 3],[1, -2, -2, -1]
    ];

    setTimeout(function(){
        timer.textContent = `Las celdas rojas pueden ver otras celdas en su propia fila y columna.`;
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
                const cell = table.rows[i].cells[j];
                if (matrix[i][j] >= 0){
                    cell.className = 'red locked';
                }
            }
        }
        setTimeout(function(){
            timer.textContent = `Las celdas azules bloquean la vista de las celdas rojas.`;
            for (let i = 0; i < matrix.length; i++) {
                for (let j = 0; j < matrix[i].length; j++) {
                    const cell = table.rows[i].cells[j];
                    if (matrix[i][j] === -1){
                        cell.className = 'blue locked';
                    }
                }
            }
            setTimeout(function(){
                timer.textContent = `Los números indican cuántas celdas rojas deben ver.`;
                for (let i = 0; i < matrix.length; i++) {
                    for (let j = 0; j < matrix[i].length; j++) {
                        const cell = table.rows[i].cells[j];
                        if (cell.className === 'red locked') {
                            cell.innerText = matrix[i][j] > 0 ? matrix[i][j] : '';
                        }
                    }
                }
                setTimeout(function(){
                    timer.textContent = 'Esta celda debe ver dos celdas rojas y hay una azul abajo.'
                    table.rows[0].cells[0].classList.add('cell_alert');
                    setTimeout(function(){
                        timer.textContent = 'Por lo tanto, las de la derecha deben ser rojas. Presionalas una vez.'
                        table.rows[0].cells[0].classList.remove('cell_alert');
                        table.rows[0].cells[1].classList.remove('locked');
                        table.rows[0].cells[1].classList.add('cell_alert');
                        table.rows[0].cells[2].classList.remove('locked');
                        table.rows[0].cells[2].classList.add('cell_alert');
                    }, 4000)
                }, 4000)
            }, 4000)
        }, 4000)
    }, 2000)
}

function steps() {
    if (matrix[0][1] === 0 && matrix[0][2] === 0 && step === 0) {
        step++;
        table.rows[0].cells[1].classList.remove('cell_alert');
        table.rows[0].cells[2].classList.remove('cell_alert');
        table.rows[0].cells[1].classList.add('locked');
        table.rows[0].cells[2].classList.add('locked');

        table.rows[0].cells[3].classList.remove('locked');
        table.rows[0].cells[3].classList.add('cell_alert');
        timer.textContent = `¡Genial! Esta debe ser azul para bloquear, presionala dos veces.`;
    }
    if (matrix[0][3] === -1 && step === 1) {
        step++;
        table.rows[0].cells[3].classList.remove('cell_alert')
        table.rows[0].cells[3].classList.add('locked');

        table.rows[1].cells[3].classList.remove('locked');
        table.rows[1].cells[3].classList.add('cell_alert');
        timer.textContent = "Esta celda ya está viendo una celda roja.";
        setTimeout(function(){
            table.rows[1].cells[3].classList.remove('cell_alert')
            table.rows[1].cells[3].classList.add('locked');
            table.rows[1].cells[2].classList.remove('locked');
            table.rows[1].cells[2].classList.add('cell_alert');
            timer.textContent = "Por lo tanto, debemos bloquearla aquí.";
        }, 4000)
    }
    if (matrix[1][2] === -1 && step === 2) {
        step++;
        table.rows[1].cells[2].classList.remove('cell_alert')
        table.rows[1].cells[2].classList.add('locked');

        table.rows[1].cells[1].classList.remove('locked');
        table.rows[1].cells[1].classList.add('cell_alert');
        timer.textContent = "Esta celda no puede ver a los lados. Pero ve la celda de arriba.";
        setTimeout(function(){
            table.rows[1].cells[1].classList.remove('cell_alert')
            table.rows[1].cells[1].classList.add('locked');
            table.rows[2].cells[1].classList.remove('locked');
            table.rows[2].cells[1].classList.add('cell_alert');
            table.rows[3].cells[1].classList.remove('locked');
            table.rows[3].cells[1].classList.add('cell_alert');
            timer.textContent = "Para completar las 3 celdas rojas deben ser estas, presionalas.";
        }, 4000)
    }
    if (matrix[2][1] === 0 && matrix[3][1] === 0 && step === 3) {
        step++;
        table.rows[2].cells[1].classList.remove('cell_alert')
        table.rows[3].cells[1].classList.remove('cell_alert')
        table.rows[2].cells[1].classList.add('locked');
        table.rows[3].cells[1].classList.add('locked');

        table.rows[2].cells[0].classList.remove('locked');
        table.rows[2].cells[0].classList.add('cell_alert');
        table.rows[2].cells[2].classList.remove('locked');
        table.rows[2].cells[2].classList.add('cell_alert');
        table.rows[3].cells[2].classList.remove('locked');
        table.rows[3].cells[2].classList.add('cell_alert');
        timer.textContent = "¿Puedes completar el resto?";
    }
    if (matrix[2][0] === -1 && matrix[2][2] === 0 && matrix[3][2] === -1 && step === 4) {
        table.rows[2].cells[0].classList.remove('cell_alert')
        table.rows[2].cells[2].classList.remove('cell_alert')
        table.rows[3].cells[2].classList.remove('cell_alert')
        table.rows[2].cells[0].classList.add('locked');
        table.rows[2].cells[2].classList.add('locked');
        table.rows[3].cells[2].classList.add('locked');
        timer.textContent = "¡Buen trabajo!";
        let values = [5,2,5,2,4]
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix.length; j++) {
                const cell = table.rows[i].cells[j];
                if (matrix[i][j] === 0) {
                    cell.innerText = values.shift();
                }
            }
        }
        window.setTimeout(() => {
            window.history.back();
        }, 2000);
    }
}