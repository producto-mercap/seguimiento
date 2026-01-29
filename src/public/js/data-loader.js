/**
 * Funciones de carga de datos
 * Seguimiento de Proyectos
 */

/** Skeleton Gantt (vista previa mientras carga) - solo menú principal */
function getSkeletonGanttHTML() {
    const rows = 6;
    let html = '<div class="gantt-skeleton" style="padding:16px;background:#fafbfc;border-radius:8px;border:1px solid #e8eaed;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
    html += '<div style="height:24px;width:180px;background:linear-gradient(90deg,#e8eaed 25%,#f1f3f4 50%,#e8eaed 75%);background-size:200% 100%;animation:shimmer 1.2s ease-in-out infinite;border-radius:4px;"></div>';
    html += '<div style="display:flex;gap:8px;"><div style="height:32px;width:70px;background:#e8eaed;border-radius:4px;"></div><div style="height:32px;width:70px;background:#e8eaed;border-radius:4px;"></div></div></div>';
    html += '<div style="display:flex;border-top:1px solid #e8eaed;">';
    html += '<div style="width:200px;padding:12px 0;border-right:1px solid #e8eaed;">';
    for (let i = 0; i < rows; i++) {
        html += '<div style="height:36px;margin:4px 12px;background:linear-gradient(90deg,#e8eaed 25%,#f1f3f4 50%,#e8eaed 75%);background-size:200% 100%;animation:shimmer 1.2s ease-in-out infinite;border-radius:4px;animation-delay:' + (i * 0.05) + 's;"></div>';
    }
    html += '</div><div style="flex:1;padding:12px 0;overflow:hidden;">';
    for (let i = 0; i < rows; i++) {
        const w = 40 + Math.random() * 30;
        html += '<div style="height:36px;margin:4px 0;display:flex;align-items:center;"><div style="height:24px;width:' + w + '%;max-width:280px;background:linear-gradient(90deg,#e8eaed 25%,#f1f3f4 50%,#e8eaed 75%);background-size:200% 100%;animation:shimmer 1.2s ease-in-out infinite;border-radius:4px;animation-delay:' + (i * 0.05) + 's;"></div></div>';
    }
    html += '</div></div></div>';
    return html;
}

/** Skeleton tabla (vista previa mientras carga) - solo menú principal */
function getSkeletonTablaHTML() {
    const rows = 8;
    let html = '<div class="table-skeleton" style="background:#fff;border-radius:8px;border:1px solid #e8eaed;overflow:hidden;">';
    html += '<div style="display:flex;height:40px;background:#f8f9fa;border-bottom:1px solid #e8eaed;padding:0 12px;align-items:center;gap:8px;">';
    for (let c = 0; c < 6; c++) {
        html += '<div style="height:14px;flex:1;min-width:60px;max-width:120px;background:#e8eaed;border-radius:4px;"></div>';
    }
    html += '</div>';
    for (let r = 0; r < rows; r++) {
        html += '<div style="display:flex;height:44px;border-bottom:1px solid #f1f3f4;padding:0 12px;align-items:center;gap:8px;">';
        for (let c = 0; c < 6; c++) {
            const w = 60 + (c === 1 ? 40 : 0);
            html += '<div style="height:14px;flex:1;min-width:50px;max-width:' + w + 'px;background:linear-gradient(90deg,#f1f3f4 25%,#e8eaed 50%,#f1f3f4 75%);background-size:200% 100%;animation:shimmer 1.2s ease-in-out infinite;border-radius:4px;animation-delay:' + (r * 0.04 + c * 0.02) + 's;"></div>';
        }
        html += '</div>';
    }
    html += '</div>';
    return html;
}

/**
 * Cargar proyectos de todos los equipos (vista principal sin producto seleccionado).
 * Primero carga y muestra el Gantt, luego la tabla. Gantt y tabla se renderizan en paralelo para mejor performance.
 */
