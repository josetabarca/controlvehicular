import { auth, db } from "./firebase.js"; // Configuracion de firebase 
import { getAuth, signOut, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Iniciar sesion
const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Obtener los campos del formulario        
        const username = document.getElementById("username");
        const password = document.getElementById("password");

        // Limpiar estados anteriores
        limpiarEstados();

        try {
            // Validacion de campos vacios
            if (!username.value.trim() || !password.value.trim()) {
                mostrarError("Por favor, complete todos los campos", [username, password]);
                return;
            }

            // Buscar el correo a partir del nombre de usuario
            const nombresRef = collection(db, "nombresusuarios");
            const q = query(nombresRef, where("usuario", "==", username.value));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                mostrarError("Usuario no encontrado", [username]);
                return;
            }

            // Obtener el correo
            let correo = querySnapshot.docs[0].data().correo;

            // Iniciar sesión con correo real + contraseña
            const cred = await signInWithEmailAndPassword(auth, correo, password.value);
            const userData = await obtenerDatosUsuario(cred.user.uid);

            if (!userData) {
                mostrarError("Información de usuario no encontrada");
                return;
            }

            mostrarExito(`Bienvenid@ ${userData.nombre}`);

            // Redirigir según el rol
            setTimeout(() => {
                if (userData.rol === "Administrador") {
                    window.location.href = "./HTML/searchCar.html";
                } else if (userData.rol === "Seguridad") {
                    window.location.href = "./HTML/searchCarG.html";
                } else {
                    mostrarError("Tipo de usuario no válido");
                }
            }, 1000);

        } catch (error) {
            manejarErrorAuth(error, username, password);
        }
    });
}

// Funciones de utilidad
// Manejo de estados de validación
function limpiarEstados() {
    document.querySelectorAll('.form-control').forEach(input => {
        input.classList.remove('is-invalid');
    });
    document.getElementById('mensaje').className = 'alert mt-3 d-none';
}

// Obtener datos del usuario desde Firestore
async function obtenerDatosUsuario(firebaseUid) {
    const usuariosRef = collection(db, "usuarios");
    const user = query(usuariosRef, where("firebaseUid", "==", firebaseUid));
    const userSnap = await getDocs(user);

    if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        userData.idDocumento = userSnap.docs[0].id;
        return userData;
    }
    return null;
}

// Manejo de errores de autenticación
function manejarErrorAuth(error, username, password) {
    const errores = {
        'auth/wrong-password': ["La contraseña es incorrecta", [password]],
        'auth/too-many-requests': ["Demasiados intentos fallidos. Por favor, intente más tarde", [username, password]],
        'auth/network-request-failed': ["Error de conexión. Verifique su internet", []],
    };

    const [mensaje, campos] = errores[error.code] || ["Error en las credenciales", [username, password]];
    mostrarError(mensaje, campos);
}

// Mostrar mensajes
function mostrarError(mensaje, campos = []) {
    const mensajeElement = document.getElementById("mensaje");
    mensajeElement.className = 'alert alert-danger mt-3 show';
    mensajeElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${mensaje}`;
    campos.forEach(campo => campo.classList.add('is-invalid'));
}

function mostrarExito(mensaje) {
    const mensajeElement = document.getElementById("mensaje");
    mensajeElement.className = 'alert alert-success mt-3 show';
    mensajeElement.innerHTML = `<i class="fas fa-check-circle"></i> ${mensaje}`;
}
if (loginForm) {
    // Limpiar validación al escribir
    document.querySelectorAll('.form-control').forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
            document.getElementById('mensaje').classList.add('d-none');
        });
    });
}
// Cerrar sesión
const opcLogut = document.getElementById("logoutBtn");
if (opcLogut) {
    opcLogut.addEventListener("click", (e) => {
        e.preventDefault();
        signOut(auth)
            .then(() => {
                window.location.href = "../index.html";
            })
            .catch(() => mostrarError("Error al cerrar sesión"));
    });
}

// Control de acceso
const paginaActual = window.location.pathname.split("/").pop();

// Páginas específicas según el rol
const paginasSeguridad = ["searchCarG.html"]; // Solo guardia
const paginasAdmin = ["modCar.html", "newCar.html", "searchCar.html"]; // Solo admin

// Ejecutar el chequeo solo si NO estás en index.html
if (paginaActual !== "index.html" && paginaActual !== "") {
    onAuthStateChanged(auth, async (user) => {
        // Si no hay sesión activa, redirigir al login
        if (!user) {
            window.location.href = "../index.html";
            return;
        }

        try {
            const userData = await obtenerDatosUsuario(user.uid);
            if (!userData) {
                throw new Error("Usuario no encontrado");
            }

            if (userData.rol === "Seguridad" && paginasAdmin.includes(paginaActual)) {
                window.location.href = "./searchCarG.html";
            }
            if (userData.rol === "Administrador" && paginasSeguridad.includes(paginaActual)) {
                window.location.href = "./searchCar.html";
            }
        } catch (error) {
            window.location.href = "../index.html";
        }
    });
}

// Toggle de visibilidad de contraseña
if (loginForm) {

    document.getElementById('togglePassword').addEventListener('click', function () {
        const password = document.getElementById('password');
        const icon = this.querySelector('i');

        if (password.type === 'password') {
            password.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            password.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
}