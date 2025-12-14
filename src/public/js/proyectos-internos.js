/**
 * Funciones específicas para Proyectos Internos
 * Seguimiento de Proyectos
 */

// Función para cargar datos de proyectos internos
// Usa la misma lógica que proyectos pero con filtro de categoría "Proyectos Internos"
async function cargarDatosProyectosInternos() {
    const contenido = document.getElementById('contenido');
    contenido.innerHTML = '<div class="empty-state"><div class="spinner"></div><div class="empty-state-text">Cargando datos...</div></div>';

    try {
        let params = 'producto=' + encodeURIComponent(productoActual);
        if (busquedaActual) {
            params += '&busqueda=' + encodeURIComponent(busquedaActual);
        }
        
        // Usar el endpoint de proyectos-internos que internamente usa proyectos con filtro de categoría
        const endpoint = '/api/proyectos-internos?' + params;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        let response;
        try {
            response = await fetch(endpoint, { signal: controller.signal });
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('La solicitud tardó demasiado tiempo. Verifica tu conexión a internet o el estado del servidor.');
            } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
                throw new Error('Error de conexión con el servidor. Verifica tu conexión a internet o que el servidor esté funcionando.');
            } else {
                throw new Error('Error al conectar con el servidor: ' + fetchError.message);
            }
        }
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Error del servidor';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorMessage;
            } catch (e) {
                errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Error al obtener los datos');
        }

        if (!result.data) {
            throw new Error('No se recibieron datos del servidor');
        }

        if (result.data.length > 0) {
            let datosFiltrados = result.data;
            
            datosOriginales = result.data;
            const incluirCerrados = document.getElementById('incluirCerrados')?.checked || false;
            let datosParaFiltro = [...datosOriginales];
            if (!incluirCerrados) {
                datosParaFiltro = datosParaFiltro.filter(d => (d.estado || '').toLowerCase() !== 'cerrado');
            }
            datosTablaActual = datosParaFiltro;
            actualizarFiltroClientesDesdeTabla();
            
            if (filtrosClientes.length > 0) {
                datosFiltrados = datosFiltrados.filter(d => filtrosClientes.includes(d.cliente));
            }
            if (filtrosEstados.length > 0) {
                datosFiltrados = datosFiltrados.filter(d => filtrosEstados.includes(d.estado));
            }
            if (!incluirCerrados) {
                datosFiltrados = datosFiltrados.filter(d => (d.estado || '').toLowerCase() !== 'cerrado');
            }
            actualizarFiltrosAplicados();
            
            // Usar la misma función de renderizado que proyectos
            if (typeof renderizarTabla === 'function') {
                renderizarTabla(datosFiltrados);
            } else {
                // Fallback si no existe renderizarTabla
                renderizarTablaProyectosInternos(datosFiltrados);
            }
        } else {
            datosTablaActual = [];
            datosOriginales = [];
            contenido.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No hay datos disponibles</div><div class="empty-state-subtext">Haz clic en "Sincronizar" para sincronizar</div></div>';
            actualizarFiltroClientesDesdeTabla();
            const contadorProyectos = document.getElementById('contadorProyectos');
            if (contadorProyectos) {
                contadorProyectos.textContent = 'Total proyectos: 0';
            }
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        
        let mensajeError = 'Error al cargar datos';
        let mensajeDetalle = error.message || 'Error desconocido';
        
        if (mensajeDetalle.includes('conexión') || mensajeDetalle.includes('connection') || 
            mensajeDetalle.includes('ECONNREFUSED') || mensajeDetalle.includes('timeout') ||
            mensajeDetalle.includes('NetworkError') || mensajeDetalle.includes('Failed to fetch')) {
            mensajeError = 'Error de conexión';
            mensajeDetalle = 'No se pudo conectar con el servidor. Verifica que el servidor esté funcionando y tu conexión a internet.';
        } else if (mensajeDetalle.includes('base de datos') || mensajeDetalle.includes('database') ||
                   mensajeDetalle.includes('relation') || mensajeDetalle.includes('does not exist')) {
            mensajeError = 'Error de base de datos';
            mensajeDetalle = 'Error al conectar con la base de datos. Contacta al administrador del sistema.';
        }
        
        contenido.innerHTML = '<div class="empty-state">' +
            '<div class="empty-state-icon">❌</div>' +
            '<div class="empty-state-text">' + mensajeError + '</div>' +
            '<div class="empty-state-subtext">' + mensajeDetalle + '</div>' +
            '<button class="button" onclick="cargarDatosProyectosInternos()" style="margin-top: 16px;">Reintentar</button>' +
            '</div>';
        
        const contadorProyectos = document.getElementById('contadorProyectos');
        if (contadorProyectos) {
            contadorProyectos.textContent = 'Total proyectos: 0';
        }
        
        datosTablaActual = [];
        datosOriginales = [];
    }
}

