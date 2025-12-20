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

// Función para abreviar nombres de clientes si exceden 20 caracteres
function abreviarCliente(cliente) {
    if (!cliente || cliente === '-') return cliente || '-';

    // Si el nombre tiene 20 caracteres o menos, devolverlo sin cambios
    if (cliente.length <= 20) {
        return cliente;
    }

    // Dividir el nombre en palabras
    const palabras = cliente.split(' ').filter(p => p.trim() !== '');

    // Si hay menos de 2 palabras, no abreviar
    if (palabras.length < 2) {
        return cliente;
    }

    // Abreviar la primera palabra: mostrar solo la primera letra seguida de punto
    const primeraPalabra = palabras[0];
    const primeraLetra = primeraPalabra.charAt(0);
    const primeraAbreviada = primeraLetra + '.';

    // Construir el resultado con la primera palabra abreviada y el resto sin cambios
    const palabrasAbreviadas = [primeraAbreviada, ...palabras.slice(1)];
    let resultado = palabrasAbreviadas.join(' ');

    // Si después de abreviar la primera palabra sigue siendo muy largo, abreviar también palabras intermedias
    if (resultado.length > 20 && palabras.length > 2) {
        const palabrasFinales = resultado.split(' ');
        const abreviadas = palabrasFinales.map((palabra, index) => {
            // Abreviar palabras intermedias (no la primera ni la última) que tengan más de 4 caracteres
            if (index > 0 && index < palabrasFinales.length - 1 && palabra.length > 4 && !palabra.includes('.')) {
                return palabra.substring(0, 4) + '.';
            }
            return palabra;
        });
        resultado = abreviadas.join(' ');
    }

    return resultado;
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
    let tablaHTML = '<div class="modern-table-wrapper mantenimiento-wrapper"><div class="modern-table mantenimiento"><div class="modern-table-header" style="position: relative;">';
    tablaHTML += '<div class="modern-table-cell header-cell">Cliente</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" style="text-align: center; justify-content: center;">Límite Horas</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" style="text-align: center; justify-content: center;">Overall</div>';
    tablaHTML += '<div class="modern-table-cell header-cell">Demanda</div>';
    tablaHTML += '<div class="modern-table-cell header-cell">Estabilidad</div>';
    tablaHTML += '<div class="modern-table-cell header-cell">Satisfacción</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" style="flex: 1; display: flex; align-items: center; gap: 6px;">';
    tablaHTML += '<span>WIN</span>';
    tablaHTML += '<div class="win-info-icon" style="position: relative; display: inline-flex; align-items: center; cursor: help;">';
    tablaHTML += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color: #5f6368; opacity: 0.7;" onmouseover="this.style.opacity=\'1\'" onmouseout="this.style.opacity=\'0.7\'">';
    tablaHTML += '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>';
    tablaHTML += '</svg>';
    tablaHTML += '<div class="win-tooltip">What\'s Important Now</div>';
    tablaHTML += '</div>';
    tablaHTML += '</div>';
    tablaHTML += '<button onclick="sincronizar()" style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; border: 1px solid #dfe1e5; background: white; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background=\'#f1f3f4\'" onmouseout="this.style.background=\'white\'" title="Actualizar mantenimiento">';
    tablaHTML += '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="color: #5f6368;">';
    tablaHTML += '<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>';
    tablaHTML += '</svg></button>';
    tablaHTML += '</div>';

    datos.forEach(function (item) {
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
        tablaHTML += '<div style="line-height: 1.4; font-size: 15px;">' + (item.cliente || '-') + '</div>';
        if (nombreProyectoTruncado) {
            tablaHTML += '<div style="font-size: 11px; color: var(--text-secondary); line-height: 1.3;">' + nombreProyectoTruncado + '</div>';
        }
        tablaHTML += '</div>';
        tablaHTML += '<div class="modern-table-cell item-text" style="text-align: center; justify-content: center;">' + (item.limite_horas || '-') + '</div>';
        tablaHTML += '<div class="modern-table-cell">' + crearDropdownOverall(item.id_proyecto, 'estado', item.estado || '', '') + '</div>';
        tablaHTML += '<div class="modern-table-cell">' + crearDropdownIconos(item.id_proyecto, 'demanda', item.demanda || '', 'demanda', '') + '</div>';
        tablaHTML += '<div class="modern-table-cell">' + crearDropdownIconos(item.id_proyecto, 'estabilidad', item.estabilidad || '', 'estabilidad', '') + '</div>';
        tablaHTML += '<div class="modern-table-cell">' + crearDropdownCaras(item.id_proyecto, 'satisfaccion', item.satisfaccion || '', '') + '</div>';
        tablaHTML += '<div class="modern-table-cell"><textarea class="modern-input win-textarea" rows="1" onchange="actualizarMantenimiento(' + item.id_proyecto + ', \'win\', this.value); ajustarAlturaTextarea(this);">' + (item.win || '') + '</textarea></div>';
        tablaHTML += '</div>';
    });

    tablaHTML += '</div></div>';
    contenido.innerHTML = tablaHTML;
}