async function cargarDatosTodosEquipos() {
    const contenido = document.getElementById('contenido');
    const ganttContainer = document.getElementById('team-gantt-container');
    if (!contenido) return;

    contenido.className = 'table-container proyectos-container';
    contenido.style.background = '';
    contenido.style.borderRadius = '';
    contenido.style.boxShadow = '';
    contenido.style.overflow = '';
    contenido.innerHTML = getSkeletonTablaHTML();
    if (ganttContainer) {
        ganttContainer.style.display = 'block';
        ganttContainer.innerHTML = getSkeletonGanttHTML();
    }

    const incluirCerrados = document.getElementById('incluirCerrados')?.checked || false;
    let params = 'incluirCerrados=' + (incluirCerrados ? 'true' : 'false');
    if (typeof busquedaActual !== 'undefined' && busquedaActual) {
        params += '&busqueda=' + encodeURIComponent(busquedaActual);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        const response = await fetch('/api/proyectos?' + params, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Error del servidor';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorMessage;
            } catch (e) {
                errorMessage = 'Error HTTP ' + response.status;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Error al obtener los datos');
        if (!result.data) throw new Error('No se recibieron datos del servidor');

        let datos = result.data;
        if (!incluirCerrados) {
            datos = datos.filter(d => (d.estado || '').toLowerCase() !== 'cerrado');
        }

        // Excluir proyectos cuyo "equipo" no está mapeado (ej. "32", "39" son IDs sin nombre en productosEquiposData)
        if (typeof obtenerNombreEquipoSolo === 'function') {
            datos = datos.filter(function (item) {
                if (!item.equipo) return true;
                const nombre = obtenerNombreEquipoSolo(item.equipo);
                return nombre !== String(item.equipo);
            });
        }

        datosOriginales = datos;
        datosTablaActual = [...datos];

        if (typeof actualizarFiltroClientesDesdeTabla === 'function') {
            actualizarFiltroClientesDesdeTabla();
        }
        if (typeof actualizarFiltroEquiposDesdeTabla === 'function') {
            actualizarFiltroEquiposDesdeTabla();
        }

        // Aplicar filtros en cliente
        let datosFiltrados = [...datos];
        if (typeof filtrosClientes !== 'undefined' && filtrosClientes.length > 0) {
            datosFiltrados = datosFiltrados.filter(d => filtrosClientes.includes(d.cliente));
        }
        if (typeof filtrosCategorias !== 'undefined' && filtrosCategorias.length > 0) {
            datosFiltrados = datosFiltrados.filter(d => filtrosCategorias.includes(d.categoria));
        }
        if (typeof filtrosEstados !== 'undefined' && filtrosEstados.length > 0) {
            datosFiltrados = datosFiltrados.filter(d => filtrosEstados.includes(d.estado));
        }
        if (typeof filtrosEquipos !== 'undefined' && filtrosEquipos.length > 0) {
            datosFiltrados = datosFiltrados.filter(d => d.equipo && filtrosEquipos.includes(String(d.equipo)));
        }

        if (typeof actualizarFiltrosAplicados === 'function') {
            actualizarFiltrosAplicados();
        }

        const contadorEl = document.getElementById('contadorProyectos');
        if (contadorEl) {
            contadorEl.textContent = 'Total proyectos: ' + datosFiltrados.length;
        }

        // Gantt y tabla en paralelo: tabla se empieza a renderizar mientras carga el Gantt (mejor performance)
        const tablePromise = typeof renderizarTabla === 'function'
            ? Promise.resolve().then(function () { renderizarTabla(datosFiltrados); })
            : Promise.resolve();

        if (ganttContainer && typeof renderizarGanttEquipo === 'function' && datosFiltrados.length > 0) {
            await renderizarGanttEquipo(datosFiltrados);
            ganttContainer.style.display = 'block';
        } else if (ganttContainer) {
            ganttContainer.style.display = 'none';
            ganttContainer.innerHTML = '';
        }

        await tablePromise;
    } catch (error) {
        console.error('Error al cargar proyectos de todos los equipos:', error);
        contenido.innerHTML = '<div class="empty-state">' +
            '<div class="empty-state-icon">❌</div>' +
            '<div class="empty-state-text">Error al cargar proyectos</div>' +
            '<div class="empty-state-subtext">' + (error.message || '') + '</div>' +
            '<button class="button" onclick="cargarDatosTodosEquipos()" style="margin-top: 16px;">Reintentar</button>' +
            '</div>';
        datosTablaActual = [];
        datosOriginales = [];
        const contadorEl = document.getElementById('contadorProyectos');
        if (contadorEl) contadorEl.textContent = 'Total proyectos: 0';
        const ganttContainer = document.getElementById('team-gantt-container');
        if (ganttContainer) ganttContainer.style.display = 'none';
    }
}

// Función para mostrar dashboard cuando no hay producto seleccionado (ya no se usa; reemplazada por tabla+gantt)
async function mostrarDashboard() {
    const contenido = document.getElementById('contenido');

    // Eliminar estilos de table-container cuando se muestra el dashboard
    contenido.className = '';
    contenido.style.background = 'transparent';
    contenido.style.borderRadius = '0';
    contenido.style.boxShadow = 'none';
    contenido.style.overflow = 'visible';

    // Mostrar loading
    contenido.innerHTML = '<div class="empty-state"><div class="spinner"></div><div class="empty-state-text">Cargando métricas...</div></div>';

    try {
        const response = await fetch('/api/dashboard/metricas');
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Error al cargar métricas');
        }

        const metricas = result.data || [];

        // Crear un mapa de métricas por producto
        const metricasMap = {};
        metricas.forEach(m => {
            metricasMap[m.producto] = m;
        });

        // Orden específico de productos
        const ordenProductos = [
            'Abbaco',
            'Portfolio',
            'Portfolio Cloud',
            'Unitrade',
            'Trading Room',
            'Order Management',
            'Pepper'
        ];

        // Crear un mapa de productos ordenados
        const productosOrdenados = [];
        ordenProductos.forEach(function (nombreOrdenado) {
            const productoEncontrado = productosEquiposData.find(function (item) {
                const productoNormalizado = item.producto === 'OMS' ? 'Order Management' : item.producto;
                return productoNormalizado === nombreOrdenado || item.producto === nombreOrdenado;
            });
            if (productoEncontrado) {
                productosOrdenados.push(productoEncontrado);
            }
        });

        // Agregar productos que no están en el orden específico
        productosEquiposData.forEach(function (item) {
            if (!productosOrdenados.includes(item)) {
                productosOrdenados.push(item);
            }
        });

        // Función para convertir hex a rgba
        function hexToRgba(hex, alpha) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
        }

        // Función para obtener colores únicos por producto
        function obtenerColoresProducto(producto) {
            const colores = {
                'Abbaco': { primary: '#4285F4', secondary: '#E8F0FE', gradient: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)' },
                'Portfolio': { primary: '#4285F4', secondary: '#E8F0FE', gradient: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)' },
                'Portfolio Cloud': { primary: '#4285F4', secondary: '#E8F0FE', gradient: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)' },
                'Unitrade': { primary: '#F67F1E', secondary: '#FEF3E8', gradient: 'linear-gradient(135deg, #F67F1E 0%, #FF9800 100%)' },
                'Trading Room': { primary: '#F67F1E', secondary: '#FEF3E8', gradient: 'linear-gradient(135deg, #F67F1E 0%, #FF9800 100%)' },
                'Order Management': { primary: '#F67F1E', secondary: '#FEF3E8', gradient: 'linear-gradient(135deg, #F67F1E 0%, #FF9800 100%)' },
                'OMS': { primary: '#F67F1E', secondary: '#FEF3E8', gradient: 'linear-gradient(135deg, #F67F1E 0%, #FF9800 100%)' },
                'Pepper': { primary: '#34A853', secondary: '#E6F4EA', gradient: 'linear-gradient(135deg, #34A853 0%, #2E7D32 100%)' }
            };
            return colores[producto] || { primary: '#1A73E8', secondary: '#E8F0FE', gradient: 'linear-gradient(135deg, #1A73E8 0%, #4285F4 100%)' };
        }

        // Grid responsive: se adapta al tamaño de pantalla
        // - Pantallas pequeñas (< 640px): 1 columna
        // - Pantallas medianas (640px - 1024px): 2 columnas
        // - Pantallas grandes (> 1024px): 3 columnas fijas
        // Usar solo la clase CSS, sin estilos inline que puedan interferir
        let dashboardHTML = '<div class="dashboard-grid" style="position: relative; z-index: 1;">';

        productosOrdenados.forEach(function (item, index) {
            const producto = item.producto;
            const productoNormalizado = producto === 'OMS' ? 'Order Management' : producto;
            const equipos = item.equipos || [];
            const metrica = metricasMap[producto] || { total_equipos: 0, total_clientes: 0, proyectos_en_curso: 0 };
            const colores = obtenerColoresProducto(producto);

            // Para Abbaco y Pepper, solo mostrar "Proyectos en Curso"
            const mostrarClientes = producto !== 'Abbaco' && producto !== 'Pepper';

            // Determinar URL de redirección: si hay equipos, usar el primero; si no, solo producto
            const primerEquipo = equipos.length > 0 ? equipos[0] : null;
            const urlRedireccion = primerEquipo
                ? '/?producto=' + encodeURIComponent(producto) + '&equipo=' + encodeURIComponent(primerEquipo.id_equipo_redmine)
                : '/?producto=' + encodeURIComponent(producto);

            // Estilo tipo article card con detalle decorativo (sin click en la tarjeta completa)
            // El padding se maneja desde CSS con media queries
            dashboardHTML += '<div class="feed-article dashboard-card" style="position: relative; background: white; border-radius: 12px; box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15); transition: all 0.2s; cursor: default; border: 1px solid transparent; overflow: visible;" onmouseover="this.style.boxShadow=\'0 2px 6px 2px rgba(60,64,67,.15), 0 1px 2px 0 rgba(60,64,67,.3)\'; this.style.borderColor=\'#dadce0\';" onmouseout="this.style.boxShadow=\'0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)\'; this.style.borderColor=\'transparent\';">';

            // Detalle decorativo en esquina superior derecha
            dashboardHTML += '<div style="position: absolute; top: 0; right: 0; width: 40px; height: 40px; background: ' + colores.primary + '; opacity: 0.1; border-radius: 0 12px 0 40px;"></div>';
            dashboardHTML += '<div style="position: absolute; top: 8px; right: 8px; width: 6px; height: 6px; background: ' + colores.primary + '; border-radius: 50%;"></div>';

            // Eyebrow (Producto) - con color del producto
            dashboardHTML += '<a class="uni-eyebrow" style="display: inline-block; font-size: 14px; font-weight: 500; color: ' + colores.primary + '; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; font-family: \'Google Sans\', \'Roboto\', sans-serif;">' + productoNormalizado.toUpperCase() + '</a>';

            // Equipos como tags (clickeables para redirigir a ese equipo específico)
            if (equipos.length > 0) {
                dashboardHTML += '<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;">';
                equipos.forEach(function (equipo) {
                    const urlEquipo = '/?producto=' + encodeURIComponent(producto) + '&equipo=' + encodeURIComponent(equipo.id_equipo_redmine);
                    dashboardHTML += '<span onclick="event.stopPropagation(); window.location.href=\'' + urlEquipo + '\'" style="display: inline-flex; align-items: center; padding: 4px 10px; background: rgba(222, 235, 242, 1); color: #5f6368; border-radius: 12px; font-size: 12px; font-weight: 500; font-family: \'Google Sans\', \'Roboto\', sans-serif; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background=\'rgba(26, 115, 232, 0.1)\'; this.style.color=\'#1a73e8\';" onmouseout="this.style.background=\'rgba(222, 235, 242, 1)\'; this.style.color=\'#5f6368\';">' + equipo.equipo + '</span>';
                });
                dashboardHTML += '</div>';
            }

            // Línea divisora gris oscura antes de las métricas
            dashboardHTML += '<div style="border-top: 1px solid #5f6368; margin: 8px 0 12px 0; opacity: 0.3;"></div>';

            // Métricas - estilo eyebrow__date
            dashboardHTML += '<div style="display: flex; flex-direction: column; gap: 8px;">';

            // Métrica: Total Clientes (solo si no es Abbaco ni Pepper)
            if (mostrarClientes) {
                dashboardHTML += '<span class="eyebrow__date" style="display: inline-block; font-size: 12px; font-weight: 500; color: #5f6368; text-transform: uppercase; letter-spacing: 0.5px; font-family: \'Google Sans\', \'Roboto\', sans-serif; line-height: 1.5;">CLIENTES ' + parseInt(metrica.total_clientes || 0) + '</span>';
            }

            // Métrica: Proyectos en Curso
            dashboardHTML += '<span class="eyebrow__date" style="display: inline-block; font-size: 12px; font-weight: 500; color: #5f6368; text-transform: uppercase; letter-spacing: 0.5px; font-family: \'Google Sans\', \'Roboto\', sans-serif; line-height: 1.5;">PROYECTOS EN CURSO ' + parseInt(metrica.proyectos_en_curso || 0) + '</span>';

            dashboardHTML += '</div>';
            dashboardHTML += '</div>';
        });

        dashboardHTML += '</div>';

        contenido.innerHTML = dashboardHTML;
    } catch (error) {
        console.error('Error al cargar métricas:', error);
        contenido.innerHTML = '<div class="empty-state"><div class="empty-state-text">Error al cargar métricas</div><div class="empty-state-subtext">' + error.message + '</div></div>';
    }
}

