/**
 * Funciones de búsqueda y filtros
 * Seguimiento de Proyectos
 */

// Nota: busquedaActual se declara en las vistas (index.ejs y proyectos-internos.ejs)
// No declararla aquí para evitar conflictos

// Búsqueda
function buscar(event) {
    if (event) event.preventDefault();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const valor = searchInput.value.trim();
        busquedaActual = valor;
        if (!valor) {
            limpiarBusqueda();
            return;
        }
        if (typeof vistaTodosEquipos !== 'undefined' && vistaTodosEquipos && typeof cargarDatosTodosEquipos === 'function') {
            cargarDatosTodosEquipos();
        } else {
            cargarDatos();
        }
    }
}

// Búsqueda con sugerencias - optimizada con debounce más largo
let timeoutSugerencias;
async function buscarSugerencias(query) {
    clearTimeout(timeoutSugerencias);

    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) {
        console.warn('Contenedor de sugerencias no encontrado');
        return;
    }

    // Si el query está vacío, limpiar la búsqueda y ocultar sugerencias
    if (!query || query.trim().length === 0) {
        suggestionsContainer.style.display = 'none';
        // Si había una búsqueda activa y ahora está vacío, limpiar la búsqueda
        if (busquedaActual && busquedaActual.trim().length > 0) {
            busquedaActual = '';
            cargarDatos();
        }
        return;
    }

    // Si el query tiene menos de 2 caracteres, solo ocultar sugerencias
    if (query.trim().length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }

    timeoutSugerencias = setTimeout(async () => {
        try {
            const queryTrimmed = query.trim();
            // Validar que el query tenga al menos 2 caracteres después de trim
            if (!queryTrimmed || queryTrimmed.length < 2) {
                suggestionsContainer.style.display = 'none';
                return;
            }

            // Construir endpoint con producto y equipo actual si están disponibles
            let endpoint = '/api/proyectos/sugerencias?q=' + encodeURIComponent(queryTrimmed);
            if (typeof productoActual !== 'undefined' && productoActual) {
                endpoint += '&producto=' + encodeURIComponent(productoActual);
            }
            if (typeof equipoActual !== 'undefined' && equipoActual) {
                endpoint += '&equipo=' + encodeURIComponent(equipoActual);
            }
            const response = await fetch(endpoint);
            
            // Si hay un error HTTP, simplemente ocultar sugerencias sin mostrar error
            if (!response.ok) {
                suggestionsContainer.style.display = 'none';
                return;
            }
            
            const data = await response.json();

            if (data.success && data.sugerencias && data.sugerencias.length > 0) {
                // Escapar caracteres especiales para evitar problemas con comillas
                const html = data.sugerencias.map(item => {
                    const nombre = (item.nombre_proyecto || item.nombre || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    const nombreDisplay = (item.nombre_proyecto || item.nombre || 'Sin nombre').replace(/"/g, '&quot;');
                    // Capitalizar primera letra del estado
                    const estadoRaw = item.estado || 'Sin estado';
                    const estadoCapitalizado = estadoRaw.charAt(0).toUpperCase() + estadoRaw.slice(1).toLowerCase();
                    const estadoDisplay = estadoCapitalizado.replace(/"/g, '&quot;');
                    return `
                        <div class="google-suggestion-item" onclick="seleccionarSugerencia('${nombre}')">
                            <div class="suggestion-text">
                                <div class="suggestion-title">${nombreDisplay}</div>
                                <div class="suggestion-subtitle">${estadoDisplay}</div>
                            </div>
                        </div>
                    `;
                }).join('');

                suggestionsContainer.innerHTML = html;
                suggestionsContainer.style.display = 'block';
            } else {
                suggestionsContainer.style.display = 'none';
            }
        } catch (error) {
            // Silenciar errores de red para evitar spam en la consola
            // Solo ocultar sugerencias si hay error
            suggestionsContainer.style.display = 'none';
        }
    }, 250);
}

function actualizarBotonLimpiar(valor) {
    const btnLimpiar = document.getElementById('btnLimpiarBusqueda');
    if (btnLimpiar) {
        btnLimpiar.style.display = valor && valor.trim().length > 0 ? 'flex' : 'none';
    }
}

function limpiarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        searchInput.style.height = 'auto';
        searchInput.style.height = Math.min(searchInput.scrollHeight, 44) + 'px';
        busquedaActual = '';
        actualizarBotonLimpiar('');
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
        // Recargar datos en lugar de recargar toda la página
        // Detectar si estamos en proyectos internos o proyectos normales
        if (typeof cargarDatosProyectosInternos === 'function' && window.location.pathname.includes('proyectos-internos')) {
            cargarDatosProyectosInternos();
        } else if (typeof vistaTodosEquipos !== 'undefined' && vistaTodosEquipos && typeof cargarDatosTodosEquipos === 'function') {
            cargarDatosTodosEquipos();
        } else if (typeof cargarDatos === 'function') {
            cargarDatos();
        } else {
            window.location.reload();
        }
    }
}

