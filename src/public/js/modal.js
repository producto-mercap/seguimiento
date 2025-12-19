/**
 * Funciones del modal de detalle de proyecto
 * Seguimiento de Proyectos
 */

// Abrir modal de detalle del proyecto
window.abrirModalDetalle = async function abrirModalDetalle(id_proyecto, mostrarAccionables = false) {
    try {
        let btn = window.tempModalButton || (typeof event !== 'undefined' && event?.target) || document.querySelector('button[data-item][onclick*="' + id_proyecto + '"]') || document.querySelector('a[data-item][onclick*="' + id_proyecto + '"]');
        let itemData = null;
        
        // Si hay un botón con data-item, usar esos datos
        if (btn && btn.getAttribute('data-item')) {
            const itemDataJson = btn.getAttribute('data-item');
            itemData = JSON.parse(itemDataJson.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
        } else {
            // Si no hay data-item, obtener los datos del proyecto desde la API
            try {
                const response = await fetch('/api/proyectos/' + id_proyecto);
                const result = await response.json();
                if (result.success && result.data) {
                    itemData = result.data;
                } else {
                    // Intentar con mantenimiento
                    const responseMant = await fetch('/api/mantenimiento/' + id_proyecto);
                    const resultMant = await responseMant.json();
                    if (resultMant.success && resultMant.data) {
                        itemData = resultMant.data;
                    }
                }
            } catch (error) {
                console.error('Error al obtener datos del proyecto:', error);
            }
        }
        
        if (!itemData) {
            console.error('No se encontraron datos del proyecto');
            return;
        }
        const modal = document.getElementById('modalDetalle');
        const modalTitulo = document.getElementById('modalTitulo');
        const modalBody = document.getElementById('modalBody');
        
        modalTitulo.textContent = itemData.nombre_proyecto || 'Detalle del Proyecto';
        
        // Verificar si es proyecto padre
        // Primero verificar en itemData, si no está, verificar consultando la API
        let esProyectoPadre = itemData.tiene_subproyectos || false;
        
        // Si no está en itemData, verificar consultando subproyectos
        if (!esProyectoPadre) {
            try {
                const subproyectosCheckResponse = await fetch('/api/proyectos?proyecto_padre=' + id_proyecto);
                const subproyectosCheckData = await subproyectosCheckResponse.json();
                if (subproyectosCheckData.success && subproyectosCheckData.data && subproyectosCheckData.data.length > 0) {
                    esProyectoPadre = true;
                }
            } catch (error) {
                console.error('Error al verificar subproyectos:', error);
            }
        }
        
        let horasEstimadas = parseFloat(itemData.horas_estimadas) || 0;
        let horasRealizadas = parseFloat(itemData.horas_realizadas) || 0;
        let fechaInicio = formatearFecha(itemData.fecha_inicio_epics || itemData.fecha_inicio || '');
        let fechaFin = formatearFecha(itemData.fecha_fin_epics || itemData.fecha_fin || '');
        let tieneEpics = itemData.tiene_epics || false;
        
        let fechaInicioPlanificada = null;
        let fechaFinPlanificada = null;
        let fechaFinReal = null;
        
        let epicsHTML = '';
        let subproyectosHTML = '';
        let subproyectos = [];
        
        // Si es proyecto padre, obtener y sumarizar datos de subproyectos
        if (esProyectoPadre) {
            // Para proyectos padre, no cargar epics
            tieneEpics = false;
            epicsHTML = '';
            try {
                // Obtener subproyectos
                const subproyectosResponse = await fetch('/api/proyectos?proyecto_padre=' + id_proyecto);
                const subproyectosData = await subproyectosResponse.json();
                subproyectos = subproyectosData.success ? subproyectosData.data : [];
                
                // Sumarizar datos de subproyectos
                let totalHorasEstimadas = 0;
                let totalHorasRealizadas = 0;
                const fechasInicio = [];
                const fechasFinPlanificada = [];
                const fechasFinReal = [];
                
                // Obtener epics de todos los subproyectos para extraer fechas
                const epicsPromises = subproyectos.map(async function(sub) {
                    try {
                        const epicsResponse = await fetch('/api/epics/' + sub.id_proyecto + '?es_proyecto_padre=false');
                        const epicsData = await epicsResponse.json();
                        return epicsData.success ? epicsData.data : [];
                    } catch (error) {
                        console.error('Error al obtener epics del subproyecto ' + sub.id_proyecto + ':', error);
                        return [];
                    }
                });
                
                const epicsArrays = await Promise.all(epicsPromises);
                
                // Verificar si todos los subproyectos tienen fecha fin
                let todosTienenFechaFin = true;
                
                subproyectos.forEach(function(sub, index) {
                    totalHorasEstimadas += parseFloat(sub.horas_estimadas || 0);
                    totalHorasRealizadas += parseFloat(sub.horas_realizadas || 0);
                    
                    // Obtener fechas de los epics del subproyecto
                    const epicsSub = epicsArrays[index] || [];
                    
                    // Extraer fechas de inicio de los epics (cf_21)
                    epicsSub.forEach(function(epic) {
                        if (epic.cf_21 && epic.cf_21.trim() !== '') {
                            fechasInicio.push(epic.cf_21);
                        }
                    });
                    
                    // Verificar si el subproyecto tiene fecha fin
                    let subproyectoTieneFechaFin = false;
                    
                    // Verificar en epics (cf_22)
                    epicsSub.forEach(function(epic) {
                        if (epic.cf_22 && epic.cf_22.trim() !== '') {
                            fechasFinPlanificada.push(epic.cf_22);
                            subproyectoTieneFechaFin = true;
                        }
                    });
                    
                    // Verificar en campos directos del proyecto
                    const fechaFinSub = sub.fecha_fin_epics || sub.fecha_fin || '';
                    if (fechaFinSub && fechaFinSub.trim() !== '') {
                        fechasFinPlanificada.push(fechaFinSub);
                        subproyectoTieneFechaFin = true;
                    }
                    
                    // Si el subproyecto no tiene fecha fin, marcar que no todos tienen
                    if (!subproyectoTieneFechaFin) {
                        todosTienenFechaFin = false;
                    }
                    
                    // Extraer fechas de fin real de los epics (cf_15)
                    epicsSub.forEach(function(epic) {
                        if (epic.cf_15 && epic.cf_15.trim() !== '') {
                            fechasFinReal.push(epic.cf_15);
                        }
                    });
                    
                    // También intentar obtener fechas directamente del proyecto si existen
                    const fechaInicioSub = sub.fecha_inicio_epics || sub.fecha_inicio || '';
                    if (fechaInicioSub && fechaInicioSub.trim() !== '') {
                        fechasInicio.push(fechaInicioSub);
                    }
                    
                    if (sub.fecha_fin_real && sub.fecha_fin_real.trim() !== '') {
                        fechasFinReal.push(sub.fecha_fin_real);
                    }
                });
                
                // Si no todos los subproyectos tienen fecha fin, limpiar el array de fechas fin
                if (!todosTienenFechaFin) {
                    fechasFinPlanificada.length = 0; // Limpiar el array
                }
                
                console.log('Fechas recolectadas de subproyectos:', {
                    fechasInicio: fechasInicio,
                    fechasFinPlanificada: fechasFinPlanificada,
                    totalSubproyectos: subproyectos.length
                });
                
                horasEstimadas = totalHorasEstimadas;
                horasRealizadas = totalHorasRealizadas;
                
                if (fechasInicio.length > 0) {
                    // Ordenar fechas correctamente (la más temprana primero)
                    const fechasInicioOrdenadas = fechasInicio
                        .filter(f => f) // Filtrar valores vacíos
                        .map(f => {
                            // Convertir a formato comparable (YYYY-MM-DD)
                            const match = String(f).match(/^(\d{4})-(\d{2})-(\d{2})/);
                            return match ? match[0] : f;
                        })
                        .sort();
                    if (fechasInicioOrdenadas.length > 0) {
                        fechaInicioPlanificada = fechasInicioOrdenadas[0];
                    }
                }
                if (fechasFinPlanificada.length > 0) {
                    // Ordenar fechas correctamente (la más tardía última)
                    const fechasFinOrdenadas = fechasFinPlanificada
                        .filter(f => f) // Filtrar valores vacíos
                        .map(f => {
                            // Convertir a formato comparable (YYYY-MM-DD)
                            const match = String(f).match(/^(\d{4})-(\d{2})-(\d{2})/);
                            return match ? match[0] : f;
                        })
                        .sort()
                        .reverse();
                    if (fechasFinOrdenadas.length > 0) {
                        fechaFinPlanificada = fechasFinOrdenadas[0];
                    }
                }
                if (fechasFinReal.length > 0) {
                    fechaFinReal = fechasFinReal.sort().reverse()[0];
                }
                
                // Generar HTML de subproyectos
                if (subproyectos.length === 0) {
                    subproyectosHTML = '<div style="color: var(--text-secondary); font-style: italic; padding: 20px; text-align: center;">No hay subproyectos</div>';
                } else {
                    subproyectosHTML = '<div class="subproyectos-list">';
                    subproyectos.forEach(function(sub) {
                        const subRedmineLink = 'https://redmine.mercap.net/projects/' + (sub.codigo_proyecto || '');
                        subproyectosHTML += '<div class="subproyecto-item" style="background: white; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-bottom: 12px;">';
                        subproyectosHTML += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">';
                        subproyectosHTML += '<div style="display: flex; flex-direction: column; gap: 4px;">';
                        subproyectosHTML += '<div style="font-size: 14px; font-weight: 500; color: var(--text-primary);"><a href="' + subRedmineLink + '" target="_blank" style="color: var(--primary-color); text-decoration: none;">' + (sub.nombre_proyecto || 'Sin nombre') + '</a></div>';
                        subproyectosHTML += '<div style="font-size: 12px; color: var(--text-secondary);">' + (sub.codigo_proyecto || '') + '</div>';
                        subproyectosHTML += '</div>';
                        subproyectosHTML += '</div>';
                        subproyectosHTML += '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 13px; color: var(--text-secondary);">';
                        subproyectosHTML += '<div>Est.: ' + (parseFloat(sub.horas_estimadas) || 0).toFixed(1) + 'h</div>';
                        subproyectosHTML += '<div>Real.: ' + (parseFloat(sub.horas_realizadas) || 0).toFixed(1) + 'h</div>';
                        const fechaInicioSub = sub.fecha_inicio_epics || sub.fecha_inicio || '';
                        const fechaFinSub = sub.fecha_fin_epics || sub.fecha_fin || '';
                        
                        // Función auxiliar para formatear fecha a DD/MM/YYYY
                        function formatearFechaDDMMYYYY(fecha) {
                            if (!fecha) return '';
                            const match = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/);
                            if (match) {
                                return match[3] + '/' + match[2] + '/' + match[1];
                            }
                            return fecha;
                        }
                        
                        subproyectosHTML += '<div>Inicio: ' + (fechaInicioSub ? formatearFechaDDMMYYYY(fechaInicioSub) : '-') + '</div>';
                        subproyectosHTML += '<div>Fin: ' + (fechaFinSub ? formatearFechaDDMMYYYY(fechaFinSub) : '-') + '</div>';
                        subproyectosHTML += '</div>';
                        subproyectosHTML += '</div>';
                    });
                    subproyectosHTML += '</div>';
                }
            } catch (error) {
                console.error('Error al cargar subproyectos:', error);
                subproyectosHTML = '<div style="color: #d93025; padding: 20px; text-align: center;">Error al cargar subproyectos</div>';
            }
        } else {
            // Si NO es proyecto padre, cargar epics normalmente
            try {
                const epicsResponse = await fetch('/api/epics/' + id_proyecto + '?es_proyecto_padre=false');
                const epicsData = await epicsResponse.json();
                const epics = epicsData.success ? epicsData.data : [];
                
                tieneEpics = epics.length > 0;
                
                if (epics.length === 0) {
                    epicsHTML = '<div style="color: var(--text-secondary); font-style: italic; padding: 20px; text-align: center;">No hay epics sincronizados</div>';
                } else {
                    const fechasInicio = epics.map(e => e.cf_21).filter(f => f);
                    const fechasFinPlanificada = epics.map(e => e.cf_22).filter(f => f);
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
                
                // Todos los epics devueltos pertenecen al proyecto (buscados por proyecto_padre)
                epicsHTML = '<div class="epics-list">';
                
                function renderizarEpic(epic) {
                    const epicUrl = 'https://redmine.mercap.net/issues/' + epic.epic_id;
                    const epicTitle = epic.subject || 'Epic #' + epic.epic_id;
                    let html = '<div class="epic-item" style="background: white; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-bottom: 12px;">';
                    html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">';
                    html += '<div style="display: flex; flex-direction: column; gap: 4px;">';
                    html += '<div style="font-size: 11px; color: var(--text-secondary); font-weight: 500;">Epic #' + epic.epic_id + '</div>';
                    html += '<div style="font-size: 14px; font-weight: 500; color: var(--text-primary);"><a href="' + epicUrl + '" target="_blank" style="color: var(--primary-color); text-decoration: none;">' + epicTitle + '</a></div>';
                    html += '</div>';
                    
                    const estadoEpic = epic.status || '';
                    let estadoEpicBg = '';
                    const estadoLower = estadoEpic.toLowerCase();
                    
                    if (estadoLower.includes('cerrado') || estadoLower.includes('closed') || 
                        estadoLower.includes('entregado') || estadoLower.includes('resuelto') || 
                        estadoLower.includes('resolved')) {
                        estadoEpicBg = 'rgba(30, 142, 62, 0.1)';
                    } 
                    else if (estadoLower.includes('nuevo') || estadoLower.includes('new') || 
                             estadoLower.includes('en progreso') || estadoLower.includes('in progress') ||
                             estadoLower.includes('abierto') || estadoLower.includes('open')) {
                        estadoEpicBg = 'rgba(26, 115, 232, 0.1)';
                    }
                    
                    html += '<div style="font-size: 12px; color: var(--text-secondary); padding: 4px 8px; border-radius: 12px; background: ' + (estadoEpicBg || 'transparent') + '; display: inline-block;">' + (estadoEpic || '-') + '</div>';
                    html += '</div>';
                    html += '<div style="display: grid; grid-template-columns: auto auto minmax(120px, auto) minmax(130px, auto) minmax(110px, auto); gap: 12px; font-size: 13px; color: var(--text-secondary);">';
                    html += '<div>Est.: ' + (parseFloat(epic.total_estimated_hours) || 0).toFixed(1) + 'h</div>';
                    html += '<div>Real.: ' + (parseFloat(epic.total_spent_hours) || 0).toFixed(1) + 'h</div>';
                    html += '<div style="white-space: nowrap;">Inicio: ' + (epic.cf_21 ? formatearFecha(epic.cf_21) : '-') + '</div>';
                    html += '<div style="white-space: nowrap;">Fin Plan.: ' + (epic.cf_22 ? formatearFecha(epic.cf_22) : '-') + '</div>';
                    html += '<div style="white-space: nowrap;">Fin Real: ' + (epic.cf_15 ? formatearFecha(epic.cf_15) : '-') + '</div>';
                    html += '</div>';
                    html += '</div>';
                    return html;
                }
                
                // Renderizar todos los epics del proyecto
                epics.forEach(function(epic) {
                    epicsHTML += renderizarEpic(epic);
                });
                
                epicsHTML += '</div>';
                }
            } catch (error) {
                console.error('Error al cargar epics:', error);
                epicsHTML = '<div style="color: #d93025; padding: 20px; text-align: center;">Error al cargar epics</div>';
            }
        }
        
        const redmineLink = itemData.redmineUrl || ('https://redmine.mercap.net/projects/' + (itemData.codigo_proyecto || ''));
        
        // Obtener accionables del proyecto (desde itemData si está disponible, sino hacer fetch)
        let accionablesActual = itemData.accionables || '';
        let fechaAccionableActual = itemData.fecha_accionable || '';
        let asignadoAccionableActual = itemData.asignado_accionable || '';
        let updatedAt = itemData.updated_at || '';
        
        if (!accionablesActual) {
            try {
                // Intentar obtener desde la tabla actual si está disponible
                const proyectoEnTabla = datosTablaActual?.find(p => p.id_proyecto === id_proyecto);
                if (proyectoEnTabla) {
                    if (proyectoEnTabla.accionables) accionablesActual = proyectoEnTabla.accionables;
                    if (proyectoEnTabla.fecha_accionable) fechaAccionableActual = proyectoEnTabla.fecha_accionable;
                    if (proyectoEnTabla.asignado_accionable) asignadoAccionableActual = proyectoEnTabla.asignado_accionable;
                    if (proyectoEnTabla.updated_at) updatedAt = proyectoEnTabla.updated_at;
                }
            } catch (error) {
                console.error('Error al cargar accionables:', error);
            }
        }
        
        // Formatear fecha de última actualización (mostrar tal como viene de BD para evitar problemas de zona horaria)
        let fechaUltimaActualizacion = '';
        if (updatedAt) {
            try {
                // Manejar diferentes formatos de fecha:
                // 1. Formato ISO con Z (UTC): 2025-12-10T17:56:16.692Z
                // 2. Formato de BD: 2025-12-10 14:56:16.692379
                // 3. Formato de BD simple: 2025-12-10 14:56:16
                
                let fechaStr = updatedAt;
                
                // Si viene en formato ISO (con T y Z), convertir de UTC a hora local (Argentina UTC-3)
                if (fechaStr.includes('T') && fechaStr.includes('Z')) {
                    // Formato ISO: 2025-12-10T17:56:16.692Z
                    // Convertir a hora local (restar 3 horas para Argentina)
                    const fecha = new Date(fechaStr);
                    // Obtener componentes en hora local
                    const año = fecha.getFullYear();
                    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                    const dia = String(fecha.getDate()).padStart(2, '0');
                    const horas = String(fecha.getHours()).padStart(2, '0');
                    const minutos = String(fecha.getMinutes()).padStart(2, '0');
                    const segundos = String(fecha.getSeconds()).padStart(2, '0');
                    fechaStr = `${año}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
                } else {
                    // Formato de BD: 2025-12-10 14:56:16.692379 o 2025-12-10 14:56:16
                    const match = fechaStr.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
                    if (match) {
                        fechaStr = match[1] + ' ' + match[2];
                    }
                }
                
                fechaUltimaActualizacion = fechaStr;
            } catch (e) {
                fechaUltimaActualizacion = updatedAt;
            }
        }
        
        let contenido = '<div style="display: flex; flex-direction: column; gap: 24px; position: relative;">';
        
        // Header superior: Botón Sincronizar Redmine (solo si NO es proyecto padre) y Última Actualización
        contenido += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">';
        if (!esProyectoPadre) {
            contenido += '<button class="button" onclick="sincronizarEpicsDesdeModal(' + id_proyecto + ', \'' + (itemData.codigo_proyecto || '').replace(/'/g, "\\'") + '\', this)" style="padding: 8px 16px; font-size: 13px; white-space: nowrap;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px; vertical-align: middle;"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>Sincronizar Redmine</button>';
        } else {
            contenido += '<div></div>';
        }
        if (fechaUltimaActualizacion) {
            contenido += '<div id="ultimaActualizacion_' + id_proyecto + '" style="font-size: 12px; color: var(--text-secondary); font-family: \'Google Sans\', \'Roboto\', sans-serif;">Última Actualización: ' + fechaUltimaActualizacion + '</div>';
        } else {
            contenido += '<div></div>';
        }
        contenido += '</div>';
        
        const codigoProyecto = itemData.codigo_proyecto || '';
        contenido += '<div style="margin-bottom: 8px;"><a href="' + redmineLink + '" target="_blank" style="color: var(--primary-color); text-decoration: none; font-size: 14px; font-weight: 400;">Redmine ' + codigoProyecto + '</a></div>';
        
        contenido += '<div style="display: grid; grid-template-columns: 0.7fr 1.5fr; gap: 32px;">';
        
        contenido += '<div style="display: flex; flex-direction: column; gap: 20px;">';
        contenido += '<h3 style="font-size: 18px; font-weight: 500; color: var(--text-primary); margin-bottom: 16px;">Información del Proyecto</h3>';
        
        contenido += '<div><label style="display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px;">Horas Estimadas</label>';
        contenido += '<div style="font-size: 16px; color: var(--text-primary); font-weight: 500;">' + (horasEstimadas > 0 ? horasEstimadas.toFixed(1) : '-') + 'h</div></div>';
        
        contenido += '<div><label style="display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px;">Horas Realizadas</label>';
        contenido += '<div style="font-size: 16px; color: var(--text-primary); font-weight: 500;">' + (horasRealizadas > 0 ? horasRealizadas.toFixed(1) : '-') + 'h</div></div>';
        
        contenido += '<div><label style="display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px;">Fecha Inicio Planificada</label>';
        // Para proyectos padre, usar fechaInicioPlanificada sumarizada; para otros, usar tieneEpics
        let tieneDatosInicio = false;
        let tieneDatosFin = false;
        
        // Mostrar fechas planificadas siempre que exista al menos una fecha válida,
        // aunque haya epics sin planificación.
        if (esProyectoPadre) {
            tieneDatosInicio = fechaInicioPlanificada !== null && fechaInicioPlanificada !== undefined && String(fechaInicioPlanificada).trim() !== '';
            tieneDatosFin    = fechaFinPlanificada   !== null && fechaFinPlanificada   !== undefined && String(fechaFinPlanificada).trim()   !== '';
        } else {
            tieneDatosInicio = fechaInicioPlanificada !== null && fechaInicioPlanificada !== undefined && String(fechaInicioPlanificada).trim() !== '';
            tieneDatosFin    = fechaFinPlanificada   !== null && fechaFinPlanificada   !== undefined && String(fechaFinPlanificada).trim()   !== '';
        }
        
        console.log('Verificación de fechas proyecto padre:', {
            esProyectoPadre: esProyectoPadre,
            fechaInicioPlanificada: fechaInicioPlanificada,
            fechaFinPlanificada: fechaFinPlanificada,
            tieneDatosInicio: tieneDatosInicio,
            tieneDatosFin: tieneDatosFin
        });
        
        if (!tieneDatosInicio) {
            contenido += '<div style="width: 100%; padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 14px; font-family: \'Google Sans\', \'Roboto\', sans-serif; background: #f8f9fa; color: var(--text-secondary);">-</div></div>';
        } else {
            const fechaFormateada = formatearFecha(fechaInicioPlanificada);
            contenido += '<input type="date" class="modern-input date-input" value="' + fechaFormateada + '" readonly style="width: 100%; padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 14px; font-family: \'Google Sans\', \'Roboto\', sans-serif; background: #f8f9fa; cursor: not-allowed;"></div>';
        }
        
        contenido += '<div><label style="display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px;">Fecha Fin Planificada</label>';
        if (!tieneDatosFin) {
            contenido += '<div style="width: 100%; padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 14px; font-family: \'Google Sans\', \'Roboto\', sans-serif; background: #f8f9fa; color: var(--text-secondary);">-</div></div>';
        } else {
            const fechaFormateada = formatearFecha(fechaFinPlanificada);
            contenido += '<input type="date" class="modern-input date-input" value="' + fechaFormateada + '" readonly style="width: 100%; padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 14px; font-family: \'Google Sans\', \'Roboto\', sans-serif; background: #f8f9fa; cursor: not-allowed;"></div>';
        }
        
        const estadoProyecto = (itemData.estado || '').toLowerCase();
        const mostrarFechaFinReal = estadoProyecto === 'entregado' || estadoProyecto === 'cerrado';
        
        if (mostrarFechaFinReal) {
            const tieneDatosFinReal = fechaFinReal !== null && fechaFinReal !== undefined && String(fechaFinReal).trim() !== '';
            contenido += '<div><label style="display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px;">Fecha Fin Real</label>';
            if (!tieneDatosFinReal) {
                contenido += '<div style="width: 100%; padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 14px; font-family: \'Google Sans\', \'Roboto\', sans-serif; background: #f8f9fa; color: var(--text-secondary);">-</div></div>';
            } else {
                contenido += '<input type="date" class="modern-input date-input" value="' + formatearFecha(fechaFinReal) + '" readonly style="width: 100%; padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 14px; font-family: \'Google Sans\', \'Roboto\', sans-serif; background: #f8f9fa; cursor: not-allowed;"></div>';
            }
        }
        
        contenido += '</div>';
        
        contenido += '<div style="display: flex; flex-direction: column; gap: 20px;">';
        if (esProyectoPadre) {
            // Mostrar subproyectos para proyectos padre (NO mostrar epics)
            contenido += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">';
            contenido += '<h3 style="font-size: 18px; font-weight: 500; color: var(--text-primary); margin: 0;">Subproyectos</h3>';
            contenido += '<div style="font-size: 13px; color: var(--text-secondary);">Total: ' + subproyectos.length + ' subproyecto(s) - ' + horasEstimadas.toFixed(1) + 'h est. / ' + horasRealizadas.toFixed(1) + 'h real.</div>';
            contenido += '</div>';
            contenido += subproyectosHTML;
        } else {
            // Mostrar epics solo para proyectos normales y subproyectos (NO para proyectos padre)
            contenido += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">';
            contenido += '<h3 style="font-size: 18px; font-weight: 500; color: var(--text-primary); margin: 0;">Epics Sincronizados</h3>';
            contenido += '<div style="font-size: 13px; color: var(--text-secondary);">' + (tieneEpics ? 'Total: ' + (parseFloat(itemData.horas_estimadas) || 0).toFixed(1) + 'h est. / ' + (parseFloat(itemData.horas_realizadas) || 0).toFixed(1) + 'h real.' : 'Sin epics') + '</div>';
            contenido += '</div>';
            contenido += epicsHTML;
        }
        contenido += '</div>';
        
        contenido += '</div>';
        contenido += '</div>';
        
        // Panel de Accionables (al final, después de la información del proyecto)
        contenido += '<div id="accionablesPanel_' + id_proyecto + '" style="margin-top: 32px; padding: 20px; padding-top: 24px; border-top: 1px solid var(--border-color); background: rgba(26, 115, 232, 0.05); border-radius: 8px;">';
        contenido += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">';
        contenido += '<label style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">Accionables</label>';
        contenido += '</div>';
        contenido += '<div id="accionablesList_' + id_proyecto + '" style="display: flex; flex-direction: column; gap: 12px;">';
        contenido += '<div style="color: var(--text-secondary); font-style: italic; text-align: center; padding: 20px;">Cargando accionables...</div>';
        contenido += '</div>';
        contenido += '<div id="agregarAccionableBtnContainer_' + id_proyecto + '" style="margin-top: 12px; display: flex; justify-content: center;"></div>';
        contenido += '</div>';
        
        contenido += '</div>';
        
        modalBody.innerHTML = contenido;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Cargar accionables
        cargarAccionablesProyecto(id_proyecto);
        
        // Inicializar estado de edición
        accionablesEditados = false;
        idProyectoActual = id_proyecto;
        
        // Si se debe mostrar los accionables, hacer scroll al panel después de cargar
        if (mostrarAccionables) {
            setTimeout(() => {
                const accionablesPanel = document.getElementById('accionablesPanel_' + id_proyecto);
                if (accionablesPanel) {
                    accionablesPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500); // Esperar a que se carguen los accionables
        }
        
        // Verificar estado inicial del botón check
        setTimeout(() => {
            marcarAccionablesEditado(id_proyecto);
        }, 100);
    } catch (error) {
        console.error('Error al abrir modal:', error);
        alert('Error al abrir detalles del proyecto');
    }
}

// Marcar que los accionables fueron editados (mostrar check solo si los 3 campos están llenos)
function marcarAccionablesEditado(id_proyecto) {
    const inputAccionables = document.getElementById('accionablesInput_' + id_proyecto);
    const inputFecha = document.getElementById('fechaAccionableInput_' + id_proyecto);
    const inputAsignado = document.getElementById('asignadoAccionableInput_' + id_proyecto);
    const btnGuardar = document.getElementById('guardarAccionablesBtn_' + id_proyecto);
    
    if (btnGuardar && inputAccionables && inputFecha && inputAsignado) {
        const accionables = inputAccionables.value.trim();
        const fecha = inputFecha.value.trim();
        const asignado = inputAsignado.value.trim();
        
        // Solo mostrar check si los 3 campos están llenos
        if (accionables && fecha && asignado) {
            btnGuardar.style.display = 'flex';
            accionablesEditados = true;
        } else {
            btnGuardar.style.display = 'none';
        }
    }
}

// Función auxiliar para convertir fecha YYYY-MM-DD a DD-MM-AAAA
function convertirFechaADDMAAAA(fecha) {
    if (!fecha) return obtenerFechaHoy();
    
    // Si ya está en formato DD-MM-AAAA, devolverlo
    if (/^\d{2}-\d{2}-\d{4}$/.test(fecha)) {
        return fecha;
    }
    
    // Si está en formato YYYY-MM-DD, convertir
    if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
        const partes = fecha.split('T')[0].split('-');
        return `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
    
    return obtenerFechaHoy();
}

// Guardar accionables (retorna Promise)
async function guardarAccionables(id_proyecto) {
    return new Promise(async (resolve, reject) => {
    const inputAccionables = document.getElementById('accionablesInput_' + id_proyecto);
    const inputFecha = document.getElementById('fechaAccionableInput_' + id_proyecto);
    const inputAsignado = document.getElementById('asignadoAccionableInput_' + id_proyecto);
    const btnGuardar = document.getElementById('guardarAccionablesBtn_' + id_proyecto);
    
    if (!inputAccionables || !inputFecha || !inputAsignado) {
        console.error('No se encontraron los campos de accionables');
        return;
    }
    
    const accionables = inputAccionables.value.trim();
    // Convertir fecha DD-MM-AAAA a YYYY-MM-DD para el backend
    let fechaAccionable = null;
    if (inputFecha.value.trim()) {
        const partesFecha = inputFecha.value.trim().split('-');
        if (partesFecha.length === 3) {
            fechaAccionable = `${partesFecha[2]}-${partesFecha[1]}-${partesFecha[0]}`;
        }
    }
    const asignadoAccionable = inputAsignado.value.trim() || null;
    
    try {
        const response = await fetch('/api/proyectos/' + id_proyecto + '/accionables', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                accionables: accionables,
                fecha_accionable: fechaAccionable,
                asignado_accionable: asignadoAccionable
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Ocultar botón de guardar
            if (btnGuardar) {
                btnGuardar.style.display = 'none';
            }
            
            // Marcar como guardado
            accionablesEditados = false;
            
            // Mostrar feedback visual temporal
            const originalBg = btnGuardar.style.background;
            btnGuardar.style.background = '#34a853';
            setTimeout(() => {
                btnGuardar.style.background = originalBg;
            }, 1000);
            
            resolve(result);
        } else {
            const errorMsg = 'Error al guardar accionables: ' + (result.error || 'Error desconocido');
            alert(errorMsg);
            reject(new Error(errorMsg));
        }
    } catch (error) {
        console.error('Error al guardar accionables:', error);
        const errorMsg = 'Error al guardar accionables';
        alert(errorMsg);
        reject(error);
    }
    });
}

// Variable global para rastrear si hay cambios sin guardar
let accionablesEditados = false;
let idProyectoActual = null;

// Mostrar modal de confirmación personalizado
function mostrarConfirmacion(mensaje, onConfirm, onCancel, textoConfirmar = 'Guardar y cerrar') {
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.id = 'confirmModalOverlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    // Crear modal
    const modal = document.createElement('div');
    modal.style.cssText = 'background: white; border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); max-width: 400px; width: 90%; padding: 24px;';
    
    modal.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3 style="font-size: 18px; font-weight: 500; color: var(--text-primary); margin: 0 0 12px 0; font-family: \'Google Sans\', \'Roboto\', sans-serif;">Confirmar</h3>
            <p style="font-size: 14px; color: var(--text-secondary); margin: 0; font-family: \'Google Sans\', \'Roboto\', sans-serif; line-height: 1.5;">${mensaje}</p>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="confirmCancelBtn" style="padding: 10px 20px; border: 1px solid var(--border-color); border-radius: 4px; background: white; cursor: pointer; font-size: 14px; font-weight: 500; color: var(--text-primary); font-family: \'Google Sans\', \'Roboto\', sans-serif; transition: all 0.2s;" onmouseover="this.style.background='#f1f3f4'" onmouseout="this.style.background='white'">
                Cancelar
            </button>
            <button id="confirmOkBtn" style="padding: 10px 20px; border: none; border-radius: 4px; background: var(--primary-color); color: white; cursor: pointer; font-size: 14px; font-weight: 500; font-family: \'Google Sans\', \'Roboto\', sans-serif; transition: all 0.2s;" onmouseover="this.style.background='#1557b0'" onmouseout="this.style.background='var(--primary-color)'">
                ${textoConfirmar}
            </button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Función para cerrar el modal
    const cerrar = () => {
        if (overlay && overlay.parentNode) {
            overlay.remove();
        }
    };
    
    // Event listeners
    const btnCancel = document.getElementById('confirmCancelBtn');
    const btnOk = document.getElementById('confirmOkBtn');
    
    btnCancel.onclick = () => {
        cerrar();
        if (onCancel) onCancel();
    };
    
    btnOk.onclick = () => {
        cerrar();
        if (onConfirm) onConfirm();
    };
    
    // Cerrar al hacer clic fuera del modal
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            cerrar();
            if (onCancel) onCancel();
        }
    };
    
    // Cerrar con Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            cerrar();
            document.removeEventListener('keydown', handleEscape);
            if (onCancel) onCancel();
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Cerrar modal de detalle con aviso si hay cambios sin guardar
window.cerrarModalDetalle = function cerrarModalDetalle() {
    // Verificar si hay cambios sin guardar
    if (accionablesEditados && idProyectoActual) {
        const btnGuardar = document.getElementById('guardarAccionablesBtn_' + idProyectoActual);
        if (btnGuardar && btnGuardar.style.display !== 'none') {
            mostrarConfirmacion(
                '¿Desea guardar los cambios antes de cerrar?',
                () => {
                    // Guardar y cerrar
                    guardarAccionables(idProyectoActual).then(() => {
                        const modal = document.getElementById('modalDetalle');
                        modal.style.display = 'none';
                        document.body.style.overflow = 'auto';
                        accionablesEditados = false;
                        idProyectoActual = null;
                    }).catch(() => {
                        // Si hay error, no cerrar el modal
                    });
                },
                () => {
                    // Cerrar sin guardar
                    const modal = document.getElementById('modalDetalle');
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                    accionablesEditados = false;
                    idProyectoActual = null;
                }
            );
            return;
        }
    }
    
    const modal = document.getElementById('modalDetalle');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    accionablesEditados = false;
    idProyectoActual = null;
}

// Actualizar fecha en el modal después de guardar
function actualizarFechaEnModal(id_proyecto, campo, valor) {
    // La fecha ya se actualizó en el input, no necesitamos hacer nada más
}

// Cargar accionables del proyecto
async function cargarAccionablesProyecto(id_proyecto) {
    try {
        const response = await fetch('/api/proyectos/' + id_proyecto + '/accionables');
        const result = await response.json();
        
        if (result.success) {
            renderizarAccionables(id_proyecto, result.data);
        } else {
            document.getElementById('accionablesList_' + id_proyecto).innerHTML = '<div style="color: var(--text-secondary); font-style: italic; text-align: center; padding: 20px;">Error al cargar accionables</div>';
        }
    } catch (error) {
        console.error('Error al cargar accionables:', error);
        document.getElementById('accionablesList_' + id_proyecto).innerHTML = '<div style="color: var(--text-secondary); font-style: italic; text-align: center; padding: 20px;">Error al cargar accionables</div>';
    }
}

// Renderizar lista de accionables
function renderizarAccionables(id_proyecto, accionables) {
    const container = document.getElementById('accionablesList_' + id_proyecto);
    const btnContainer = document.getElementById('agregarAccionableBtnContainer_' + id_proyecto);
    if (!container) return;
    
    // Si está vacío, no mostrar ningún registro, solo el botón "+"
    if (!accionables || accionables.length === 0) {
        container.innerHTML = '';
        // Mostrar botón "+" para agregar el primer accionable
        if (btnContainer) {
            btnContainer.innerHTML = '<button onclick="agregarNuevoAccionable(' + id_proyecto + ')" style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border-color); background: white; cursor: pointer; transition: all 0.2s; color: var(--primary-color); font-size: 20px; font-weight: 500; padding: 0;" onmouseover="this.style.background=\'#f1f3f4\'" onmouseout="this.style.background=\'white\'" title="Agregar accionable">+</button>';
        }
        return;
    }
    
    let html = '';
    accionables.forEach((accionable) => {
        const fechaHoy = obtenerFechaHoy();
        const fechaValor = accionable.fecha_accionable ? convertirFechaADDMAAAA(accionable.fecha_accionable) : fechaHoy;
        const asignadoValor = (accionable.asignado_accionable || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const accionableValor = (accionable.accionable || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const estadoValor = accionable.estado || '';
        
        html += crearHTMLAccionable(accionable.id, id_proyecto, fechaValor, asignadoValor, accionableValor, estadoValor);
    });
    
    container.innerHTML = html;
    
    // Mostrar botón "+" abajo del último accionable
    if (btnContainer) {
        btnContainer.innerHTML = '<button onclick="agregarNuevoAccionable(' + id_proyecto + ')" style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border-color); background: white; cursor: pointer; transition: all 0.2s; color: var(--primary-color); font-size: 20px; font-weight: 500; padding: 0;" onmouseover="this.style.background=\'#f1f3f4\'" onmouseout="this.style.background=\'white\'" title="Agregar accionable">+</button>';
    }
}

// Función auxiliar para crear HTML de un accionable
function crearHTMLAccionable(id_accionable, id_proyecto, fechaValor, asignadoValor, accionableValor, estadoValor) {
    const idInput = id_accionable ? id_accionable : 'nuevo_' + Date.now();
    const fechaInputId = 'fechaAccionable_' + idInput;
    const asignadoInputId = 'asignadoAccionable_' + idInput;
    const accionableInputId = 'accionable_' + idInput;
    const guardarBtnId = 'guardarAccionableBtn_' + idInput;
    const itemId = 'accionableItem_' + idInput;
    
    let html = '<div id="' + itemId + '" style="display: grid; grid-template-columns: 140px 1px 180px 1px 1fr 1px 120px 1px 40px; gap: 0; align-items: stretch; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: rgba(26, 115, 232, 0.08);">';
    
    // Campo Fecha
    html += '<div class="date-input-wrapper" style="position: relative; display: flex; align-items: center;">';
    html += '<input type="text" class="input date-input" id="' + fechaInputId + '" value="' + fechaValor + '" placeholder="DD-MM-AAAA" maxlength="10" style="width: 100%; padding: 8px 12px; padding-right: 40px; border: none; outline: none; font-size: 13px; font-family: \'Google Sans\', \'Roboto\', sans-serif; box-sizing: border-box; background: transparent;" onchange="' + (id_accionable ? 'actualizarAccionableIndividual(' + id_accionable + ')' : 'actualizarAccionableNuevo(\'' + idInput + '\', ' + id_proyecto + ')') + '" oninput="' + (id_accionable ? 'actualizarAccionableIndividual(' + id_accionable + ')' : 'actualizarAccionableNuevo(\'' + idInput + '\', ' + id_proyecto + ')') + '">';
    html += '<button type="button" class="date-picker-icon-btn" onclick="abrirDatePicker(\'' + fechaInputId + '\')" title="Seleccionar fecha">';
    html += '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">';
    html += '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>';
    html += '</svg>';
    html += '</button>';
    html += '</div>';
    
    // Separador 1
    html += '<div style="background: var(--border-color); width: 1px;"></div>';
    
    // Campo Asignado
    html += '<div style="display: flex; align-items: center;">';
    html += '<input type="text" id="' + asignadoInputId + '" value="' + asignadoValor + '" placeholder="Asignado a..." style="width: 100%; padding: 8px 12px; border: none; outline: none; font-size: 13px; font-family: \'Google Sans\', \'Roboto\', sans-serif; box-sizing: border-box; background: transparent;" onchange="' + (id_accionable ? 'actualizarAccionableIndividual(' + id_accionable + ')' : 'actualizarAccionableNuevo(\'' + idInput + '\', ' + id_proyecto + ')') + '" oninput="' + (id_accionable ? 'actualizarAccionableIndividual(' + id_accionable + ')' : 'actualizarAccionableNuevo(\'' + idInput + '\', ' + id_proyecto + ')') + '">';
    html += '</div>';
    
    // Separador 2
    html += '<div style="background: var(--border-color); width: 1px;"></div>';
    
    // Campo Accionable
    html += '<div style="position: relative; display: flex; align-items: center;">';
    html += '<input type="text" id="' + accionableInputId + '" value="' + accionableValor + '" placeholder="Ingrese el accionable..." style="width: 100%; padding: 8px 12px; padding-right: 40px; border: none; outline: none; font-size: 13px; font-family: \'Google Sans\', \'Roboto\', sans-serif; box-sizing: border-box; background: transparent;" onchange="' + (id_accionable ? 'actualizarAccionableIndividual(' + id_accionable + ')' : 'actualizarAccionableNuevo(\'' + idInput + '\', ' + id_proyecto + ')') + '" oninput="' + (id_accionable ? 'actualizarAccionableIndividual(' + id_accionable + ')' : 'actualizarAccionableNuevo(\'' + idInput + '\', ' + id_proyecto + ')') + '">';
    html += '<button id="' + guardarBtnId + '" onclick="' + (id_accionable ? 'guardarAccionableIndividual(' + id_accionable + ')' : 'guardarAccionableNuevo(\'' + idInput + '\', ' + id_proyecto + ')') + '" style="display: none; position: absolute; right: 8px; width: 24px; height: 24px; border: none; background: transparent; cursor: pointer; transition: all 0.2s; padding: 0; align-items: center; justify-content: center; flex-shrink: 0;" title="Guardar">';
    html += '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    html += '</button>';
    html += '</div>';
    
    // Separador 3
    html += '<div style="background: var(--border-color); width: 1px;"></div>';
    
    // Campo Estado (solo si tiene ID, no para nuevos)
    if (id_accionable) {
        html += '<div style="display: flex; align-items: center; justify-content: center; padding: 8px;">';
        html += crearDropdownEstadoAccionable(id_accionable, estadoValor || '');
        html += '</div>';
    } else {
        html += '<div style="display: flex; align-items: center; justify-content: center; padding: 8px;"></div>';
    }
    
    // Separador 4
    html += '<div style="background: var(--border-color); width: 1px;"></div>';
    
    // Botón eliminar (solo si tiene ID, no para nuevos)
    if (id_accionable) {
        html += '<div style="display: flex; align-items: center; justify-content: center; padding: 8px; position: relative; z-index: 10;">';
        html += '<button onclick="eliminarAccionable(' + id_accionable + ', ' + id_proyecto + ')" style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; border: 1px solid #dadce0; background: white; cursor: pointer; transition: all 0.2s; color: #d93025; padding: 0; box-shadow: 0 1px 2px 0 rgba(60,64,67,.3);" onmouseover="this.style.background=\'#fce8e6\'; this.style.borderColor=\'#d93025\';" onmouseout="this.style.background=\'white\'; this.style.borderColor=\'#dadce0\';" title="Eliminar accionable">';
        html += '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">';
        html += '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>';
        html += '</svg>';
        html += '</button>';
        html += '</div>';
    } else {
        html += '<div style="display: flex; align-items: center; justify-content: center; padding: 8px;"></div>';
    }
    
    html += '</div>';
    return html;
}

// Agregar nuevo accionable
async function agregarNuevoAccionable(id_proyecto) {
    try {
        const fechaHoy = obtenerFechaHoy();
        const response = await fetch('/api/proyectos/' + id_proyecto + '/accionables', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fecha_accionable: convertirFechaADDMAAAA(fechaHoy).split('-').reverse().join('-'), // Convertir a YYYY-MM-DD
                asignado_accionable: '',
                accionable: ''
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Recargar la lista de accionables
            await cargarAccionablesProyecto(id_proyecto);
            // Refrescar la tabla principal para actualizar el "Ver"
            if (typeof cargarDatos === 'function') {
                cargarDatos();
            }
        } else {
            alert('Error al crear accionable: ' + (result.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al agregar accionable:', error);
        alert('Error al agregar accionable');
    }
}

// Actualizar accionable individual (mostrar check)
function actualizarAccionableIndividual(id_accionable) {
    const btnGuardar = document.getElementById('guardarAccionableBtn_' + id_accionable);
    if (btnGuardar) {
        const inputAccionable = document.getElementById('accionable_' + id_accionable);
        const inputFecha = document.getElementById('fechaAccionable_' + id_accionable);
        const inputAsignado = document.getElementById('asignadoAccionable_' + id_accionable);
        
        if (inputAccionable && inputFecha && inputAsignado) {
            const accionable = inputAccionable.value.trim();
            const fecha = inputFecha.value.trim();
            const asignado = inputAsignado.value.trim();
            
            // Solo mostrar check si los 3 campos están llenos
            if (accionable && fecha && asignado) {
                btnGuardar.style.display = 'flex';
            } else {
                btnGuardar.style.display = 'none';
            }
        }
    }
}

// Actualizar accionable nuevo (mostrar check)
function actualizarAccionableNuevo(idInput, id_proyecto) {
    const btnGuardar = document.getElementById('guardarAccionableBtn_' + idInput);
    if (btnGuardar) {
        const inputAccionable = document.getElementById('accionable_' + idInput);
        const inputFecha = document.getElementById('fechaAccionable_' + idInput);
        const inputAsignado = document.getElementById('asignadoAccionable_' + idInput);
        
        if (inputAccionable && inputFecha && inputAsignado) {
            const accionable = inputAccionable.value.trim();
            const fecha = inputFecha.value.trim();
            const asignado = inputAsignado.value.trim();
            
            // Solo mostrar check si los 3 campos están llenos
            if (accionable && fecha && asignado) {
                btnGuardar.style.display = 'flex';
            } else {
                btnGuardar.style.display = 'none';
            }
        }
    }
}

// Guardar accionable nuevo (desde registro vacío)
async function guardarAccionableNuevo(idInput, id_proyecto) {
    const inputAccionable = document.getElementById('accionable_' + idInput);
    const inputFecha = document.getElementById('fechaAccionable_' + idInput);
    const inputAsignado = document.getElementById('asignadoAccionable_' + idInput);
    
    if (!inputAccionable || !inputFecha || !inputAsignado) {
        console.error('No se encontraron los campos del accionable');
        return;
    }
    
    const accionable = inputAccionable.value.trim();
    let fechaAccionable = null;
    if (inputFecha.value.trim()) {
        const partesFecha = inputFecha.value.trim().split('-');
        if (partesFecha.length === 3) {
            fechaAccionable = `${partesFecha[2]}-${partesFecha[1]}-${partesFecha[0]}`;
        }
    }
    const asignadoAccionable = inputAsignado.value.trim() || null;
    
    // Validar que los 3 campos estén llenos
    if (!accionable || !fechaAccionable || !asignadoAccionable) {
        alert('Por favor complete todos los campos (fecha, asignado y accionable)');
        return;
    }
    
    try {
        const response = await fetch('/api/proyectos/' + id_proyecto + '/accionables', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fecha_accionable: fechaAccionable,
                asignado_accionable: asignadoAccionable,
                accionable: accionable
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Recargar la lista de accionables
            await cargarAccionablesProyecto(id_proyecto);
            // Refrescar la tabla principal para actualizar el "Ver"
            if (typeof cargarDatos === 'function') {
                cargarDatos();
            }
        } else {
            alert('Error al guardar accionable: ' + (result.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al guardar accionable:', error);
        alert('Error al guardar accionable');
    }
}

// Guardar accionable individual
async function guardarAccionableIndividual(id_accionable) {
    const inputAccionable = document.getElementById('accionable_' + id_accionable);
    const inputFecha = document.getElementById('fechaAccionable_' + id_accionable);
    const inputAsignado = document.getElementById('asignadoAccionable_' + id_accionable);
    const btnGuardar = document.getElementById('guardarAccionableBtn_' + id_accionable);
    
    if (!inputAccionable || !inputFecha || !inputAsignado) {
        console.error('No se encontraron los campos del accionable');
        return;
    }
    
    const accionable = inputAccionable.value.trim();
    let fechaAccionable = null;
    if (inputFecha.value.trim()) {
        const partesFecha = inputFecha.value.trim().split('-');
        if (partesFecha.length === 3) {
            fechaAccionable = `${partesFecha[2]}-${partesFecha[1]}-${partesFecha[0]}`;
        }
    }
    const asignadoAccionable = inputAsignado.value.trim() || null;
    
    try {
        const response = await fetch('/api/accionables/' + id_accionable, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fecha_accionable: fechaAccionable,
                asignado_accionable: asignadoAccionable,
                accionable: accionable
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (btnGuardar) {
                btnGuardar.style.display = 'none';
            }
            // Refrescar la tabla principal para actualizar el "Ver"
            if (typeof cargarDatos === 'function') {
                cargarDatos();
            }
        } else {
            alert('Error al guardar accionable: ' + (result.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al guardar accionable:', error);
        alert('Error al guardar accionable');
    }
}

// Eliminar accionable
async function eliminarAccionable(id_accionable, id_proyecto) {
    mostrarConfirmacion(
        '¿Está seguro de que desea eliminar este accionable?',
        async () => {
            try {
                const response = await fetch('/api/accionables/' + id_accionable, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Recargar la lista de accionables
                    await cargarAccionablesProyecto(id_proyecto);
                    // Refrescar la tabla principal para actualizar el "Ver"
                    if (typeof cargarDatos === 'function') {
                        cargarDatos();
                    }
                } else {
                    alert('Error al eliminar accionable: ' + (result.error || 'Error desconocido'));
                }
            } catch (error) {
                console.error('Error al eliminar accionable:', error);
                alert('Error al eliminar accionable');
            }
        },
        () => {
            // Cancelar - no hacer nada
        },
        'Eliminar'
    );
}

// Función para actualizar el texto de "Última Actualización" en el modal
function actualizarTextoUltimaActualizacion(id_proyecto, updatedAt) {
    const elemento = document.getElementById('ultimaActualizacion_' + id_proyecto);
    if (!elemento) return;
    
    try {
        // Manejar diferentes formatos de fecha:
        // 1. Formato ISO con Z (UTC): 2025-12-10T17:56:16.692Z
        // 2. Formato de BD: 2025-12-10 14:56:16.692379
        // 3. Formato de BD simple: 2025-12-10 14:56:16
        
        let fechaFormateada = '';
        
        // Si viene en formato ISO (con T y Z), convertir de UTC a hora local (Argentina UTC-3)
        if (updatedAt.includes('T') && updatedAt.includes('Z')) {
            // Formato ISO: 2025-12-10T17:56:16.692Z
            // Convertir a hora local (restar 3 horas para Argentina)
            const fecha = new Date(updatedAt);
            // Obtener componentes en hora local
            const año = fecha.getFullYear();
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const dia = String(fecha.getDate()).padStart(2, '0');
            const horas = String(fecha.getHours()).padStart(2, '0');
            const minutos = String(fecha.getMinutes()).padStart(2, '0');
            const segundos = String(fecha.getSeconds()).padStart(2, '0');
            fechaFormateada = `${año}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
        } else {
            // Formato de BD: 2025-12-10 14:56:16.692379 o 2025-12-10 14:56:16
            const match = updatedAt.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
            if (match) {
                fechaFormateada = match[1] + ' ' + match[2];
            } else {
                fechaFormateada = updatedAt;
            }
        }
        
        elemento.textContent = 'Última Actualización: ' + fechaFormateada;
    } catch (e) {
        console.error('Error al formatear fecha:', e);
        elemento.textContent = 'Última Actualización: ' + updatedAt;
    }
}
