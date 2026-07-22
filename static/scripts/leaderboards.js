let better;
let records;
let game_name;
let timerInterval;

const MEDALS = ['🥇', '🥈', '🥉'];

function showSkeletonRows(tbodyEl, count) {
    tbodyEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const tr = document.createElement('tr');
        tr.classList.add('skeleton-row');
        for (let j = 0; j < 3; j++) {
            const td = document.createElement('td');
            const span = document.createElement('span');
            span.classList.add('skeleton-cell');
            td.appendChild(span);
            tr.appendChild(td);
        }
        tbodyEl.appendChild(tr);
    }
}

const back = document.getElementById('back');
const title = document.getElementById('title');
const leader = document.getElementById('ranking');
const game_info = document.getElementById('game_info');
const extra_leader = document.getElementById('extra_ranking');
const extra_table = document.getElementById('extra_leaderboard');
const fireworks = document.getElementById('fireworks-layer');
const count_records = document.getElementById('count_records');
if (count_records) {
    count_records.textContent = '0';
}

document.addEventListener('DOMContentLoaded', function () {

    if (back) {
        back.addEventListener('click', () => {
            const groupId = getGroupId();
            const url = groupId !== 'default' ? `/menu_games?group_id=${encodeURIComponent(groupId)}` : '/menu_games';
            window.location.href = url;
        });
    }

    if (game_info) {
        game_info.addEventListener('click', () => {
            window.history.back();
        });
    }

    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            window.location.reload();
        }
    });
    records = document.body.dataset.records;
    better = document.body.dataset.better;
    if (better === 'True') {
        fireworks.style.display = 'flex'
    }
    updateLeaderboard();

    timerInterval = setInterval(() => {
        updateLeaderboard();
    }, 15000);
    filterGamesByCategory();
})

function updateLeaderboard() {
    game_name = document.body.dataset.game || document.getElementById('select').value;
    const userid = localStorage.getItem('userId');
    const groupId = getGroupId();
    showSkeletonRows(leader, records || 10);
    fetch('/leaderboard/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            game: game_name,
            userid: userid,
            group_id: groupId
        })
    })
        .then(response => response.json())
        .then(data => {
            leader.innerHTML = '';
            if (count_records) {
                count_records.textContent = data.count_records;
            }
            // Asegurar que siempre haya 10 filas
            const fullRanking = [...data.ranking];
            while (fullRanking.length < records) {
                fullRanking.push(['-', '-', '-']);
            }

            // Crear todas las filas
            fullRanking.slice(0, records).forEach((register, index) => {
                let colorClass = "#ffffff";
                const mtr = document.createElement('tr');
                const mtd_position = document.createElement('td');
                const mtd_name = document.createElement('td');
                const mtd_record = document.createElement('td');

                if (index === 0) {
                    colorClass = "#f1c40f";
                } else if (index === 1) {
                    colorClass = "#7bafb9";
                } else if (index === 2) {
                    colorClass = "#bd6104";
                }

                // Medalla para top 3, número para el resto
                if (index < 3 && register[0] !== '-') {
                    mtd_position.innerHTML = `<span class="rank-medal">${MEDALS[index]}</span>`;
                } else {
                    mtd_position.textContent = register[0];
                    mtd_position.style.color = colorClass;
                }
                mtd_name.textContent = register[1];
                mtd_record.textContent = register[2];
                mtd_name.style.color = colorClass;
                mtd_record.style.color = colorClass;

                if (localStorage.getItem('userId') === register[3]) {
                    mtr.classList.add('my-row');
                }

                mtr.classList.add('leaderboard-row-enter');
                mtr.style.animationDelay = `${index * 45}ms`;

                mtr.appendChild(mtd_position);
                mtr.appendChild(mtd_name);
                mtr.appendChild(mtd_record);
                leader.appendChild(mtr);
            });

            if (data.personal_ranking[0] > records) {
                extra_table.style.display = 'flex';
                extra_leader.innerHTML = '';
                const mtr = document.createElement('tr');
                const mtd_position = document.createElement('td');
                const mtd_name = document.createElement('td');
                const mtd_record = document.createElement('td');

                mtd_position.textContent = data.personal_ranking[0];
                mtd_name.textContent = data.personal_ranking[1];
                mtd_record.textContent = data.personal_ranking[2];

                mtr.classList.add('my-row');
                mtr.appendChild(mtd_position);
                mtr.appendChild(mtd_name);
                mtr.appendChild(mtd_record);
                extra_leader.appendChild(mtr);
            } else {
                extra_table.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function filterGamesByCategory() {
    const categorySelect = document.getElementById('category_select');
    const gameSelect = document.getElementById('select');
    const category = categorySelect.value;
    const options = gameSelect.options;

    let firstVisibleSet = false;

    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const optionCat = option.getAttribute('data-cat');

        if (category === 'all' || optionCat === category) {
            option.style.display = 'block';
            if (!firstVisibleSet) {
                gameSelect.value = option.value;
                firstVisibleSet = true;
            }
        } else {
            option.style.display = 'none';
        }
    }

    updateLeaderboard();
}