async function cargarClientesParaFiltro() {
    actualizarFiltroClientesDesdeTabla();
}

function actualizarFiltroClientesDesdeTabla() {
    try {
        const clientes = [...new Set(datosTablaActual.map(p => p.cliente).filter(c => c))].sort();
        const filterClientes = document.getElementById('filterClientes');
        if (filterClientes) {
            let html = '<div style="padding: 8px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">';
            html += '<button onclick="seleccionarTodosClientes()" style="background: none; border: none; color: var(--primary-color); font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 8px;">Todos</button>';
            html += '<button onclick="deseleccionarTodosClientes()" style="background: none; border: none; color: var(--text-secondary); font-size: 13px; cursor: pointer; padding: 4px 8px;">Borrar todos</button>';
            html += '</div>';
            html += clientes.map(cliente => {
                const checked = (typeof filtrosClientes !== 'undefined' && filtrosClientes.includes(cliente)) ? 'checked' : '';
                return `
                <label style="display: flex; align-items: center; padding: 10px 16px; cursor: pointer; transition: background 0.2s;" 
                       onmouseover="this.style.background='#f1f3f4'" 
                       onmouseout="this.style.background='white'">
                    <input type="checkbox" class="filter-checkbox-cliente" value="${cliente}" ${checked} style="margin-right: 8px; cursor: pointer;" onchange="aplicarFiltrosProyectos()" />
                    <span style="font-size: 13px;">${cliente}</span>
                </label>
            `;
            }).join('');
            filterClientes.innerHTML = html;
        }

        // Actualizar también el filtro de categorías
        const categorias = [...new Set(datosTablaActual.map(p => p.categoria).filter(c => c))].sort();
        const filterCategorias = document.getElementById('filterCategorias');
        if (filterCategorias) {
            let html = '<div style="padding: 8px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">';
            html += '<button onclick="seleccionarTodosCategorias()" style="background: none; border: none; color: var(--primary-color); font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 8px;">Todos</button>';
            html += '<button onclick="deseleccionarTodosCategorias()" style="background: none; border: none; color: var(--text-secondary); font-size: 13px; cursor: pointer; padding: 4px 8px;">Borrar todos</button>';
            html += '</div>';
            html += categorias.map(categoria => {
                const checked = (typeof filtrosCategorias !== 'undefined' && filtrosCategorias.includes(categoria)) ? 'checked' : '';
                return `
                <label style="display: flex; align-items: center; padding: 10px 16px; cursor: pointer; transition: background 0.2s;" 
                       onmouseover="this.style.background='#f1f3f4'" 
                       onmouseout="this.style.background='white'">
                    <input type="checkbox" class="filter-checkbox-categoria" value="${categoria}" ${checked} style="margin-right: 8px; cursor: pointer;" onchange="aplicarFiltrosProyectos()" />
                    <span style="font-size: 13px;">${categoria}</span>
                </label>
            `;
            }).join('');
            filterCategorias.innerHTML = html;
        }

        if (typeof vistaTodosEquipos !== 'undefined' && vistaTodosEquipos) {
            actualizarFiltroEquiposDesdeTabla();
        }
    } catch (error) {
        console.error('Error al actualizar filtro de clientes y categorías:', error);
    }
}

