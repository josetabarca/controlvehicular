import { auth, db } from "./firebase.js"; // Configuracion de firebase 
import { getAuth, signOut, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Iniciar sesion

const loginForm = document.getElementById("login-form"); // Obtener el formulario de login
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        // Obtener los campos del formulario
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        const mensaje = document.getElementById("mensaje");

        try {
            // Buscar el correo a partir del nombre de usuario
            const nombresRef = collection(db, "nombresusuarios"); // Coleccion de nombres de usuario
            const q = query(nombresRef, where("usuario", "==", username));
            const querySnapshot = await getDocs(q);

            // Si no se encuentra el usuario
            if (querySnapshot.empty) {
                mensaje.textContent = "❌ Usuario no encontrado.";
                return;
            }

            // Obtencion el correo
            let correo = "";
            querySnapshot.forEach((docSnap) => {
                correo = docSnap.data().correo;
            });


            // Iniciar sesión con correo real + contraseña
            const cred = await signInWithEmailAndPassword(auth, correo, password);
            const firebaseUid = cred.user.uid;
            mensaje.textContent = "✅ Inicio de sesión exitoso";

            // Obtener documento del usuario
            const usuariosRef = collection(db, "usuarios");
            const user = query(usuariosRef, where("firebaseUid", "==", firebaseUid));
            const userSnap = await getDocs(user);

            if (userSnap.empty) {
                mensaje.textContent = "⚠️ El usuario no existe";
                return;
            }

            // Obtener datos completos del usuario
            let userData = {};
            userSnap.forEach((docSnap) => {
                userData = docSnap.data();
                userData.idDocumento = docSnap.id;
            });

            // Imprimir los datos del usuario
            alert(
                "Datos del usuario:\n" +
                "Nombre: " + userData.nombre + " " + userData.apellido + "\n" +
                "Correo: " + userData.correo + "\n" +
                "Rol: " + userData.rol + "\n" +
                "Telefono: " + userData.telefono
            );

            // Redirigir según el rol 
            if (userData.rol === "Administrador") {
                window.location.href = "./HTML/newCar.html";
            } else if (userData.rol === "Seguridad") {
                window.location.href = "./HTML/searchCarG.html";
            }
            else { mensaje.textContent = "Error, tipo de usuario no valido"; }

        } catch (error) {
            //console.error(error);
            alert("❌ Error al iniciar sesión: " + error.message);
        }
    });
}




// Cerrar sesion
function cerrarSesion() {
    signOut(auth)
        .then(() => {
            alert("Sesión cerrada correctamente ✅");
            window.location.href = "../index.html";
        })
        .catch((error) => {
            alert("Error al cerrar sesión ❌");
        });
}

const opcLogut = document.getElementById("logoutBtn"); // Obtener botón del menú con la función cerrar sision

if (opcLogut) { // Este boton solo existe en las paginas posteriores al login/index
    opcLogut.addEventListener("click", (e) => {
        e.preventDefault();
        cerrarSesion();
    });
}




// Bloqueo de acceso a personas no autorizadas y según el rol

// Detectar el nombre del archivo actual
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
            // Buscar el documento del usuario usando el campo firebaseUid
            const usuariosRef = collection(db, "usuarios");
            const q = query(usuariosRef, where("firebaseUid", "==", user.uid));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("No se encontró información del usuario. Contacta al administrador.");
                window.location.href = "../index.html";
                return;
            }

            // Extraer los datos del usuario
            let rol = "";
            querySnapshot.forEach((doc) => {
                rol = doc.data().rol;
            });

            // Verificación de permisos por rol
            if (rol === "Seguridad" && paginasAdmin.includes(paginaActual)) {
                window.location.href = "./searchCarG.html";
            }

            if (rol === "Administrador" && paginasSeguridad.includes(paginaActual)) {
                window.location.href = "./searchCar.html";
            }

        } catch (error) {
            alert("Hubo un problema al verificar permisos.");
            window.location.href = "../index.html";
        }
    });
}