function seleccionarSugerencia(texto) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // El texto ya viene escapado desde el onclick, JavaScript lo decodifica automáticamente
        searchInput.value = texto;
        searchInput.style.height = 'auto';
        searchInput.style.height = Math.min(searchInput.scrollHeight, 44) + 'px';
        busquedaActual = texto;
        actualizarBotonLimpiar(texto);
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
        cargarDatos();
    }
}

// Cerrar sugerencias al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.google-search-box')) {
        const suggestions = document.getElementById('searchSuggestions');
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    }
});

// Toggle filters
function toggleFilterClientes(buttonElement) {
    const dropdown = document.getElementById('filterClientes');
    const estadosDropdown = document.getElementById('filterEstados');
    const categoriasDropdown = document.getElementById('filterCategorias');
    const equiposDropdown = document.getElementById('filterEquipos');

    if (estadosDropdown) estadosDropdown.style.display = 'none';
    if (categoriasDropdown) categoriasDropdown.style.display = 'none';
    if (equiposDropdown) equiposDropdown.style.display = 'none';

    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        if (isVisible) {
            dropdown.style.display = 'none';
        } else {
            const button = buttonElement || document.querySelector('button[onclick*="toggleFilterClientes"]');
            if (button) {
                const rect = button.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = rect.left + 'px';
                dropdown.style.zIndex = '100002';
                dropdown.style.background = 'white';
                dropdown.style.borderRadius = '8px';
                dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            }
            dropdown.style.display = 'block';
        }
    }
}

function toggleFilterCategorias(buttonElement) {
    const dropdown = document.getElementById('filterCategorias');
    const clientesDropdown = document.getElementById('filterClientes');
    const estadosDropdown = document.getElementById('filterEstados');
    const equiposDropdown = document.getElementById('filterEquipos');

    if (clientesDropdown) clientesDropdown.style.display = 'none';
    if (estadosDropdown) estadosDropdown.style.display = 'none';
    if (equiposDropdown) equiposDropdown.style.display = 'none';

    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        if (isVisible) {
            dropdown.style.display = 'none';
        } else {
            const button = buttonElement || document.querySelector('button[onclick*="toggleFilterCategorias"]');
            if (button) {
                const rect = button.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = rect.left + 'px';
                dropdown.style.zIndex = '100002';
                dropdown.style.background = 'white';
                dropdown.style.borderRadius = '8px';
                dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            }
            dropdown.style.display = 'block';
        }
    }
}

function toggleFilterEstados(buttonElement) {
    const dropdown = document.getElementById('filterEstados');
    const clientesDropdown = document.getElementById('filterClientes');
    const categoriasDropdown = document.getElementById('filterCategorias');
    const equiposDropdown = document.getElementById('filterEquipos');

    if (clientesDropdown) clientesDropdown.style.display = 'none';
    if (categoriasDropdown) categoriasDropdown.style.display = 'none';
    if (equiposDropdown) equiposDropdown.style.display = 'none';

    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        if (isVisible) {
            dropdown.style.display = 'none';
        } else {
            const button = buttonElement || document.querySelector('button[onclick*="toggleFilterEstados"]');
            if (button) {
                const rect = button.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = rect.left + 'px';
                dropdown.style.zIndex = '100002';
                dropdown.style.background = 'white';
                dropdown.style.borderRadius = '8px';
                dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            }
            dropdown.style.display = 'block';
        }
    }
}

function toggleFilterEquipos(buttonElement) {
    const dropdown = document.getElementById('filterEquipos');
    const clientesDropdown = document.getElementById('filterClientes');
    const categoriasDropdown = document.getElementById('filterCategorias');
    const estadosDropdown = document.getElementById('filterEstados');

    if (clientesDropdown) clientesDropdown.style.display = 'none';
    if (categoriasDropdown) categoriasDropdown.style.display = 'none';
    if (estadosDropdown) estadosDropdown.style.display = 'none';

    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        if (isVisible) {
            dropdown.style.display = 'none';
        } else {
            const button = buttonElement || document.querySelector('button[onclick*="toggleFilterEquipos"]');
            if (button) {
                const rect = button.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = rect.left + 'px';
                dropdown.style.zIndex = '100002';
                dropdown.style.background = 'white';
                dropdown.style.borderRadius = '8px';
                dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            }
            dropdown.style.display = 'block';
        }
    }
}

