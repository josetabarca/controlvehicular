import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_URL,
} from "./cloudinaryConfig.js";
import { db } from "./firebase.js";
import { loadRecords } from "./search.js";

const form = document.getElementById("registre-form");
const modalEl = document.getElementById("vehiculoModal");
const modal = new bootstrap.Modal(modalEl);

//Crear modolo de formulario
let modo = "crear";
let placaEditar = null;
let uid, vehiculoID;

//Modal modo segun el modo
function abrirModal(tipo, data = null) {
  modo = tipo;
  const modalTitle = document.getElementById("modalTitle");
  const formHeaderText = document.getElementById("formHeaderText");
  const formButton = document.getElementById("formButton");

  const fileInputs = ["licencia", "tarjeta", "seguro", "responsiva"].map((id) =>
    document.getElementById(id)
  );
  if (modo === "crear") {
    modalTitle.innerText = "Nuevo Registro de Vehículo";
    formHeaderText.innerText = "Nuevo Registro de Vehículo";
    formButton.innerText = "Registrar";
    form.reset();

    document.getElementById("placa").disabled = false;
    document.getElementById("correo").disabled = false;
    fileInputs.forEach((input) => {
      input.required = true;
      const preview = document.getElementById(`${input.id}-preview`);
      if (preview) preview.innerHTML = "";
    });
  } else if (modo === "editar") {
    modalTitle.innerText = "Editar Registro de Vehículo";
    formButton.innerText = "Guardar Cambios";
    formHeaderText.innerText = "Editar Registro de Vehículo";

    //Registro seleccionado
    placaEditar = data;

    const { vehiculo, estudiante } = data;

    // Rellenar campos del vehículo
    for (const [key, value] of Object.entries(vehiculo)) {
      const input = document.getElementById(key);
      if (input && input.type !== "file") input.value = value;
    }

    if (vehiculo.documentos) {
      for (const key in vehiculo.documentos) {
        const preview = document.getElementById(`${key}-preview`);
        if (preview) {
          preview.innerHTML = `<small class="text-muted">Archivo actual:</small>
                               <a href="${vehiculo.documentos[key]}" target="_blank" class="text-primary">Ver archivo</a>`;
        }
      }
    }

    // Rellenar campos del estudiante
    if (estudiante) {
      for (const [key, value] of Object.entries(estudiante)) {
        const input = document.getElementById(key);
        if (input) input.value = value;
      }
    }

    document.getElementById("placa").disabled = true;
    document.getElementById("correo").disabled = true;
    fileInputs.forEach((input) => (input.required = false));
  }

  modal.show();
}

// Expresiones regulares para validar los campos del formulario
const patterns = {
  nombre: /^[a-zA-Z\s]{2,30}$/,
  apellido: /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]{2,60}$/,
  phone: /^\d{3}-\d{3}-\d{4}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  placa: /^[A-Z0-9]{1,7}$/,
  marca: /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]{1,30}$/,
  modelo: /^[a-zA-Z0-9\s]{1,20}$/,
  color: /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]{1,30}$/,
};

//Funcion para validar los campos del formulario
function validarCampos(name, value) {
  if (!patterns[name]) return true;
  return patterns[name].test(value);
}