function renderizarTablaProyectos(datos, contenido) {
    // Asegurar que el contenedor sea responsive para proyectos
    if (contenido) {
        contenido.classList.add('proyectos-container');
    }
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

    // Crear estructura con scrollbar fija inferior (estilo Google Sheets)
    let tablaHTML = '<div class="proyectos-table-container"><div class="proyectos-scroll-wrapper">';
    tablaHTML += '<div class="modern-table-wrapper proyectos-wrapper"><div class="modern-table proyectos"><div class="modern-table-header">';
    const flechaAsc = '▲';
    const flechaDesc = '▼';

    tablaHTML += '<div class="modern-table-cell header-cell" style="width: 30px;"></div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'cliente\')" style="cursor: pointer; user-select: none;' + (ordenActual.columna === 'cliente' ? ' color: var(--primary-color);' : '') + '">Cliente' + (ordenActual.columna === 'cliente' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'proyecto\')" style="cursor: pointer; user-select: none;' + (ordenActual.columna === 'proyecto' ? ' color: var(--primary-color);' : '') + '">Proyecto' + (ordenActual.columna === 'proyecto' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'categoria\')" style="cursor: pointer; user-select: none;' + (ordenActual.columna === 'categoria' ? ' color: var(--primary-color);' : '') + '">Categoría' + (ordenActual.columna === 'categoria' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'estado\')" style="cursor: pointer; user-select: none; text-align: center; justify-content: center;' + (ordenActual.columna === 'estado' ? ' color: var(--primary-color);' : '') + '">Estado' + (ordenActual.columna === 'estado' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'avance\')" style="cursor: pointer; user-select: none;' + (ordenActual.columna === 'avance' ? ' color: var(--primary-color);' : '') + '">Avance' + (ordenActual.columna === 'avance' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'overall\')" style="cursor: pointer; user-select: none; text-align: center; justify-content: center;' + (ordenActual.columna === 'overall' ? ' color: var(--primary-color);' : '') + '">Overall' + (ordenActual.columna === 'overall' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'alcance\')" style="cursor: pointer; user-select: none; text-align: center; justify-content: center;' + (ordenActual.columna === 'alcance' ? ' color: var(--primary-color);' : '') + '">Alcance' + (ordenActual.columna === 'alcance' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'costo\')" style="cursor: pointer; user-select: none; text-align: center; justify-content: center;' + (ordenActual.columna === 'costo' ? ' color: var(--primary-color);' : '') + '">Costo' + (ordenActual.columna === 'costo' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'plazos\')" style="cursor: pointer; user-select: none; text-align: center; justify-content: center;' + (ordenActual.columna === 'plazos' ? ' color: var(--primary-color);' : '') + '">Plazos' + (ordenActual.columna === 'plazos' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" style="text-align: center; justify-content: center;">Accionables</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'fecha_inicio\')" style="cursor: pointer; user-select: none; text-align: center; justify-content: center;' + (ordenActual.columna === 'fecha_inicio' ? ' color: var(--primary-color);' : '') + '">Fecha Inicio' + (ordenActual.columna === 'fecha_inicio' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'fecha_fin\')" style="cursor: pointer; user-select: none; text-align: center; justify-content: center;' + (ordenActual.columna === 'fecha_fin' ? ' color: var(--primary-color);' : '') + '">Fecha Fin' + (ordenActual.columna === 'fecha_fin' ? ' ' + (ordenActual.direccion === 'asc' ? flechaAsc : flechaDesc) : '') + '</div>';
    tablaHTML += '<div class="modern-table-cell header-cell" style="flex: 1; display: flex; align-items: center; gap: 6px;">';
    tablaHTML += '<span>WIN</span>';
    tablaHTML += '<div class="win-info-icon" style="position: relative; display: inline-flex; align-items: center; cursor: help; z-index: 99999;" onmouseenter="const icon = this; const tooltip = icon.querySelector(\'.win-tooltip\'); if (tooltip) { const rect = icon.getBoundingClientRect(); tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + \'px\'; tooltip.style.left = rect.left + (rect.width / 2) + \'px\'; tooltip.style.transform = \'translateX(-50%)\'; }">';
    tablaHTML += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color: #5f6368; opacity: 0.7;" onmouseover="this.style.opacity=\'1\'" onmouseout="this.style.opacity=\'0.7\'">';
    tablaHTML += '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>';
    tablaHTML += '</svg>';
    tablaHTML += '<div class="win-tooltip">What\'s Important Now</div>';
    tablaHTML += '</div>';
    tablaHTML += '</div>';
    tablaHTML += '</div>';

    // Filtrar proyectos con estado "Cerrado" según el checkbox "Incluir cerrados"
    const incluirCerrados = document.getElementById('incluirCerrados')?.checked || false;
    const datosFiltrados = incluirCerrados
        ? datosOrdenados
        : datosOrdenados.filter(item => item.estado !== 'Cerrado');

    datosFiltrados.forEach(function (item) {
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
            tiene_subproyectos: item.tiene_subproyectos || false,
            estado: item.estado || '',
            accionables: item.accionables || '',
            fecha_accionable: item.fecha_accionable || '',
            asignado_accionable: item.asignado_accionable || '',
            updated_at: item.updated_at || '',
            redmineUrl: redmineUrl
        };
        const itemDataJson = JSON.stringify(itemData).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        tablaHTML += '<div class="modern-table-row" data-id-proyecto="' + item.id_proyecto + '">';

        // Botón para expandir/contraer subproyectos (solo si tiene subproyectos)
        if (tieneSecundarios && item.subproyectos && item.subproyectos.length > 0) {
            tablaHTML += '<div class="modern-table-cell" style="width: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="toggleSubproyectos(' + item.id_proyecto + '); event.stopPropagation();" title="Expandir/Contraer subproyectos">';
            tablaHTML += '<svg id="icon-subproyectos-' + item.id_proyecto + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px; color: var(--text-secondary); transition: transform 0.2s;" class="icon-expand-subproyectos">';
            tablaHTML += '<path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>';
            tablaHTML += '</svg>';
            tablaHTML += '</div>';
        } else {
            tablaHTML += '<div class="modern-table-cell" style="width: 30px;"></div>';
        }

        tablaHTML += '<div class="modern-table-cell item-text">' + abreviarCliente(item.cliente || '-') + '</div>';
        tablaHTML += '<div class="modern-table-cell item-text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;"><a href="javascript:void(0);" onclick="abrirModalDetalle(' + item.id_proyecto + '); event.stopPropagation();" data-item="' + itemDataJson + '" style="color: var(--primary-color); text-decoration: none; cursor: pointer; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;">' + nombreProyecto + '</a></div>';
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
        // Columna Accionables - mostrar "Ver" si tiene accionables
        if (item.tiene_accionables) {
            tablaHTML += '<div class="modern-table-cell" style="text-align: center; justify-content: center;"><a href="javascript:void(0);" onclick="abrirModalDetalle(' + item.id_proyecto + ', true); event.stopPropagation();" style="color: var(--primary-color); text-decoration: none; cursor: pointer; font-size: 13px; font-weight: 500;">Ver</a></div>';
        } else {
            tablaHTML += '<div class="modern-table-cell" style="text-align: center; justify-content: center; color: var(--text-secondary);">-</div>';
        }

        // Formatear fechas para mostrar en formato corto (dd/mm).
        // Regla: tomar SIEMPRE la fecha de inicio mínima y la fecha fin máxima
        // considerando proyecto + subproyectos + epics (cuando existan).
        const fechasInicioAll = [];
        const fechasFinAll = [];

        if (item.fecha_inicio_epics) fechasInicioAll.push(item.fecha_inicio_epics);
        if (item.fecha_inicio) fechasInicioAll.push(item.fecha_inicio);
        if (item.fecha_fin_epics) fechasFinAll.push(item.fecha_fin_epics);
        if (item.fecha_fin) fechasFinAll.push(item.fecha_fin);

        if (item.tiene_subproyectos && Array.isArray(item.subproyectos) && item.subproyectos.length > 0) {
            item.subproyectos.forEach(sp => {
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

        tablaHTML += '<div class="modern-table-cell" style="font-size: 11px; text-align: center; justify-content: center; color: var(--text-secondary);">' + fechaInicioCorta + '</div>';
        tablaHTML += '<div class="modern-table-cell" style="font-size: 11px; text-align: center; justify-content: center; color: var(--text-secondary);">' + fechaFinCorta + '</div>';
        const winValue = item.win || '';
        tablaHTML += '<div class="modern-table-cell"><textarea class="modern-input win-textarea" rows="1" onchange="actualizarProyecto(' + item.id_proyecto + ', \'win\', this.value); ajustarAlturaTextarea(this);">' + winValue + '</textarea></div>';

        tablaHTML += '</div>';

        // Renderizar subproyectos directamente después del proyecto padre
        // Por defecto están ocultos (clase "subproyectos-ocultos")
        // Filtrar según el checkbox "Incluir cerrados"
        if (item.subproyectos && item.subproyectos.length > 0) {
            const incluirCerrados = document.getElementById('incluirCerrados')?.checked || false;
            const subproyectosFiltrados = incluirCerrados
                ? item.subproyectos
                : item.subproyectos.filter(sub => sub.estado !== 'Cerrado');
            subproyectosFiltrados.forEach(function (subproyecto) {
                tablaHTML += crearFilaSubproyectoHTML(item.id_proyecto, subproyecto);
            });
        }
    });

    // Cerrar divs: modern-table, modern-table-wrapper, proyectos-scroll-wrapper, proyectos-table-container
    tablaHTML += '</div></div></div></div>';

    // Agregar scrollbar fija en la parte inferior (fuera del contenedor de la tabla)
    tablaHTML += '<div class="fixed-scrollbar-container" id="fixed-scrollbar"><div class="fixed-scrollbar-content" id="fixed-scrollbar-content"></div></div>';

    contenido.innerHTML = tablaHTML;

    const contadorProyectos = document.getElementById('contadorProyectos');
    if (contadorProyectos) {
        contadorProyectos.textContent = 'Total proyectos: ' + datosFiltrados.length;
    }

    // Configurar scrollbar fija
    setTimeout(() => {
        configurarScrollbarFija();
        ajustarScrollHorizontal();
        // Ajustar altura de todos los textareas WIN
        document.querySelectorAll('.win-textarea').forEach(textarea => {
            ajustarAlturaTextarea(textarea);
            // Agregar listener para ajustar altura mientras escribe
            textarea.addEventListener('input', function() {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/c387d317-3dcc-4598-b290-b71e313e8754',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'table-renderer.js:457',message:'Evento INPUT disparado',data:{valueLength:this.value.length,currentHeight:this.clientHeight,currentRows:this.getAttribute('rows')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                ajustarAlturaTextarea(this);
            });
        });
    }, 100);
}

// Función para configurar la scrollbar fija inferior (estilo Google Sheets)
let fixedScrollHandler = null;
let tableScrollHandler = null;
let scrollWrapperHandler = null;

function configurarScrollbarFija() {
    const fixedScrollbar = document.getElementById('fixed-scrollbar');
    const fixedContent = document.getElementById('fixed-scrollbar-content');
    const tableWrapper = document.querySelector('.modern-table-wrapper.proyectos-wrapper');
    const table = tableWrapper?.querySelector('.modern-table');
    const scrollWrapper = document.querySelector('.proyectos-scroll-wrapper');

    if (!fixedScrollbar || !fixedContent || !tableWrapper || !table) {
        return;
    }

    // Remover event listeners anteriores si existen
    if (fixedScrollHandler) {
        fixedScrollbar.removeEventListener('scroll', fixedScrollHandler);
    }
    if (tableScrollHandler) {
        tableWrapper.removeEventListener('scroll', tableScrollHandler);
    }
    if (scrollWrapperHandler && scrollWrapper) {
        scrollWrapper.removeEventListener('scroll', scrollWrapperHandler);
    }

    // Establecer el ancho del contenido de la scrollbar fija
    const tableWidth = table.scrollWidth;
    fixedContent.style.width = tableWidth + 'px';

    // Verificar si se necesita scroll horizontal
    const wrapperWidth = tableWrapper.clientWidth;
    const needsScroll = tableWidth > wrapperWidth;

    if (!needsScroll) {
        fixedScrollbar.style.display = 'none';
        return;
    }

    // Ajustar el ancho y posición de la scrollbar fija para que coincida con la tabla
    const tableRect = tableWrapper.getBoundingClientRect();
    fixedScrollbar.style.left = tableRect.left + 'px';
    fixedScrollbar.style.width = tableRect.width + 'px';
    fixedScrollbar.style.right = 'auto';

    // Sincronizar scroll
    let isSyncingFixed = false;
    let isSyncingTable = false;

    fixedScrollHandler = function () {
        if (isSyncingTable) {
            isSyncingTable = false;
            return;
        }
        isSyncingFixed = true;
        tableWrapper.scrollLeft = fixedScrollbar.scrollLeft;
    };

    tableScrollHandler = function () {
        if (isSyncingFixed) {
            isSyncingFixed = false;
            return;
        }
        isSyncingTable = true;
        fixedScrollbar.scrollLeft = tableWrapper.scrollLeft;
    };

    fixedScrollbar.addEventListener('scroll', fixedScrollHandler);
    tableWrapper.addEventListener('scroll', tableScrollHandler);

    // Mostrar/ocultar la scrollbar fija según si la tabla está visible en el viewport
    function actualizarVisibilidadScrollbar() {
        if (!scrollWrapper || !tableWrapper) {
            fixedScrollbar.style.display = 'block';
            return;
        }

        const tableWrapperRect = tableWrapper.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Mostrar la scrollbar fija si la parte inferior de la tabla NO está visible en el viewport
        // (es decir, si el usuario tiene que hacer scroll para ver la scrollbar de la tabla)
        if (tableWrapperRect.bottom > viewportHeight - 50) {
            fixedScrollbar.style.display = 'block';
        } else {
            fixedScrollbar.style.display = 'none';
        }
    }

    // Actualizar visibilidad al hacer scroll
    if (scrollWrapper) {
        scrollWrapperHandler = actualizarVisibilidadScrollbar;
        scrollWrapper.addEventListener('scroll', scrollWrapperHandler);
    }

    // Actualizar visibilidad al hacer scroll en la ventana
    window.addEventListener('scroll', actualizarVisibilidadScrollbar);

    // Actualizar visibilidad inicial
    actualizarVisibilidadScrollbar();
}


// Función para crear una fila de subproyecto (ahora renderiza directamente como HTML)
function crearFilaSubproyectoHTML(id_proyecto, subproyecto) {
    const redmineUrl = 'https://redmine.mercap.net/projects/' + (subproyecto.codigo_proyecto || '');
    let nombreSubproyecto = subproyecto.nombre_proyecto || '-';
    if (nombreSubproyecto.includes(' | ')) {
        nombreSubproyecto = nombreSubproyecto.split(' | ').slice(1).join(' | ');
    }

    const subproyectoData = {
        id_proyecto: subproyecto.id_proyecto,
        nombre_proyecto: subproyecto.nombre_proyecto || '',
        codigo_proyecto: subproyecto.codigo_proyecto || '',
        horas_estimadas: parseFloat(subproyecto.horas_estimadas) || 0,
        horas_realizadas: parseFloat(subproyecto.horas_realizadas) || 0,
        fecha_inicio_epics: subproyecto.fecha_inicio_epics || subproyecto.fecha_inicio || '',
        fecha_fin_epics: subproyecto.fecha_fin_epics || subproyecto.fecha_fin || '',
        fecha_inicio: subproyecto.fecha_inicio || '',
        fecha_fin: subproyecto.fecha_fin || '',
        win: subproyecto.win || '',
        tiene_epics: subproyecto.tiene_epics || false,
        estado: subproyecto.estado || '',
        accionables: subproyecto.accionables || '',
        fecha_accionable: subproyecto.fecha_accionable || '',
        asignado_accionable: subproyecto.asignado_accionable || '',
        updated_at: subproyecto.updated_at || '',
        redmineUrl: redmineUrl
    };
    const subproyectoDataJson = JSON.stringify(subproyectoData).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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

    let filaHTML = '';
    filaHTML += '<div class="modern-table-row proyecto-secundario-' + id_proyecto + ' subproyecto-row subproyectos-ocultos" data-id-proyecto="' + id_proyecto + '" data-id-subproyecto="' + subproyecto.id_proyecto + '" style="display: none;">';
    filaHTML += '<div class="modern-table-cell" style="width: 30px;"></div>';
    filaHTML += '<div class="modern-table-cell item-text"></div>';
    filaHTML += '<div class="modern-table-cell item-text" style="padding-left: 16px; font-style: italic; color: var(--text-secondary); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;"><a href="javascript:void(0);" onclick="abrirModalDetalle(' + subproyecto.id_proyecto + '); event.stopPropagation();" data-item="' + subproyectoDataJson + '" style="color: var(--primary-color); text-decoration: none; cursor: pointer; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;">' + nombreSubproyecto + '</a></div>';
    filaHTML += '<div class="modern-table-cell item-text" style="font-size: 12px; color: var(--text-secondary);">' + abreviarCategoria(subproyecto.categoria) + '</div>';
    filaHTML += '<div class="modern-table-cell" style="text-align: center; justify-content: center;">' + crearDropdownEstado(subproyecto.id_proyecto, estadoSubproyecto, 'subproyecto ' + estadoClassSub) + '</div>';
    filaHTML += '<div class="modern-table-cell"><div class="progress-bar-container" data-id="' + subproyecto.id_proyecto + '"><div class="progress-bar" style="width: ' + avanceSubproyecto + '%; background: ' + avanceGradientSub + ';"></div><input type="range" min="0" max="100" step="5" value="' + avanceSubproyecto + '" class="progress-slider" oninput="actualizarBarraProgreso(this);" onchange="actualizarProyecto(' + subproyecto.id_proyecto + ', \'avance\', this.value);" /></div></div>';
    filaHTML += '<div class="modern-table-cell">' + crearDropdownOverall(subproyecto.id_proyecto, 'overall', subproyecto.overall || '', 'subproyecto') + '</div>';
    filaHTML += '<div class="modern-table-cell">' + crearDropdownOverall(subproyecto.id_proyecto, 'alcance', subproyecto.alcance || '', 'subproyecto') + '</div>';
    filaHTML += '<div class="modern-table-cell">' + crearDropdownOverall(subproyecto.id_proyecto, 'costo', subproyecto.costo || '', 'subproyecto') + '</div>';
    filaHTML += '<div class="modern-table-cell">' + crearDropdownOverall(subproyecto.id_proyecto, 'plazos', subproyecto.plazos || '', 'subproyecto') + '</div>';
    // Columna Accionables para subproyectos - mostrar "Ver" si tiene accionables
    if (subproyecto.tiene_accionables) {
        filaHTML += '<div class="modern-table-cell" style="text-align: center; justify-content: center;"><a href="javascript:void(0);" onclick="abrirModalDetalle(' + subproyecto.id_proyecto + ', true); event.stopPropagation();" style="color: var(--primary-color); text-decoration: none; cursor: pointer; font-size: 13px; font-weight: 500;">Ver</a></div>';
    } else {
        filaHTML += '<div class="modern-table-cell" style="text-align: center; justify-content: center; color: var(--text-secondary);">-</div>';
    }

    // Fechas de subproyecto: usar epics si existen, sino fechas propias
    const fechaInicioSub = subproyecto.fecha_inicio_epics || subproyecto.fecha_inicio || '';
    const fechaFinSub = subproyecto.fecha_fin_epics || subproyecto.fecha_fin || '';
    const fechaInicioSubCorta = fechaInicioSub ? formatearFechaCorta(fechaInicioSub) : '-';
    const fechaFinSubCorta = fechaFinSub ? formatearFechaCorta(fechaFinSub) : '-';

    filaHTML += '<div class="modern-table-cell" style="font-size: 11px; text-align: center; justify-content: center; color: var(--text-secondary);">' + fechaInicioSubCorta + '</div>';
    filaHTML += '<div class="modern-table-cell" style="font-size: 11px; text-align: center; justify-content: center; color: var(--text-secondary);">' + fechaFinSubCorta + '</div>';
    const subproyectoWinValue = subproyecto.win || '';
    filaHTML += '<div class="modern-table-cell"><textarea class="modern-input win-textarea" rows="1" onchange="actualizarProyecto(' + subproyecto.id_proyecto + ', \'win\', this.value); ajustarAlturaTextarea(this);">' + subproyectoWinValue + '</textarea></div>';
    filaHTML += '</div>';

    return filaHTML;
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

// Función para expandir/contraer subproyectos (disponible globalmente)
window.toggleSubproyectos = function (idProyectoPadre) {
    const subproyectosRows = document.querySelectorAll('.proyecto-secundario-' + idProyectoPadre + '.subproyecto-row');
    const icon = document.getElementById('icon-subproyectos-' + idProyectoPadre);

    if (!subproyectosRows || subproyectosRows.length === 0) {
        console.log('No se encontraron subproyectos para el proyecto:', idProyectoPadre);
        return;
    }

    // Verificar si están visibles: verificar tanto el estilo inline como el computed
    const primerSubproyecto = subproyectosRows[0];
    const estiloInline = primerSubproyecto.style.display;
    const computedStyle = window.getComputedStyle(primerSubproyecto);
    const estaVisible = estiloInline !== 'none' && computedStyle.display !== 'none';

    console.log('Toggle subproyectos para proyecto:', idProyectoPadre, 'Visible:', estaVisible, 'Rows encontrados:', subproyectosRows.length, 'Icon encontrado:', !!icon);

    // Actualizar el ícono PRIMERO
    if (icon) {
        if (estaVisible) {
            // Contraer: flecha hacia la derecha (estado inicial)
            icon.innerHTML = '<path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>';
            console.log('Ícono actualizado a: contraído (flecha derecha)');
        } else {
            // Expandir: flecha hacia abajo
            icon.innerHTML = '<path d="M7 10l5 5 5-5z"/>';
            console.log('Ícono actualizado a: expandido (flecha abajo)');
        }
    } else {
        console.error('No se encontró el ícono para el proyecto:', idProyectoPadre, 'ID buscado: icon-subproyectos-' + idProyectoPadre);
    }

    // Toggle de visibilidad
    subproyectosRows.forEach(function (row) {
        if (estaVisible) {
            // Ocultar: usar setProperty con important para asegurar que se oculte
            row.style.setProperty('display', 'none', 'important');
            row.classList.add('subproyectos-ocultos');
        } else {
            // Mostrar: remover clase y establecer display
            row.classList.remove('subproyectos-ocultos');
            // Forzar el display grid con !important usando setProperty
            row.style.setProperty('display', 'grid', 'important');
        }
    });

    // Verificar después de un pequeño delay
    setTimeout(() => {
        const primerSubproyecto = subproyectosRows[0];
        if (primerSubproyecto) {
            const computedDisplay = window.getComputedStyle(primerSubproyecto).display;
            console.log('Después de toggle - Display computado:', computedDisplay);
            console.log('Elemento visible (offsetHeight):', primerSubproyecto.offsetHeight);
            console.log('Estilo inline display:', primerSubproyecto.style.display);
        }
    }, 50);
};

// Función para ajustar la altura del textarea WIN dinámicamente
function ajustarAlturaTextarea(textarea) {
    if (!textarea) return;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c387d317-3dcc-4598-b290-b71e313e8754',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'table-renderer.js:739',message:'ajustarAlturaTextarea ENTRY',data:{textareaExists:!!textarea,valueLength:textarea?.value?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const contenido = textarea.value;
    
    // Si está vacío, mantener en 1 renglón
    if (!contenido.trim()) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c387d317-3dcc-4598-b290-b71e313e8754',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'table-renderer.js:747',message:'textarea vacío - manteniendo 1 renglón',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        textarea.setAttribute('rows', '1');
        textarea.style.height = '20px';
        return;
    }
    
    // Contar saltos de línea reales (Enter presionado)
    const lineasReales = contenido.split('\n').length;
    
    // Guardar altura y rows actuales ANTES de modificar
    const alturaActual = textarea.clientHeight;
    const rowsActual = parseInt(textarea.getAttribute('rows')) || 1;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c387d317-3dcc-4598-b290-b71e313e8754',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'table-renderer.js:760',message:'ANTES de modificar altura',data:{alturaActual,rowsActual,lineasReales,contenidoLength:contenido.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Estrategia: Verificar overflow real usando la altura actual (sin forzar altura mínima)
    // Solo expandir cuando realmente hay overflow o saltos de línea
    
    // Si está en 1 renglón, verificar si realmente necesita expandir
    if (rowsActual === 1) {
        // Verificar overflow usando la altura actual (sin forzar a 20px)
        const scrollHeightActual = textarea.scrollHeight;
        const hayOverflow = scrollHeightActual > alturaActual;
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c387d317-3dcc-4598-b290-b71e313e8754',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'table-renderer.js:771',message:'Verificación overflow (rows=1)',data:{hayOverflow,scrollHeightActual,alturaActual,lineasReales},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        // Si no hay overflow y solo hay 1 línea de texto (sin saltos de línea)
        if (!hayOverflow && lineasReales === 1) {
            // Mantener en 1 renglón - no expandir
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c387d317-3dcc-4598-b290-b71e313e8754',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'table-renderer.js:777',message:'Mantener en 1 renglón (no overflow, 1 línea)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            return; // No hacer nada, ya está bien
        }
        
        // Hay overflow o múltiples líneas, necesitamos expandir
        // Usar una altura temporal muy grande para medir sin afectar visualmente
        const alturaTemporal = textarea.style.height;
        textarea.style.height = '9999px';
        const scrollHeight = textarea.scrollHeight;
        textarea.style.height = alturaTemporal; // Restaurar inmediatamente
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c387d317-3dcc-4598-b290-b71e313e8754',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'table-renderer.js:789',message:'Calculando altura necesaria (overflow o múltiples líneas)',data:{scrollHeight,lineasReales},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        // Calcular número de líneas necesarias
        const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 19.5;
        const padding = 8;
        const lineasPorOverflow = Math.ceil((scrollHeight - padding) / lineHeight);
        const lineasNecesarias = Math.max(lineasReales, lineasPorOverflow);
        
        // Expandir
        if (lineasNecesarias > 1) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c387d317-3dcc-4598-b290-b71e313e8754',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'table-renderer.js:802',message:'AJUSTANDO altura del textarea (expandir)',data:{lineasNecesarias,scrollHeight},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            textarea.setAttribute('rows', lineasNecesarias);
            textarea.style.height = scrollHeight + 'px';
        }
        return;
    }
    
    // Si ya está en múltiples renglones, verificar si necesita ajustar
    // Usar una altura temporal muy grande para medir
    const alturaTemporal = textarea.style.height;
    textarea.style.height = '9999px';
    const scrollHeight = textarea.scrollHeight;
    textarea.style.height = alturaTemporal; // Restaurar inmediatamente
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c387d317-3dcc-4598-b290-b71e313e8754',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'table-renderer.js:815',message:'Verificando altura en múltiples renglones',data:{scrollHeight,alturaActual,lineasReales},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // Calcular número de líneas necesarias
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 19.5;
    const padding = 8;
    const lineasPorOverflow = Math.ceil((scrollHeight - padding) / lineHeight);
    const lineasNecesarias = Math.max(lineasReales, lineasPorOverflow);
    
    // Solo ajustar si la altura necesaria es diferente a la actual
    // (con un margen de 2px para evitar ajustes mínimos)
    if (Math.abs(scrollHeight - alturaActual) > 2 || rowsActual !== lineasNecesarias) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c387d317-3dcc-4598-b290-b71e313e8754',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'table-renderer.js:825',message:'AJUSTANDO altura del textarea',data:{lineasNecesarias,scrollHeight,alturaActual,rowsActual},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        if (lineasNecesarias > 1) {
            textarea.setAttribute('rows', lineasNecesarias);
            textarea.style.height = scrollHeight + 'px';
        } else {
            textarea.setAttribute('rows', '1');
            textarea.style.height = '20px';
        }
    } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c387d317-3dcc-4598-b290-b71e313e8754',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'table-renderer.js:833',message:'NO ajustar - altura ya es correcta',data:{scrollHeight,alturaActual,diferencia:Math.abs(scrollHeight-alturaActual)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
    }
}

// Ajustar scroll cuando se redimensiona la ventana
if (typeof window !== 'undefined') {
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            configurarScrollbarFija();
            ajustarScrollHorizontal();
        }, 250);
    });
}


