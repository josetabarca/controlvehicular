import { auth, db } from "../Scripts/firebase.js";
import { collection, query, orderBy, limit, getDocs, startAfter, endBefore, doc, getDoc, writeBatch, where, } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

//Varible de rol
let userRole = null;

//Conseguir rol del usuario actual

async function obtenerRolUsuario() {
  const user = auth.currentUser;
  if (!user) {
    console.warn("No hay usuario autenticado.");
    return;
  }

  try {
    const userDocRef = doc(db, "usuarios", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      userRole = data.rol || null;
    } else {
      console.warn("No se encontró el documento del usuario.");
    }
  } catch (error) {
    console.error("Error al obtener el rol del usuario:", error);
  }
}

// Variables globales para paginación
let lastDoc = null;
let firstDoc = null;
let pageSize = 5;
let currentDocs = [];

// Elementos dinamicos
const tbody = document.getElementById("registrosBody");
const nextBtn = document.getElementById("nextPage");
const prevBtn = document.getElementById("prevPage");
const limitSelect = document.getElementById("limitePage");

// Formatear fecha
function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  return new Date(timestamp.seconds * 1000).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Crear enlace de documento con icono y tooltip
function createDocumentLink(url, icon, tooltip) {
  if (!url) return "";
  return `
        <button 
            onclick="showDocument('${url}')"
            class="btn btn-sm btn-outline-secondary document-link me-1" 
            data-bs-toggle="tooltip" 
            title="${tooltip}">
            <i class="fas ${icon}"></i>
        </button>
    `;
}

// Mostrar documento en modal
function showDocument(url) {
  const viewer = document.getElementById("documentViewer");
  const download = document.getElementById("documentDownload");
  viewer.src = url;
  download.href = url;
  new bootstrap.Modal(document.getElementById("documentModal")).show();
}

// Hacer la función accesible globalmente
window.showDocument = showDocument;

// Obtener información del estudiante
async function getStudentInfo(uid) {
  try {
    if (!uid) return null;

    const userDoc = await getDoc(doc(db, "usuarios", uid.toString()));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error al obtener la informacion del alumno:", error);
    return null;
  }
}

