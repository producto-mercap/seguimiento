// JavaScript principal para Seguimiento de Proyectos

// Funciones globales disponibles para las vistas
console.log('✅ JavaScript cargado correctamente');

// Variable global para el progreso de sincronización
let progresoActual = 0;

// Función para mostrar popup de sincronización
function mostrarPopupSincronizacion() {
    // Resetear progreso
    progresoActual = 0;
    
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.id = 'syncOverlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;';
    
    // Crear popup
    const popup = document.createElement('div');
    popup.id = 'syncPopup';
    popup.style.cssText = 'background: white; border-radius: 12px; padding: 24px; min-width: 320px; max-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    
    popup.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 16px; font-weight: 500; color: #202124; margin-bottom: 16px; font-family: 'Google Sans', 'Roboto', sans-serif;">
                Sincronizando con Redmine
            </div>
            <div style="width: 100%; height: 8px; background: #f1f3f4; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                <div id="syncProgressBar" style="height: 100%; background: #0D5AA2; width: 0%; transition: width 0.3s ease; border-radius: 4px;"></div>
            </div>
            <div id="syncProgressText" style="font-size: 13px; color: #5f6368; font-family: 'Roboto', sans-serif;">
                0%
            </div>
        </div>
    `;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Simular progreso de forma progresiva y predecible
    const intervalo = setInterval(() => {
        // Incremento más pequeño y consistente (entre 1% y 3% por intervalo)
        const incremento = 1 + Math.random() * 2;
        progresoActual += incremento;
        
        // Limitar a 90% máximo hasta que la sincronización termine
        if (progresoActual > 90) {
            progresoActual = 90;
        }
        
        actualizarProgresoSincronizacion(progresoActual);
    }, 300);
    
    // Guardar intervalo para limpiarlo después
    overlay.dataset.intervalo = intervalo;
}

// Actualizar progreso de sincronización (solo avanza, nunca retrocede)
function actualizarProgresoSincronizacion(porcentaje) {
    // Asegurar que el porcentaje esté entre 0 y 100
    porcentaje = Math.max(0, Math.min(100, porcentaje));
    
    // Solo actualizar si el nuevo porcentaje es mayor o igual al actual
    // Esto previene retrocesos
    if (porcentaje >= progresoActual) {
        progresoActual = porcentaje;
        
        const barra = document.getElementById('syncProgressBar');
        const texto = document.getElementById('syncProgressText');
        
        if (barra) {
            barra.style.width = porcentaje + '%';
        }
        if (texto) {
            texto.textContent = Math.round(porcentaje) + '%';
        }
        
        // Si llegamos a 100%, limpiar el intervalo si existe
        if (porcentaje >= 100) {
            const overlay = document.getElementById('syncOverlay');
            if (overlay && overlay.dataset.intervalo) {
                clearInterval(parseInt(overlay.dataset.intervalo));
            }
        }
    }
}

// Ocultar popup de sincronización
function ocultarPopupSincronizacion() {
    const overlay = document.getElementById('syncOverlay');
    if (overlay) {
        // Limpiar intervalo si existe
        if (overlay.dataset.intervalo) {
            clearInterval(parseInt(overlay.dataset.intervalo));
        }
        overlay.remove();
    }
}

// Función para sincronizar proyectos o mantenimiento desde el botón principal
async function sincronizar() {
    if (!productoActual) {
        alert('Por favor selecciona un producto primero');
        return;
    }
    
    // Determinar si es mantenimiento o proyectos según tipoActual
    const esMantenimiento = typeof tipoActual !== 'undefined' && tipoActual === 'mantenimiento';
    const tipoSincronizacion = esMantenimiento ? 'mantenimiento' : 'proyectos';
    
    console.log('🔄 Iniciando sincronización de ' + tipoSincronizacion + '...');
    console.log('   Producto:', productoActual);
    console.log('   Equipo:', equipoActual || 'todos');
    console.log('   Tipo:', tipoSincronizacion);
    
    mostrarPopupSincronizacion();
    
    const btnSincronizar = document.getElementById('btnSincronizar');
    let textoOriginal = null;
    if (btnSincronizar) {
        textoOriginal = btnSincronizar.innerHTML;
        btnSincronizar.disabled = true;
        btnSincronizar.style.opacity = '0.6';
        btnSincronizar.style.cursor = 'not-allowed';
    }

    try {
        // Usar el endpoint correcto según el tipo
        const endpoint = esMantenimiento ? '/api/sincronizar/mantenimiento' : '/api/sincronizar/proyectos';
        const bodyData = {
            producto: productoActual,
            equipo: equipoActual || null
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
                // Recargar los datos de la tabla
                if (typeof cargarDatos === 'function') {
                    cargarDatos();
                } else {
                    window.location.reload();
                }
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
            btnSincronizar.style.opacity = '1';
            btnSincronizar.style.cursor = 'pointer';
        }
    }
}

// Función auxiliar para actualizar la sección de epics en el modal sin cerrarlo
async function actualizarEpicsEnModal(id_proyecto, datosSincronizacion) {
    try {
        // Obtener los datos actualizados del proyecto
        const response = await fetch('/api/proyectos/' + id_proyecto);
        const result = await response.json();
        
        if (!result.success || !result.data) {
            console.error('Error al obtener datos actualizados del proyecto');
            return;
        }
        
        const itemData = result.data;
        const modalBody = document.getElementById('modalBody');
        if (!modalBody) return;
        
        // Obtener epics actualizados
        const epicsResponse = await fetch('/api/epics/' + id_proyecto + '?es_proyecto_padre=false');
        const epicsDataResult = await epicsResponse.json();
        const epics = epicsDataResult.success ? epicsDataResult.data : [];
        
        // Calcular horas y fechas desde los epics
        let horasEstimadas = parseFloat(itemData.horas_estimadas) || 0;
        let horasRealizadas = parseFloat(itemData.horas_realizadas) || 0;
        let fechaInicioPlanificada = null;
        let fechaFinPlanificada = null;
        let fechaFinReal = null;
        
        if (epics.length > 0) {
            // Usar campos nativos start_date/due_date con fallback a cf_21/cf_22
            const fechasInicio = epics.map(e => e.start_date || e.cf_21).filter(f => f);
            const fechasFinPlanificada = epics.map(e => e.due_date || e.cf_22).filter(f => f);
            const fechasFinReal = epics.map(e => e.cf_15).filter(f => f);
            
            if (fechasInicio.length > 0) {
                fechaInicioPlanificada = fechasInicio.sort()[0];
            }
            if (fechasFinPlanificada.length > 0) {
                fechaFinPlanificada = fechasFinPlanificada.sort().reverse()[0];
            }
            if (fechasFinReal.length > 0) {
                fechaFinReal = fechasFinReal.sort().reverse()[0];
            }
        }
        
        // Función auxiliar para formatear fechas (usar la función global si existe)
        const formatearFecha = window.formatearFecha || function(fecha) {
            if (!fecha) return '';
            const match = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                return match[1] + '-' + match[2] + '-' + match[3];
            }
            return fecha;
        };
        
        // Función auxiliar para renderizar fila de epic
        function renderizarEpicFila(epic) {
            const epicUrl = 'https://redmine.mercap.net/issues/' + epic.epic_id;
            const epicTitle = epic.subject || 'Sin título';
            const estadoEpic = epic.status || '';
            const estadoLower = estadoEpic.toLowerCase();
            
            // Usar campos nativos start_date/due_date con fallback
            const fechaInicio = (epic.start_date || epic.cf_21) ? formatearFecha(epic.start_date || epic.cf_21) : '';
            const fechaFinPlan = (epic.due_date || epic.cf_22) ? formatearFecha(epic.due_date || epic.cf_22) : '';
            const fechaFinRealEpic = epic.cf_15 ? formatearFecha(epic.cf_15) : '';
            
            // Formatear fecha para mostrar (DD/MM/YYYY)
            function formatearFechaMostrar(fecha) {
                if (!fecha) return '';
                const match = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (match) {
                    return match[3] + '/' + match[2] + '/' + match[1];
                }
                return fecha;
            }
            
            let html = '<tr>';
            html += '<td class="epic-id-cell"><a href="' + epicUrl + '" target="_blank" title="' + estadoEpic + '">#' + epic.epic_id + '</a></td>';
            html += '<td class="epic-title-cell" title="' + epicTitle.replace(/"/g, '&quot;') + '">' + epicTitle + '</td>';
            html += '<td class="epic-hours-cell estimated">' + (parseFloat(epic.total_estimated_hours) || 0).toFixed(1) + 'h</td>';
            html += '<td class="epic-hours-cell spent">' + (parseFloat(epic.total_spent_hours) || 0).toFixed(1) + 'h</td>';
            html += '<td class="epic-date-cell ' + (fechaInicio ? 'has-date' : 'no-date') + '">' + (fechaInicio ? formatearFechaMostrar(fechaInicio) : '-') + '</td>';
            html += '<td class="epic-date-cell ' + (fechaFinPlan ? 'has-date' : 'no-date') + '">' + (fechaFinPlan ? formatearFechaMostrar(fechaFinPlan) : '-') + '</td>';
            html += '<td class="epic-date-cell ' + (fechaFinRealEpic ? 'has-date' : 'no-date') + '">' + (fechaFinRealEpic ? formatearFechaMostrar(fechaFinRealEpic) : '-') + '</td>';
            html += '</tr>';
            return html;
        }
        
        // Construir HTML de epics
        let epicsHTML = '';
        if (epics.length === 0) {
            epicsHTML = '<div class="epics-table-container"><div class="epics-table-empty">No hay epics sincronizados</div></div>';
        } else {
            epicsHTML = '<div class="epics-table-container">';
            epicsHTML += '<table class="epics-table">';
            epicsHTML += '<thead><tr>';
            epicsHTML += '<th>Epic</th>';
            epicsHTML += '<th>Título</th>';
            epicsHTML += '<th style="text-align: right;">Hs Est.</th>';
            epicsHTML += '<th style="text-align: right;">Hs Real</th>';
            epicsHTML += '<th>Inicio Plan.</th>';
            epicsHTML += '<th>Fin Plan.</th>';
            epicsHTML += '<th>Fin Real</th>';
            epicsHTML += '</tr></thead>';
            epicsHTML += '<tbody>';
            
            epics.forEach(function (epic) {
                epicsHTML += renderizarEpicFila(epic);
            });
            
            epicsHTML += '</tbody></table>';
            epicsHTML += '</div>';
        }
        
        // Buscar y actualizar elementos de forma más directa
        // Buscar la sección de información del proyecto (primera columna)
        const gridContainer = modalBody.querySelector('div[style*="grid-template-columns: 260px 1fr"]');
        if (gridContainer) {
            const infoSection = gridContainer.firstElementChild;
            if (infoSection) {
                // Buscar y actualizar horas estimadas
                const labels = infoSection.querySelectorAll('label');
                labels.forEach(label => {
                    if (label.textContent.includes('Horas Estimadas')) {
                        const horasDiv = label.nextElementSibling;
                        if (horasDiv && horasDiv.tagName === 'DIV') {
                            horasDiv.textContent = (horasEstimadas > 0 ? horasEstimadas.toFixed(1) : '-') + 'h';
                        }
                    } else if (label.textContent.includes('Horas Realizadas')) {
                        const horasDiv = label.nextElementSibling;
                        if (horasDiv && horasDiv.tagName === 'DIV') {
                            horasDiv.textContent = (horasRealizadas > 0 ? horasRealizadas.toFixed(1) : '-') + 'h';
                        }
                    } else if (label.textContent.includes('Fecha Inicio Planificada')) {
                        const fechaDiv = label.nextElementSibling;
                        if (fechaDiv) {
                            if (fechaInicioPlanificada) {
                                const fechaFormateada = formatearFecha(fechaInicioPlanificada);
                                if (fechaDiv.tagName === 'INPUT') {
                                    fechaDiv.value = fechaFormateada;
                                } else {
                                    fechaDiv.outerHTML = '<input type="date" class="modern-input date-input" value="' + fechaFormateada + '" readonly style="width: 100%; padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 14px; font-family: \'Google Sans\', \'Roboto\', sans-serif; background: #f8f9fa; cursor: not-allowed;">';
                                }
                            } else if (fechaDiv.tagName === 'DIV') {
                                fechaDiv.textContent = '-';
                            }
                        }
                    } else if (label.textContent.includes('Fecha Fin Planificada')) {
                        const fechaDiv = label.nextElementSibling;
                        if (fechaDiv) {
                            if (fechaFinPlanificada) {
                                const fechaFormateada = formatearFecha(fechaFinPlanificada);
                                if (fechaDiv.tagName === 'INPUT') {
                                    fechaDiv.value = fechaFormateada;
                                } else {
                                    fechaDiv.outerHTML = '<input type="date" class="modern-input date-input" value="' + fechaFormateada + '" readonly style="width: 100%; padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 14px; font-family: \'Google Sans\', \'Roboto\', sans-serif; background: #f8f9fa; cursor: not-allowed;">';
                                }
                            } else if (fechaDiv.tagName === 'DIV') {
                                fechaDiv.textContent = '-';
                            }
                        }
                    }
                });
            }
            
            // Buscar la sección de epics (segunda columna)
            const epicsSection = gridContainer.children[1];
            if (epicsSection) {
                // Buscar el h3 de "Epics Sincronizados"
                const h3Epics = Array.from(epicsSection.querySelectorAll('h3')).find(h3 => h3.textContent.includes('Epics Sincronizados'));
                if (h3Epics) {
                    // Actualizar el contador
                    const headerDiv = h3Epics.parentElement;
                    if (headerDiv) {
                        const contadorDiv = Array.from(headerDiv.querySelectorAll('div')).find(div => div.style.fontSize === '13px' || div.textContent.includes('Total:') || div.textContent.includes('Sin epics'));
                        if (contadorDiv) {
                            contadorDiv.textContent = epics.length > 0 
                                ? 'Total: ' + horasEstimadas.toFixed(1) + 'h est. / ' + horasRealizadas.toFixed(1) + 'h real.' 
                                : 'Sin epics';
                        }
                    }
                    
                    // Buscar y reemplazar el contenedor de epics
                    const epicsContainer = epicsSection.querySelector('.epics-table-container');
                    const epicsEmpty = epicsSection.querySelector('.epics-table-empty');
                    if (epicsContainer) {
                        epicsContainer.outerHTML = epicsHTML;
                    } else if (epicsEmpty) {
                        epicsEmpty.parentElement.outerHTML = epicsHTML;
                    } else {
                        // Si no existe, insertarlo después del header
                        const headerContainer = h3Epics.parentElement;
                        if (headerContainer && headerContainer.nextElementSibling) {
                            headerContainer.nextElementSibling.outerHTML = epicsHTML;
                        }
                    }
                }
            }
        }
        
        // Actualizar el Gantt chart si existe la función
        if (typeof renderizarGanttChart === 'function') {
            const esProyectoPadre = false; // Ya sabemos que no es proyecto padre porque tiene epics
            renderizarGanttChart(id_proyecto, esProyectoPadre, epics, itemData);
        }
        
        console.log('✅ Contenido del modal actualizado sin cerrarlo');
    } catch (error) {
        console.error('Error al actualizar epics en el modal:', error);
        // Si falla la actualización, recargar el modal completo como fallback
        if (typeof window.abrirModalDetalle === 'function') {
            window.abrirModalDetalle(id_proyecto);
        }
    }
}

// Función para sincronizar epics desde el modal
async function sincronizarEpicsDesdeModal(id_proyecto, codigo_proyecto, botonElement) {
    if (!id_proyecto || !codigo_proyecto) {
        alert('Error: ID de proyecto y código son requeridos');
        return;
    }
    
    console.log('🔄 Iniciando sincronización de epics...');
    console.log('   ID Proyecto:', id_proyecto);
    console.log('   Código Proyecto:', codigo_proyecto);
    
    // Deshabilitar botón
    if (botonElement) {
        const textoOriginal = botonElement.innerHTML;
        botonElement.disabled = true;
        botonElement.style.opacity = '0.6';
        botonElement.style.cursor = 'not-allowed';
        botonElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px; vertical-align: middle;"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>Sincronizando...';
        
        try {
            const endpoint = '/api/sincronizar/epics';
            const bodyData = {
                id_proyecto: id_proyecto,
                codigo_proyecto: codigo_proyecto
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
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(errorData.error || `Error HTTP: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Resultado de sincronización:', result);
            
            if (result.success) {
                console.log('✅ Sincronización exitosa');
                
                // Actualizar la fecha de última actualización en el modal
                const fechaActualizacionElement = document.getElementById('ultimaActualizacion_' + id_proyecto);
                if (fechaActualizacionElement) {
                    const ahora = new Date();
                    const fechaFormateada = ahora.toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    fechaActualizacionElement.textContent = 'Última Actualización: ' + fechaFormateada;
                }
                
                // Actualizar el contenido del modal sin cerrarlo
                await actualizarEpicsEnModal(id_proyecto, result.data);
                
                // Actualizar la tabla de proyectos con las fechas refrescadas
                await actualizarFilaProyectoEnTabla(id_proyecto);
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('❌ Error al sincronizar epics:', error);
            alert('Error al sincronizar epics: ' + error.message);
        } finally {
            // Restaurar botón
            botonElement.disabled = false;
            botonElement.style.opacity = '1';
            botonElement.style.cursor = 'pointer';
            botonElement.innerHTML = textoOriginal;
        }
    }
}

