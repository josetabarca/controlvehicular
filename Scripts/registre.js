import { doc, setDoc, getDocs, collection, query, where, serverTimestamp} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_URL } from "./cloudinaryConfig.js";
import { db } from "./firebase.example.js";


const form = document.getElementById("registre-form");

// Expresiones regulares para validar los campos del formulario
const patterns = {
  nombre: /^[a-zA-Z\s]{2,30}$/,
  apellido: /^[a-zA-Z\s]{2,60}$/,
  phone: /^\d{3}-\d{3}-\d{4}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  placa: /^[A-Z0-9]{1,7}$/,
  marca: /^[a-zA-Z\s]{1,30}$/,
  modelo: /^[a-zA-Z0-9\s]{1,20}$/,
  color: /^[a-zA-Z\s]{1,30}$/,
};

//Funcion para validar los campos del formulario
function validarCampos(name, value) {
  if (!patterns[name]) return true;
  return patterns[name].test(value);
}

// Función para subir archivos a Cloudinary
async function subirArchivo(file, carpetaUsuario) {
  const dataForm = new FormData();
  dataForm.append("file", file);
  dataForm.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  dataForm.append("folder", `usuarios/${carpetaUsuario}`); 

  const response = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: dataForm,
  });

  const json = await response.json();
  return json.secure_url; 
}



//Formulario
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  //Obtener los datos de texto y select, excluyendo los archivos
  const formData = new FormData(form);
  const data = Object.fromEntries(
    formData.entries(
      [...formData].filter(([key, value]) => !(value instanceof File))
    )
  );

  //Obtener los archivos
  const archivos = {
    licencia: formData.get("licencia"),
    tarjeta: formData.get("tarjeta"),
    seguro: formData.get("seguro"),
    responsiva: formData.get("responsiva"),
  };

  //Validar los campos del formulario
  for (const [key, value] of Object.entries(data)) {
    if (!value) {
      alert(`El campo ${key} es obligatorio.`);
      return;
    }
    if (!validarCampos(key, value)) {
      alert(`El campo ${key} no es válido.`);
      return;
    }
  }

  if (
    !archivos.licencia ||
    !archivos.tarjeta ||
    !archivos.seguro ||
    !archivos.responsiva
  ) {
    alert("Todos los archivos son obligatorios.");
    return;
  }

  const usuariosQuery = await getDocs(
    query(collection(db, "usuarios"), where("correo", "==", data.email))
  );

  if (!usuariosQuery.empty) {
    alert("Ya existe un usuario con este correo.");
    return;
  }

  //uid único para el usuario
  const uid = data.email.split("@")[0] + Date.now();

  try {
    // Colección usuarios
    const usuarioRef = doc(db, "usuarios", uid); 
    await setDoc(usuarioRef, {
      nombre: data.nombre,
      apellido: data.apellido,
      grado: data.grado,
      grupo: data.grupo,
      telefono: data.phone,
      correo: data.email,
      rol: "Alumno",
      activo: true,
      fotoPerfil: "",
    });

    // Colección nombresusuarios
    const nombreUsuarioRef = doc(db, "nombresusuarios", uid);
    await setDoc(nombreUsuarioRef, {
      usuario: `${data.nombre}.${data.apellido}`,
      correo: data.email,
    });

    /// Subir archivos a Cloudinary
    const urls = {};
    for (const key in archivos) {
      urls[key] = await subirArchivo(archivos[key], uid);
    }
    
    // Colección vehículos
    const vehiculoRef = doc(db, "vehiculos", data.placa.toUpperCase());
    await setDoc(vehiculoRef, {
      placa: data.placa.toUpperCase(),
      marca: data.marca,
      modelo: data.modelo,
      color: data.color,
      documentos: urls,
      estadoValidacion: "Pendiente",
      fechaRegistro: serverTimestamp(),
      uid,
    });
    alert("Alumno y vehículo registrados correctamente.");
    form.reset();
  } catch (error) {
    console.error("Error al crear alumno:", error);
    alert("Error al crear alumno. Inténtalo de nuevo más tarde.");
  }
});
