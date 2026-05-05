let overlay = document.getElementById('overlay');
overlay.style.display = "none"; // Ocultar overlay al empezar

const form = document.querySelector('form');

document.querySelectorAll('.opcion-multiple').forEach(opcion => {
    opcion.addEventListener('click', function () {
        const radio = opcion.querySelector('input[type="radio"]');
        if (radio) {
            radio.checked = true;
        }
    });
});

const logos = [];

for (let i = 0; i < 100; i++) {
    const img = document.createElement('img');
    img.src = "/static/images/logos/logo_M&B_b.png";
    img.className = 'background-logo';
    img.style.position = 'fixed';
    img.style.width = `${Math.random() * 80 + 40}px`;
    img.style.height = 'auto';
    img.style.opacity = 0.1;
    img.style.zIndex = '-1';
    img.style.pointerEvents = 'none';

    const width = parseFloat(img.style.width);

    const logo = {
        element: img,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        width: width,
        angle: Math.random() * 360,  // Ángulo inicial
        rotationSpeed: (Math.random() - 0.5) * 2.5 // Velocidad angular aleatoria
    };

    img.style.left = `${logo.x}px`;
    img.style.top = `${logo.y}px`;

    logos.push(logo);
    document.body.appendChild(img);
}

function animate() {
    for (const logo of logos) {
        logo.x += logo.vx;
        logo.y += logo.vy;
        logo.angle += logo.rotationSpeed;

        if (logo.x <= 0 || logo.x + logo.width >= window.innerWidth) {
            logo.vx *= -1;
        }
        if (logo.y <= 0 || logo.y + logo.width >= window.innerHeight) {
            logo.vy *= -1;
        }

        logo.element.style.left = `${logo.x}px`;
        logo.element.style.top = `${logo.y}px`;
        logo.element.style.transform = `rotate(${logo.angle}deg)`;
    }
    requestAnimationFrame(animate);
}

animate();

function updateRating(rating) {
    const stars = document.querySelectorAll('.rating img');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
    document.getElementById('calificacion').value = rating;
}

function toggleKonradista(isKonradista) {
    const carreraField = document.getElementById('carrera-field');
    const inputsCarrera = document.querySelectorAll('.input-condicional-carrera');
    if (isKonradista) {
        carreraField.style.display = 'block';
        inputsCarrera.forEach(input => {
            input.required = true
            if (input.value === "No aplica") input.checked = false
        });
    } else {
        carreraField.style.display = 'none';
        inputsCarrera.forEach(input => {
            input.required = false;
            input.checked = false;
        });
        const defaultInput = document.querySelector('input[name="carrera"][value="No aplica"]');
        if (defaultInput) {
            defaultInput.checked = true;
        }
    }
}

function toggleCiudad(isBogota) {
    const ciudadField = document.getElementById('ciudad-field');
    const inputsCiudad = document.querySelectorAll('.input-condicional-ciudad');
    if (isBogota) {
        ciudadField.style.display = 'block';
        inputsCiudad.forEach(input => {
            input.required = true
            if (input.value === "No") input.checked = false
        });
    } else {
        ciudadField.style.display = 'none';
        inputsCiudad.forEach(input => {
            input.required = false;
            input.checked = false; // Desmarcar opciones de ciudad si no es Bogotá
        });

        const defaultInput = document.querySelector('input[name="konradista"][value="No"]');
        if (defaultInput) {
            defaultInput.checked = true; // Marcar "No" si no es Bogotá
        }
    }
}

async function submitForm(event) {
    event.preventDefault(); // Evitar recargar página
    const submitButton = document.getElementById('enviar');
    submitButton.textContent = 'Enviando...'; // Cambiar texto del botón
    submitButton.style.backgroundColor = '#ccc'; // Cambiar color del botón
    submitButton.disabled = true; // Deshabilitar el botón de envío

    const formData = new FormData(event.target);
    console.log('Datos del formulario:', Object.fromEntries(formData.entries())); // Mostrar datos en consola

    const response = await fetch('/attendance', {
        method: 'POST',
        body: formData
    });

    const result = await response.json();
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'flex'; // Mostrar overlay al enviar el formulario
    const overlayContent = document.createElement('div');
    const overlayLabel = document.getElementById('overlay-label');
    const overlayButtons = document.getElementById('overlay-buttons');

    if (result.success) {
        overlayLabel.innerHTML = 'Información cargada correctamente.<br>¡Gracias por tu participación!';
        overlayButtons.innerHTML = `
            <button onclick="location.href='/forms'" class="game">Nuevo Registro</button>
            <button onclick="location.href='/'" class="game">Visitar página</button>
        `;
    } else {
        overlayLabel.textContent = 'Se produjo un error, intente nuevamente.';
        overlayButtons.innerHTML = ''; // Limpiamos botones
        setTimeout(() => {
            window.location.reload(); // Recargar página después de 3 segundos
        }, 3000);
    }
}
