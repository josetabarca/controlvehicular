const MODAL_ID = "feedbackModal";
// Iconos para diferentes tipos de mensajes
const ICON_CLASSES = {
    success: "fas fa-check-circle text-success",
    error: "fas fa-times-circle text-danger",
    warning: "fas fa-exclamation-triangle text-warning",
    info: "fas fa-info-circle text-primary",
};

// Temporizadores para auto-cierre y redirección
let autoCloseTimer = null;
let redirectTimer = null;

// Limpiar temporizadores
function clearTimers() {
    if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
    }
    if (redirectTimer) {
        clearTimeout(redirectTimer);
        redirectTimer = null;
    }
}

// Mostrar modal de feedback
export function showFeedbackModal({
    // Opciones por defecto
    title = "Aviso",
    message = "",
    type = "info",
    autoClose = false,
    autoCloseDelay = 1800,
    redirectTo = null,
    redirectDelay = 1800,
} = {}) {
    // Obtener elementos del modal
    const modalEl = document.getElementById(MODAL_ID);
    // Si no existe el modal, salir
    if (!modalEl) {
        console.warn(`[feedbackModal] No se encontró el elemento #${MODAL_ID}.`);
        return false;
    }
    // Actualizar contenido del modal
    const titleEl = modalEl.querySelector(".feedback-modal-title");
    const messageEl = modalEl.querySelector(".feedback-modal-message");
    const iconEl = modalEl.querySelector(".feedback-modal-icon");

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (iconEl) {
        iconEl.className = `feedback-modal-icon fa-3x mb-3 ${ICON_CLASSES[type] || ICON_CLASSES.info}`.trim();
    }
    // Verificar que Bootstrap Modal esté disponible
    if (!window.bootstrap || !window.bootstrap.Modal) {
        console.warn("Bootstrap Modal no se encuentra disponible.");
        return false;
    }

    clearTimers();

    // Mostrar el modal y evitar cierre al hacer clic fuera del modal
    const modalInstance = window.bootstrap.Modal.getOrCreateInstance(modalEl, {
        backdrop: "static",
    });
    modalInstance.show();

    // Configurar auto-cierre y redirección si es necesario
    if (autoClose) {
        autoCloseTimer = setTimeout(() => {
            modalInstance.hide();
            autoCloseTimer = null;
        }, autoCloseDelay);
    }

    if (redirectTo) {
        redirectTimer = setTimeout(() => {
            window.location.href = redirectTo;
        }, redirectDelay);
    }

    return true;
}

// Ocultar modal de feedback
export function hideFeedbackModal() {
    // Obtener elementos del modal
    const modalEl = document.getElementById(MODAL_ID);
    // Si no existe el modal, salir
    if (!modalEl || !window.bootstrap || !window.bootstrap.Modal) return;

    clearTimers();
    const instance = window.bootstrap.Modal.getInstance(modalEl);
    if (instance) instance.hide(); // Ocultar el modal
}