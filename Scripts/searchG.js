import { db } from "./firebase.js";
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Elementos de la interfaz
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const tbody = document.getElementById('registrosBody');

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

// Función para buscar vehículos por placas
async function searchVehicle(placa) {
    try {
        const vehiculosRef = collection(db, "vehiculos");
        const q = query(vehiculosRef, where("placa", "==", placa.toUpperCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="alert alert-warning mb-0" role="alert">
                            <i class="fas fa-exclamation-triangle"></i> 
                            No se encontró ningún vehículo con la placa ${placa}
                        </div>
                    </td>
                </tr>`;
            return;
        }
        // Renderizar resultados de búsqueda
        tbody.innerHTML = '';
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        const studentInfo = await getStudentInfo(data.uid);

        const row = `
            <tr data-row-id="${doc.id}">
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
                    ${createDocumentLink(studentInfo.qrUrl, 'fa-qrcode', 'Código QR')}
                </td>
                <td class="text-center">
                    <button class="btn btn-info btn-sm" 
                            onclick="toggleStudentInfo('${doc.id}')"
                            data-bs-toggle="tooltip"
                            title="Ver información del estudiante">
                        <i class="fas fa-user-graduate"></i>
                    </button>
                </td>
            </tr>
            <tr class="info-row" id="info-${doc.id}">
                <td colspan="7">
                    <div class="student-info">
                        <div class="row">
                            <div class="col-3 col-md-3">
                                <p><strong><i class="fas fa-user"></i> Nombre:</strong><br>
                                ${studentInfo ? `${studentInfo.nombre} ${studentInfo.apellido}` : 'N/A'}</p>
                            </div>
                            <div class="col-2 col-md-3">
                                <p><strong><i class="fas fa-graduation-cap"></i> Grado y Grupo:</strong><br>
                                ${studentInfo ? `${studentInfo.grado} "${studentInfo.grupo}"` : 'N/A'}</p>
                            </div>
                            <div class="col-3 col-md-3">
                                <p><strong><i class="fas fa-phone"></i> Teléfono:</strong><br>
                                ${studentInfo ? studentInfo.telefono : 'N/A'}</p>
                            </div>
                            <div class="col-3 col-md-3">
                                <p style="word-break: break-all;"><strong><i class="fas fa-envelope"></i> Email:</strong><br>
                                ${studentInfo ? studentInfo.correo : 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>`;
        
        tbody.innerHTML = row;

        // Reinicializar tooltips
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));

    } catch (error) { // Manejar errores
        console.error("Error al buscar vehículo:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="alert alert-danger mb-0" role="alert">
                        <i class="fas fa-exclamation-circle"></i> 
                        Error al buscar vehículo: ${error.message}
                    </div>
                </td>
            </tr>`;
    }
}

// Event listeners
// Mostrar documento en modal
window.showDocument = (url) => {
    const viewer = document.getElementById('documentViewer');
    const download = document.getElementById('documentDownload');
    viewer.src = url;
    download.href = url;
    new bootstrap.Modal(document.getElementById('documentModal')).show();
};

// Toggle de información del estudiante en la tabla
window.toggleStudentInfo = (rowId) => {
    const infoRow = document.getElementById(`info-${rowId}`);
    const button = document.querySelector(`[data-row-id="${rowId}"] .btn-info i`);
    
    infoRow.classList.toggle('show');
    
    if (infoRow.classList.contains('show')) {
        button.classList.replace('fa-user-graduate', 'fa-user-minus');
    } else {
        button.classList.replace('fa-user-minus', 'fa-user-graduate');
    }
};

// Event listeners para búsqueda
// Búsqueda por botón
searchBtn.addEventListener('click', () => {
    const placa = searchInput.value.trim();
    if (!placa) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="alert alert-warning mb-0" role="alert">
                        <i class="fas fa-exclamation-triangle"></i> 
                        Por favor ingrese una placa
                    </div>
                </td>
            </tr>`;
        return;
    }
    searchVehicle(placa);
});

// Búsqueda al presionar Enter en el input
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});