// Cerrar dropdowns al hacer click fuera
document.addEventListener('click', (e) => {
    const filterClientes = document.getElementById('filterClientes');
    const filterCategorias = document.getElementById('filterCategorias');
    const filterEstados = document.getElementById('filterEstados');
    const filterEquipos = document.getElementById('filterEquipos');

    if (filterClientes && !e.target.closest('#filterClientes') && !e.target.closest('button[onclick*="toggleFilterClientes"]')) {
        filterClientes.style.display = 'none';
    }
    if (filterCategorias && !e.target.closest('#filterCategorias') && !e.target.closest('button[onclick*="toggleFilterCategorias"]')) {
        filterCategorias.style.display = 'none';
    }
    if (filterEstados && !e.target.closest('#filterEstados') && !e.target.closest('button[onclick*="toggleFilterEstados"]')) {
        filterEstados.style.display = 'none';
    }
    if (filterEquipos && !e.target.closest('#filterEquipos') && !e.target.closest('button[onclick*="toggleFilterEquipos"]')) {
        filterEquipos.style.display = 'none';
    }
});

function aplicarFiltrosProyectos() {
    filtrosClientes = Array.from(document.querySelectorAll('.filter-checkbox-cliente:checked')).map(cb => cb.value);
    filtrosCategorias = Array.from(document.querySelectorAll('.filter-checkbox-categoria:checked')).map(cb => cb.value);
    filtrosEstados = Array.from(document.querySelectorAll('.filter-checkbox-estado:checked')).map(cb => cb.value);
    if (typeof filtrosEquipos !== 'undefined') {
        filtrosEquipos = Array.from(document.querySelectorAll('.filter-checkbox-equipo:checked')).map(cb => cb.value);
    }

    const filterClientes = document.getElementById('filterClientes');
    const filterCategorias = document.getElementById('filterCategorias');
    const filterEstados = document.getElementById('filterEstados');
    const filterEquipos = document.getElementById('filterEquipos');
    if (filterClientes) filterClientes.style.display = 'none';
    if (filterCategorias) filterCategorias.style.display = 'none';
    if (filterEstados) filterEstados.style.display = 'none';
    if (filterEquipos) filterEquipos.style.display = 'none';

    actualizarFiltrosAplicados();
    if (typeof vistaTodosEquipos !== 'undefined' && vistaTodosEquipos && typeof cargarDatosTodosEquipos === 'function') {
        cargarDatosTodosEquipos();
    } else {
        cargarDatos();
    }
}

