/**
 * Renderizador de Gantt Chart
 * Compartido entre el modal de detalles y la vista de equipo
 */

// Estado global del Gantt
let ganttExpanded = {};
let ganttZoom = 'months'; // 'weeks', 'months', 'quarters'
let ganttDataCache = {}; // Cache para re-renderizar al cambiar zoom
let ganttTooltipElement = null; // Elemento del tooltip
let ganttEpicsCache = {}; // Cache de epics cargados por proyecto (solo hojas del árbol: sin subproyectos)

// Orden visual (drag&drop) en Gantt de equipo
const TEAM_GANTT_ORDER_KEY = 'teamGanttOrder.v1';

function _teamGanttLoadOrder() {
    try {
        const raw = localStorage.getItem(TEAM_GANTT_ORDER_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function _teamGanttSaveOrder(obj) {
    try {
        localStorage.setItem(TEAM_GANTT_ORDER_KEY, JSON.stringify(obj || {}));
    } catch (e) { /* noop */ }
}

function _teamGanttApplySavedOrder(parentKey, arr, getKey) {
    const order = _teamGanttLoadOrder();
    const saved = Array.isArray(order[parentKey]) ? order[parentKey] : null;
    if (!saved || !arr || arr.length < 2) return arr || [];
    const idx = new Map();
    saved.forEach(function (k, i) { idx.set(String(k), i); });
    return (arr || []).slice().sort(function (a, b) {
        const ka = String(getKey(a));
        const kb = String(getKey(b));
        const ia = idx.has(ka) ? idx.get(ka) : 999999;
        const ib = idx.has(kb) ? idx.get(kb) : 999999;
        if (ia !== ib) return ia - ib;
        return 0;
    });
}

// Constantes
const GANTT_CONFIG = {
    rowHeight: 40,
    headerHeight: 50,
    sidebarWidth: 320
};

/**
 * Renderiza el Gantt Chart para un proyecto individual (usado en modal)
 */
function renderizarGanttChart(idProyecto, esProyectoPadre, items, proyectoData) {
    const container = document.getElementById('ganttPanel_' + idProyecto);
    if (!container) return;

    // Si hay items (subproyectos/epics), asegurar que la fecha del padre cubra todo el rango
    if (proyectoData && items && items.length > 0) {
        // Filtrar y ordenar fechas de inicio y fin válidas
        const datesStart = items.map(i => i.fechaInicio).filter(d => d).sort();
        const datesEnd = items.map(i => i.fechaFin).filter(d => d).sort();

        // Actualizar Fecha Inicio si corresponde (la menor de todas)
        if (datesStart.length > 0) {
            const minItemDate = datesStart[0];
            const currentStart = proyectoData.fecha_inicio_epics || proyectoData.fecha_inicio;
            // Si no tiene fecha, o la del item es ANTERIOR a la actual -> actualizar
            if (!currentStart || minItemDate < currentStart) {
                proyectoData.fecha_inicio = minItemDate;
                proyectoData.fecha_inicio_epics = minItemDate;
            }
        }

        // Actualizar Fecha Fin si corresponde (la mayor de todas)
        if (datesEnd.length > 0) {
            const maxItemDate = datesEnd[datesEnd.length - 1]; // La última (mayor)
            const currentEnd = proyectoData.fecha_fin_epics || proyectoData.fecha_fin;
            // Si no tiene fecha, o la del item es POSTERIOR a la actual -> actualizar
            // La comparación lexica de strings ISO "YYYY-MM-DD" es segura
            if (!currentEnd || maxItemDate > currentEnd) {
                proyectoData.fecha_fin = maxItemDate;
                proyectoData.fecha_fin_epics = maxItemDate;
            }
        }
    }

    // Guardar datos en cache
    ganttDataCache[idProyecto] = {
        type: 'project',
        esProyectoPadre: esProyectoPadre,
        items: items,
        proyectoData: proyectoData
    };

    // Preparar datos
    const ganttItems = prepararDatosGantt(esProyectoPadre, items, proyectoData);

    // Validar si hay datos para mostrar
    if (!ganttItems || ganttItems.length === 0 || !ganttItems.some(item => item.fechaInicio && item.fechaFin)) {
        container.innerHTML = renderizarGanttVacio();
        return;
    }

    // Calcular rango de fechas
    const { minDate, maxDate } = calcularRangoFechas(ganttItems, ganttZoom, proyectoData);
    if (!minDate || !maxDate) {
        container.innerHTML = renderizarGanttVacio();
        return;
    }

    // Renderizar
    const html = generarHTMLGantt(idProyecto, minDate, maxDate, ganttItems, proyectoData, false);
    container.innerHTML = html;

    // Inicializar comportamientos
    inicializarComportamientoGantt(idProyecto, minDate, maxDate);
}

function refreshTeamGanttRowVisibility(container) {
    if (!container) return;
    container.querySelectorAll('[data-gantt-ancestors]').forEach(function (row) {
        const a = row.getAttribute('data-gantt-ancestors');
        const ok = !a || a.split(',').every(function (id) {
            return ganttExpanded[String(id.trim())] === true;
        });
        row.style.display = ok ? 'flex' : 'none';
    });
}

function ajustarAnchoSidebarGanttEquipo(container) {
    if (!container) return;
    const sidebar = container.querySelector('.gantt-sidebar');
    if (!sidebar) return;

    const rows = sidebar.querySelectorAll('.gantt-sidebar-row');
    if (!rows || rows.length === 0) return;

    // Medir también filas colapsadas: forzarlas a display:flex temporalmente
    // y garantizar que el texto no esté truncado durante la medición.
    const prev = [];
    const prevText = [];
    rows.forEach(function (r) {
        prev.push(r.style.display);
        r.style.display = 'flex';
        const name = r.querySelector('.gantt-row-name');
        if (name) {
            prevText.push({ el: name, overflow: name.style.overflow, whiteSpace: name.style.whiteSpace });
            name.style.overflow = 'visible';
            name.style.whiteSpace = 'nowrap';
        }
    });

    let maxW = 0;
    rows.forEach(function (r) {
        const w = r.scrollWidth || 0;
        if (w > maxW) maxW = w;
    });

    // Restaurar display previo y reaplicar visibilidad por ancestros
    rows.forEach(function (r, i) {
        r.style.display = prev[i];
    });
    prevText.forEach(function (x) {
        x.el.style.overflow = x.overflow;
        x.el.style.whiteSpace = x.whiteSpace;
    });

    // Evitar valores absurdos
    const minW = 320;
    const maxSafe = 900;
    const finalW = Math.max(minW, Math.min(maxW, maxSafe));

    container.style.setProperty('--gantt-sidebar-width', finalW + 'px');
}

function toggleGanttNodeExpand(nodeId) {
    const k = String(nodeId);
    ganttExpanded[k] = !(ganttExpanded[k] === true);
    const container = document.getElementById('team-gantt-container');
    if (!container) return;
    refreshTeamGanttRowVisibility(container);
    ajustarAnchoSidebarGanttEquipo(container);
    const btn = container.querySelector('.gantt-node-toggle[data-node-id="' + k + '"]');
    if (btn) {
        if (ganttExpanded[k]) btn.classList.remove('collapsed');
        else btn.classList.add('collapsed');
    }
}

function renderTeamSubtreeSidebarHTML(sp, ancestorIds, depth) {
    let html = '';
    const chain = ancestorIds.length ? ancestorIds.join(',') : '';
    const ancAttr = chain ? ' data-gantt-ancestors="' + chain + '"' : '';
    const padLeft = 24 + depth * 14;
    const parentKey = 'SP:' + String(sp.id_proyecto);
    const subs = _teamGanttApplySavedOrder(parentKey, (sp.subproyectos || []), function (x) { return 'SP:' + String(x.id_proyecto); });
    const epicsHijo = _teamGanttApplySavedOrder(parentKey, (ganttEpicsCache[sp.id_proyecto] || []), function (e) { return 'E:' + String(e.epic_id); });
    const tieneMas = subs.length > 0 || epicsHijo.length > 0;
    const spNom = truncarNombreGantt(sp.nombre_proyecto);
    const spTit = (sp.nombre_proyecto || '').replace(/"/g, '&quot;');

    html += '<div class="gantt-sidebar-row is-child gantt-draggable-row" draggable="true" data-gantt-row-id="SP:' + sp.id_proyecto + '" data-gantt-parent-key="' + parentKey + '"' + ancAttr + ' style="padding-left: ' + padLeft + 'px;">';
    if (tieneMas) {
        const exp = ganttExpanded[String(sp.id_proyecto)] === true;
        html += '<button type="button" class="gantt-toggle-btn gantt-node-toggle' + (exp ? '' : ' collapsed') + '" data-node-id="' + sp.id_proyecto + '" onclick="event.stopPropagation(); toggleGanttNodeExpand(\'' + sp.id_proyecto + '\')">';
        html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg></button>';
    } else {
        html += '<span style="display:inline-block;width:28px;flex-shrink:0;"></span>';
    }
    html += '<span class="gantt-row-name" title="' + spTit + '">' + (spNom || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
    html += '</div>';

    const nextAnc = ancestorIds.concat(String(sp.id_proyecto));
    subs.forEach(function (ch) {
        html += renderTeamSubtreeSidebarHTML(ch, nextAnc, depth + 1);
    });

    const epicAncCsv = nextAnc.join(',');
    epicsHijo.forEach(function (epic) {
        const fi = epic.start_date || epic.cf_21;
        const ff = epic.due_date || epic.cf_22;
        if (!fi || !ff) return;
        const epicNom = truncarNombreGantt(epic.subject || 'Epic #' + epic.epic_id);
        const epicTit = ((epic.subject || 'Epic #' + epic.epic_id) || '').replace(/"/g, '&quot;');
        html += '<div class="gantt-sidebar-row is-child gantt-epic-ganttrow gantt-draggable-row" draggable="true" data-gantt-row-id="E:' + epic.epic_id + '" data-gantt-parent-key="' + parentKey + '" data-gantt-ancestors="' + epicAncCsv + '" style="padding-left: ' + (padLeft + 14) + 'px;">';
        html += '<span style="display:inline-block;width:28px;flex-shrink:0;"></span>';
        html += '<span class="gantt-row-name" title="' + epicTit + '">' + (epicNom || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>';
    });

    return html;
}

function renderTeamSubtreeTimelineHTML(sp, ancestorIds, depth, timelineCols, baseCellWidth) {
    let html = '';
    const chain = ancestorIds.length ? ancestorIds.join(',') : '';
    const ancAttr = chain ? ' data-gantt-ancestors="' + chain + '"' : '';
    const parentKey = 'SP:' + String(sp.id_proyecto);
    const subs = _teamGanttApplySavedOrder(parentKey, (sp.subproyectos || []), function (x) { return 'SP:' + String(x.id_proyecto); });
    const epicsHijo = _teamGanttApplySavedOrder(parentKey, (ganttEpicsCache[sp.id_proyecto] || []), function (e) { return 'E:' + String(e.epic_id); });

    const fiSp = sp.fecha_inicio_epics || sp.fecha_inicio;
    const ffSp = sp.fecha_fin_epics || sp.fecha_fin;
    html += '<div class="gantt-timeline-row is-child" data-gantt-row-id="SP:' + sp.id_proyecto + '" data-gantt-parent-key="' + parentKey + '"' + ancAttr + '>';
    html += renderizarFondoRow(timelineCols, baseCellWidth, ganttZoom);
    if (fiSp && ffSp) {
        const barraSp = calcularBarraGantt(fiSp, ffSp, timelineCols, ganttZoom, baseCellWidth);
        if (barraSp) {
            const estadoSubproyecto = sp.estado || '-';
            const estadoFormateado = formatearEstado(estadoSubproyecto);
            const nombreEsc = (sp.nombre_proyecto || '').replace(/'/g, "\\'");
            html += '<div class="gantt-bar bar-child" style="left: ' + barraSp.left + 'px; width: ' + barraSp.width + 'px;"' +
                ' onmouseenter="mostrarTooltipGantt(event, \'' + nombreEsc + '\', \'' + formatearFechaGantt(fiSp) + '\', \'' + formatearFechaGantt(ffSp) + '\', \'' + estadoFormateado.replace(/'/g, "\\'") + '\')"' +
                ' onmouseleave="ocultarTooltipGantt()">';
            html += '<span class="gantt-bar-label">' + (sp.nombre_proyecto || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>';
        }
    }
    html += '</div>';

    const nextAnc = ancestorIds.concat(String(sp.id_proyecto));
    subs.forEach(function (ch) {
        html += renderTeamSubtreeTimelineHTML(ch, nextAnc, depth + 1, timelineCols, baseCellWidth);
    });

    const epicAncCsv = nextAnc.join(',');
    epicsHijo.forEach(function (epic) {
        const epicFechaInicio = epic.start_date || epic.cf_21 || null;
        const epicFechaFin = epic.due_date || epic.cf_22 || null;
        if (!epicFechaInicio || !epicFechaFin) return;
        html += '<div class="gantt-timeline-row is-child gantt-epic-ganttrow" data-gantt-row-id="E:' + epic.epic_id + '" data-gantt-parent-key="' + parentKey + '" data-gantt-ancestors="' + epicAncCsv + '">';
        html += renderizarFondoRow(timelineCols, baseCellWidth, ganttZoom);
        const barraEpic = calcularBarraGantt(epicFechaInicio, epicFechaFin, timelineCols, ganttZoom, baseCellWidth);
        if (barraEpic) {
            const epicNombre = epic.subject || 'Epic #' + epic.epic_id;
            const epicNombreEsc = (epicNombre || '').replace(/'/g, "\\'");
            html += '<div class="gantt-bar bar-child gantt-bar-epic" style="left: ' + barraEpic.left + 'px; width: ' + barraEpic.width + 'px;"' +
                ' onmouseenter="mostrarTooltipGantt(event, \'' + epicNombreEsc + '\', \'' + formatearFechaGantt(epicFechaInicio) + '\', \'' + formatearFechaGantt(epicFechaFin) + '\', \'-\')"' +
                ' onmouseleave="ocultarTooltipGantt()">';
            html += '<span class="gantt-bar-label">' + (epicNombre || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>';
        }
        html += '</div>';
    });

    return html;
}

/**
 * Renderiza el Gantt Chart a nivel de equipo (lista de proyectos)
 */
async function renderizarGanttEquipo(proyectos) {
    const container = document.getElementById('team-gantt-container');
    if (!container) return;

    const idGantt = 'team_gantt';
    ganttEpicsCache = {};

    // Filtrar proyectos válidos (que tengan fechas)
    let proyectosValidos = proyectos.filter(p => {
        return (p.fecha_inicio || p.fecha_inicio_epics) && (p.fecha_fin || p.fecha_fin_epics);
    });

    // Ordenar con el mismo criterio que la tabla (por equipo por defecto en vista todos los equipos)
    if (typeof ordenActual !== 'undefined' && ordenActual && proyectosValidos.length > 1) {
        proyectosValidos = [...proyectosValidos];
        proyectosValidos.sort((a, b) => {
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
            } else if (ordenActual.columna === 'equipo') {
                valorA = (typeof obtenerNombreEquipoSolo === 'function' && a.equipo) ? (obtenerNombreEquipoSolo(a.equipo) || '').toLowerCase() : String(a.equipo || '').toLowerCase();
                valorB = (typeof obtenerNombreEquipoSolo === 'function' && b.equipo) ? (obtenerNombreEquipoSolo(b.equipo) || '').toLowerCase() : String(b.equipo || '').toLowerCase();
            } else if (ordenActual.columna === 'estado' && typeof ordenEstados !== 'undefined') {
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
                valorA = (typeof obtenerNombreEquipoSolo === 'function' && a.equipo) ? (obtenerNombreEquipoSolo(a.equipo) || '').toLowerCase() : String(a.equipo || '').toLowerCase();
                valorB = (typeof obtenerNombreEquipoSolo === 'function' && b.equipo) ? (obtenerNombreEquipoSolo(b.equipo) || '').toLowerCase() : String(b.equipo || '').toLowerCase();
            }
            if (valorA < valorB) return ordenActual.direccion === 'asc' ? -1 : 1;
            if (valorA > valorB) return ordenActual.direccion === 'asc' ? 1 : -1;
            return 0;
        });
    }

    if (proyectosValidos.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    // Guardar datos cache
    ganttDataCache[idGantt] = {
        type: 'team',
        proyectos: proyectosValidos
    };

    function flattenSubproyectosParaFechas(nodes) {
        let out = [];
        (nodes || []).forEach(function (sp) {
            out.push({
                id: sp.id_proyecto,
                nombre: sp.nombre_proyecto,
                fechaInicio: sp.fecha_inicio_epics || sp.fecha_inicio,
                fechaFin: sp.fecha_fin_epics || sp.fecha_fin,
                estado: sp.estado || ''
            });
            out = out.concat(flattenSubproyectosParaFechas(sp.subproyectos));
        });
        return out;
    }

    function collectLeafProjectIds(proyecto) {
        const ids = [];
        function walk(node) {
            const subs = node.subproyectos || [];
            if (!subs.length) {
                if (node.id_proyecto != null) ids.push(node.id_proyecto);
            } else {
                subs.forEach(walk);
            }
        }
        walk(proyecto);
        return ids;
    }

    // Epics: solo en proyectos/subproyectos hoja (sin hijos en el árbol)
    const idsHojaParaEpics = [];
    proyectosValidos.forEach(function (p) {
        collectLeafProjectIds(p).forEach(function (id) {
            if (!idsHojaParaEpics.includes(id)) idsHojaParaEpics.push(id);
        });
    });
    if (idsHojaParaEpics.length > 0) {
        const epicsPromises = idsHojaParaEpics.map(async function (idProy) {
            try {
                const epicsResponse = await fetch('/api/epics/' + idProy + '?es_proyecto_padre=false');
                const epicsData = await epicsResponse.json();
                if (epicsData.success && epicsData.data) {
                    const epicsConFechas = epicsData.data.filter(function (epic) {
                        const fechaInicio = epic.start_date || epic.cf_21;
                        const fechaFin = epic.due_date || epic.cf_22;
                        return fechaInicio && fechaFin;
                    });
                    if (epicsConFechas.length > 0) {
                        ganttEpicsCache[idProy] = epicsConFechas;
                    }
                }
            } catch (error) {
                console.error('Error al precargar epics del proyecto ' + idProy + ':', error);
            }
        });
        await Promise.all(epicsPromises);
    }

    // Items para rango de fechas: raíz + todo el árbol de subproyectos aplanado
    let allGanttItems = [];
    let itemsPorProyecto = {};

    proyectosValidos.forEach(function (p) {
        const proyectoItem = {
            id: p.id_proyecto,
            nombre: p.nombre_proyecto || 'Sin nombre',
            fechaInicio: p.fecha_inicio_epics || p.fecha_inicio,
            fechaFin: p.fecha_fin_epics || p.fecha_fin,
            estado: p.estado || '',
            isParent: true,
            hasChildren: (p.subproyectos && p.subproyectos.length > 0)
        };
        allGanttItems.push(proyectoItem);

        if (p.subproyectos && p.subproyectos.length > 0) {
            const subItems = flattenSubproyectosParaFechas(p.subproyectos).filter(function (i) {
                return i.fechaInicio && i.fechaFin;
            });
            itemsPorProyecto[p.id_proyecto] = subItems;
            allGanttItems = allGanttItems.concat(subItems);
        }
    });

    // Calcular rango global
    const { minDate, maxDate } = calcularRangoFechas(allGanttItems, ganttZoom);
    if (!minDate || !maxDate) {
        return;
    }

    // Guardar fechas en cache para uso posterior
    ganttDataCache[idGantt].minDate = minDate;
    ganttDataCache[idGantt].maxDate = maxDate;

    // Generar estructura HTML personalizada para multiples proyectos
    let html = '';

    // Header y Controles
    html += '<div class="gantt-header">';
    html += '<div class="gantt-title" style="display: flex; align-items: center; gap: 8px;">';
    html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="transform: rotate(90deg);"><path d="M3 22V8h4v14H3zm7 0V2h4v20h-4zm7 0v-8h4v8h-4z"/></svg>';
    html += '<span>Planificacion de Equipo</span>';
    html += '<div class="win-info-icon" style="position: relative; display: inline-flex; align-items: center; cursor: help; z-index: 99999;" onmouseenter="const icon = this; const tooltip = icon.querySelector(\'.win-tooltip\'); if (tooltip) { const rect = icon.getBoundingClientRect(); tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + \'px\'; tooltip.style.left = rect.left + (rect.width / 2) + \'px\'; tooltip.style.transform = \'translateX(-50%)\'; }">';
    html += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color: #5f6368; opacity: 0.7;" onmouseover="this.style.opacity=\'1\'" onmouseout="this.style.opacity=\'0.7\'">';
    html += '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>';
    html += '</svg>';
    html += '<div class="win-tooltip">Desplegá cada proyecto y subproyecto para ver su cronograma y, en la última capa, los epics con fechas.</div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="gantt-controls">';
    html += '<button class="gantt-zoom-btn' + (ganttZoom === 'weeks' ? ' active' : '') + '" onclick="setGanttZoom(\'' + idGantt + '\', \'weeks\')">Semanal</button>';
    html += '<button class="gantt-zoom-btn' + (ganttZoom === 'months' ? ' active' : '') + '" onclick="setGanttZoom(\'' + idGantt + '\', \'months\')">Mensual</button>';
    html += '<button class="gantt-zoom-btn' + (ganttZoom === 'quarters' ? ' active' : '') + '" onclick="setGanttZoom(\'' + idGantt + '\', \'quarters\')">Trimestral</button>';
    html += '</div>';
    html += '</div>';

    // Body
    html += '<div class="gantt-body">';

    // Sidebar
    html += '<div class="gantt-sidebar">';
    html += '<div class="gantt-sidebar-header">PROYECTO</div>';

    // Renderizar Rows en Sidebar
    proyectosValidos.forEach(function (p) {
        const rootKey = 'P:' + String(p.id_proyecto);
        const tieneHijosOEpicsRaiz = (p.subproyectos && p.subproyectos.length > 0) ||
            (ganttEpicsCache[p.id_proyecto] && ganttEpicsCache[p.id_proyecto].length > 0);

        html += '<div class="gantt-sidebar-row is-parent" style="cursor: pointer;" onclick="var b=this.querySelector(\'.gantt-toggle-btn:not(.gantt-node-toggle)\'); if(b) b.click();">';

        if (tieneHijosOEpicsRaiz) {
            html += '<button type="button" class="gantt-toggle-btn' + (ganttExpanded[p.id_proyecto] === true ? '' : ' collapsed') + '" onclick="event.stopPropagation(); toggleGanttExpand(\'' + p.id_proyecto + '\', true)">';
            html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg></button>';
        } else {
            html += '<span style="display:inline-block;width:28px;flex-shrink:0;"></span>';
        }

        const nombreTruncado = truncarNombreGantt(p.nombre_proyecto);
        const nombreEquipo = (typeof obtenerNombreEquipoSolo === 'function' && p.equipo) ? obtenerNombreEquipoSolo(p.equipo) : '';
        const labelTexto = nombreEquipo ? (nombreEquipo + ' · ' + (p.nombre_proyecto || '')) : (p.nombre_proyecto || '');
        const labelMostrado = nombreEquipo ? (nombreEquipo + ' · ' + nombreTruncado) : nombreTruncado;
        html += '<span class="gantt-row-name" title="' + (labelTexto || '').replace(/"/g, '&quot;') + '">' + (labelMostrado || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
        html += '</div>';

        if (p.subproyectos && p.subproyectos.length > 0) {
            _teamGanttApplySavedOrder(rootKey, (p.subproyectos || []), function (x) { return 'SP:' + String(x.id_proyecto); }).forEach(function (sp) {
                html += renderTeamSubtreeSidebarHTML(sp, [String(p.id_proyecto)], 0);
            });
        } else if (ganttEpicsCache[p.id_proyecto] && ganttEpicsCache[p.id_proyecto].length > 0) {
            const ancRoot = String(p.id_proyecto);
            _teamGanttApplySavedOrder(rootKey, ganttEpicsCache[p.id_proyecto], function (e) { return 'E:' + String(e.epic_id); }).forEach(function (epic) {
                const fi = epic.start_date || epic.cf_21;
                const ff = epic.due_date || epic.cf_22;
                if (!fi || !ff) return;
                const epicNom = truncarNombreGantt(epic.subject || 'Epic #' + epic.epic_id);
                const epicTit = ((epic.subject || 'Epic #' + epic.epic_id) || '').replace(/"/g, '&quot;');
                html += '<div class="gantt-sidebar-row is-child gantt-epic-ganttrow gantt-draggable-row" draggable="true" data-gantt-row-id="E:' + epic.epic_id + '" data-gantt-parent-key="' + rootKey + '" data-gantt-ancestors="' + ancRoot + '" style="padding-left: 38px;">';
                html += '<span style="display:inline-block;width:28px;flex-shrink:0;"></span>';
                html += '<span class="gantt-row-name" title="' + epicTit + '">' + (epicNom || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>';
            });
        }
    });
    html += '</div>'; // End sidebar

    // Timeline
    html += '<div class="gantt-timeline" id="ganttTimeline_' + idGantt + '">';

    // Generar columnas
    const timelineCols = generarColumnasTimeline(minDate, maxDate, ganttZoom);
    const params = calcularDimensionesTimeline(timelineCols, ganttZoom);
    const { totalWidth, baseCellWidth } = params;

    // Header Timeline
    html += renderizarTimelineHeader(timelineCols, totalWidth, baseCellWidth, ganttZoom);

    // Rows Timeline
    html += '<div class="gantt-timeline-rows" style="width: ' + totalWidth + 'px;">';

    proyectosValidos.forEach(function (p) {
        const rootKey = 'P:' + String(p.id_proyecto);
        let fechaInicioProyecto = p.fecha_inicio_epics || p.fecha_inicio;
        let fechaFinProyecto = p.fecha_fin_epics || p.fecha_fin;

        if (itemsPorProyecto[p.id_proyecto] && itemsPorProyecto[p.id_proyecto].length > 0) {
            const fechasFinSubproyectos = itemsPorProyecto[p.id_proyecto]
                .map(function (sp) { return sp.fechaFin; })
                .filter(function (f) { return f && String(f).trim() !== ''; })
                .map(function (f) {
                    const match = String(f).match(/^(\d{4})-(\d{2})-(\d{2})/);
                    return match ? match[0] : f;
                })
                .sort()
                .reverse();

            if (fechasFinSubproyectos.length > 0) {
                fechaFinProyecto = fechasFinSubproyectos[0];
            }

            const fechasInicioSubproyectos = itemsPorProyecto[p.id_proyecto]
                .map(function (sp) { return sp.fechaInicio; })
                .filter(function (f) { return f && String(f).trim() !== ''; })
                .map(function (f) {
                    const match = String(f).match(/^(\d{4})-(\d{2})-(\d{2})/);
                    return match ? match[0] : f;
                })
                .sort();

            if (fechasInicioSubproyectos.length > 0) {
                const fechaInicioMinima = fechasInicioSubproyectos[0];
                if (!fechaInicioProyecto || fechaInicioMinima < fechaInicioProyecto) {
                    fechaInicioProyecto = fechaInicioMinima;
                }
            }
        }

        html += '<div class="gantt-timeline-row is-parent">';
        html += renderizarFondoRow(timelineCols, baseCellWidth, ganttZoom);

        const barra = calcularBarraGantt(fechaInicioProyecto, fechaFinProyecto, timelineCols, ganttZoom, baseCellWidth);
        if (barra) {
            const estadoProyecto = p.estado || '-';
            const estadoFormateado = formatearEstado(estadoProyecto);
            html += '<div class="gantt-bar bar-parent" style="left: ' + barra.left + 'px; width: ' + barra.width + 'px;"' +
                ' onmouseenter="mostrarTooltipGantt(event, \'' + (p.nombre_proyecto || '').replace(/'/g, "\\'") + '\', \'' + formatearFechaGantt(fechaInicioProyecto) + '\', \'' + formatearFechaGantt(fechaFinProyecto) + '\', \'' + estadoFormateado.replace(/'/g, "\\'") + '\')"' +
                ' onmouseleave="ocultarTooltipGantt()"' +
                ' onclick="event.stopPropagation(); toggleGanttExpand(\'' + p.id_proyecto + '\', true)">';
            html += '<span class="gantt-bar-label">' + (p.nombre_proyecto || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>';
        }
        html += '</div>';

        if (p.subproyectos && p.subproyectos.length > 0) {
            _teamGanttApplySavedOrder(rootKey, (p.subproyectos || []), function (x) { return 'SP:' + String(x.id_proyecto); }).forEach(function (sp) {
                html += renderTeamSubtreeTimelineHTML(sp, [String(p.id_proyecto)], 0, timelineCols, baseCellWidth);
            });
        } else if (ganttEpicsCache[p.id_proyecto] && ganttEpicsCache[p.id_proyecto].length > 0) {
            const ancRoot = String(p.id_proyecto);
            _teamGanttApplySavedOrder(rootKey, ganttEpicsCache[p.id_proyecto], function (e) { return 'E:' + String(e.epic_id); }).forEach(function (epic) {
                const epicFechaInicio = epic.start_date || epic.cf_21 || null;
                const epicFechaFin = epic.due_date || epic.cf_22 || null;
                if (!epicFechaInicio || !epicFechaFin) return;
                const epicNombre = epic.subject || 'Epic #' + epic.epic_id;
                const epicNombreEsc = (epicNombre || '').replace(/'/g, "\\'");
                html += '<div class="gantt-timeline-row is-child gantt-epic-ganttrow" data-gantt-row-id="E:' + epic.epic_id + '" data-gantt-parent-key="' + rootKey + '" data-gantt-ancestors="' + ancRoot + '">';
                html += renderizarFondoRow(timelineCols, baseCellWidth, ganttZoom);
                const barraEpic = calcularBarraGantt(epicFechaInicio, epicFechaFin, timelineCols, ganttZoom, baseCellWidth);
                if (barraEpic) {
                    html += '<div class="gantt-bar bar-child gantt-bar-epic" style="left: ' + barraEpic.left + 'px; width: ' + barraEpic.width + 'px;"' +
                        ' onmouseenter="mostrarTooltipGantt(event, \'' + epicNombreEsc + '\', \'' + formatearFechaGantt(epicFechaInicio) + '\', \'' + formatearFechaGantt(epicFechaFin) + '\', \'-\')"' +
                        ' onmouseleave="ocultarTooltipGantt()">';
                    html += '<span class="gantt-bar-label">' + (epicNombre || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>';
                }
                html += '</div>';
            });
        }
    });

    html += '</div>'; // End rows
    html += '</div>'; // End timeline
    html += '</div>'; // End gantt-body

    container.innerHTML = html;

    // Inicializar scroll
    inicializarComportamientoGantt(idGantt, minDate, maxDate);

    refreshTeamGanttRowVisibility(container);
    ajustarAnchoSidebarGanttEquipo(container);
    inicializarDragDropGanttEquipo(container);
}


// ==========================================
// FUNCIONES AUXILIARES Y COMPARTIDAS
// ==========================================

function generarHTMLGantt(idProyecto, minDate, maxDate, ganttItems, proyectoData, esMultiProyecto) {
    let html = '';

    // Header
    html += '<div class="gantt-header">';
    html += '<div class="gantt-title">';
    html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="transform: rotate(90deg);"><path d="M3 22V8h4v14H3zm7 0V2h4v20h-4zm7 0v-8h4v8h-4z"/></svg>';
    html += '<span>Planificación del Proyecto</span>';
    html += '</div>';
    html += '<div class="gantt-controls">';
    html += '<button class="gantt-zoom-btn' + (ganttZoom === 'weeks' ? ' active' : '') + '" onclick="setGanttZoom(\'' + idProyecto + '\', \'weeks\')">Semanal</button>';
    html += '<button class="gantt-zoom-btn' + (ganttZoom === 'months' ? ' active' : '') + '" onclick="setGanttZoom(\'' + idProyecto + '\', \'months\')">Mensual</button>';
    html += '<button class="gantt-zoom-btn' + (ganttZoom === 'quarters' ? ' active' : '') + '" onclick="setGanttZoom(\'' + idProyecto + '\', \'quarters\')">Trimestral</button>';
    html += '</div>';
    html += '</div>';

    // Body
    html += '<div class="gantt-body">';

    // Sidebar
    html += '<div class="gantt-sidebar">';
    html += '<div class="gantt-sidebar-header">Nombre</div>';

    // Proyecto data (Padre)
    html += '<div class="gantt-sidebar-row is-parent">';
    html += '<button class="gantt-toggle-btn' + (ganttExpanded[idProyecto] === false ? ' collapsed' : '') + '" onclick="toggleGanttExpand(\'' + idProyecto + '\', ' + (esMultiProyecto ? 'true' : 'false') + ')">';
    html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
    html += '</button>';
    const nombre = proyectoData.nombre_proyecto || 'Proyecto';
    html += '<span class="gantt-row-name" title="' + nombre.replace(/"/g, '&quot;') + '">' + truncarNombreGantt(nombre) + '</span>';
    html += '</div>';

    // Items hijos
    if (ganttExpanded[idProyecto] !== false) {
        ganttItems.forEach((item, index) => {
            html += '<div class="gantt-sidebar-row is-child">';
            html += '<span class="gantt-row-name" title="' + (item.nombre || '').replace(/"/g, '&quot;') + '">' + truncarNombreGantt(item.nombre) + '</span>';
            html += '</div>';
        });
    }
    html += '</div>'; // sidebar

    // Timeline
    const timelineCols = generarColumnasTimeline(minDate, maxDate, ganttZoom);
    const { totalWidth, baseCellWidth } = calcularDimensionesTimeline(timelineCols, ganttZoom);

    html += '<div class="gantt-timeline" id="ganttTimeline_' + idProyecto + '">';
    html += renderizarTimelineHeader(timelineCols, totalWidth, baseCellWidth, ganttZoom);

    html += '<div class="gantt-timeline-rows" style="width: ' + totalWidth + 'px;">';

    // Row Padre
    html += '<div class="gantt-timeline-row is-parent">';
    html += renderizarFondoRow(timelineCols, baseCellWidth, ganttZoom);

    const pFechaInicio = proyectoData.fecha_inicio_epics || proyectoData.fecha_inicio;
    const pFechaFin = proyectoData.fecha_fin_epics || proyectoData.fecha_fin;
    const barraP = calcularBarraGantt(pFechaInicio || minDate, pFechaFin || maxDate, timelineCols, ganttZoom, baseCellWidth);

    if (barraP) {
        const estadoProyecto = proyectoData.estado || '-';
        const estadoFormateado = formatearEstado(estadoProyecto);
        html += `<div class="gantt-bar bar-parent" style="left: ${barraP.left}px; width: ${barraP.width}px;"
                 onmouseenter="mostrarTooltipGantt(event, '${(nombre || '').replace(/'/g, "\\'")}', '${formatearFechaGantt(pFechaInicio)}', '${formatearFechaGantt(pFechaFin)}', '${estadoFormateado.replace(/'/g, "\\'")}')"
                 onmouseleave="ocultarTooltipGantt()">`;
        html += `<span class="gantt-bar-label">${nombre}</span></div>`;
    }
    html += '</div>';

    // Rows Hijos
    if (ganttExpanded[idProyecto] !== false) {
        ganttItems.forEach(item => {
            html += '<div class="gantt-timeline-row is-child">';
            html += renderizarFondoRow(timelineCols, baseCellWidth, ganttZoom);

            if (item.fechaInicio && item.fechaFin) {
                const barra = calcularBarraGantt(item.fechaInicio, item.fechaFin, timelineCols, ganttZoom, baseCellWidth);
                if (barra) {
                    const estadoItem = item.estado || '-';
                    const estadoFormateado = formatearEstado(estadoItem);
                    html += `<div class="gantt-bar bar-child" style="left: ${barra.left}px; width: ${barra.width}px;"
                             onmouseenter="mostrarTooltipGantt(event, '${(item.nombre || '').replace(/'/g, "\\'")}', '${formatearFechaGantt(item.fechaInicio)}', '${formatearFechaGantt(item.fechaFin)}', '${estadoFormateado.replace(/'/g, "\\'")}')"
                             onmouseleave="ocultarTooltipGantt()">`;
                    html += `<span class="gantt-bar-label">${item.nombre}</span></div>`;
                }
            }
            html += '</div>';
        });
    }

    html += '</div>'; // rows
    html += '</div>'; // timeline container
    html += '</div>'; // body

    return html;
}

function inicializarComportamientoGantt(idGantt, minDate, maxDate) {
    setTimeout(function () {
        const timeline = document.getElementById('ganttTimeline_' + idGantt);
        if (timeline) {
            // Scroll to today
            const timelineCols = generarColumnasTimeline(minDate, maxDate, ganttZoom);
            const { baseCellWidth } = calcularDimensionesTimeline(timelineCols, ganttZoom);

            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            let todayColLeft = 0;
            let currentLeft = 0;
            let found = false;

            for (let i = 0; i < timelineCols.length; i++) {
                const col = timelineCols[i];
                let cellWidth = getCellWidth(col, baseCellWidth, ganttZoom, timelineCols);

                const colDate = new Date(col.date);
                if (ganttZoom === 'weeks') {
                    if (colDate.getTime() === hoy.getTime()) found = true;
                } else if (ganttZoom === 'months') {
                    if (colDate.getMonth() === hoy.getMonth() && colDate.getFullYear() === hoy.getFullYear()) found = true;
                } else {
                    const colQ = Math.floor(colDate.getMonth() / 3);
                    const hoyQ = Math.floor(hoy.getMonth() / 3);
                    if (colDate.getFullYear() === hoy.getFullYear() && colQ === hoyQ) found = true;
                }

                if (found) {
                    todayColLeft = currentLeft;
                    break;
                }
                currentLeft += cellWidth;
            }

            if (found) {
                timeline.scrollLeft = Math.max(0, todayColLeft - (timeline.clientWidth / 2) + (baseCellWidth / 2));
            }

            inicializarDragScrollGantt(timeline);
        }
    }, 100);
}

function prepararDatosGantt(esProyectoPadre, items, proyectoData) {
    if (!items || items.length === 0) return [];

    return items.map(function (item) {
        if (esProyectoPadre) {
            return {
                id: item.id_proyecto,
                nombre: item.nombre_proyecto || 'Sin nombre',
                fechaInicio: item.fecha_inicio_epics || item.fecha_inicio || null,
                fechaFin: item.fecha_fin_epics || item.fecha_fin || null,
                estado: item.estado || ''
            };
        } else {
            // Usar campos nativos start_date/due_date con fallback a cf_21/cf_22
            return {
                id: item.epic_id,
                nombre: item.subject || 'Epic #' + item.epic_id,
                fechaInicio: item.start_date || item.cf_21 || null,
                fechaFin: item.due_date || item.cf_22 || null,
                estado: '' // Los epics no tienen estado en el sistema actual
            };
        }
    }).filter(function (item) {
        return item.fechaInicio || item.fechaFin;
    });
}

function calcularRangoFechas(items, zoom, proyectoData) {
    let allDates = [];

    // Incluir fechas del proyecto padre si existen
    if (proyectoData) {
        if (proyectoData.fecha_inicio_epics || proyectoData.fecha_inicio) allDates.push(parsearFechaGantt(proyectoData.fecha_inicio_epics || proyectoData.fecha_inicio));
        if (proyectoData.fecha_fin_epics || proyectoData.fecha_fin) allDates.push(parsearFechaGantt(proyectoData.fecha_fin_epics || proyectoData.fecha_fin));
    }

    items.forEach(function (item) {
        if (item.fechaInicio) allDates.push(parsearFechaGantt(item.fechaInicio));
        if (item.fechaFin) allDates.push(parsearFechaGantt(item.fechaFin));
    });

    // Filtrar nulos
    allDates = allDates.filter(d => d);

    if (allDates.length === 0) return { minDate: null, maxDate: null };

    allDates.sort(function (a, b) { return a - b; });

    // Agregar margen
    let minDate = new Date(allDates[0]);
    minDate.setDate(minDate.getDate() - 7);

    let maxDate = new Date(allDates[allDates.length - 1]);
    if (zoom === 'weeks') {
        maxDate.setDate(maxDate.getDate() + 14);
    } else if (zoom === 'months') {
        maxDate.setMonth(maxDate.getMonth() + 3);
    } else {
        maxDate.setMonth(maxDate.getMonth() + 6);
    }

    return { minDate: minDate, maxDate: maxDate };
}

function parsearFechaGantt(fechaStr) {
    if (!fechaStr) return null;
    if (fechaStr instanceof Date) return fechaStr;
    const match = String(fechaStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
    return null;
}

function formatearFechaGantt(fechaStr) {
    if (!fechaStr) return '-';
    const fecha = parsearFechaGantt(fechaStr);
    if (!fecha) return fechaStr;
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const año = fecha.getFullYear();
    return dia + '/' + mes + '/' + año;
}

function generarColumnasTimeline(minDate, maxDate, zoom) {
    const cols = [];
    if (!minDate || !maxDate) return cols;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const trimestres = ['Q1', 'Q2', 'Q3', 'Q4'];

    if (zoom === 'weeks') {
        let current = new Date(minDate);
        current.setHours(0, 0, 0, 0);
        while (current <= maxDate) {
            const dayOfWeek = current.getDay();
            const label = (dayOfWeek === 1 || current.getDate() === 1) ? current.getDate() + ' ' + meses[current.getMonth()] : current.getDate().toString();
            cols.push({
                date: new Date(current),
                label: label,
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                isToday: current.getTime() === hoy.getTime(),
                isMonthStart: current.getDate() === 1
            });
            current.setDate(current.getDate() + 1);
        }
    } else if (zoom === 'months') {
        let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        current.setHours(0, 0, 0, 0);
        const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
        while (current <= endMonth) {
            const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0);
            cols.push({
                date: new Date(current),
                label: meses[current.getMonth()] + ' ' + String(current.getFullYear()).slice(-2),
                isToday: current.getMonth() === hoy.getMonth() && current.getFullYear() === hoy.getFullYear(),
                isMonthStart: true,
                daysInMonth: lastDay.getDate()
            });
            current.setMonth(current.getMonth() + 1);
        }
    } else { // quarters
        let current = new Date(minDate.getFullYear(), Math.floor(minDate.getMonth() / 3) * 3, 1);
        current.setHours(0, 0, 0, 0);
        const endQuarter = new Date(maxDate.getFullYear(), Math.floor(maxDate.getMonth() / 3) * 3, 1);
        while (current <= endQuarter) {
            const q = Math.floor(current.getMonth() / 3);
            const lastDay = new Date(current.getFullYear(), (q + 1) * 3, 0);
            // Dias aprox
            const days = lastDay.getDate() + new Date(current.getFullYear(), q * 3 + 1, 0).getDate() + new Date(current.getFullYear(), q * 3 + 2, 0).getDate();
            cols.push({
                date: new Date(current),
                label: trimestres[q] + ' ' + String(current.getFullYear()).slice(-2),
                isToday: current.getFullYear() === hoy.getFullYear() && Math.floor(hoy.getMonth() / 3) === q,
                daysInQuarter: days
            });
            current.setMonth(current.getMonth() + 3);
        }
    }
    return cols;
}

function calcularDimensionesTimeline(timelineCols, zoom) {
    let baseCellWidth = 0;
    let totalWidth = 0;

    if (zoom === 'weeks') {
        baseCellWidth = 50;
        totalWidth = timelineCols.length * baseCellWidth;
    } else if (zoom === 'months') {
        const totalDays = timelineCols.reduce((sum, c) => sum + (c.daysInMonth || 30), 0);
        const avgDays = totalDays / timelineCols.length;
        baseCellWidth = Math.max(120, avgDays * 4);
        totalWidth = timelineCols.reduce((sum, col) => sum + (baseCellWidth * (col.daysInMonth || 30) / avgDays), 0);
    } else {
        const totalDays = timelineCols.reduce((sum, c) => sum + (c.daysInQuarter || 90), 0);
        const avgDays = totalDays / timelineCols.length;
        baseCellWidth = Math.max(180, avgDays * 2.5);
        totalWidth = timelineCols.reduce((sum, col) => sum + (baseCellWidth * (col.daysInQuarter || 90) / avgDays), 0);
    }

    return { baseCellWidth, totalWidth };
}

function getCellWidth(col, baseCellWidth, zoom, allCols) {
    if (zoom === 'weeks') return baseCellWidth;
    if (zoom === 'months') {
        const avgDays = allCols.reduce((s, c) => s + (c.daysInMonth || 30), 0) / allCols.length;
        return baseCellWidth * (col.daysInMonth || 30) / avgDays;
    }
    const avgDays = allCols.reduce((s, c) => s + (c.daysInQuarter || 90), 0) / allCols.length;
    return baseCellWidth * (col.daysInQuarter || 90) / avgDays;
}

function renderizarTimelineHeader(cols, totalWidth, baseCellWidth, zoom) {
    let html = '<div class="gantt-timeline-header" style="width: ' + totalWidth + 'px;">';
    let currentLeft = 0;

    cols.forEach(col => {
        let classes = 'gantt-timeline-cell';
        if (col.isWeekend) classes += ' is-weekend';
        if (col.isToday) classes += ' is-today';
        if (col.isMonthStart) classes += ' is-month-start';

        const width = getCellWidth(col, baseCellWidth, zoom, cols);
        html += `<div class="${classes}" style="min-width: ${width}px; left: ${currentLeft}px;">${col.label}</div>`;
        currentLeft += width;
    });
    html += '</div>';
    return html;
}

function renderizarFondoRow(cols, baseCellWidth, zoom) {
    let html = '';
    let currentLeft = 0;
    cols.forEach(col => {
        let classes = 'gantt-timeline-bg-cell';
        if (col.isWeekend) classes += ' is-weekend';
        if (col.isToday) classes += ' is-today';

        const width = getCellWidth(col, baseCellWidth, zoom, cols);
        html += `<div class="${classes}" style="min-width: ${width}px; left: ${currentLeft}px;"></div>`;
        currentLeft += width;
    });
    return html;
}

function calcularBarraGantt(fechaInicio, fechaFin, timelineCols, zoom, baseCellWidth) {
    const inicio = parsearFechaGantt(fechaInicio);
    const fin = parsearFechaGantt(fechaFin);
    if (!inicio || !fin) return null;

    inicio.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);

    let currentLeft = 0;
    let startLeft = -1;
    let endLeft = -1;

    for (let i = 0; i < timelineCols.length; i++) {
        const col = timelineCols[i];
        const cellWidth = getCellWidth(col, baseCellWidth, zoom, timelineCols);
        const colDate = new Date(col.date);
        colDate.setHours(0, 0, 0, 0);

        let cellStart = currentLeft;
        let cellEnd = currentLeft + cellWidth;
        let cellStartDate = null;
        let cellEndDate = null;
        let totalDaysInCell = 0;
        let daysInRange = 0;

        // Calcular fechas de inicio y fin de la celda según el zoom
        if (zoom === 'weeks') {
            cellStartDate = new Date(colDate);
            cellEndDate = new Date(colDate);
            cellEndDate.setDate(cellEndDate.getDate() + 1);
            totalDaysInCell = 1;
        } else if (zoom === 'months') {
            cellStartDate = new Date(colDate.getFullYear(), colDate.getMonth(), 1);
            cellEndDate = new Date(colDate.getFullYear(), colDate.getMonth() + 1, 0);
            cellEndDate.setHours(23, 59, 59, 999);
            totalDaysInCell = col.daysInMonth || 30;
        } else { // quarters
            const q = Math.floor(colDate.getMonth() / 3);
            cellStartDate = new Date(colDate.getFullYear(), q * 3, 1);
            cellEndDate = new Date(colDate.getFullYear(), (q + 1) * 3, 0);
            cellEndDate.setHours(23, 59, 59, 999);
            totalDaysInCell = col.daysInQuarter || 90;
        }

        // Verificar si la celda intersecta con el rango del proyecto
        const intersecta = (inicio <= cellEndDate && fin >= cellStartDate);

        if (intersecta) {
            // Calcular el inicio real dentro de la celda
            const inicioReal = inicio > cellStartDate ? inicio : cellStartDate;
            const finReal = fin < cellEndDate ? fin : cellEndDate;

            // Calcular offset de inicio dentro de la celda
            let offsetInicio = 0;
            if (inicioReal > cellStartDate) {
                if (zoom === 'weeks') {
                    offsetInicio = 0; // Para semanas, no hay offset (cada día es una celda)
                } else if (zoom === 'months') {
                    const diasDesdeInicio = inicioReal.getDate() - 1;
                    offsetInicio = (cellWidth * diasDesdeInicio) / totalDaysInCell;
                } else { // quarters
                    const diasDesdeInicio = Math.floor((inicioReal.getTime() - cellStartDate.getTime()) / (1000 * 60 * 60 * 24));
                    offsetInicio = (cellWidth * diasDesdeInicio) / totalDaysInCell;
                }
            }

            // Calcular ancho proporcional dentro de la celda
            let anchoEnCelda = cellWidth;
            if (inicioReal > cellStartDate || finReal < cellEndDate) {
                // Calcular días dentro del rango para esta celda
                if (zoom === 'weeks') {
                    anchoEnCelda = cellWidth; // Semanas: ancho completo
                } else if (zoom === 'months') {
                    const inicioDia = inicioReal.getDate();
                    const finDia = finReal.getDate();
                    const diasEnRango = finDia - inicioDia + 1;
                    anchoEnCelda = (cellWidth * diasEnRango) / totalDaysInCell;
                } else { // quarters
                    const diasDesdeInicio = Math.floor((inicioReal.getTime() - cellStartDate.getTime()) / (1000 * 60 * 60 * 24));
                    const diasHastaFin = Math.floor((finReal.getTime() - cellStartDate.getTime()) / (1000 * 60 * 60 * 24));
                    const diasEnRango = diasHastaFin - diasDesdeInicio + 1;
                    anchoEnCelda = (cellWidth * diasEnRango) / totalDaysInCell;
                }
            }

            if (startLeft < 0) {
                // Primera celda que intersecta
                startLeft = cellStart + offsetInicio;
                endLeft = cellStart + offsetInicio + anchoEnCelda;
            } else {
                // Celdas intermedias o final
                if (fin <= cellEndDate) {
                    // Última celda - usar ancho proporcional
                    endLeft = cellStart + offsetInicio + anchoEnCelda;
                } else {
                    // Celda intermedia - usar ancho completo
                    endLeft = cellEnd;
                }
            }
        }

        currentLeft += cellWidth;
    }

    if (startLeft < 0) return null;

    return { left: startLeft, width: Math.max(0, endLeft - startLeft) };
}

function renderizarGanttVacio() {
    return `<div class="gantt-header">
            <div class="gantt-title"><span>Planificación</span></div>
            </div>
            <div class="gantt-empty">
            <span>No hay datos de planificación</span>
            </div>`;
}

/**
 * Nueva implementación de drag scroll para Gantt
 * Usa cursores personalizados (imágenes) para máxima consistencia en Chrome
 */
function inicializarDragScrollGantt(element) {
    if (!element) return;
    
    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;
    
    // URLs de los cursores - usar estándar primero (funciona en Firefox y Chrome)
    // El CSS ya maneja las imágenes personalizadas, aquí usamos los valores estándar
    const cursorGrabUrl = 'grab';
    const cursorGrabbingUrl = 'grabbing';
    
    // Función para forzar actualización del cursor en Chrome usando imágenes personalizadas
    // Chrome necesita un "refresh" agresivo para renderizar cursores personalizados correctamente
    const forceCursorUpdate = (cursorUrl) => {
        // Aplicar el cursor directamente
        element.style.cursor = cursorUrl;
        // Forzar reflow para asegurar que el navegador procese el cambio
        void element.offsetHeight;
    };
    
    // Función para establecer cursor grab (manito abierta)
    const setCursorGrab = () => {
        element.classList.remove('gantt-dragging');
        forceCursorUpdate(cursorGrabUrl);
    };
    
    // Función para establecer cursor grabbing (manito cerrada)
    const setCursorGrabbing = () => {
        element.classList.add('gantt-dragging');
        forceCursorUpdate(cursorGrabbingUrl);
    };
    
    // NO inicializar cursor mediante JavaScript - confiar completamente en el CSS
    // El CSS ya tiene las reglas correctas con !important para #team-gantt-container .gantt-timeline
    // El problema era que JavaScript estaba interfiriendo con el CSS
    
    // Mousedown: iniciar arrastre
    const handleMouseDown = (e) => {
        // No arrastrar si se hace click en una barra del Gantt
        if (e.target.closest('.gantt-bar')) {
            return;
        }
        
        isDragging = true;
        startX = e.clientX;
        startScrollLeft = element.scrollLeft;
        
        setCursorGrabbing();
        
        // Prevenir selección de texto
        e.preventDefault();
        
        // Agregar clase al body para prevenir selección global
        document.body.style.userSelect = 'none';
        document.body.style.cursor = cursorGrabbingUrl;
    };
    
    // Mousemove: arrastrar o actualizar cursor
    const handleMouseMove = (e) => {
        if (isDragging) {
            // Modo arrastre: desplazar el scroll
            e.preventDefault();
            const deltaX = e.clientX - startX;
            const scrollAmount = deltaX * 1.5; // Factor de velocidad
            element.scrollLeft = startScrollLeft - scrollAmount;
        } else {
            // Modo normal: forzar actualización del cursor en cada movimiento
            // Esto es crítico para Chrome - necesita este "refresh" constante
            if (!e.target.closest('.gantt-bar')) {
                // Aplicar inmediatamente sin requestAnimationFrame para mejor responsividad
                element.style.cursor = cursorGrabUrl;
            }
        }
    };
    
    // Mouseup: finalizar arrastre
    const handleMouseUp = () => {
        if (!isDragging) return;
        
        isDragging = false;
        setCursorGrab();
        
        // Restaurar selección de texto
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    };
    
    // Mouseleave: cancelar arrastre si el mouse sale del elemento
    const handleMouseLeave = () => {
        if (isDragging) {
            isDragging = false;
            setCursorGrab();
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }
    };
    
    // Mouseenter: forzar actualización del cursor cuando el mouse entra
    // Esto es crítico para Chrome - fuerza el renderizado del cursor al entrar
    const handleMouseEnter = () => {
        if (!isDragging) {
            // Aplicar inmediatamente y también con delay para asegurar que Chrome lo procese
            element.style.cursor = cursorGrabUrl;
            setTimeout(() => {
                if (!isDragging) {
                    setCursorGrab();
                }
            }, 10);
        }
    };
    
    // Agregar event listeners
    element.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mouseenter', handleMouseEnter);
}

function truncarNombreGantt(nombre) {
    if (!nombre) return '';
    const partes = nombre.split('|');
    if (partes.length > 1) return partes.slice(1).join('|').trim() || nombre;
    return nombre;
}

function toggleGanttExpand(idKey, esMultiProyecto) {
    const estaExpandido = ganttExpanded[idKey] === true;
    ganttExpanded[idKey] = !estaExpandido;

    if (esMultiProyecto) {
        const container = document.getElementById('team-gantt-container');
        if (container) {
            refreshTeamGanttRowVisibility(container);
            ajustarAnchoSidebarGanttEquipo(container);
            const sidebarRows = container.querySelectorAll('.gantt-sidebar-row.is-parent');
            sidebarRows.forEach(function (row) {
                const btn = row.querySelector('.gantt-toggle-btn:not(.gantt-node-toggle)');
                if (btn && btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(String(idKey))) {
                    if (ganttExpanded[idKey]) btn.classList.remove('collapsed');
                    else btn.classList.add('collapsed');
                }
            });
        }
    } else {
        // En modo modal (single project), re-renderizamos completo (legacy behavior)
        const cached = ganttDataCache[idKey];
        if (cached) {
            renderizarGanttChart(idKey, cached.esProyectoPadre, cached.items, cached.proyectoData);
        }
    }
}

function inicializarDragDropGanttEquipo(container) {
    if (!container) return;
    const sidebar = container.querySelector('.gantt-sidebar');
    const timelineRows = container.querySelector('.gantt-timeline-rows');
    if (!sidebar || !timelineRows) return;

    let dragRowId = null;
    let dragParentKey = null;

    function getRowId(el) { return el ? el.getAttribute('data-gantt-row-id') : null; }
    function getParentKey(el) { return el ? el.getAttribute('data-gantt-parent-key') : null; }

    function setDraggingStyles(el, on) {
        if (!el) return;
        if (on) el.classList.add('gantt-dragging');
        else el.classList.remove('gantt-dragging');
    }

    sidebar.querySelectorAll('.gantt-draggable-row').forEach(function (row) {
        row.addEventListener('dragstart', function (e) {
            dragRowId = getRowId(row);
            dragParentKey = getParentKey(row);
            setDraggingStyles(row, true);
            try {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', dragRowId || '');
            } catch (err) { /* noop */ }
        });
        row.addEventListener('dragend', function () {
            setDraggingStyles(row, false);
            dragRowId = null;
            dragParentKey = null;
            sidebar.querySelectorAll('.gantt-drag-over').forEach(function (x) { x.classList.remove('gantt-drag-over'); });
        });

        row.addEventListener('dragover', function (e) {
            const targetParent = getParentKey(row);
            if (!dragRowId || !dragParentKey || targetParent !== dragParentKey) return;
            e.preventDefault();
            row.classList.add('gantt-drag-over');
        });
        row.addEventListener('dragleave', function () {
            row.classList.remove('gantt-drag-over');
        });

        row.addEventListener('drop', function (e) {
            const targetId = getRowId(row);
            const targetParent = getParentKey(row);
            if (!dragRowId || !targetId || dragRowId === targetId) return;
            if (!dragParentKey || targetParent !== dragParentKey) return;
            e.preventDefault();

            // Mover en sidebar
            const draggedSidebar = sidebar.querySelector('[data-gantt-row-id="' + dragRowId + '"]');
            if (draggedSidebar && row.parentNode === draggedSidebar.parentNode) {
                row.parentNode.insertBefore(draggedSidebar, row);
            }

            // Mover en timeline (mismo orden que sidebar para ese parent)
            const draggedTimeline = timelineRows.querySelector('[data-gantt-row-id="' + dragRowId + '"]');
            const targetTimeline = timelineRows.querySelector('[data-gantt-row-id="' + targetId + '"]');
            if (draggedTimeline && targetTimeline && targetTimeline.parentNode === draggedTimeline.parentNode) {
                targetTimeline.parentNode.insertBefore(draggedTimeline, targetTimeline);
            }

            // Persistir orden en localStorage
            const order = _teamGanttLoadOrder();
            const siblings = Array.from(sidebar.querySelectorAll('.gantt-draggable-row[data-gantt-parent-key="' + dragParentKey + '"]'));
            order[dragParentKey] = siblings.map(function (s) { return getRowId(s); }).filter(Boolean);
            _teamGanttSaveOrder(order);

            ajustarAnchoSidebarGanttEquipo(container);
        });
    });
}

async function setGanttZoom(idGantt, zoom) {
    ganttZoom = zoom;
    const cached = ganttDataCache[idGantt];

    if (cached) {
        if (cached.type === 'team') {
            await renderizarGanttEquipo(cached.proyectos);
        } else {
            renderizarGanttChart(idGantt, cached.esProyectoPadre, cached.items, cached.proyectoData);
        }
    }
}

// Tooltip
function formatearEstado(estado) {
    if (!estado || estado.trim() === '' || estado === '-') {
        return '-';
    }
    const estados = {
        'sin comenzar': 'Sin comenzar',
        'en curso': 'En curso',
        'Testing': 'Testing',
        'Entregado': 'Entregado',
        'Cerrado': 'Cerrado',
        'Rework': 'Rework',
        'Bloqueado': 'Bloqueado'
    };
    return estados[estado.toLowerCase()] || estado;
}

function mostrarTooltipGantt(event, nombre, fechaInicio, fechaFin, estado) {
    if (!ganttTooltipElement) {
        ganttTooltipElement = document.createElement('div');
        ganttTooltipElement.className = 'gantt-tooltip';
        ganttTooltipElement.style.display = 'none';
        ganttTooltipElement.style.position = 'fixed';
        ganttTooltipElement.style.zIndex = '99999';
        document.body.appendChild(ganttTooltipElement);
    }
    const estadoTexto = estado || '-';
    ganttTooltipElement.innerHTML = `<div class="gantt-tooltip-title">${nombre}</div>
        <div class="gantt-tooltip-dates">
        <div class="gantt-tooltip-row"><span class="gantt-tooltip-label">Fecha Inicio:</span> ${fechaInicio}</div>
        <div class="gantt-tooltip-row"><span class="gantt-tooltip-label">Fecha Fin:</span> ${fechaFin}</div>
        <div class="gantt-tooltip-row"><span class="gantt-tooltip-label">Estado:</span> ${estadoTexto}</div>
        </div>`;
    
    // Calcular posición del tooltip
    const x = event.pageX + 10;
    const y = event.pageY + 10;
    
    // Asegurar que el tooltip no se salga de la pantalla
    const tooltipWidth = 280;
    const tooltipHeight = 120;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let finalX = x;
    let finalY = y;
    
    if (x + tooltipWidth > windowWidth) {
        finalX = event.pageX - tooltipWidth - 10;
    }
    if (y + tooltipHeight > windowHeight) {
        finalY = event.pageY - tooltipHeight - 10;
    }
    
    ganttTooltipElement.style.display = 'block';
    ganttTooltipElement.style.left = finalX + 'px';
    ganttTooltipElement.style.top = finalY + 'px';
    ganttTooltipElement.style.visibility = 'visible';
    ganttTooltipElement.style.opacity = '1';
}

function ocultarTooltipGantt() {
    if (ganttTooltipElement) ganttTooltipElement.style.display = 'none';
}