// Cargar registros con paginación
async function loadRecords(direction = "next", reset = false) {
  try {

    // Mostrar loading
    document.getElementById("loadingDiv").style.display = "block";
    document.getElementById("tablaVehiculos").style.display = "none";



    // Reiniciar paginación si se indica
    if (reset) {
      lastDoc = null;
      firstDoc = null;
      currentDocs = [];
    }
    // Referencia a la colección de vehículos
    const vehiculosRef = collection(db, "vehiculos");
    let q; // Consulta

    if (direction === "next") {
      // Si es la primera carga, no usamos startAfter
      q = lastDoc
        ? query(
            vehiculosRef,
            orderBy("fechaRegistro", "desc"),
            startAfter(lastDoc),
            limit(pageSize)
          )
        : // Primera carga
          query(
            vehiculosRef,
            orderBy("fechaRegistro", "desc"),
            limit(pageSize)
          );
    } else {
      // Cargar página anterior usando endBefore
      q = query(
        vehiculosRef,
        orderBy("fechaRegistro", "desc"),
        endBefore(firstDoc),
        limit(pageSize)
      );
    }

    // Ejecutar la consulta
    const querySnapshot = await getDocs(q);

    // Manejar caso sin resultados
    if (querySnapshot.empty) {
      // Si no hay resultados en dirección 'prev', volvemos a cargar la primera página
      if (direction === "prev") {
        lastDoc = null;
        firstDoc = null;
        return loadRecords("next"); // Recargar la primera página
      }

      // Si no hay resultados en dirección 'next', mostramos mensaje
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center">No hay registros disponibles</td></tr>';
      // Deshabilitar botones
      nextBtn.disabled = true;
      prevBtn.disabled = true;
      return;
    }

    currentDocs = querySnapshot.docs;
    tbody.innerHTML = "";

    // Renderizar filas
    // Usar Promise.all para esperar a que todas las llamadas asíncronas se completen
    await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const data = doc.data(); // Datos del vehículo
        const rowId = doc.id; // ID del documento
        console.log(data);
        // Obtener información del estudiante asociado
        const studentInfo = await getStudentInfo(data.uid);
        //  Crear fila de vehículo y fila oculta de información del estudiante
        const editarBtnId = `editar-${rowId}`;

        //Eliminar columna de acciones si el rol es 'Seguridad'
        const accionesColumna =
          userRole === "Administrador"
            ? `
            <td>
                <button class='btn btn-warning btn-sm me-1' id="${editarBtnId}">Editar</button>
                <button class='btn btn-danger btn-sm' onclick='confirmDelete("${rowId}", "${data.uid}")'>Eliminar</button>
            </td>`
            : "";

        const row = `
    <tr data-row-id="${rowId}">
        <td>${data.placa || "N/A"}</td>
        <td>${data.marca || "N/A"}</td>
        <td>${data.modelo || "N/A"}</td>
        <td>${data.color || "N/A"}</td>
        <td>${formatDate(data.fechaRegistro)}</td>
        <td>
            ${createDocumentLink(
              data.documentos?.licencia,
              "fa-id-card",
              "Licencia"
            )}
            ${createDocumentLink(
              data.documentos?.tarjeta,
              "fa-file-alt",
              "Tarjeta de Circulación"
            )}
            ${createDocumentLink(
              data.documentos?.seguro,
              "fa-shield-alt",
              "Seguro"
            )}
            ${createDocumentLink(
              data.documentos?.responsiva,
              "fa-file-signature",
              "Responsiva"
            )}
        </td>
        <td>
            <button class="btn btn-info btn-sm" 
                    onclick="toggleStudentInfo('${rowId}')"
                    data-bs-toggle="tooltip"
                    title="Estudiante">
                <i class="fas fa-user-graduate"></i>
            </button>
        </td> 
        ${accionesColumna}
    </tr>
                        <tr class="info-row" id="info-${rowId}">
                            <td colspan="7">
                                <div class="student-info">
                                    <div class="row">
                                        <div class="col-md-3">
                                            <p><strong><i class="fas fa-user"></i> Nombre:</strong><br>
                                            ${
                                              studentInfo
                                                ? `${studentInfo.nombre} ${studentInfo.apellido}`
                                                : "N/A"
                                            }</p>
                                        </div>
                                        <div class="col-md-3">
                                            <p><strong><i class="fas fa-graduation-cap"></i> Grado y Grupo:</strong><br>
                                            ${
                                              studentInfo
                                                ? `${studentInfo.grado} "${studentInfo.grupo}"`
                                                : "N/A"
                                            }</p>
                                        </div>
                                        <div class="col-md-3">
                                            <p><strong><i class="fas fa-phone"></i> Teléfono:</strong><br>
                                            ${
                                              studentInfo
                                                ? studentInfo.telefono
                                                : "N/A"
                                            }</p>
                                        </div>
                                        <div class="col-md-3">
                                            <p><strong><i class="fas fa-envelope"></i> Email:</strong><br>
                                            ${
                                              studentInfo
                                                ? studentInfo.correo
                                                : "N/A"
                                            }</p>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
        tbody.insertAdjacentHTML("beforeend", row);

        if (userRole === "Administrador") {
          document.getElementById(editarBtnId).addEventListener("click", () => {
            abrirModal("editar", { vehiculo: data, estudiante: studentInfo });
          });
        }

             loadingDiv.style.display = "none";
            tablaVehiculos.style.display = "flex";
      })
    );

    // Inicializar tooltips de Bootstrap
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach((tooltip) => new bootstrap.Tooltip(tooltip));

    // Actualizar referencias de paginación
    lastDoc = currentDocs[currentDocs.length - 1];
    firstDoc = currentDocs[0];

    // Verificar si hay más documentos para habilitar/deshabilitar botones
    const prevCheck = await getDocs(
      query(
        vehiculosRef,
        orderBy("fechaRegistro", "desc"),
        endBefore(firstDoc),
        limit(1)
      )
    );
    const nextCheck = await getDocs(
      query(
        vehiculosRef,
        orderBy("fechaRegistro", "desc"),
        startAfter(lastDoc),
        limit(1)
      )
    );

    // Actualizar estado de botones
    nextBtn.disabled = nextCheck.empty;
    prevBtn.disabled = prevCheck.empty;
  } catch (error) {
    console.error("Error al cargar registros:", error);
    tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger">
                            <i class="fas fa-exclamation-circle"></i> 
                            Error al cargar los registros: ${error.message}
                        </td>
                    </tr>
                `;
  }
}

