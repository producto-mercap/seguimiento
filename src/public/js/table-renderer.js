/**
 * Funciones de renderizado de tablas
 * Seguimiento de Proyectos
 */

// Función para abreviar nombres de categorías
function abreviarCategoria(categoria) {
    if (!categoria) return '-';
    
    const categoriaLower = categoria.toLowerCase().trim();
    
    // Mapeo de categorías a abreviaciones
    const abreviaciones = {
        'proyectos externos': 'P. Externos',
        'proyectos internos': 'P. Internos',
        'proyectos de bolsa': 'P. de bolsa',
        'proyecto externo': 'P. Externos',
        'proyecto interno': 'P. Internos',
        'proyecto de bolsa': 'P. de bolsa'
    };
    
    // Buscar coincidencia exacta (case-insensitive)
    if (abreviaciones[categoriaLower]) {
        return abreviaciones[categoriaLower];
    }
    
    // Si no hay coincidencia, devolver el original
    return categoria;
}

// Función para formatear fecha a YYYY-MM-DD
function formatearFecha(fecha) {
    if (!fecha) return '';
    if (fecha instanceof Date) {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }
    if (typeof fecha === 'string') {
        const match = fecha.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
            return match[1];
        }
        return fecha;
    }
    return '';
}

// Función para formatear fecha en formato completo (dd/mm/aaaa)
function formatearFechaCorta(fecha) {
    if (!fecha) return '';
    try {
        let fechaStr = fecha;
        if (typeof fecha === 'object' && fecha instanceof Date) {
            const day = String(fecha.getDate()).padStart(2, '0');
            const month = String(fecha.getMonth() + 1).padStart(2, '0');
            const year = fecha.getFullYear();
            return day + '/' + month + '/' + year;
        }
        if (typeof fecha === 'string') {
            // Formato esperado: YYYY-MM-DD o YYYY-MM-DDTHH:MM:SS
            const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                return match[3] + '/' + match[2] + '/' + match[1];
            }
        }
        return '';
    } catch (e) {
        return '';
    }
}

function renderizarTabla(datos) {
    const contenido = document.getElementById('contenido');
    
    if (tipoActual === 'mantenimiento') {
        renderizarTablaMantenimiento(datos, contenido);
    } else {
        // Todas las demás categorías usan la misma lógica de proyectos
        renderizarTablaProyectos(datos, contenido);
    }
}

function renderizarTablaMantenimiento(datos, contenido) {
    let tablaHTML = '<div class="modern-table-wrapper"><div class="modern-table mantenimiento"><div class="modern-table-header" style="position: relative;">';
    tablaHTML += '<div class="modern-table-cell header-cell">Cliente</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" style="text-align: center; justify-content: center;">Límite Horas</div>';
    tablaHTML += '<div class="modern-table-cell header-cell">Overall</div>';
    tablaHTML += '<div class="modern-table-cell header-cell">Demanda</div>';
    tablaHTML += '<div class="modern-table-cell header-cell">Estabilidad</div>';
    tablaHTML += '<div class="modern-table-cell header-cell">Satisfacción</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" style="flex: 1;">WIN</div>';
    tablaHTML += '<button onclick="sincronizar()" style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; border: 1px solid #dfe1e5; background: white; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background=\'#f1f3f4\'" onmouseout="this.style.background=\'white\'" title="Actualizar mantenimiento">';
    tablaHTML += '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="color: #5f6368;">';
    tablaHTML += '<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>';
    tablaHTML += '</svg></button>';
    tablaHTML += '</div>';
    
    datos.forEach(function(item) {
        // Truncar nombre_proyecto: solo la parte a la derecha de " | "
        let nombreProyectoTruncado = '';
        if (item.nombre_proyecto) {
            const partes = item.nombre_proyecto.split(' | ');
            if (partes.length > 1) {
                // Tomar solo la parte a la derecha de " | "
                nombreProyectoTruncado = partes.slice(1).join(' | ');
            } else {
                // Si no hay " | ", mostrar el nombre completo
                nombreProyectoTruncado = item.nombre_proyecto;
            }
        }
        
        tablaHTML += '<div class="modern-table-row">';
        tablaHTML += '<div class="modern-table-cell item-text" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">';
        tablaHTML += '<div style="line-height: 1.4;">' + (item.cliente || '-') + '</div>';
        if (nombreProyectoTruncado) {
            tablaHTML += '<div style="font-size: 11px; color: var(--text-secondary); line-height: 1.3;">' + nombreProyectoTruncado + '</div>';
        }
        tablaHTML += '</div>';
        tablaHTML += '<div class="modern-table-cell item-text" style="text-align: center; justify-content: center;">' + (item.limite_horas || '-') + '</div>';
        tablaHTML += '<div class="modern-table-cell">' + crearDropdownOverall(item.id_proyecto, 'estado', item.estado || '', '') + '</div>';
        tablaHTML += '<div class="modern-table-cell">' + crearDropdownIconos(item.id_proyecto, 'demanda', item.demanda || '', 'demanda', '') + '</div>';
        tablaHTML += '<div class="modern-table-cell">' + crearDropdownIconos(item.id_proyecto, 'estabilidad', item.estabilidad || '', 'estabilidad', '') + '</div>';
        tablaHTML += '<div class="modern-table-cell">' + crearDropdownCaras(item.id_proyecto, 'satisfaccion', item.satisfaccion || '', '') + '</div>';
        tablaHTML += '<div class="modern-table-cell"><textarea class="modern-input win-textarea" onchange="actualizarMantenimiento(' + item.id_proyecto + ', \'win\', this.value)">' + (item.win || '') + '</textarea></div>';
        tablaHTML += '</div>';
    });
    
    tablaHTML += '</div></div>';
    contenido.innerHTML = tablaHTML;
}