function obtenerNombreEquipo(idEquipo) {
    if (!idEquipo || !productosEquiposData) return null;
    const id = String(idEquipo);
    for (let i = 0; i < productosEquiposData.length; i++) {
        const item = productosEquiposData[i];
        const equipos = item.equipos || [];
        for (let j = 0; j < equipos.length; j++) {
            if (String(equipos[j].id_equipo_redmine) === id) {
                const prod = item.producto === 'OMS' ? 'Order Management' : item.producto;
                return prod + ' - ' + (equipos[j].equipo || id);
            }
        }
    }
    return id;
}

/** Solo el nombre del equipo (sin "Producto - "). Para mostrar en tabla truncado. */
function obtenerNombreEquipoSolo(idEquipo) {
    if (!idEquipo || !productosEquiposData) return null;
    const id = String(idEquipo);
    for (let i = 0; i < productosEquiposData.length; i++) {
        const item = productosEquiposData[i];
        const equipos = item.equipos || [];
        for (let j = 0; j < equipos.length; j++) {
            if (String(equipos[j].id_equipo_redmine) === id) {
                return equipos[j].equipo || id;
            }
        }
    }
    return id;
}

function actualizarFiltroEquiposDesdeTabla() {
    const filterEquipos = document.getElementById('filterEquipos');
    if (!filterEquipos) return;
    try {
        const equiposEnDatos = [...new Set(datosTablaActual.map(p => p.equipo).filter(e => e))].map(String);
        const listaEquipos = [];
        (productosEquiposData || []).forEach(item => {
            (item.equipos || []).forEach(equipo => {
                const id = String(equipo.id_equipo_redmine || '');
                if (id && equiposEnDatos.includes(id)) {
                    const label = (item.producto === 'OMS' ? 'Order Management' : item.producto) + ' - ' + (equipo.equipo || id);
                    if (!listaEquipos.find(e => e.id === id)) {
                        listaEquipos.push({ id: id, label: label });
                    }
                }
            });
        });
        listaEquipos.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
        let html = '<div style="padding: 8px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">';
        html += '<button onclick="seleccionarTodosEquipos()" style="background: none; border: none; color: var(--primary-color); font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 8px;">Todos</button>';
        html += '<button onclick="deseleccionarTodosEquipos()" style="background: none; border: none; color: var(--text-secondary); font-size: 13px; cursor: pointer; padding: 4px 8px;">Borrar todos</button>';
        html += '</div>';
        listaEquipos.forEach(eq => {
            const checked = (typeof filtrosEquipos !== 'undefined' && filtrosEquipos.includes(eq.id)) ? 'checked' : '';
            html += '<label style="display: flex; align-items: center; padding: 10px 16px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background=\'#f1f3f4\'" onmouseout="this.style.background=\'white\'">';
            html += '<input type="checkbox" class="filter-checkbox-equipo" value="' + (eq.id || '').replace(/"/g, '&quot;') + '" ' + checked + ' style="margin-right: 8px; cursor: pointer;" onchange="aplicarFiltrosProyectos()" />';
            html += '<span style="font-size: 13px;">' + (eq.label || eq.id).replace(/</g, '&lt;') + '</span></label>';
        });
        filterEquipos.innerHTML = html;
    } catch (error) {
        console.error('Error al actualizar filtro de equipos:', error);
    }
}

async function cargarDatos() {
    const contenido = document.getElementById('contenido');
    const ganttContainer = document.getElementById('team-gantt-container');

    // Vista previa (skeleton) en pestaña Proyectos; spinner en Mantenimiento
    if (typeof tipoActual !== 'undefined' && tipoActual !== 'mantenimiento') {
        contenido.innerHTML = getSkeletonTablaHTML();
        if (ganttContainer) {
            ganttContainer.style.display = 'block';
            ganttContainer.innerHTML = getSkeletonGanttHTML();
        }
    } else {
        contenido.innerHTML = '<div class="empty-state"><div class="spinner"></div><div class="empty-state-text">Cargando datos...</div></div>';
    }

    try {
        if (typeof productoActual === 'undefined' || !productoActual) {
            throw new Error('productoActual no está definido. No se puede cargar datos sin especificar el producto.');
        }

        let endpoint = '';
        let params = 'producto=' + encodeURIComponent(productoActual);
        if (typeof equipoActual !== 'undefined' && equipoActual) {
            params += '&equipo=' + encodeURIComponent(equipoActual);
        }
        if (typeof busquedaActual !== 'undefined' && busquedaActual) {
            params += '&busqueda=' + encodeURIComponent(busquedaActual);
        }

        if (typeof tipoActual === 'undefined') {
            throw new Error('tipoActual no está definido. No se puede cargar datos sin especificar el tipo.');
        }

        if (tipoActual === 'mantenimiento') {
            endpoint = '/api/mantenimiento?' + params;
        } else {
            // Para todas las demás categorías (proyectos externos, internos, bolsa de horas, etc.)
            // Usar el endpoint de proyectos con la categoría correspondiente
            endpoint = '/api/proyectos?' + params;

            // Si hay categoría definida, agregarla como parámetro
            if (typeof categoriaActual !== 'undefined' && categoriaActual) {
                endpoint += '&categoria=' + encodeURIComponent(categoriaActual);
            }

            // Agregar parámetro incluirCerrados
            const incluirCerrados = document.getElementById('incluirCerrados')?.checked || false;
            if (incluirCerrados) {
                endpoint += '&incluirCerrados=true';
            }
        }

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

            // Para todas las categorías que no sean mantenimiento (proyectos externos, internos, bolsa de horas, etc.)
            if (tipoActual !== 'mantenimiento') {
                if (typeof datosOriginales !== 'undefined') {
                    datosOriginales = result.data;
                }
                const incluirCerrados = document.getElementById('incluirCerrados')?.checked || false;
                let datosParaFiltro = [...result.data];
                if (!incluirCerrados) {
                    datosParaFiltro = datosParaFiltro.filter(d => (d.estado || '').toLowerCase() !== 'cerrado');
                }
                if (typeof datosTablaActual !== 'undefined') {
                    datosTablaActual = datosParaFiltro;
                }
                if (typeof actualizarFiltroClientesDesdeTabla === 'function') {
                    actualizarFiltroClientesDesdeTabla();
                }
            }

            if (tipoActual !== 'mantenimiento') {
                if (typeof filtrosClientes !== 'undefined' && filtrosClientes.length > 0) {
                    datosFiltrados = datosFiltrados.filter(d => filtrosClientes.includes(d.cliente));
                }
                if (typeof filtrosCategorias !== 'undefined' && filtrosCategorias.length > 0) {
                    datosFiltrados = datosFiltrados.filter(d => filtrosCategorias.includes(d.categoria));
                }
                if (typeof filtrosEstados !== 'undefined' && filtrosEstados.length > 0) {
                    datosFiltrados = datosFiltrados.filter(d => filtrosEstados.includes(d.estado));
                }
                const incluirCerrados = document.getElementById('incluirCerrados')?.checked || false;
                if (!incluirCerrados) {
                    datosFiltrados = datosFiltrados.filter(d => (d.estado || '').toLowerCase() !== 'cerrado');
                }
                if (typeof actualizarFiltrosAplicados === 'function') {
                    actualizarFiltrosAplicados();
                }
            }

            if (tipoActual !== 'mantenimiento' && typeof ordenActual !== 'undefined' && ordenActual && ordenActual.columna === 'cliente') {
                datosFiltrados.sort((a, b) => {
                    const clienteA = (a.cliente || '').toLowerCase();
                    const clienteB = (b.cliente || '').toLowerCase();
                    if (clienteA !== clienteB) {
                        return ordenActual.direccion === 'asc'
                            ? (clienteA < clienteB ? -1 : 1)
                            : (clienteA > clienteB ? -1 : 1);
                    }
                    const ordenEstadosArray = typeof ordenEstados !== 'undefined' ? ordenEstados : [];
                    const indexA = ordenEstadosArray.indexOf((a.estado || '').toLowerCase());
                    const indexB = ordenEstadosArray.indexOf((b.estado || '').toLowerCase());
                    const estadoA = indexA === -1 ? 999 : indexA;
                    const estadoB = indexB === -1 ? 999 : indexB;
                    return estadoA - estadoB;
                });
            }

            if (typeof renderizarTabla === 'function') {
                renderizarTabla(datosFiltrados);

                // Cargar Gantt de equipo si corresponde (después de rendering de tabla)
                if (typeof renderizarGanttEquipo === 'function' && tipoActual !== 'mantenimiento') {
                    // Usar setTimeout para permitir que la tabla se renderice primero (UI responsive)
                    setTimeout(async () => {
                        console.log('Actualizando Gantt de equipo con ' + datosFiltrados.length + ' proyectos');
                        await renderizarGanttEquipo(datosFiltrados);
                    }, 100);
                }
            } else {
                console.warn('renderizarTabla no está definido');
            }
        } else {
            if (typeof datosTablaActual !== 'undefined') {
                datosTablaActual = [];
            }
            if (typeof datosOriginales !== 'undefined') {
                datosOriginales = [];
            }
            contenido.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No hay datos disponibles</div><div class="empty-state-subtext">Haz clic en "Actualizar" para sincronizar</div></div>';
            if (tipoActual !== 'mantenimiento') {
                if (typeof actualizarFiltroClientesDesdeTabla === 'function') {
                    actualizarFiltroClientesDesdeTabla();
                }
                const contadorProyectos = document.getElementById('contadorProyectos');
                if (contadorProyectos) {
                    contadorProyectos.textContent = 'total proyectos: 0';
                }
                const ganttContainer = document.getElementById('team-gantt-container');
                if (ganttContainer) ganttContainer.style.display = 'none';
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
            '<button class="button" onclick="cargarDatos()" style="margin-top: 16px;">Reintentar</button>' +
            '</div>';

        if (tipoActual !== 'mantenimiento') {
            const contadorProyectos = document.getElementById('contadorProyectos');
            if (contadorProyectos) {
                contadorProyectos.textContent = 'total proyectos: 0';
            }
            const ganttContainerErr = document.getElementById('team-gantt-container');
            if (ganttContainerErr) {
                ganttContainerErr.style.display = 'none';
                ganttContainerErr.innerHTML = '';
            }
        }

        if (typeof datosTablaActual !== 'undefined') {
            datosTablaActual = [];
        }
        if (typeof datosOriginales !== 'undefined') {
            datosOriginales = [];
        }
    }
}


