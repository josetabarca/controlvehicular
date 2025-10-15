import { db } from "../Scripts/firebase.js";
import { collection, query, orderBy, limit, getDocs, startAfter, endBefore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Variables globales para paginación
let lastDoc = null;
let firstDoc = null;
let pageSize = 5;
let currentDocs = [];

// Elementos dinamicos 
const tbody = document.getElementById('registrosBody');
const nextBtn = document.getElementById('nextPage');
const prevBtn = document.getElementById('prevPage');
const limitSelect = document.getElementById('limitePage');

// Formatear fecha
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Crear enlace de documento con icono y tooltip 
function createDocumentLink(url, icon, tooltip) {
    if (!url) return '';
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
    const viewer = document.getElementById('documentViewer');
    const download = document.getElementById('documentDownload');
    viewer.src = url;
    download.href = url;
    new bootstrap.Modal(document.getElementById('documentModal')).show();
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
async function loadRecords(direction = 'next') {
    try {
        // Referencia a la colección de vehículos
        const vehiculosRef = collection(db, "vehiculos");
        let q; // Consulta

        if (direction === 'next') {
            // Si es la primera carga, no usamos startAfter
            q = lastDoc ?
                query(vehiculosRef, orderBy("fechaRegistro", "desc"), startAfter(lastDoc), limit(pageSize)) :
                // Primera carga
                query(vehiculosRef, orderBy("fechaRegistro", "desc"), limit(pageSize));
        } else {
            // Cargar página anterior usando endBefore
            q = query(vehiculosRef, orderBy("fechaRegistro", "desc"), endBefore(firstDoc), limit(pageSize));
        }

        // Ejecutar la consulta
        const querySnapshot = await getDocs(q);

        // Manejar caso sin resultados
        if (querySnapshot.empty) {
            // Si no hay resultados en dirección 'prev', volvemos a cargar la primera página
            if (direction === 'prev') {
                lastDoc = null;
                firstDoc = null;
                return loadRecords('next'); // Recargar la primera página
            }

            // Si no hay resultados en dirección 'next', mostramos mensaje
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay registros disponibles</td></tr>';
            // Deshabilitar botones
            nextBtn.disabled = true;
            prevBtn.disabled = true;
            return;
        }

        currentDocs = querySnapshot.docs;
        tbody.innerHTML = '';

        // Renderizar filas
        // Usar Promise.all para esperar a que todas las llamadas asíncronas se completen
        await Promise.all(querySnapshot.docs.map(async (doc) => {
            const data = doc.data(); // Datos del vehículo
            const rowId = doc.id; // ID del documento
            // Obtener información del estudiante asociado
            const studentInfo = await getStudentInfo(data.uid);
            //  Crear fila de vehículo y fila oculta de información del estudiante
            const row = `
    <tr data-row-id="${rowId}">
        <td>${data.placa || 'N/A'}</td>
        <td>${data.marca || 'N/A'}</td>
        <td>${data.modelo || 'N/A'}</td>
        <td>${data.color || 'N/A'}</td>
        <td>${formatDate(data.fechaRegistro)}</td>
        <td>
            ${createDocumentLink(data.documentos?.licencia, 'fa-id-card', 'Licencia')}
            ${createDocumentLink(data.documentos?.tarjeta, 'fa-file-alt', 'Tarjeta de Circulación')}
            ${createDocumentLink(data.documentos?.seguro, 'fa-shield-alt', 'Seguro')}
            ${createDocumentLink(data.documentos?.responsiva, 'fa-file-signature', 'Responsiva')}
        </td>
        <td>
            <button class="btn btn-info btn-sm" 
                    onclick="toggleStudentInfo('${rowId}')"
                    data-bs-toggle="tooltip"
                    title="Estudiante">
                <i class="fas fa-user-graduate"></i>
            </button>
        </td>
    </tr>
                        <tr class="info-row" id="info-${rowId}">
                            <td colspan="7">
                                <div class="student-info">
                                    <div class="row">
                                        <div class="col-md-3">
                                            <p><strong><i class="fas fa-user"></i> Nombre:</strong><br>
                                            ${studentInfo ? `${studentInfo.nombre} ${studentInfo.apellido}` : 'N/A'}</p>
                                        </div>
                                        <div class="col-md-3">
                                            <p><strong><i class="fas fa-graduation-cap"></i> Grado y Grupo:</strong><br>
                                            ${studentInfo ? `${studentInfo.grado} "${studentInfo.grupo}"` : 'N/A'}</p>
                                        </div>
                                        <div class="col-md-3">
                                            <p><strong><i class="fas fa-phone"></i> Teléfono:</strong><br>
                                            ${studentInfo ? studentInfo.telefono : 'N/A'}</p>
                                        </div>
                                        <div class="col-md-3">
                                            <p><strong><i class="fas fa-envelope"></i> Email:</strong><br>
                                            ${studentInfo ? studentInfo.correo : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
            tbody.innerHTML += row;
        }));

        // Inicializar tooltips de Bootstrap
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));

        // Actualizar referencias de paginación
        lastDoc = currentDocs[currentDocs.length - 1];
        firstDoc = currentDocs[0];

        // Verificar si hay más documentos para habilitar/deshabilitar botones
        const prevCheck = await getDocs(
            query(vehiculosRef, orderBy("fechaRegistro", "desc"), endBefore(firstDoc), limit(1))
        );
        const nextCheck = await getDocs(
            query(vehiculosRef, orderBy("fechaRegistro", "desc"), startAfter(lastDoc), limit(1))
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

// Event Listeners de botones y select

// Navegación de página
nextBtn.addEventListener('click', () => loadRecords('next'));
prevBtn.addEventListener('click', () => loadRecords('prev'));
// Cambiar tamaño de página
limitSelect.addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value);
    lastDoc = null;
    firstDoc = null;
    currentDocs = [];
    loadRecords('next');
});

// Cargar registros iniciales al cargar la página
loadRecords('next');

// Toggle de información del estudiante en la tabla
function toggleStudentInfo(rowId) {
    const infoRow = document.getElementById(`info-${rowId}`); // Fila oculta de información del estudiante
    const allInfoRows = document.querySelectorAll('.info-row'); // 
    const button = document.querySelector(`[data-row-id="${rowId}"] .btn-info`); // Botón que se presionó
    const icon = button.querySelector('i'); // Icono dentro del botón

    // Cerrar otras filas abiertas al abrir una nueva
    allInfoRows.forEach(row => { 
        if (row.id !== `info-${rowId}` && row.classList.contains('show')) {
            row.classList.remove('show'); // Cerrar la fila
            // Actualizar el icono del botón correspondiente
            const otherButton = document.querySelector(`[data-row-id="${row.id.replace('info-', '')}"] .btn-info i`);
            // Cambiar el icono a fa-user-graduate
            otherButton.classList.remove('fa-user-minus');
            otherButton.classList.add('fa-user-graduate');
        }
    });

    // Toggle la fila de información actual
    infoRow.classList.toggle('show');

    // Actualizar el icono del botón
    if (infoRow.classList.contains('show')) {
        icon.classList.replace('fa-user-graduate', 'fa-user-minus');
    } else {
        icon.classList.replace('fa-user-minus', 'fa-user-graduate');
    }
}

// Hacer la función accesible globalmente
window.toggleStudentInfo = toggleStudentInfo;