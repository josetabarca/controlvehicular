import { searchVehicle } from "./searchG.js";

// Inicializa el lector de QR
const video = document.createElement("video");

// Inicializa canvas para dibujar el video
const canvasElement = document.getElementById("qr-canvas");
const canvas = canvasElement.getContext("2d");

// Botones de abrir y cerrar camara
const scannerBtn = document.getElementById("scannerBtn");
const closeEscannerBtn = document.getElementById("closeEscannerBtn");

// Variable para controlar el estado de escaneo
let scanning = false;


// Funciones para abrir la camara y escanear el codigo QR
scannerBtn.addEventListener('click', () => encenderCamara());
const encenderCamara = () => {
    navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then(function (stream) {
            scanning = true; // activar el escaneo
            new bootstrap.Modal(document.getElementById('scannerModal')).show(); // mostrar el modal
            canvasElement.hidden = false; // mostrar el canvas
            video.setAttribute("playsinline", true); // Necesario para iOS
            video.srcObject = stream; // Asignar el stream de la camara al video
            video.play(); // Iniciar el video
            tick(); // Iniciar el proceso de dibujo en el canvas
            scan(); // Iniciar el escaneo
        });
};

// Funcion para dibujar el video en el canvas
function tick() {
    canvasElement.height = video.videoHeight;
    canvasElement.width = video.videoWidth;
    canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

    scanning && requestAnimationFrame(tick); // Continuar dibujando mientras se escanea
}

// Funcion para escanear el codigo QR
function scan() {
    try {
        qrcode.decode();
    } catch (e) {
        setTimeout(scan, 300);
    }
}

// Funcion para cerrar la camara
closeEscannerBtn.addEventListener('click', () => cerrarCamara());
const cerrarCamara = () => {
    // detener el stream de la camara
    video.srcObject.getTracks().forEach((track) => {
        track.stop();
    });
    canvasElement.hidden = true;
    scanning = false;
    //console.log("Camara cerrada");
    const modal = bootstrap.Modal.getInstance(document.getElementById('scannerModal')); // obtener instancia del modal
    modal.hide(); // ocultar el modal
};

// Funcion para activar el sonido al escanear
const activarSonido = () => {
    var audio = document.getElementById('audioScaner');
    audio.play();
}

// Manejar el resultado del escaneo
qrcode.callback = (respuesta) => {
    if (respuesta) {
        activarSonido();
        cerrarCamara();
        searchVehicle(respuesta);
    }
};