function renderizarTablaProyectos(datos, contenido) {
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
        } else if (ordenActual.columna === 'categoria') {
            valorA = (a.categoria || '').toLowerCase();
            valorB = (b.categoria || '').toLowerCase();
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
    
    let tablaHTML = '<div class="modern-table-wrapper"><div class="modern-table proyectos"><div class="modern-table-header">';
    const flechaAsc = '▲';
    const flechaDesc = '▼';
    
    tablaHTML += '<div class="modern-table-cell header-cell" style="width: 30px;"></div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'cliente\')" style="cursor: pointer; user-select: none;' + (ordenActual.columna === 'cliente' ? ' color: var(--primary-color);' : '') + '">Cliente' + (ordenActual.columna === 'cliente' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'proyecto\')" style="cursor: pointer; user-select: none;' + (ordenActual.columna === 'proyecto' ? ' color: var(--primary-color);' : '') + '">Proyecto' + (ordenActual.columna === 'proyecto' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'categoria\')" style="cursor: pointer; user-select: none;' + (ordenActual.columna === 'categoria' ? ' color: var(--primary-color);' : '') + '">Categoría' + (ordenActual.columna === 'categoria' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
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
        
        const tieneSecundarios = item.tiene_subproyectos || false;
        
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
        
        if (tieneSecundarios) {
            tablaHTML += '<div class="modern-table-cell" style="width: 30px; padding: 0; text-align: center;"><button class="expand-btn" onclick="toggleProyectosSecundarios(' + item.id_proyecto + ', this)" style="background: none; border: none; cursor: pointer; padding: 4px; color: var(--text-secondary); font-size: 12px; transition: transform 0.2s;" title="Expandir/Contraer proyectos secundarios">▶</button></div>';
        } else {
            tablaHTML += '<div class="modern-table-cell" style="width: 30px;"></div>';
        }
        
        tablaHTML += '<div class="modern-table-cell item-text">' + (item.cliente || '-') + '</div>';
        tablaHTML += '<div class="modern-table-cell item-text"><a href="javascript:void(0);" onclick="abrirModalDetalle(' + item.id_proyecto + '); event.stopPropagation();" data-item="' + itemDataJson + '" style="color: var(--primary-color); text-decoration: none; cursor: pointer;">' + nombreProyecto + '</a></div>';
        tablaHTML += '<div class="modern-table-cell item-text">' + abreviarCategoria(item.categoria) + '</div>';
        
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
        tablaHTML += '<div class="modern-table-cell"><div class="progress-bar-container" data-id="' + item.id_proyecto + '"><div class="progress-bar" style="width: ' + avanceValue + '%; background: ' + avanceGradient + ';"></div><input type="range" min="0" max="100" step="5" value="' + avanceValue + '" class="progress-slider" oninput="actualizarBarraProgreso(this);" onchange="actualizarProyecto(' + item.id_proyecto + ', \'avance\', this.value);" /></div></div>';
        
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

// Función para expandir/contraer proyectos secundarios (con carga lazy)
async function toggleProyectosSecundarios(id_proyecto, btn) {
    const filasSecundarias = document.querySelectorAll('.proyecto-secundario-' + id_proyecto);
    const isExpanded = filasSecundarias.length > 0 && filasSecundarias[0].style.display !== 'none';
    
    if (isExpanded) {
        filasSecundarias.forEach(function(fila) {
            fila.style.display = 'none';
        });
        btn.textContent = '▶';
        btn.style.transform = 'rotate(0deg)';
        return;
    }
    
    if (filasSecundarias.length === 0) {
        const textoOriginal = btn.textContent;
        btn.textContent = '⏳';
        btn.disabled = true;
        btn.style.cursor = 'wait';
        
        try {
            console.log('📦 Cargando subproyectos para proyecto:', id_proyecto);
            const inicio = performance.now();
            
            const response = await fetch('/api/proyectos/' + id_proyecto + '/subproyectos', {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            const tiempo = (performance.now() - inicio).toFixed(2);
            console.log(`✅ Subproyectos cargados en ${tiempo}ms`);
            
            if (result.success && result.data && result.data.length > 0) {
                const filaProyecto = btn.closest('.modern-table-row');
                if (filaProyecto) {
                    const fragment = document.createDocumentFragment();
                    result.data.forEach(function(subproyecto) {
                        const fila = crearFilaSubproyecto(id_proyecto, subproyecto, filaProyecto);
                        if (fila) {
                            fragment.appendChild(fila);
                        }
                    });
                    filaProyecto.parentNode.insertBefore(fragment, filaProyecto.nextSibling);
                }
            } else {
                console.log('ℹ️ No hay subproyectos para este proyecto');
                btn.textContent = textoOriginal;
                btn.disabled = false;
                btn.style.cursor = 'pointer';
                return;
            }
        } catch (error) {
            console.error('❌ Error al cargar subproyectos:', error);
            alert('Error al cargar subproyectos: ' + error.message);
            btn.textContent = textoOriginal;
            btn.disabled = false;
            btn.style.cursor = 'pointer';
            return;
        }
        
        btn.disabled = false;
        btn.style.cursor = 'pointer';
    }
    
    const filasSecundariasActualizadas = document.querySelectorAll('.proyecto-secundario-' + id_proyecto);
    filasSecundariasActualizadas.forEach(function(fila) {
        fila.style.display = '';
    });
    
    btn.textContent = '▼';
    btn.style.transform = 'rotate(0deg)';
}

// Función para crear una fila de subproyecto
function crearFilaSubproyecto(id_proyecto, subproyecto, filaProyectoPadre) {
    const filaSubproyecto = document.createElement('div');
    filaSubproyecto.className = 'modern-table-row proyecto-secundario-' + id_proyecto + ' subproyecto-row';
    filaSubproyecto.setAttribute('data-id-proyecto', id_proyecto);
    filaSubproyecto.setAttribute('data-id-subproyecto', subproyecto.id_subproyecto);
    filaSubproyecto.style.display = 'none';
    
    const celdas = [
        { class: 'modern-table-cell', style: 'width: 30px;', content: '' },
        { class: 'modern-table-cell item-text', content: '' },
        { class: 'modern-table-cell item-text', style: 'padding-left: 16px; font-style: italic; color: var(--text-secondary); font-size: 12px;', content: subproyecto.nombre || '-' },
        { class: 'modern-table-cell item-text', style: 'font-size: 12px; color: var(--text-secondary);', content: '-' }
    ];
    
    celdas.forEach(celda => {
        const div = document.createElement('div');
        div.className = celda.class;
        if (celda.style) div.setAttribute('style', celda.style);
        div.textContent = celda.content;
        filaSubproyecto.appendChild(div);
    });
    
    const estadoSubproyecto = subproyecto.estado || '';
    let estadoClassSub = '';
    if (estadoSubproyecto === 'Entregado' || estadoSubproyecto === 'Cerrado') {
        estadoClassSub = 'estado-entregado';
    } else if (estadoSubproyecto === 'sin comenzar') {
        estadoClassSub = 'estado-sin-comenzar';
    } else if (estadoSubproyecto === 'en curso') {
        estadoClassSub = 'estado-progreso';
    } else if (estadoSubproyecto === 'Testing') {
        estadoClassSub = 'estado-testing';
    } else if (estadoSubproyecto === 'Rework') {
        estadoClassSub = 'estado-rework';
    } else if (estadoSubproyecto === 'Bloqueado') {
        estadoClassSub = 'estado-bloqueado';
    }
    
    const celdaEstado = document.createElement('div');
    celdaEstado.className = 'modern-table-cell';
    celdaEstado.innerHTML = crearDropdownEstado(subproyecto.id_subproyecto, estadoSubproyecto, 'subproyecto ' + estadoClassSub);
    filaSubproyecto.appendChild(celdaEstado);
    
    const avanceSubproyecto = parseInt(subproyecto.avance) || 0;
    let avanceGradientSub = 'linear-gradient(90deg, #66bb6a 0%, #34a853 100%)';
    if (avanceSubproyecto <= 25) {
        avanceGradientSub = 'linear-gradient(90deg, #a5d6a7 0%, #81c784 100%)';
    } else if (avanceSubproyecto <= 50) {
        avanceGradientSub = 'linear-gradient(90deg, #81c784 0%, #66bb6a 100%)';
    } else if (avanceSubproyecto <= 75) {
        avanceGradientSub = 'linear-gradient(90deg, #66bb6a 0%, #4caf50 100%)';
    } else {
        avanceGradientSub = 'linear-gradient(90deg, #4caf50 0%, #34a853 50%, #1e8e3e 100%)';
    }
    const celdaAvance = document.createElement('div');
    celdaAvance.className = 'modern-table-cell';
    celdaAvance.innerHTML = '<div class="progress-bar-container" data-id="' + subproyecto.id_subproyecto + '"><div class="progress-bar" style="width: ' + avanceSubproyecto + '%; background: ' + avanceGradientSub + ';"></div><input type="range" min="0" max="100" step="5" value="' + avanceSubproyecto + '" class="progress-slider" oninput="actualizarBarraProgreso(this);" onchange="actualizarSubproyecto(' + subproyecto.id_subproyecto + ', \'avance\', this.value);" /></div>';
    filaSubproyecto.appendChild(celdaAvance);
    
    const celdaOverall = document.createElement('div');
    celdaOverall.className = 'modern-table-cell';
    celdaOverall.innerHTML = crearDropdownOverall(subproyecto.id_subproyecto, 'overall', subproyecto.overall || '', 'subproyecto');
    filaSubproyecto.appendChild(celdaOverall);
    
    const celdaAlcance = document.createElement('div');
    celdaAlcance.className = 'modern-table-cell';
    celdaAlcance.innerHTML = crearDropdownOverall(subproyecto.id_subproyecto, 'alcance', subproyecto.alcance || '', 'subproyecto');
    filaSubproyecto.appendChild(celdaAlcance);
    
    const celdaCosto = document.createElement('div');
    celdaCosto.className = 'modern-table-cell';
    celdaCosto.innerHTML = crearDropdownOverall(subproyecto.id_subproyecto, 'costo', subproyecto.costo || '', 'subproyecto');
    filaSubproyecto.appendChild(celdaCosto);
    
    const celdaPlazos = document.createElement('div');
    celdaPlazos.className = 'modern-table-cell';
    celdaPlazos.innerHTML = crearDropdownOverall(subproyecto.id_subproyecto, 'plazos', subproyecto.plazos || '', 'subproyecto');
    filaSubproyecto.appendChild(celdaPlazos);
    
    const celdaRiesgos = document.createElement('div');
    celdaRiesgos.className = 'modern-table-cell';
    celdaRiesgos.innerHTML = crearDropdownRiesgo(subproyecto.id_subproyecto, subproyecto.riesgos || '', 'subproyecto');
    filaSubproyecto.appendChild(celdaRiesgos);
    
    // Celdas de fecha vacías para subproyectos (mantener alineación del grid)
    const celdaFechaInicio = document.createElement('div');
    celdaFechaInicio.className = 'modern-table-cell';
    celdaFechaInicio.style.cssText = 'font-size: 11px; text-align: center; justify-content: center; color: var(--text-secondary);';
    celdaFechaInicio.textContent = '-';
    filaSubproyecto.appendChild(celdaFechaInicio);
    
    const celdaFechaFin = document.createElement('div');
    celdaFechaFin.className = 'modern-table-cell';
    celdaFechaFin.style.cssText = 'font-size: 11px; text-align: center; justify-content: center; color: var(--text-secondary);';
    celdaFechaFin.textContent = '-';
    filaSubproyecto.appendChild(celdaFechaFin);
    
    return filaSubproyecto;
}

// Función para ajustar el scroll horizontal: ocultar barra cuando no es necesaria
function ajustarScrollHorizontal() {
    const wrappers = document.querySelectorAll('.modern-table-wrapper');
    wrappers.forEach(wrapper => {
        const table = wrapper.querySelector('.modern-table');
        if (table) {
            // Verificar si el contenido es más ancho que el contenedor
            const wrapperWidth = wrapper.clientWidth;
            const tableWidth = table.scrollWidth;
            
            // Si el contenido cabe en el contenedor, ocultar scroll
            if (tableWidth <= wrapperWidth) {
                wrapper.style.overflowX = 'hidden';
            } else {
                wrapper.style.overflowX = 'auto';
            }
        }
    });
}

// Ajustar scroll cuando se redimensiona la ventana
if (typeof window !== 'undefined') {
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            ajustarScrollHorizontal();
        }, 250);
    });
}