// Función para buscar vehículos por placas
async function searchVehicles(placas) {
  try {
    // Referencia a la colección de vehículos
    const vehiculosRef = collection(db, "vehiculos");
    const placasArray = placas.split(",").map((p) => p.trim().toUpperCase());

    if (
      placasArray.length === 0 ||
      (placasArray.length === 1 && placasArray[0] === "")
    ) {
      loadRecords("next", true);
      return;
    }
    // Consulta para buscar vehículos con las placas especificadas
    const q = query(vehiculosRef, where("placa", "in", placasArray));
    const querySnapshot = await getDocs(q);
    // Manejar caso sin resultados
    if (querySnapshot.empty) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <i class="fas fa-search"></i> No se encontraron vehículos con las placas especificadas
                    </td>
                </tr>`;
      return;
    }
    // Renderizar resultados de búsqueda
    tbody.innerHTML = "";
    await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const rowId = doc.id;
        const studentInfo = await getStudentInfo(data.uid);
        const editarBtnId = `editar-${rowId}`;

        // Usar el mismo template de fila que en loadRecords
        const row = `
                <tr data-row-id="${rowId}">
                    <td>${data.placa || "N/A"}</td>
                    <td>${data.marca || "N/A"}</td>
                    <td>${data.modelo || "N/A"}</td>
                    <td>${data.color || "N/A"}</td>
                    <td>${formatDate(data.fechaRegistro)}</td>
                    <td>
                        ${createDocumentLink(
                          data.documentos?.licencia,
                          "fa-id-card",
                          "Licencia"
                        )}
                        ${createDocumentLink(
                          data.documentos?.tarjeta,
                          "fa-file-alt",
                          "Tarjeta de Circulación"
                        )}
                        ${createDocumentLink(
                          data.documentos?.seguro,
                          "fa-shield-alt",
                          "Seguro"
                        )}
                        ${createDocumentLink(
                          data.documentos?.responsiva,
                          "fa-file-signature",
                          "Responsiva"
                        )}
                    </td>
                    <td>
                        <button class="btn btn-info btn-sm" 
                                onclick="toggleStudentInfo('${rowId}')"
                                data-bs-toggle="tooltip"
                                title="Ver información del estudiante">
                            <i class="fas fa-user-graduate"></i>
                        </button>
                    </td>
                    <td>
                        <button class='btn btn-warning btn-sm me-1' id="${editarBtnId}">Editar</button>
                        <button class='btn btn-danger btn-sm' onclick='confirmDelete("${rowId}", "${
          data.uid
        }")'>Eliminar</button>
                    </td>
                </tr>
                <tr class="info-row" id="info-${rowId}">
                    <td colspan="8">
                        <div class="student-info">
                            <div class="row">
                                <div class="col-md-3">
                                    <p><strong><i class="fas fa-user"></i> Nombre:</strong><br>
                                    ${
                                      studentInfo
                                        ? `${studentInfo.nombre} ${studentInfo.apellido}`
                                        : "N/A"
                                    }</p>
                                </div>
                                <div class="col-md-3">
                                    <p><strong><i class="fas fa-graduation-cap"></i> Grado y Grupo:</strong><br>
                                    ${
                                      studentInfo
                                        ? `${studentInfo.grado} "${studentInfo.grupo}"`
                                        : "N/A"
                                    }</p>
                                </div>
                                <div class="col-md-3">
                                    <p><strong><i class="fas fa-phone"></i> Teléfono:</strong><br>
                                    ${
                                      studentInfo ? studentInfo.telefono : "N/A"
                                    }</p>
                                </div>
                                <div class="col-md-3">
                                    <p><strong><i class="fas fa-envelope"></i> Email:</strong><br>
                                    ${
                                      studentInfo ? studentInfo.correo : "N/A"
                                    }</p>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>`;

        tbody.insertAdjacentHTML("beforeend", row);

        // Añadir event listener para el botón de editar
        document.getElementById(editarBtnId).addEventListener("click", () => {
          abrirModal("editar", { vehiculo: data, estudiante: studentInfo });
        });
      })
    );

    // Reinicializar tooltips
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach((tooltip) => new bootstrap.Tooltip(tooltip));
  } catch (error) {
    // Manejar errores
    console.error("Error al buscar vehículos:", error);
    tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-danger">
                    <i class="fas fa-exclamation-circle"></i> 
                    Error al buscar vehículos: ${error.message}
                </td>
            </tr>`;
  }
}