function actualizarFiltrosAplicados() {
    const filtrosAplicados = document.getElementById('filtrosAplicados');
    if (!filtrosAplicados) return;

    const tieneFiltros = filtrosClientes.length > 0 || filtrosCategorias.length > 0 || filtrosEstados.length > 0 ||
        (typeof filtrosEquipos !== 'undefined' && filtrosEquipos.length > 0);

    if (!tieneFiltros) {
        filtrosAplicados.style.display = 'none';
        filtrosAplicados.innerHTML = '';
        return;
    }

    filtrosAplicados.style.display = 'flex';
    let html = '';

    filtrosClientes.forEach(cliente => {
        html += '<div class="filter-chip" style="display: inline-flex; align-items: center; background: #e8f0fe; color: var(--primary-color); padding: 6px 12px; border-radius: 16px; font-size: 13px; font-weight: 500; gap: 8px; margin: 0 4px 4px 0;"><span>Cliente: ' + (cliente || '').replace(/</g, '&lt;') + '</span><button onclick="removerFiltroCliente(\'' + (cliente || '').replace(/'/g, "\\'") + '\')" style="background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: var(--primary-color);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button></div>';
    });
    filtrosCategorias.forEach(categoria => {
        html += '<div class="filter-chip" style="display: inline-flex; align-items: center; background: #e6f4ea; color: #1e8e3e; padding: 6px 12px; border-radius: 16px; font-size: 13px; font-weight: 500; gap: 8px; margin: 0 4px 4px 0;"><span>Categoría: ' + (categoria || '').replace(/</g, '&lt;') + '</span><button onclick="removerFiltroCategoria(\'' + (categoria || '').replace(/'/g, "\\'") + '\')" style="background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: #1e8e3e;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button></div>';
    });
    filtrosEstados.forEach(estado => {
        html += '<div class="filter-chip" style="display: inline-flex; align-items: center; background: #fef7e0; color: #f9ab00; padding: 6px 12px; border-radius: 16px; font-size: 13px; font-weight: 500; gap: 8px; margin: 0 4px 4px 0;"><span>Estado: ' + (estado || '').replace(/</g, '&lt;') + '</span><button onclick="removerFiltroEstado(\'' + (estado || '').replace(/'/g, "\\'") + '\')" style="background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: #f9ab00;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button></div>';
    });
    if (typeof filtrosEquipos !== 'undefined' && filtrosEquipos.length > 0) {
        filtrosEquipos.forEach(equipoId => {
            const label = (typeof obtenerNombreEquipo === 'function' && obtenerNombreEquipo(equipoId)) || equipoId;
            html += '<div class="filter-chip" style="display: inline-flex; align-items: center; background: #f3e8fd; color: #7c4dff; padding: 6px 12px; border-radius: 16px; font-size: 13px; font-weight: 500; gap: 8px; margin: 0 4px 4px 0;"><span>Equipo: ' + (label || '').replace(/</g, '&lt;') + '</span><button onclick="removerFiltroEquipo(\'' + String(equipoId || '').replace(/'/g, "\\'") + '\')" style="background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: #7c4dff;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button></div>';
        });
    }

    if (tieneFiltros) {
        html += '<button onclick="limpiarFiltrosProyectos()" style="background: rgb(241, 243, 244); border: none; color: var(--text-secondary); font-size: 13px; cursor: pointer; padding: 6px 12px; border-radius: 16px; transition: background 0.2s;" onmouseover="this.style.background=\'#e8eaed\'" onmouseout="this.style.background=\'rgb(241, 243, 244)\'">Borrar filtros</button>';
    }
    filtrosAplicados.innerHTML = html;
}

function removerFiltroCliente(cliente) {
    filtrosClientes = filtrosClientes.filter(c => c !== cliente);
    const checkbox = document.querySelector('.filter-checkbox-cliente[value="' + cliente + '"]');
    if (checkbox) checkbox.checked = false;
    actualizarFiltrosAplicados();
    cargarDatos();
}

function removerFiltroCategoria(categoria) {
    filtrosCategorias = filtrosCategorias.filter(c => c !== categoria);
    const checkbox = document.querySelector('.filter-checkbox-categoria[value="' + categoria + '"]');
    if (checkbox) checkbox.checked = false;
    actualizarFiltrosAplicados();
    cargarDatos();
}

function removerFiltroEstado(estado) {
    filtrosEstados = filtrosEstados.filter(e => e !== estado);
    const checkbox = document.querySelector('.filter-checkbox-estado[value="' + estado + '"]');
    if (checkbox) checkbox.checked = false;
    actualizarFiltrosAplicados();
    cargarDatos();
}

function limpiarFiltrosProyectos() {
    filtrosClientes = [];
    filtrosCategorias = [];
    filtrosEstados = [];
    if (typeof filtrosEquipos !== 'undefined') filtrosEquipos = [];
    document.querySelectorAll('.filter-checkbox-cliente, .filter-checkbox-categoria, .filter-checkbox-estado, .filter-checkbox-equipo').forEach(cb => cb.checked = false);
    actualizarFiltrosAplicados();
    if (typeof vistaTodosEquipos !== 'undefined' && vistaTodosEquipos && typeof cargarDatosTodosEquipos === 'function') {
        cargarDatosTodosEquipos();
    } else {
        cargarDatos();
    }
}

function removerFiltroEquipo(equipoId) {
    if (typeof filtrosEquipos === 'undefined') return;
    filtrosEquipos = filtrosEquipos.filter(e => String(e) !== String(equipoId));
    const checkbox = document.querySelector('.filter-checkbox-equipo[value="' + String(equipoId).replace(/"/g, '&quot;') + '"]');
    if (checkbox) checkbox.checked = false;
    actualizarFiltrosAplicados();
    if (typeof vistaTodosEquipos !== 'undefined' && vistaTodosEquipos && typeof cargarDatosTodosEquipos === 'function') {
        cargarDatosTodosEquipos();
    } else {
        cargarDatos();
    }
}

function seleccionarTodosEquipos() {
    document.querySelectorAll('.filter-checkbox-equipo').forEach(cb => cb.checked = true);
    aplicarFiltrosProyectos();
}

function deseleccionarTodosEquipos() {
    document.querySelectorAll('.filter-checkbox-equipo').forEach(cb => cb.checked = false);
    aplicarFiltrosProyectos();
}

function seleccionarTodosClientes() {
    document.querySelectorAll('.filter-checkbox-cliente').forEach(cb => cb.checked = true);
    aplicarFiltrosProyectos();
}

function deseleccionarTodosClientes() {
    document.querySelectorAll('.filter-checkbox-cliente').forEach(cb => cb.checked = false);
    aplicarFiltrosProyectos();
}

function seleccionarTodosCategorias() {
    document.querySelectorAll('.filter-checkbox-categoria').forEach(cb => cb.checked = true);
    aplicarFiltrosProyectos();
}

function deseleccionarTodosCategorias() {
    document.querySelectorAll('.filter-checkbox-categoria').forEach(cb => cb.checked = false);
    aplicarFiltrosProyectos();
}

function seleccionarTodosEstados() {
    document.querySelectorAll('.filter-checkbox-estado').forEach(cb => cb.checked = true);
    aplicarFiltrosProyectos();
}

function deseleccionarTodosEstados() {
    document.querySelectorAll('.filter-checkbox-estado').forEach(cb => cb.checked = false);
    aplicarFiltrosProyectos();
}

// Variables para ordenamiento
// Nota: ordenActual y ordenEstados se declaran en las vistas (index.ejs y proyectos-internos.ejs)
// No declararlas aquí para evitar conflictos

function ordenarPor(columna) {
    if (ordenActual.columna === columna) {
        ordenActual.direccion = ordenActual.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        ordenActual.columna = columna;
        // Si es cliente, usar 'desc' por defecto, sino 'asc'
        ordenActual.direccion = columna === 'cliente' ? 'desc' : 'asc';
    }

    // Optimización: ordenar en el cliente sin hacer petición al servidor
    if (typeof datosOriginales !== 'undefined' && datosOriginales && datosOriginales.length > 0) {
        // Aplicar filtros a los datos originales
        let datosFiltrados = [...datosOriginales];

        // Aplicar filtro de incluir cerrados
        const incluirCerrados = document.getElementById('incluirCerrados')?.checked || false;
        if (!incluirCerrados) {
            datosFiltrados = datosFiltrados.filter(d => (d.estado || '').toLowerCase() !== 'cerrado');
        }

        // Aplicar filtros de clientes
        if (typeof filtrosClientes !== 'undefined' && filtrosClientes.length > 0) {
            datosFiltrados = datosFiltrados.filter(d => filtrosClientes.includes(d.cliente));
        }

        // Aplicar filtros de categorías
        if (typeof filtrosCategorias !== 'undefined' && filtrosCategorias.length > 0) {
            datosFiltrados = datosFiltrados.filter(d => filtrosCategorias.includes(d.categoria));
        }

        // Aplicar filtros de estados
        if (typeof filtrosEstados !== 'undefined' && filtrosEstados.length > 0) {
            datosFiltrados = datosFiltrados.filter(d => filtrosEstados.includes(d.estado));
        }
        // Aplicar filtros de equipos (vista todos los equipos)
        if (typeof filtrosEquipos !== 'undefined' && filtrosEquipos.length > 0) {
            datosFiltrados = datosFiltrados.filter(d => d.equipo && filtrosEquipos.includes(String(d.equipo)));
        }

        if (typeof renderizarTabla === 'function') {
            // Menú principal (vistaTodosEquipos): Gantt primero, luego tabla. Páginas de equipo: tabla primero, luego Gantt.
            if (typeof vistaTodosEquipos !== 'undefined' && vistaTodosEquipos && typeof renderizarGanttEquipo === 'function' && tipoActual !== 'mantenimiento' && datosFiltrados.length > 0) {
                (async () => {
                    await renderizarGanttEquipo(datosFiltrados);
                    renderizarTabla(datosFiltrados);
                })();
            } else if (typeof renderizarGanttEquipo === 'function' && tipoActual !== 'mantenimiento') {
                renderizarTabla(datosFiltrados);
                setTimeout(async () => { await renderizarGanttEquipo(datosFiltrados); }, 100);
            } else {
                renderizarTabla(datosFiltrados);
            }
        } else {
            if (typeof vistaTodosEquipos !== 'undefined' && vistaTodosEquipos && typeof cargarDatosTodosEquipos === 'function') {
                cargarDatosTodosEquipos();
            } else {
                cargarDatos();
            }
        }
    } else {
        if (typeof vistaTodosEquipos !== 'undefined' && vistaTodosEquipos && typeof cargarDatosTodosEquipos === 'function') {
            cargarDatosTodosEquipos();
        } else {
            cargarDatos();
        }
    }
}