// Función para renderizar tabla de proyectos internos (similar a proyectos externos)
function renderizarTablaProyectosInternos(datos) {
    const contenido = document.getElementById('contenido');
    
    // Ordenar datos antes de renderizar
    let datosOrdenados = [...datos];
    datosOrdenados.sort((a, b) => {
        let valorA, valorB;
        
        if (ordenActual.columna === 'cliente') {
            valorA = (a.cliente || '').toLowerCase();
            valorB = (b.cliente || '').toLowerCase();
        } else if (ordenActual.columna === 'proyecto') {
            valorA = (a.nombre_proyecto || '').toLowerCase();
            valorB = (b.nombre_proyecto || '').toLowerCase();
        } else if (ordenActual.columna === 'estado') {
            const indexA = ordenEstados.indexOf((a.estado || '').toLowerCase());
            const indexB = ordenEstados.indexOf((b.estado || '').toLowerCase());
            valorA = indexA === -1 ? 999 : indexA;
            valorB = indexB === -1 ? 999 : indexB;
            if (valorA === valorB) {
                valorA = (a.cliente || '').toLowerCase();
                valorB = (b.cliente || '').toLowerCase();
            }
        } else if (ordenActual.columna === 'overall') {
            const ordenOverall = { 'verde': 1, 'amarillo': 2, 'rojo': 3, '': 4 };
            valorA = ordenOverall[a.overall] || 4;
            valorB = ordenOverall[b.overall] || 4;
        } else if (ordenActual.columna === 'alcance') {
            const ordenAlcance = { 'verde': 1, 'amarillo': 2, 'rojo': 3, '': 4 };
            valorA = ordenAlcance[a.alcance] || 4;
            valorB = ordenAlcance[b.alcance] || 4;
        } else if (ordenActual.columna === 'costo') {
            const ordenCosto = { 'verde': 1, 'amarillo': 2, 'rojo': 3, '': 4 };
            valorA = ordenCosto[a.costo] || 4;
            valorB = ordenCosto[b.costo] || 4;
        } else if (ordenActual.columna === 'plazos') {
            const ordenPlazos = { 'verde': 1, 'amarillo': 2, 'rojo': 3, '': 4 };
            valorA = ordenPlazos[a.plazos] || 4;
            valorB = ordenPlazos[b.plazos] || 4;
        } else if (ordenActual.columna === 'riesgos') {
            const ordenRiesgos = { 'ok': 1, 'red flag': 2, '': 3 };
            valorA = ordenRiesgos[a.riesgos] || 3;
            valorB = ordenRiesgos[b.riesgos] || 3;
        } else if (ordenActual.columna === 'avance') {
            valorA = parseInt(a.avance) || 0;
            valorB = parseInt(b.avance) || 0;
        } else if (ordenActual.columna === 'fecha_inicio') {
            valorA = a.fecha_inicio || '';
            valorB = b.fecha_inicio || '';
        } else if (ordenActual.columna === 'fecha_fin') {
            valorA = a.fecha_fin || '';
            valorB = b.fecha_fin || '';
        } else {
            return 0;
        }
        
        if (valorA < valorB) return ordenActual.direccion === 'asc' ? -1 : 1;
        if (valorA > valorB) return ordenActual.direccion === 'asc' ? 1 : -1;
        
        if (ordenActual.columna !== 'cliente' && ordenActual.columna !== 'estado') {
            const clienteA = (a.cliente || '').toLowerCase();
            const clienteB = (b.cliente || '').toLowerCase();
            if (clienteA !== clienteB) {
                return clienteA < clienteB ? -1 : 1;
            }
            const indexA = ordenEstados.indexOf((a.estado || '').toLowerCase());
            const indexB = ordenEstados.indexOf((b.estado || '').toLowerCase());
            const estadoA = indexA === -1 ? 999 : indexA;
            const estadoB = indexB === -1 ? 999 : indexB;
            return estadoA - estadoB;
        }
        return 0;
    });
    
    let tablaHTML = '<div class="modern-table-wrapper"><div class="modern-table proyectos proyectos-internos"><div class="modern-table-header">';
    const flechaAsc = '▲';
    const flechaDesc = '▼';
    
    tablaHTML += '<div class="modern-table-cell header-cell" style="width: 30px;"></div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'cliente\')" style="cursor: pointer; user-select: none;' + (ordenActual.columna === 'cliente' ? ' color: var(--primary-color);' : '') + '">Cliente' + (ordenActual.columna === 'cliente' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'proyecto\')" style="cursor: pointer; user-select: none;' + (ordenActual.columna === 'proyecto' ? ' color: var(--primary-color);' : '') + '">Proyecto' + (ordenActual.columna === 'proyecto' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'estado\')" style="cursor: pointer; user-select: none; text-align: center; justify-content: center;' + (ordenActual.columna === 'estado' ? ' color: var(--primary-color);' : '') + '">Estado' + (ordenActual.columna === 'estado' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'avance\')" style="cursor: pointer; user-select: none;' + (ordenActual.columna === 'avance' ? ' color: var(--primary-color);' : '') + '">Avance' + (ordenActual.columna === 'avance' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'overall\')" style="cursor: pointer; user-select: none; text-align: center;' + (ordenActual.columna === 'overall' ? ' color: var(--primary-color);' : '') + '">Overall' + (ordenActual.columna === 'overall' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'alcance\')" style="cursor: pointer; user-select: none; text-align: center;' + (ordenActual.columna === 'alcance' ? ' color: var(--primary-color);' : '') + '">Alcance' + (ordenActual.columna === 'alcance' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'costo\')" style="cursor: pointer; user-select: none; text-align: center;' + (ordenActual.columna === 'costo' ? ' color: var(--primary-color);' : '') + '">Costo' + (ordenActual.columna === 'costo' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'plazos\')" style="cursor: pointer; user-select: none; text-align: center;' + (ordenActual.columna === 'plazos' ? ' color: var(--primary-color);' : '') + '">Plazos' + (ordenActual.columna === 'plazos' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'riesgos\')" style="cursor: pointer; user-select: none; text-align: center;' + (ordenActual.columna === 'riesgos' ? ' color: var(--primary-color);' : '') + '">Riesgos' + (ordenActual.columna === 'riesgos' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'fecha_inicio\')" style="cursor: pointer; user-select: none; text-align: center;' + (ordenActual.columna === 'fecha_inicio' ? ' color: var(--primary-color);' : '') + '">Fecha Inicio' + (ordenActual.columna === 'fecha_inicio' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'fecha_fin\')" style="cursor: pointer; user-select: none; text-align: center;' + (ordenActual.columna === 'fecha_fin' ? ' color: var(--primary-color);' : '') + '">Fecha Fin' + (ordenActual.columna === 'fecha_fin' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '</div>';
    
    datosOrdenados.forEach(function(item) {
        const redmineUrl = 'https://redmine.mercap.net/projects/' + (item.codigo_proyecto || '');
        let nombreProyecto = item.nombre_proyecto || '-';
        if (nombreProyecto.includes(' | ')) {
            nombreProyecto = nombreProyecto.split(' | ').slice(1).join(' | ');
        }
        
        const itemData = {
            id_proyecto: item.id_proyecto,
            nombre_proyecto: item.nombre_proyecto || '',
            codigo_proyecto: item.codigo_proyecto || '',
            horas_estimadas: parseFloat(item.horas_estimadas) || 0,
            horas_realizadas: parseFloat(item.horas_realizadas) || 0,
            fecha_inicio_epics: item.fecha_inicio_epics || item.fecha_inicio || '',
            fecha_fin_epics: item.fecha_fin_epics || item.fecha_fin || '',
            fecha_inicio: item.fecha_inicio || '',
            fecha_fin: item.fecha_fin || '',
            win: item.win || '',
            tiene_epics: item.tiene_epics || false,
            estado: item.estado || '',
            accionables: item.accionables || '',
            fecha_accionable: item.fecha_accionable || '',
            asignado_accionable: item.asignado_accionable || '',
            updated_at: item.updated_at || '',
            redmineUrl: redmineUrl
        };
        const itemDataJson = JSON.stringify(itemData).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        
        tablaHTML += '<div class="modern-table-row" data-id-proyecto="' + item.id_proyecto + '">';
        tablaHTML += '<div class="modern-table-cell" style="width: 30px;"></div>';
        tablaHTML += '<div class="modern-table-cell item-text">' + (item.cliente || '-') + '</div>';
        tablaHTML += '<div class="modern-table-cell item-text"><a href="javascript:void(0);" onclick="abrirModalDetalle(' + item.id_proyecto + '); event.stopPropagation();" data-item="' + itemDataJson + '" style="color: var(--primary-color); text-decoration: none; cursor: pointer;">' + nombreProyecto + '</a></div>';
        
        const estadoValue = item.estado || '';
        let estadoClass = '';
        if (estadoValue === 'Entregado' || estadoValue === 'Cerrado') {
            estadoClass = 'estado-entregado';
        } else if (estadoValue === 'sin comenzar') {
            estadoClass = 'estado-sin-comenzar';
        } else if (estadoValue === 'en curso') {
            estadoClass = 'estado-progreso';
        } else if (estadoValue === 'Testing') {
            estadoClass = 'estado-testing';
        } else if (estadoValue === 'Rework') {
            estadoClass = 'estado-rework';
        } else if (estadoValue === 'Bloqueado') {
            estadoClass = 'estado-bloqueado';
        }
        tablaHTML += '<div class="modern-table-cell" style="text-align: center; justify-content: center;">' + crearDropdownEstado(item.id_proyecto, estadoValue, estadoClass) + '</div>';
        
        const avanceValue = parseInt(item.avance) || 0;
        let avanceGradient = 'linear-gradient(90deg, #66bb6a 0%, #34a853 100%)';
        if (avanceValue <= 25) {
            avanceGradient = 'linear-gradient(90deg, #a5d6a7 0%, #81c784 100%)';
        } else if (avanceValue <= 50) {
            avanceGradient = 'linear-gradient(90deg, #81c784 0%, #66bb6a 100%)';
        } else if (avanceValue <= 75) {
            avanceGradient = 'linear-gradient(90deg, #66bb6a 0%, #4caf50 100%)';
        } else {
            avanceGradient = 'linear-gradient(90deg, #4caf50 0%, #34a853 50%, #1e8e3e 100%)';
        }
        tablaHTML += '<div class="modern-table-cell"><div class="progress-bar-container" data-id="' + item.id_proyecto + '"><div class="progress-bar" style="width: ' + avanceValue + '%; background: ' + avanceGradient + ';"></div><input type="range" min="0" max="100" step="5" value="' + avanceValue + '" class="progress-slider" oninput="actualizarBarraProgreso(this);" onchange="actualizarProyectoInternoDesdeUI(' + item.id_proyecto + ', \'avance\', this.value);" /></div></div>';
        
        tablaHTML += '<div class="modern-table-cell">' + crearDropdownOverall(item.id_proyecto, 'overall', item.overall || '', '') + '</div>';
        tablaHTML += '<div class="modern-table-cell">' + crearDropdownOverall(item.id_proyecto, 'alcance', item.alcance || '', '') + '</div>';
        tablaHTML += '<div class="modern-table-cell">' + crearDropdownOverall(item.id_proyecto, 'costo', item.costo || '', '') + '</div>';
        tablaHTML += '<div class="modern-table-cell">' + crearDropdownOverall(item.id_proyecto, 'plazos', item.plazos || '', '') + '</div>';
        tablaHTML += '<div class="modern-table-cell">' + crearDropdownRiesgo(item.id_proyecto, item.riesgos || '', '') + '</div>';
        
        // Formatear fechas para mostrar en formato corto (dd/mm)
        const fechaInicio = item.fecha_inicio || '';
        const fechaFin = item.fecha_fin || '';
        const fechaInicioCorta = fechaInicio ? formatearFechaCorta(fechaInicio) : '-';
        const fechaFinCorta = fechaFin ? formatearFechaCorta(fechaFin) : '-';
        
        tablaHTML += '<div class="modern-table-cell" style="font-size: 11px; text-align: center; justify-content: center; color: var(--text-secondary);">' + fechaInicioCorta + '</div>';
        tablaHTML += '<div class="modern-table-cell" style="font-size: 11px; text-align: center; justify-content: center; color: var(--text-secondary);">' + fechaFinCorta + '</div>';
        
        tablaHTML += '</div>';
    });
    
    tablaHTML += '</div></div>';
    contenido.innerHTML = tablaHTML;
    
    const contadorProyectos = document.getElementById('contadorProyectos');
    if (contadorProyectos) {
        contadorProyectos.textContent = 'Total proyectos: ' + datosOrdenados.length;
    }
    
    // Ocultar scroll horizontal si no es necesario
    setTimeout(() => {
        ajustarScrollHorizontal();
    }, 100);
}

// Función para actualizar proyecto interno desde la UI
// Usa la misma función que proyectos (actualizarProyecto) ya que ahora usan la misma tabla
async function actualizarProyectoInternoDesdeUI(id_proyecto, campo, valor) {
    // Usar la función global de api-handlers.js (actualizarProyecto)
    // que ahora maneja tanto proyectos externos como internos
    if (typeof actualizarProyecto === 'function') {
        await actualizarProyecto(id_proyecto, campo, valor);
    } else {
        try {
            // Mantener el endpoint de proyectos-internos para compatibilidad
            // pero internamente usa la misma tabla que proyectos
            const endpoint = '/api/proyectos-internos/' + id_proyecto;
            const datos = { [campo]: valor };
            console.log('Actualizando proyecto interno:', { id_proyecto, campo, valor });
            
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(datos)
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Proyecto interno actualizado correctamente:', result.data);
            } else {
                console.error('❌ Error al actualizar proyecto interno:', result.error);
                alert('Error al actualizar: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('❌ Error al actualizar proyecto interno:', error);
            alert('Error al actualizar: ' + error.message);
        }
    }
}

// Función para sincronizar proyectos internos
async function sincronizarProyectosInternos() {
    if (!productoActual) {
        alert('Por favor selecciona un producto primero');
        return;
    }
    
    console.log('🔄 Iniciando sincronización de proyectos internos...');
    console.log('   Producto:', productoActual);
    
    mostrarPopupSincronizacion();
    
    const btnSincronizar = document.getElementById('btnSincronizar');
    let textoOriginal = null;
    if (btnSincronizar) {
        textoOriginal = btnSincronizar.innerHTML;
        btnSincronizar.disabled = true;
        btnSincronizar.innerHTML = '<div class="spinner"></div> <span>Sincronizando...</span>';
    }

    try {
        const endpoint = '/api/sincronizar/proyectos-internos';
        const bodyData = {
            producto: productoActual
        };

        console.log('📡 Llamando a:', endpoint);
        console.log('📦 Datos enviados:', bodyData);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(bodyData)
        });

        console.log('📥 Respuesta recibida, status:', response.status);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Resultado de sincronización:', result);
        
        actualizarProgresoSincronizacion(100);
        
        setTimeout(() => {
            ocultarPopupSincronizacion();
            if (result.success) {
                console.log('✅ Sincronización exitosa, recargando datos...');
                cargarDatosProyectosInternos();
            } else {
                console.error('❌ Error en sincronización:', result.error);
                alert('Error en la sincronización: ' + (result.error || 'Error desconocido'));
            }
        }, 500);
    } catch (error) {
        console.error('❌ Error al sincronizar:', error);
        console.error('   Stack:', error.stack);
        ocultarPopupSincronizacion();
        alert('Error al sincronizar: ' + error.message);
    } finally {
        if (btnSincronizar && textoOriginal) {
            btnSincronizar.disabled = false;
            btnSincronizar.innerHTML = textoOriginal;
        }
    }
}

// Sobrescribir función buscar para proyectos internos
const buscarOriginal = buscar;
function buscar(event) {
    if (event) event.preventDefault();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        busquedaActual = searchInput.value;
        cargarDatosProyectosInternos();
    }
}

// Sobrescribir función buscarSugerencias para proyectos internos
async function buscarSugerencias(query) {
    clearTimeout(timeoutSugerencias);
    
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;
    
    if (!query || query.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    timeoutSugerencias = setTimeout(async () => {
        try {
            const endpoint = '/api/proyectos-internos/sugerencias?q=' + encodeURIComponent(query);
            const response = await fetch(endpoint);
            const data = await response.json();
            
            if (data.success && data.sugerencias && data.sugerencias.length > 0) {
                const html = data.sugerencias.map(item => `
                    <div class="google-suggestion-item" onclick="seleccionarSugerencia('${item.nombre_proyecto || item.nombre || ''}')">
                        <div class="suggestion-icon">${(item.nombre_proyecto || item.nombre || '?').substring(0, 1).toUpperCase()}</div>
                        <div class="suggestion-text">
                            <div class="suggestion-title">${item.nombre_proyecto || item.nombre || 'Sin nombre'}</div>
                            <div class="suggestion-subtitle">${item.cliente || item.producto || ''}</div>
                        </div>
                    </div>
                `).join('');
                
                suggestionsContainer.innerHTML = html;
                suggestionsContainer.style.display = 'block';
            } else {
                suggestionsContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error al obtener sugerencias:', error);
            suggestionsContainer.style.display = 'none';
        }
    }, 500);
}

// Sobrescribir función aplicarFiltrosProyectos para proyectos internos
function aplicarFiltrosProyectos() {
    filtrosClientes = Array.from(document.querySelectorAll('.filter-checkbox-cliente:checked')).map(cb => cb.value);
    filtrosEstados = Array.from(document.querySelectorAll('.filter-checkbox-estado:checked')).map(cb => cb.value);
    actualizarFiltrosAplicados();
    cargarDatosProyectosInternos();
}

// Sobrescribir función ordenarPor para proyectos internos
function ordenarPor(columna) {
    if (ordenActual.columna === columna) {
        ordenActual.direccion = ordenActual.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        ordenActual.columna = columna;
        // Si es cliente, usar 'desc' por defecto, sino 'asc'
        ordenActual.direccion = columna === 'cliente' ? 'desc' : 'asc';
    }
    cargarDatosProyectosInternos();
}