// Event Listeners de botones, select e imput

// Navegación de página
nextBtn.addEventListener("click", () => loadRecords("next"));
prevBtn.addEventListener("click", () => loadRecords("prev"));
// Cambiar tamaño de página
limitSelect.addEventListener("change", (e) => {
  pageSize = parseInt(e.target.value);
  lastDoc = null;
  firstDoc = null;
  currentDocs = [];
  loadRecords("next");
});

// Cargar registros iniciales al cargar la página
loadRecords("next");

// Toggle de información del estudiante en la tabla
function toggleStudentInfo(rowId) {
  const infoRow = document.getElementById(`info-${rowId}`); // Fila oculta de información del estudiante
  const allInfoRows = document.querySelectorAll(".info-row"); //
  const button = document.querySelector(`[data-row-id="${rowId}"] .btn-info`); // Botón que se presionó
  const icon = button.querySelector("i"); // Icono dentro del botón

  // Cerrar otras filas abiertas al abrir una nueva
  allInfoRows.forEach((row) => {
    if (row.id !== `info-${rowId}` && row.classList.contains("show")) {
      row.classList.remove("show"); // Cerrar la fila
      // Actualizar el icono del botón correspondiente
      const otherButton = document.querySelector(
        `[data-row-id="${row.id.replace("info-", "")}"] .btn-info i`
      );
      // Cambiar el icono a fa-user-graduate
      otherButton.classList.remove("fa-user-minus");
      otherButton.classList.add("fa-user-graduate");
    }
  });

  // Toggle la fila de información actual
  infoRow.classList.toggle("show");

  // Actualizar el icono del botón
  if (infoRow.classList.contains("show")) {
    icon.classList.replace("fa-user-graduate", "fa-user-minus");
  } else {
    icon.classList.replace("fa-user-minus", "fa-user-graduate");
  }
}

// Hacer la función accesible globalmente
window.toggleStudentInfo = toggleStudentInfo;

// Función para confirmar y eliminar un registro
window.confirmDelete = function (rowId, userId) {
  const confirmBtn = document.getElementById("confirmDelete");
  confirmBtn.onclick = async function () {
    const batch = writeBatch(db);
    try {
      batch.delete(doc(db, "vehiculos", rowId));
      batch.delete(doc(db, "usuarios", userId));
      batch.delete(doc(db, "nombresusuarios", userId));

      // Confirmar la eliminación en Firestore
      await batch.commit();

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("deleteModal")
      );
      modal.hide();
      loadRecords("next", true);
      alert("Registro y datos relacionados eliminados correctamente.");
    } catch (error) {
      console.error("Error al eliminar el registro:", error);
    }
  };
  new bootstrap.Modal(document.getElementById("deleteModal")).show();
};

// Exportar la función loadRecords
export { loadRecords };

// Event listeners para búsqueda
// Búsqueda por botón
document.getElementById("searchBtn").addEventListener("click", () => {
  const searchInput = document.getElementById("searchInput");
  const placas = searchInput.value.trim();
  if (!placas) {
    loadRecords("next", true);
    return;
  }
  searchVehicles(placas);
});

// Búsqueda al presionar Enter en el input
document.getElementById("searchInput").addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    // Si se presionó Enter
    const placas = e.target.value.trim(); // Obtener valor del input
    if (!placas) {
      // Si está vacío, mostrar todos los registros
      loadRecords("next", true);
      return;
    }
    // Buscar vehículos por placas
    searchVehicles(placas);
  } else if (e.target.value.trim() === "") {
    loadRecords("next", true); // Si está vacío, mostrar todos los registros
  }
});


auth.onAuthStateChanged(async (user) => {
  if (user) {
    await obtenerRolUsuario(user.uid);

    if (userRole !== "Administrador") {
      const thAcciones = document.querySelector("#tablaVehiculos thead th:last-child");
      if (thAcciones) thAcciones.style.display = "none";
    }
  } else {
    console.warn("No hay usuario autenticado");
  }
});