// Función para subir archivos a Cloudinary
async function subirArchivo(file, carpetaUsuario, tipoArchivo) {
  const timestamp = Math.round(Date.now() / 1000);

  const dataForm = new FormData();
  dataForm.append("file", file);  
  dataForm.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  dataForm.append("folder", `usuarios/${carpetaUsuario}`);
   dataForm.append("public_id", `${tipoArchivo}_${timestamp}`);


  const response = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: dataForm,
  });

  if (!response.ok) throw new Error("Error al subir archivo a Cloudinary.");

  const json = await response.json();
  return {
    url: json.secure_url,
  };
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

  try {
    let uid;
    let batch = writeBatch(db);

    if (modo === "crear") {
      //---CREAR----

      //Verificar que no exista un usuario con el mismo correo
      const usuariosQuery = await getDocs(
        query(collection(db, "usuarios"), where("correo", "==", data.correo))
      );
      if (!usuariosQuery.empty)
        throw new Error("Ya existe un usuario con este correo.");

      //uid único para el usuario
      uid = data.correo.split("@")[0] + Date.now();

      //Crear documentos en batch
      const usuarioRef = doc(db, "usuarios", uid);
      batch.set(usuarioRef, {
        nombre: data.nombre,
        apellido: data.apellido,
        grado: data.grado,
        grupo: data.grupo,
        telefono: data.telefono,
        correo: data.correo,
        rol: "Alumno",
        activo: true,
        fotoPerfil: "",
      });

      const nombreUsuarioRef = doc(db, "nombresusuarios", uid);
      batch.set(nombreUsuarioRef, {
        usuario: `${data.nombre}.${data.apellido}`,
        correo: data.correo,
      });

      const vehiculoRef = doc(db, "vehiculos", data.placa.toUpperCase());
      batch.set(vehiculoRef, {
        placa: data.placa.toUpperCase(),
        marca: data.marca,
        modelo: data.modelo,
        color: data.color,
        documentos: {},
        estadoValidacion: "Pendiente",
        fechaRegistro: serverTimestamp(),
        uid,
      });

      // Commit del batch
      await batch.commit();

      //Subir los archivos a Cloudinary
      const urls = {};
      for (const [tipo, file] of Object.entries(archivos)) {
        if (file && file.size > 0) {
          const resultado = await subirArchivo(file, uid, tipo);
          urls[tipo] = resultado.url;
        }
      }

      //Actualizar el documento
      await setDoc(
        doc(db, "vehiculos", data.placa.toUpperCase()),
        { documentos: urls },
        { merge: true }
      );

      alert("Alumno y vehículo registrados correctamente.");
      form.reset();
      modal.hide();
      loadRecords('next', true);
    } else if (modo === "editar" && placaEditar) {
      //---EDITAR----

      uid = placaEditar.vehiculo.uid;
      vehiculoID = placaEditar.vehiculo.placa;
      const vehiculoRef = doc(db, "vehiculos", vehiculoID);
      const usuarioRef = doc(db, "usuarios", uid);
      const nombreUsuarioRef = doc(db, "nombresusuarios", uid);

      //Actualizar el documento del vehículo
      batch.set(
        vehiculoRef,
        {
          marca: data.marca,
          modelo: data.modelo,
          color: data.color,
        },
        { merge: true }
      );

      // Actualizar "usuarios"
      batch.set(
        usuarioRef,
        {
          nombre: data.nombre,
          apellido: data.apellido,
          grado: data.grado,
          grupo: data.grupo,
          telefono: data.telefono,
        },
        { merge: true }
      );

      batch.set(
        nombreUsuarioRef,
        {
          usuario: `${data.nombre}.${data.apellido}`,
        },
        { merge: true }
      );

      await batch.commit();

      const archivosNuevos = {};
      for (const [tipo, file] of Object.entries(archivos)) {
        if (file && file.size > 0) {
          const resultado = await subirArchivo(file, uid, tipo);
          archivosNuevos[tipo] = resultado.url;
        }
      }

      if (Object.keys(archivosNuevos).length > 0) {
        await setDoc(
          doc(db, "vehiculos", vehiculoID),
          { documentos: archivosNuevos },
          { merge: true }
        );
      }

      alert("Registro actualizado correctamente");
      modal.hide();
      loadRecords('next', true);
    }
  } catch (error) {
    console.error("Error al crear alumno:", error);

    if (error.message === "Ya existe un usuario con este correo.") {
      alert(error.message);
    } else if (error.code === "permission-denied") {
      alert("No tienes permisos para realizar esta acción.");
    } else {
      alert("Error al crear alumno. Inténtalo de nuevo más tarde.");
    }

    form.reset();
  }
});

window.abrirModal = abrirModal;
