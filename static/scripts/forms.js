// Estado global del Wizard y Perfil de Asistencia
let currentStep = 1;
const totalSteps = 5;

const stepTitles = {
    1: 'Información Personal',
    2: 'Identificación y Contacto',
    3: 'Ubicación y Perfil Académico',
    4: 'Rol del Asistente',
    5: 'Calificación y Comentarios'
};

const STORAGE_KEY = 'mnb_attendance_profile';
let hasSavedProfile = false;
let lastSubmittedFormData = null;

// Inicialización cuando carga el DOM
document.addEventListener('DOMContentLoaded', () => {
    checkExistingUserAndProfile();
    initWizardUI();
    initFloatingBackgroundLogos();
});

// Configura la UI inicial del wizard
function initWizardUI() {
    updateStepView();
}

// Salto directo a un paso específico (ej. para revisar datos desde el banner)
function goToStep(step) {
    if (step >= 1 && step <= totalSteps) {
        currentStep = step;
        updateStepView();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Navegación entre pasos (direction: +1 para siguiente, -1 para anterior)
function navigateStep(direction) {
    if (direction === 1) {
        if (!validateStep(currentStep)) {
            return;
        }
    }

    const nextStep = currentStep + direction;
    if (nextStep >= 1 && nextStep <= totalSteps) {
        currentStep = nextStep;
        updateStepView();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Actualiza la visualización de los pasos, barra de progreso y botones
function updateStepView() {
    // Mostrar/ocultar pasos
    document.querySelectorAll('.wizard-step').forEach(stepEl => {
        const stepNum = parseInt(stepEl.getAttribute('data-step'), 10);
        if (stepNum === currentStep) {
            stepEl.classList.add('active');
        } else {
            stepEl.classList.remove('active');
        }
    });

    // Actualizar texto y progreso
    const indicatorText = document.getElementById('step-indicator-text');
    const titleText = document.getElementById('step-title-text');
    const progressBarFill = document.getElementById('progress-bar-fill');

    if (indicatorText) indicatorText.textContent = `${currentStep} / ${totalSteps}`;
    if (titleText) titleText.textContent = stepTitles[currentStep] || '';
    if (progressBarFill) {
        const percentage = (currentStep / totalSteps) * 100;
        progressBarFill.style.width = `${percentage}%`;
    }

    // Actualizar botones de navegación
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('enviar');

    if (btnPrev) {
        btnPrev.style.display = currentStep > 1 ? 'block' : 'none';
    }

    if (currentStep === totalSteps) {
        if (btnNext) btnNext.style.display = 'none';
        if (btnSubmit) btnSubmit.style.display = 'block';
    } else {
        if (btnNext) btnNext.style.display = 'block';
        if (btnSubmit) btnSubmit.style.display = 'none';
    }
}

// Validación de los campos obligatorios del paso actual
function validateStep(step) {
    const currentStepEl = document.querySelector(`.wizard-step[data-step="${step}"]`);
    if (!currentStepEl) return true;

    // Validar inputs requeridos visibles (text, email, number)
    const requiredInputs = currentStepEl.querySelectorAll('input[required]:not([type="radio"]), textarea[required]');
    for (const input of requiredInputs) {
        if (!input.checkValidity()) {
            input.reportValidity();
            return false;
        }
    }

    // Validar grupos de radio requeridos
    const radioGroups = new Set();
    currentStepEl.querySelectorAll('input[type="radio"][required]').forEach(r => radioGroups.add(r.name));

    for (const groupName of radioGroups) {
        const checked = currentStepEl.querySelector(`input[name="${groupName}"]:checked`);
        if (!checked) {
            const firstRadio = currentStepEl.querySelector(`input[name="${groupName}"]`);
            if (firstRadio) {
                firstRadio.focus();
                showToast(`Por favor responde a todas las preguntas obligatorias.`, 'info');
            }
            return false;
        }
    }

    // Validación condicional del Paso 3 (Konradista y Carrera)
    if (step === 3) {
        const ciudadChecked = document.querySelector('input[name="ciudad"]:checked');
        if (ciudadChecked && ciudadChecked.value === 'Bogotá') {
            const konradistaChecked = document.querySelector('input[name="konradista"]:checked');
            if (!konradistaChecked) {
                showToast('Por favor indica si perteneces a la comunidad konradista.', 'info');
                return false;
            }
            if (konradistaChecked.value === 'Si') {
                const carreraChecked = document.querySelector('input[name="carrera"]:checked');
                if (!carreraChecked || carreraChecked.value === 'No aplica') {
                    showToast('Por favor selecciona tu carrera.', 'info');
                    return false;
                }
            }
        }
    }

    // Validación del Paso 5 (Calificación)
    if (step === 5) {
        const calificacionVal = document.getElementById('calificacion').value;
        const califError = document.getElementById('calificacion-error');
        if (!calificacionVal) {
            if (califError) califError.style.display = 'block';
            showToast('Por favor califica el evento con las cervezas.', 'info');
            return false;
        } else {
            if (califError) califError.style.display = 'none';
        }
    }

    return true;
}

// Carga perfil guardado en localStorage si existe y posiciona en el paso final
function checkExistingUserAndProfile() {
    const savedProfileStr = localStorage.getItem(STORAGE_KEY);

    if (savedProfileStr) {
        try {
            const savedProfile = JSON.parse(savedProfileStr);
            hasSavedProfile = true;
            applySavedProfileToForm(savedProfile);

            // Si ya guardó su info, llevarlo directo al último paso (Paso 5: Calificación y Comentarios)
            currentStep = 5;
            updateStepView();

            const banner = document.getElementById('profile-detected-banner');
            const textSpan = document.getElementById('profile-banner-text');
            if (banner) banner.style.display = 'flex';
            if (textSpan && savedProfile.nombre_completo) {
                textSpan.innerHTML = `<strong>${savedProfile.nombre_completo}</strong>, tus datos fueron autocompletados.`;
            }
        } catch (e) {
            console.warn('Error leyendo perfil guardado:', e);
        }
    }

    // Botón de limpiar perfil guardado
    const btnClearSaved = document.getElementById('btn-clear-saved');
    if (btnClearSaved) {
        btnClearSaved.addEventListener('click', () => {
            localStorage.removeItem(STORAGE_KEY);
            hasSavedProfile = false;
            const banner = document.getElementById('profile-detected-banner');
            if (banner) banner.style.display = 'none';
            goToStep(1);
            showToast('Respuestas predeterminadas eliminadas.', 'info');
        });
    }
}

// Precarga los campos del formulario con el perfil guardado (sin tocar calificación ni comentario)
function applySavedProfileToForm(profile) {
    if (!profile) return;

    if (profile.nombre_completo) {
        const el = document.getElementById('nombre_completo');
        if (el) el.value = profile.nombre_completo;
    }
    if (profile.sexo) {
        setRadioValue('sexo', profile.sexo);
    }
    if (profile.tipo_doc) {
        setRadioValue('tipo_doc', profile.tipo_doc);
    }
    if (profile.numero_doc) {
        const el = document.getElementById('numero_doc');
        if (el) el.value = profile.numero_doc;
    }
    if (profile.edad) {
        setRadioValue('edad', profile.edad);
    }
    if (profile.correo_electronico) {
        const el = document.getElementById('correo_electronico');
        if (el) el.value = profile.correo_electronico;
    }
    if (profile.ciudad) {
        setRadioValue('ciudad', profile.ciudad);
        toggleCiudad(profile.ciudad === 'Bogotá');
    }
    if (profile.konradista) {
        setRadioValue('konradista', profile.konradista);
        toggleKonradista(profile.konradista === 'Si');
    }
    if (profile.carrera && profile.carrera !== 'No aplica') {
        setRadioValue('carrera', profile.carrera);
    }
    if (profile.rol) {
        setRadioValue('rol', profile.rol);
    }
    if (profile.futuros_eventos) {
        setRadioValue('futuros_eventos', profile.futuros_eventos);
    }

    // La calificación y el comentario se dejan deliberadamente vacíos para que sean de la charla actual
}

function setRadioValue(name, val) {
    const radio = document.querySelector(`input[name="${name}"][value="${val}"]`);
    if (radio) {
        radio.checked = true;
    }
}

// Actualiza la calificación con cervezas
function updateRating(rating) {
    const beerLabels = document.querySelectorAll('.beer-label');
    beerLabels.forEach((label, index) => {
        if (index < rating) {
            label.classList.add('active');
        } else {
            label.classList.remove('active');
        }
        if (index === rating - 1) {
            label.classList.add('selected');
        } else {
            label.classList.remove('selected');
        }
    });

    const hiddenInput = document.getElementById('calificacion');
    if (hiddenInput) {
        hiddenInput.value = rating;
    }

    const califError = document.getElementById('calificacion-error');
    if (califError) califError.style.display = 'none';
}

// Lógica condicional: Konradista
function toggleKonradista(isKonradista) {
    const carreraField = document.getElementById('carrera-field');
    const inputsCarrera = document.querySelectorAll('.input-condicional-carrera');
    if (!carreraField) return;

    if (isKonradista) {
        carreraField.style.display = 'block';
        inputsCarrera.forEach(input => {
            input.required = true;
            if (input.value === "No aplica") input.checked = false;
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

// Lógica condicional: Ciudad (Bogotá activa pregunta Konradista)
function toggleCiudad(isBogota) {
    const ciudadField = document.getElementById('ciudad-field');
    const inputsCiudad = document.querySelectorAll('.input-condicional-ciudad');
    if (!ciudadField) return;

    if (isBogota) {
        ciudadField.style.display = 'block';
        inputsCiudad.forEach(input => {
            input.required = true;
            if (input.value === "No") input.checked = false;
        });
    } else {
        ciudadField.style.display = 'none';
        inputsCiudad.forEach(input => {
            input.required = false;
            input.checked = false;
        });

        const defaultInput = document.querySelector('input[name="konradista"][value="No"]');
        if (defaultInput) {
            defaultInput.checked = true;
        }
        // También ocultar carrera si no es Bogotá
        toggleKonradista(false);
    }
}

// Envío del Formulario
async function submitForm(event) {
    event.preventDefault();

    if (!validateStep(5)) {
        return;
    }

    const submitButton = document.getElementById('enviar');
    submitButton.textContent = 'Enviando Asistencia... ⏳';
    submitButton.disabled = true;

    const formElement = event.target;
    const formData = new FormData(formElement);

    // Guardar copia local de los datos para la opción de guardado
    lastSubmittedFormData = {
        nombre_completo: formData.get('nombre_completo') || '',
        sexo: formData.get('sexo') || '',
        tipo_doc: formData.get('tipo_doc') || '',
        numero_doc: formData.get('numero_doc') || '',
        edad: formData.get('edad') || '',
        correo_electronico: formData.get('correo_electronico') || '',
        ciudad: formData.get('ciudad') || '',
        rol: formData.get('rol') || '',
        konradista: formData.get('konradista') || 'No',
        carrera: formData.get('carrera') || 'No aplica',
        futuros_eventos: formData.get('futuros_eventos') || ''
    };

    try {
        const response = await fetch('/attendance', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        const overlay = document.getElementById('overlay');
        const overlayLabel = document.getElementById('overlay-label');
        const overlayButtons = document.getElementById('overlay-buttons');
        const overlaySavePrompt = document.getElementById('overlay-save-prompt');

        overlay.style.display = 'flex';

        if (result.success) {
            overlayLabel.innerHTML = '¡Asistencia registrada!<br><span style="font-size: 0.95rem; font-weight: 400; color: #b6bde7;">Gracias por venir a Math & Beer 🍻</span>';

            // Preguntar si desea guardar a cualquiera que aún no tenga un perfil guardado
            const shouldPromptSave = !hasSavedProfile;

            if (shouldPromptSave) {
                overlaySavePrompt.style.display = 'block';

                document.getElementById('btn-save-profile').onclick = () => {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(lastSubmittedFormData));
                    hasSavedProfile = true;
                    overlaySavePrompt.style.display = 'none';
                    showToast('Listo, respuestas guardadas.', 'success');
                };

                document.getElementById('btn-skip-save').onclick = () => {
                    overlaySavePrompt.style.display = 'none';
                };
            } else {
                overlaySavePrompt.style.display = 'none';
            }

            overlayButtons.innerHTML = `
                <button type="button" onclick="location.href='/forms'" class="game-btn-secondary">Nuevo Registro</button>
                <button type="button" onclick="location.href='/'" class="game-btn-primary">Ir al inicio</button>
            `;
        } else {
            overlayLabel.textContent = 'Hubo un error al registrar la asistencia.';
            overlaySavePrompt.style.display = 'none';
            showToast('Error: ' + (result.message || 'Intente nuevamente.'), 'error');
            overlayButtons.innerHTML = `
                <button type="button" onclick="document.getElementById('overlay').style.display='none'; document.getElementById('enviar').disabled=false; document.getElementById('enviar').textContent='Reintentar';" class="game-btn-primary">Reintentar</button>
            `;
        }
    } catch (err) {
        console.error('Error enviando formulario:', err);
        showToast('Error de conexión con el servidor.', 'error');
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar Asistencia 🚀';
    }
}

// Fondo de Logos Flotantes M&B
function initFloatingBackgroundLogos() {
    const logos = [];
    const count = window.innerWidth < 600 ? 25 : 50;

    for (let i = 0; i < count; i++) {
        const img = document.createElement('img');
        img.src = "/static/images/logos/logo_M&B_b.png";
        img.className = 'background-logo';
        img.style.width = `${Math.random() * 55 + 25}px`;
        img.style.height = 'auto';

        const width = parseFloat(img.style.width);
        const logo = {
            element: img,
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.9,
            vy: (Math.random() - 0.5) * 0.9,
            width: width,
            angle: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 1.5
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

            if (logo.x <= 0 || logo.x + logo.width >= window.innerWidth) logo.vx *= -1;
            if (logo.y <= 0 || logo.y + logo.width >= window.innerHeight) logo.vy *= -1;

            logo.element.style.left = `${logo.x}px`;
            logo.element.style.top = `${logo.y}px`;
            logo.element.style.transform = `rotate(${logo.angle}deg)`;
        }
        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}