// Función para actualizar la fila del proyecto en la tabla después de sincronizar epics
async function actualizarFilaProyectoEnTabla(id_proyecto) {
    try {
        // Obtener los datos actualizados del proyecto
        const response = await fetch('/api/proyectos/' + id_proyecto);
        const result = await response.json();
        
        if (!result.success || !result.data) {
            console.error('Error al obtener datos actualizados del proyecto para la tabla');
            return;
        }
        
        const itemData = result.data;
        
        // Buscar la fila del proyecto en la tabla
        const tableRow = document.querySelector(`.modern-table-row[data-id-proyecto="${id_proyecto}"]`);
        if (!tableRow) {
            console.log('Fila del proyecto no encontrada en la tabla, recargando toda la tabla...');
            // Si no se encuentra la fila, recargar toda la tabla
            if (typeof cargarDatos === 'function') {
                cargarDatos();
            }
            return;
        }
        
        // Función auxiliar para formatear fecha corta (dd/mm/aaaa)
        // Usar la función global si existe, sino usar esta implementación
        function formatearFechaCorta(fecha) {
            if (!fecha) return '-';
            try {
                let fechaStr = fecha;
                if (typeof fecha === 'object' && fecha instanceof Date) {
                    const day = String(fecha.getDate()).padStart(2, '0');
                    const month = String(fecha.getMonth() + 1).padStart(2, '0');
                    const year = fecha.getFullYear();
                    return day + '/' + month + '/' + year;
                }
                if (typeof fecha === 'string') {
                    // Formato YYYY-MM-DD
                    const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (match) {
                        return match[3] + '/' + match[2] + '/' + match[1];
                    }
                    // Formato DD/MM/YYYY
                    const match2 = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
                    if (match2) {
                        return fecha;
                    }
                }
                return fecha;
            } catch (e) {
                console.error('Error al formatear fecha:', e);
                return fecha;
            }
        }
        
        // Calcular fechas de inicio y fin desde epics o del proyecto
        let fechasInicioAll = [];
        let fechasFinAll = [];
        
        if (itemData.fecha_inicio_epics) fechasInicioAll.push(itemData.fecha_inicio_epics);
        if (itemData.fecha_inicio) fechasInicioAll.push(itemData.fecha_inicio);
        if (itemData.fecha_fin_epics) fechasFinAll.push(itemData.fecha_fin_epics);
        if (itemData.fecha_fin) fechasFinAll.push(itemData.fecha_fin);
        
        // Si tiene subproyectos, incluir sus fechas también
        if (itemData.tiene_subproyectos && Array.isArray(itemData.subproyectos) && itemData.subproyectos.length > 0) {
            itemData.subproyectos.forEach(sp => {
                if (sp.fecha_inicio_epics) fechasInicioAll.push(sp.fecha_inicio_epics);
                if (sp.fecha_inicio) fechasInicioAll.push(sp.fecha_inicio);
                if (sp.fecha_fin_epics) fechasFinAll.push(sp.fecha_fin_epics);
                if (sp.fecha_fin) fechasFinAll.push(sp.fecha_fin);
            });
        }
        
        let fechaInicio = '';
        let fechaFin = '';
        if (fechasInicioAll.length > 0) {
            fechaInicio = fechasInicioAll.slice().sort()[0]; // mínima
        }
        if (fechasFinAll.length > 0) {
            fechaFin = fechasFinAll.slice().sort().reverse()[0]; // máxima
        }
        const fechaInicioCorta = fechaInicio ? formatearFechaCorta(fechaInicio) : '-';
        const fechaFinCorta = fechaFin ? formatearFechaCorta(fechaFin) : '-';
        
        // Buscar las celdas de fecha en la fila
        // Las fechas están antes del WIN, en celdas con estilo específico
        const cells = Array.from(tableRow.querySelectorAll('.modern-table-cell'));
        
        // Buscar la celda del WIN (contiene textarea con clase win-textarea)
        const winCellIndex = cells.findIndex(cell => cell.querySelector('.win-textarea'));
        
        let fechaInicioCell = null;
        let fechaFinCell = null;
        
        if (winCellIndex > 0) {
            // Fecha fin es la celda antes del WIN (penúltima)
            fechaFinCell = cells[winCellIndex - 1];
            // Fecha inicio es la celda antes de la fecha fin (antepenúltima)
            if (winCellIndex > 1) {
                fechaInicioCell = cells[winCellIndex - 2];
            }
        }
        
        // Si no encontramos por el método anterior, buscar por el estilo (font-size: 11px)
        if (!fechaInicioCell || !fechaFinCell) {
            const fechaCells = cells.filter(cell => {
                const style = cell.getAttribute('style') || '';
                return style.includes('font-size: 11px') && style.includes('text-align: center');
            });
            
            if (fechaCells.length >= 2) {
                // La primera es fecha inicio, la segunda es fecha fin
                fechaInicioCell = fechaCells[0];
                fechaFinCell = fechaCells[1];
            }
        }
        
        // Actualizar las celdas de fecha
        if (fechaInicioCell) {
            fechaInicioCell.textContent = fechaInicioCorta;
        }
        if (fechaFinCell) {
            fechaFinCell.textContent = fechaFinCorta;
        }
        
        console.log('✅ Fila del proyecto actualizada en la tabla con fechas:', fechaInicioCorta, fechaFinCorta);
    } catch (error) {
        console.error('Error al actualizar fila del proyecto en la tabla:', error);
        // Si falla, recargar toda la tabla como fallback
        if (typeof cargarDatos === 'function') {
            cargarDatos();
        }
    }
}

















