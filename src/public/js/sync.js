/**
 * Funciones principales para la gestión de pedidos entre equipos
 * Sync - Seguimiento de Proyectos
 */

// Cargar equipos disponibles
async function cargarEquipos() {
    try {
        const response = await fetch('/api/sync/equipos');
        const data = await response.json();
        
        if (data.success) {
            equiposDisponibles = data.data;
            actualizarDropdownsEquipos();
        } else {
            console.error('Error al cargar equipos:', data.error);
        }
    } catch (error) {
        console.error('Error al cargar equipos:', error);
    }
}

// Actualizar dropdowns de equipos en los filtros
function actualizarDropdownsEquipos() {
    // Actualizar filtro de equipo solicitante
    const dropdownSolicitante = document.getElementById('filterEquipoSolicitante');
    if (dropdownSolicitante && equiposDisponibles.length > 0) {
        let html = '<div style="padding: 8px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">';
        html += '<button onclick="limpiarFiltroEquipoSolicitante()" style="background: none; border: none; color: var(--primary-color); font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 8px;">Limpiar</button>';
        html += '</div>';
        
        equiposDisponibles.forEach(equipo => {
            html += `<label style="display: flex; align-items: center; padding: 10px 16px; cursor: pointer; transition: background 0.2s;" 
                onmouseover="this.style.background='#f1f3f4'" onmouseout="this.style.background='white'">
                <input type="checkbox" class="filter-checkbox" value="${equipo}" data-filter="equipo_solicitante" style="margin-right: 8px; cursor: pointer;" onchange="aplicarFiltrosSync()" />
                <span style="font-size: 13px;">${equipo}</span>
            </label>`;
        });
        
        dropdownSolicitante.innerHTML = html;
    }

    // Actualizar filtro de equipo responsable
    const dropdownResponsable = document.getElementById('filterEquipoResponsable');
    if (dropdownResponsable && equiposDisponibles.length > 0) {
        let html = '<div style="padding: 8px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">';
        html += '<button onclick="limpiarFiltroEquipoResponsable()" style="background: none; border: none; color: var(--primary-color); font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 8px;">Limpiar</button>';
        html += '</div>';
        
        equiposDisponibles.forEach(equipo => {
            html += `<label style="display: flex; align-items: center; padding: 10px 16px; cursor: pointer; transition: background 0.2s;" 
                onmouseover="this.style.background='#f1f3f4'" onmouseout="this.style.background='white'">
                <input type="checkbox" class="filter-checkbox" value="${equipo}" data-filter="equipo_responsable" style="margin-right: 8px; cursor: pointer;" onchange="aplicarFiltrosSync()" />
                <span style="font-size: 13px;">${equipo}</span>
            </label>`;
        });
        
        dropdownResponsable.innerHTML = html;
    }
}

// Cargar pedidos desde la API
async function cargarPedidos() {
    try {
        const contenedor = document.getElementById('contenidoSync');
        if (contenedor) {
            contenedor.innerHTML = '<div class="empty-state"><div class="spinner"></div><div class="empty-state-text">Cargando pedidos...</div></div>';
        }

        const params = new URLSearchParams();
        if (filtrosAplicados.equipo_solicitante) {
            params.append('equipo_solicitante', filtrosAplicados.equipo_solicitante);
        }
        if (filtrosAplicados.equipo_responsable) {
            params.append('equipo_responsable', filtrosAplicados.equipo_responsable);
        }
        if (filtrosAplicados.estados && filtrosAplicados.estados.length > 0) {
            filtrosAplicados.estados.forEach(estado => params.append('estados', estado));
        }
        params.append('ordenPor', ordenActual.columna);
        params.append('ordenDireccion', ordenActual.direccion);

        const response = await fetch(`/api/sync/pedidos?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            pedidosOriginales = data.data;
            pedidosActuales = [...pedidosOriginales];
            renderizarTablaPedidos(pedidosActuales);
            actualizarContador();
            } else {
            console.error('Error al cargar pedidos:', data.error);
            if (contenedor) {
                contenedor.innerHTML = '<div class="empty-state"><div class="empty-state-text">Error al cargar pedidos</div></div>';
            }
        }
    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        const contenedor = document.getElementById('contenidoSync');
        if (contenedor) {
            contenedor.innerHTML = '<div class="empty-state"><div class="empty-state-text">Error al cargar pedidos</div></div>';
        }
    }
}

// Renderizar tabla de pedidos (estilo mantenimiento)
function renderizarTablaPedidos(pedidos) {
    const contenedor = document.getElementById('contenidoSync');
    if (!contenedor) return;
    
    // Verificar que equiposDisponibles esté disponible
    if (typeof equiposDisponibles === 'undefined' || equiposDisponibles.length === 0) {
        console.warn('equiposDisponibles no está disponible o está vacío al renderizar la tabla');
    }

    if (pedidos.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">No hay pedidos</div>
                <div class="empty-state-subtext">Crea un nuevo pedido para comenzar</div>
            </div>
        `;
        return;
    }

        let html = '<div class="modern-table-wrapper sync-wrapper"><div class="modern-table sync"><div class="modern-table-header" style="position: relative;">';
    
    const flechaSolicitante = ordenActual.columna === 'equipo_solicitante' ? (ordenActual.direccion === 'ASC' ? '↑' : '↓') : '';
    const flechaResponsable = ordenActual.columna === 'equipo_responsable' ? (ordenActual.direccion === 'ASC' ? '↑' : '↓') : '';
    const flechaDescripcion = ordenActual.columna === 'descripcion' ? (ordenActual.direccion === 'ASC' ? '↑' : '↓') : '';
    const flechaFecha = ordenActual.columna === 'fecha_planificada_entrega' ? (ordenActual.direccion === 'ASC' ? '↑' : '↓') : '';
    
    html += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'equipo_solicitante\')" style="cursor: pointer; user-select: none; text-align: center; justify-content: center;">Solicitante ' + flechaSolicitante + '</div>';
    html += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'equipo_responsable\')" style="cursor: pointer; user-select: none; text-align: center; justify-content: center;">Responsable ' + flechaResponsable + '</div>';
    html += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'descripcion\')" style="cursor: pointer; user-select: none;">Descripción ' + flechaDescripcion + '</div>';
    html += '<div class="modern-table-cell header-cell" style="text-align: center; justify-content: center;">Estado</div>';
    html += '<div class="modern-table-cell header-cell" onclick="ordenarPor(\'fecha_planificada_entrega\')" style="cursor: pointer; user-select: none; text-align: center; justify-content: center;">Fecha Planificada ' + flechaFecha + '</div>';
    html += '<div class="modern-table-cell header-cell">Comentarios</div>';
    html += '<div class="modern-table-cell header-cell" style="text-align: center; justify-content: center;"></div>';
    html += '</div>';

    pedidos.forEach(pedido => {
        // Usar formatearFechaParaMostrar para evitar problemas de zona horaria
        const fechaFormateada = pedido.fecha_planificada_entrega ? 
            formatearFechaParaMostrar(pedido.fecha_planificada_entrega) : '-';
        
        // Descripción siempre colapsada por defecto (2 líneas máximo)
        const descripcion = pedido.descripcion || '-';
        const descripcionId = 'descripcion-' + pedido.id;
        const esDescripcionLarga = descripcion.length > 50; // Cualquier descripción puede expandirse
        const descripcionClase = 'descripcion-colapsada'; // Siempre colapsada por defecto
        
        html += '<div class="modern-table-row">';
        html += '<div class="modern-table-cell item-text" style="display: flex; justify-content: center; align-items: center;">' + crearDropdownEquipoPedido(pedido.id, 'solicitante', pedido.equipo_solicitante) + '</div>';
        html += '<div class="modern-table-cell item-text" style="display: flex; justify-content: center; align-items: center;">' + crearDropdownEquipoPedido(pedido.id, 'responsable', pedido.equipo_responsable) + '</div>';
        html += '<div class="modern-table-cell item-text descripcion-cell ' + descripcionClase + '" id="' + descripcionId + '" onclick="habilitarEdicionDescripcion(' + pedido.id + ')" style="cursor: pointer; user-select: none;" title="Click para editar">' + descripcion + '</div>';
        html += '<div class="modern-table-cell" style="display: flex; justify-content: center; align-items: center;">' + crearDropdownEstadoPedido(pedido.id, pedido.estado || 'Pendiente') + '</div>';
        // Celda de fecha con date picker (estilo texto sin borde)
        const fechaInputId = 'fechaPedido_' + pedido.id;
        const fechaValor = pedido.fecha_planificada_entrega ? 
            formatearFechaParaInput(pedido.fecha_planificada_entrega) : '';
        const fechaMostrar = pedido.fecha_planificada_entrega ? 
            formatearFechaParaMostrar(pedido.fecha_planificada_entrega) : '-';
        html += '<div class="modern-table-cell item-text" style="display: flex; justify-content: center; align-items: center; position: relative; gap: 0 !important;">';
        html += '<span style="font-size: 13px; font-family: \'Google Sans\', \'Roboto\', sans-serif; color: var(--text-primary); margin-right: 0 !important; padding-right: 0 !important;">' + fechaMostrar + '</span>';
        html += '<button type="button" class="date-picker-icon-btn" onclick="abrirDatePicker(\'' + fechaInputId + '\')" title="Seleccionar fecha" style="position: relative !important; right: auto !important; top: auto !important; transform: none !important; background: none !important; border: none !important; cursor: pointer; padding: 2px !important; margin: 0 !important; margin-left: 4px !important; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: var(--text-secondary); border-radius: 4px;" onmouseover="this.style.background=\'var(--hover-bg)\'; this.style.color=\'var(--primary-color)\'" onmouseout="this.style.background=\'none\'; this.style.color=\'var(--text-secondary)\'">';
        html += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">';
        html += '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>';
        html += '</svg>';
        html += '</button>';
        // Input oculto para el date picker
        html += '<input type="text" class="input date-input" id="' + fechaInputId + '" value="' + fechaValor + '" placeholder="DD-MM-AAAA" maxlength="10" style="position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0;" onchange="actualizarFechaPedido(' + pedido.id + ', this.value)" oninput="formatearFechaInput(this)">';
        html += '</div>';
        html += '<div class="modern-table-cell item-text" onclick="activarEdicionComentario(' + pedido.id + ')" style="cursor: text; display: flex; align-items: center;"><textarea class="modern-input win-textarea" rows="1" data-pedido-id="' + pedido.id + '" id="comentario-' + pedido.id + '" onchange="actualizarComentarioPedido(' + pedido.id + ', this.value); ajustarAlturaTextarea(this);" onclick="event.stopPropagation();" style="width: 100%; box-sizing: border-box; padding: 0.25em 0; border: none; background: transparent; resize: none; overflow-y: auto; min-height: 20px; cursor: text; font-size: 13px;">' + (pedido.comentario || '') + '</textarea></div>';
        html += '<div class="modern-table-cell" style="display: flex; justify-content: center; align-items: center;">';
        html += '<button onclick="eliminarPedido(' + pedido.id + ')" style="padding: 6px; font-size: 12px; background: rgba(217, 48, 37, 0.1); border: none; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Eliminar" onmouseover="this.style.background=\'rgba(217, 48, 37, 0.2)\'" onmouseout="this.style.background=\'rgba(217, 48, 37, 0.1)\'">';
        html += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d93025" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
        html += '<path d="M3 6h18"></path>';
        html += '<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>';
        html += '<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>';
        html += '</svg></button>';
        html += '</div>';
        html += '</div>';
    });

    html += '</div></div>';
    contenedor.innerHTML = html;
    
    // Ajustar altura de textareas
    contenedor.querySelectorAll('.win-textarea').forEach(textarea => {
        ajustarAlturaTextarea(textarea);
    });
}

// Crear dropdown de equipo para pedidos (solicitante o responsable)
function crearDropdownEquipoPedido(idPedido, tipo, valorActual) {
    const dropdownId = 'dropdown-equipo-' + tipo + '-' + idPedido;
    // Obtener equipos desde la variable global o desde window
    const equipos = (typeof equiposDisponibles !== 'undefined' ? equiposDisponibles : (window.equiposDisponibles || []));
    
    // Si no hay equipos cargados, mostrar solo el tag
    if (equipos.length === 0) {
        const bgColor = tipo === 'solicitante' ? 'rgba(26, 115, 232, 0.1)' : 'rgba(217, 119, 6, 0.1)';
        const textColor = tipo === 'solicitante' ? 'rgb(26, 115, 232)' : 'rgb(217, 119, 6)';
        const hoverBg = tipo === 'solicitante' ? 'rgba(26, 115, 232, 0.15)' : 'rgba(217, 119, 6, 0.15)';
        return valorActual ? 
            '<span style="display: inline-flex; align-items: center; padding: 4px 10px; background: ' + bgColor + '; color: ' + textColor + '; border-radius: 12px; font-size: 12px; font-weight: 500; font-family: \'Google Sans\', \'Roboto\', sans-serif; white-space: nowrap; cursor: pointer;" onmouseover="this.style.background=\'' + hoverBg + '\';" onmouseout="this.style.background=\'' + bgColor + '\';">' + valorActual + '</span>' : '-';
    }
    
    const equipoActual = valorActual || '';
    const bgColor = tipo === 'solicitante' ? 'rgba(26, 115, 232, 0.1)' : 'rgba(217, 119, 6, 0.1)';
    const textColor = tipo === 'solicitante' ? 'rgb(26, 115, 232)' : 'rgb(217, 119, 6)';
    const hoverBg = tipo === 'solicitante' ? 'rgba(26, 115, 232, 0.15)' : 'rgba(217, 119, 6, 0.15)';
    
    let html = '<div style="position: relative; display: inline-block;">';
    html += '<span class="equipo-tag-' + tipo + '" onclick="event.stopPropagation(); toggleCustomDropdown(\'' + dropdownId + '\', this)" style="display: inline-flex; align-items: center; padding: 4px 10px; background: ' + bgColor + '; color: ' + textColor + '; border-radius: 12px; font-size: 12px; font-weight: 500; font-family: \'Google Sans\', \'Roboto\', sans-serif; white-space: nowrap; cursor: pointer;" onmouseover="this.style.background=\'' + hoverBg + '\';" onmouseout="this.style.background=\'' + bgColor + '\';">' + (equipoActual || 'Seleccionar') + '</span>';
    html += '<div id="' + dropdownId + '" class="custom-dropdown" style="display: none; position: absolute; top: 100%; left: 0; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10000; margin-top: 4px; overflow: hidden; min-width: 150px; max-height: 300px; overflow-y: auto;">';
    
    equipos.forEach(equipo => {
        const isSelected = equipo === equipoActual;
        // Escapar comillas simples y dobles para evitar errores en JavaScript
        const equipoEscapado = String(equipo).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += '<div onclick="event.stopPropagation(); seleccionarEquipoPedido(\'' + dropdownId + '\', ' + idPedido + ', \'' + tipo + '\', \'' + equipoEscapado + '\', this)" style="padding: 8px 12px; cursor: pointer; transition: background 0.2s; text-align: left; font-size: 13px; background: ' + (isSelected ? '#e8f0fe' : 'white') + '; color: ' + (isSelected ? 'var(--primary-color)' : 'var(--text-primary)') + '; white-space: nowrap;" onmouseover="this.style.background=\'#f1f3f4\'" onmouseout="this.style.background=\'' + (isSelected ? '#e8f0fe' : 'white') + '\'">' + equipo + '</div>';
    });
    html += '</div></div>';
    return html;
}

// Crear dropdown de estado para pedidos
function crearDropdownEstadoPedido(idPedido, valorActual) {
    const dropdownId = 'dropdown-estado-pedido-' + idPedido;
    const opciones = [
        { valor: 'Pendiente', label: 'Pendiente' },
        { valor: 'En curso', label: 'En curso' },
        { valor: 'Bloqueado', label: 'Bloqueado' },
        { valor: 'Realizado', label: 'Realizado' }
    ];
    const textoMostrado = valorActual ? opciones.find(o => o.valor === valorActual)?.label || valorActual : 'Pendiente';
    const estadoClass = getEstadoClass(valorActual);
    
    let html = '<div style="position: relative; display: inline-block;">';
    html += '<button class="modern-select estado-select ' + estadoClass + '" onclick="toggleCustomDropdown(\'' + dropdownId + '\', this)" style="text-align: center; border: none; padding: 4px 8px; border-radius: 14px; cursor: pointer; font-size: 11px; font-weight: 500; font-family: \'Google Sans\', \'Roboto\', sans-serif; min-width: 80px; height: 28px; white-space: nowrap; background: ' + getEstadoBackgroundColor(valorActual) + '; color: ' + getEstadoTextColor(valorActual) + ';">' + textoMostrado + '</button>';
    html += '<div id="' + dropdownId + '" class="custom-dropdown" style="display: none; position: absolute; top: 100%; left: 0; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10000; margin-top: 4px; overflow: hidden; min-width: 120px;">';
    opciones.forEach(opcion => {
        const isSelected = opcion.valor === valorActual;
        html += '<div onclick="seleccionarEstadoPedido(\'' + dropdownId + '\', ' + idPedido + ', \'' + opcion.valor + '\', this)" style="padding: 8px 12px; cursor: pointer; transition: background 0.2s; text-align: center; font-size: 13px; background: ' + (isSelected ? '#e8f0fe' : 'white') + '; color: ' + (isSelected ? 'var(--primary-color)' : 'var(--text-primary)') + '; white-space: nowrap;" onmouseover="this.style.background=\'#f1f3f4\'" onmouseout="this.style.background=\'' + (isSelected ? '#e8f0fe' : 'white') + '\'">' + opcion.label + '</div>';
    });
    html += '</div></div>';
    return html;
}

// Obtener clase CSS para el estado
function getEstadoClass(estado) {
    const estados = {
        'Pendiente': 'estado-pendiente',
        'En curso': 'estado-en-curso',
        'Bloqueado': 'estado-bloqueado',
        'Realizado': 'estado-realizado'
    };
    return estados[estado] || '';
}

// Obtener color de fondo para el estado
function getEstadoBackgroundColor(estado) {
    const colores = {
        'Pendiente': '#f1f3f4',
        'En curso': '#e8f0fe',
        'Bloqueado': '#fce8e6',
        'Realizado': '#e6f4ea'
    };
    return colores[estado] || '#f1f3f4';
}

// Obtener color de texto para el estado
function getEstadoTextColor(estado) {
    const colores = {
        'Pendiente': '#5f6368',
        'En curso': '#1a73e8',
        'Bloqueado': '#d93025',
        'Realizado': '#1e8e3e'
    };
    return colores[estado] || '#5f6368';
}

// Seleccionar estado de pedido
async function seleccionarEstadoPedido(dropdownId, idPedido, nuevoEstado, elemento) {
    try {
        // Obtener pedido actual
        const response = await fetch(`/api/sync/pedidos/${idPedido}`);
        const data = await response.json();
        
        if (!data.success) {
            alert('Error al obtener el pedido');
            return;
        }

        const pedido = data.data;
        
        // Actualizar estado
        const updateResponse = await fetch(`/api/sync/pedidos/${idPedido}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                equipo_solicitante: pedido.equipo_solicitante,
                equipo_responsable: pedido.equipo_responsable,
                descripcion: pedido.descripcion,
                fecha_planificada_entrega: pedido.fecha_planificada_entrega,
                estado: nuevoEstado,
                comentario: pedido.comentario || null
            })
        });
        
        const updateData = await updateResponse.json();
        
        if (updateData.success) {
            // Actualizar botón visualmente
            const button = document.querySelector(`#${dropdownId}`).previousElementSibling;
            if (button) {
                const opciones = [
                    { valor: 'Pendiente', label: 'Pendiente' },
                    { valor: 'En curso', label: 'En curso' },
                    { valor: 'Bloqueado', label: 'Bloqueado' },
                    { valor: 'Realizado', label: 'Realizado' }
                ];
                const textoMostrado = opciones.find(o => o.valor === nuevoEstado)?.label || nuevoEstado;
                button.textContent = textoMostrado;
                button.style.background = getEstadoBackgroundColor(nuevoEstado);
                button.style.color = getEstadoTextColor(nuevoEstado);
            }
            
            // Cerrar dropdown
            document.getElementById(dropdownId).style.display = 'none';
        } else {
            alert('Error al actualizar el estado: ' + (updateData.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        alert('Error al actualizar el estado');
    }
}

// Seleccionar equipo de pedido (solicitante o responsable)
async function seleccionarEquipoPedido(dropdownId, idPedido, tipo, nuevoEquipo, elemento) {
    try {
        // Obtener pedido actual
        const response = await fetch(`/api/sync/pedidos/${idPedido}`);
        const data = await response.json();
        
        if (!data.success) {
            alert('Error al obtener el pedido');
            return;
        }

        const pedido = data.data;
        
        // Determinar los valores de equipo solicitante y responsable
        const equipoSolicitante = tipo === 'solicitante' ? nuevoEquipo : pedido.equipo_solicitante;
        const equipoResponsable = tipo === 'responsable' ? nuevoEquipo : pedido.equipo_responsable;
        
        // Actualizar equipo
        const updateResponse = await fetch(`/api/sync/pedidos/${idPedido}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                equipo_solicitante: equipoSolicitante,
                equipo_responsable: equipoResponsable,
                descripcion: pedido.descripcion,
                fecha_planificada_entrega: pedido.fecha_planificada_entrega,
                estado: pedido.estado,
                comentario: pedido.comentario || null
            })
        });
        
        const updateData = await updateResponse.json();
        
        if (updateData.success) {
            // Actualizar tag visualmente
            const tag = document.querySelector(`#${dropdownId}`).previousElementSibling;
            if (tag) {
                tag.textContent = nuevoEquipo;
            }
            
            // Cerrar dropdown
            document.getElementById(dropdownId).style.display = 'none';
        } else {
            alert('Error al actualizar el equipo: ' + (updateData.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al actualizar equipo:', error);
        alert('Error al actualizar el equipo');
    }
}

// Actualizar comentario de pedido
async function actualizarComentarioPedido(idPedido, nuevoComentario) {
    try {
        // Obtener pedido actual
        const response = await fetch(`/api/sync/pedidos/${idPedido}`);
        const data = await response.json();
        
        if (!data.success) {
            console.error('Error al obtener el pedido');
            return;
        }

        const pedido = data.data;
        
        // Actualizar comentario
        const updateResponse = await fetch(`/api/sync/pedidos/${idPedido}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                equipo_solicitante: pedido.equipo_solicitante,
                equipo_responsable: pedido.equipo_responsable,
                descripcion: pedido.descripcion,
                fecha_planificada_entrega: pedido.fecha_planificada_entrega,
                estado: pedido.estado,
                comentario: nuevoComentario.trim() || null
            })
        });
        
        const updateData = await updateResponse.json();
        
        if (!updateData.success) {
            console.error('Error al actualizar el comentario:', updateData.error);
        }
    } catch (error) {
        console.error('Error al actualizar comentario:', error);
    }
}

// Función para ajustar altura de textarea (debe estar disponible globalmente)
if (typeof ajustarAlturaTextarea === 'undefined') {
    window.ajustarAlturaTextarea = function(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    };
}

// Aplicar filtros
function aplicarFiltrosSync() {
    // Obtener filtro de equipo solicitante (checkboxes)
    const checkboxesSolicitante = document.querySelectorAll('#filterEquipoSolicitante .filter-checkbox[data-filter="equipo_solicitante"]:checked');
    filtrosAplicados.equipo_solicitante = checkboxesSolicitante.length > 0 ? Array.from(checkboxesSolicitante).map(cb => cb.value) : null;
    // Si solo hay uno seleccionado, usar string en lugar de array
    if (filtrosAplicados.equipo_solicitante && filtrosAplicados.equipo_solicitante.length === 1) {
        filtrosAplicados.equipo_solicitante = filtrosAplicados.equipo_solicitante[0];
    }

    // Obtener filtro de equipo responsable (checkboxes)
    const checkboxesResponsable = document.querySelectorAll('#filterEquipoResponsable .filter-checkbox[data-filter="equipo_responsable"]:checked');
    filtrosAplicados.equipo_responsable = checkboxesResponsable.length > 0 ? Array.from(checkboxesResponsable).map(cb => cb.value) : null;
    // Si solo hay uno seleccionado, usar string en lugar de array
    if (filtrosAplicados.equipo_responsable && filtrosAplicados.equipo_responsable.length === 1) {
        filtrosAplicados.equipo_responsable = filtrosAplicados.equipo_responsable[0];
    }

    // Obtener filtros de estado (solo si hay checkboxes marcados explícitamente)
    const checkboxesEstados = document.querySelectorAll('#filterEstados .filter-checkbox:checked');
    if (checkboxesEstados.length > 0) {
        filtrosAplicados.estados = Array.from(checkboxesEstados).map(cb => cb.value);
    } else {
        // Si no hay estados seleccionados explícitamente, no filtrar por estados
        filtrosAplicados.estados = [];
    }

    // Obtener checkbox "Incluir realizados"
    const incluirRealizados = document.getElementById('incluirRealizados');
    if (incluirRealizados && !incluirRealizados.checked) {
        // Si no está marcado, excluir "Realizado" de los estados solo si hay estados seleccionados
        if (filtrosAplicados.estados.length > 0) {
            filtrosAplicados.estados = filtrosAplicados.estados.filter(e => e !== 'Realizado');
        }
        // Si no hay estados seleccionados explícitamente Y el checkbox no está marcado,
        // mostrar todos excepto Realizado (solo cuando no hay otros filtros activos)
        if (filtrosAplicados.estados.length === 0 && 
            !filtrosAplicados.equipo_solicitante && 
            !filtrosAplicados.equipo_responsable) {
            filtrosAplicados.estados = ['Pendiente', 'En curso', 'Bloqueado'];
        }
    }

    // Actualizar chips de filtros aplicados
    actualizarChipsFiltros();

    // Recargar pedidos con los nuevos filtros
    cargarPedidos();
}

// Actualizar chips de filtros aplicados
function actualizarChipsFiltros() {
    const contenedor = document.getElementById('filtrosAplicadosSync');
    if (!contenedor) return;

    const chips = [];
    
    if (filtrosAplicados.equipo_solicitante) {
        const equiposTexto = Array.isArray(filtrosAplicados.equipo_solicitante) 
            ? filtrosAplicados.equipo_solicitante.join(', ') 
            : filtrosAplicados.equipo_solicitante;
        chips.push({
            texto: `Solicitante: ${equiposTexto}`,
            onRemove: () => {
                filtrosAplicados.equipo_solicitante = null;
                document.querySelectorAll('#filterEquipoSolicitante .filter-checkbox[data-filter="equipo_solicitante"]').forEach(cb => cb.checked = false);
                aplicarFiltrosSync();
            }
        });
    }

    if (filtrosAplicados.equipo_responsable) {
        const equiposTexto = Array.isArray(filtrosAplicados.equipo_responsable) 
            ? filtrosAplicados.equipo_responsable.join(', ') 
            : filtrosAplicados.equipo_responsable;
        chips.push({
            texto: `Responsable: ${equiposTexto}`,
            onRemove: () => {
                filtrosAplicados.equipo_responsable = null;
                document.querySelectorAll('#filterEquipoResponsable .filter-checkbox[data-filter="equipo_responsable"]').forEach(cb => cb.checked = false);
                aplicarFiltrosSync();
            }
        });
    }

    // Solo mostrar chip de estados si hay estados seleccionados explícitamente (no por defecto)
    const checkboxesEstadosMarcados = document.querySelectorAll('#filterEstados .filter-checkbox:checked');
    if (checkboxesEstadosMarcados.length > 0) {
        chips.push({
            texto: `Estados: ${filtrosAplicados.estados.join(', ')}`,
            onRemove: () => {
                document.querySelectorAll('#filterEstados .filter-checkbox').forEach(cb => cb.checked = false);
                filtrosAplicados.estados = [];
                aplicarFiltrosSync();
            }
        });
    }


    if (chips.length === 0) {
        contenedor.style.display = 'none';
        contenedor.innerHTML = '';
    } else {
        contenedor.style.display = 'flex';
        contenedor.innerHTML = chips.map((chip, index) => `
            <div class="filter-chip" style="display: inline-flex; align-items: center; background: #e8f0fe; color: var(--primary-color); padding: 6px 12px; border-radius: 16px; font-size: 13px; font-weight: 500; gap: 8px;">
                <span>${chip.texto}</span>
                <button onclick="removerChipFiltro(${index})" style="background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: var(--primary-color);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        `).join('');
        
        // Guardar funciones de remoción en un array global
        window.chipsRemoveFunctions = chips.map(chip => chip.onRemove);
    }
}

// Ordenar por columna
function ordenarPor(columna) {
    if (ordenActual.columna === columna) {
        ordenActual.direccion = ordenActual.direccion === 'ASC' ? 'DESC' : 'ASC';
    } else {
        ordenActual.columna = columna;
        ordenActual.direccion = 'ASC';
    }
    cargarPedidos();
}

// Actualizar contador de pedidos
function actualizarContador() {
    const contador = document.getElementById('contadorPedidos');
    if (contador) {
        contador.textContent = `Total pedidos: ${pedidosActuales.length}`;
    }
}

// Funciones auxiliares para filtros
function toggleFilterEquipoSolicitante(buttonElement) {
    const dropdown = document.getElementById('filterEquipoSolicitante');
    const equipoResponsableDropdown = document.getElementById('filterEquipoResponsable');
    const estadosDropdown = document.getElementById('filterEstados');

    if (equipoResponsableDropdown) equipoResponsableDropdown.style.display = 'none';
    if (estadosDropdown) estadosDropdown.style.display = 'none';

    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        if (isVisible) {
            dropdown.style.display = 'none';
        } else {
            const button = buttonElement || document.querySelector('button[onclick*="toggleFilterEquipoSolicitante"]');
            if (button) {
                const rect = button.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = rect.left + 'px';
                dropdown.style.zIndex = '10000';
                dropdown.style.background = 'white';
            }
            dropdown.style.display = 'block';
        }
    }
}

function toggleFilterEquipoResponsable(buttonElement) {
    const dropdown = document.getElementById('filterEquipoResponsable');
    const equipoSolicitanteDropdown = document.getElementById('filterEquipoSolicitante');
    const estadosDropdown = document.getElementById('filterEstados');

    if (equipoSolicitanteDropdown) equipoSolicitanteDropdown.style.display = 'none';
    if (estadosDropdown) estadosDropdown.style.display = 'none';

    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        if (isVisible) {
            dropdown.style.display = 'none';
        } else {
            const button = buttonElement || document.querySelector('button[onclick*="toggleFilterEquipoResponsable"]');
            if (button) {
                const rect = button.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = rect.left + 'px';
                dropdown.style.zIndex = '10000';
                dropdown.style.background = 'white';
            }
            dropdown.style.display = 'block';
        }
    }
}

function toggleFilterEstados(buttonElement) {
    const dropdown = document.getElementById('filterEstados');
    const equipoSolicitanteDropdown = document.getElementById('filterEquipoSolicitante');
    const equipoResponsableDropdown = document.getElementById('filterEquipoResponsable');

    if (equipoSolicitanteDropdown) equipoSolicitanteDropdown.style.display = 'none';
    if (equipoResponsableDropdown) equipoResponsableDropdown.style.display = 'none';

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
                dropdown.style.zIndex = '10000';
                dropdown.style.background = 'white';
            }
            dropdown.style.display = 'block';
        }
    }
}

function limpiarFiltroEquipoSolicitante() {
    document.querySelectorAll('#filterEquipoSolicitante .filter-checkbox[data-filter="equipo_solicitante"]').forEach(cb => cb.checked = false);
    aplicarFiltrosSync();
}

function limpiarFiltroEquipoResponsable() {
    document.querySelectorAll('#filterEquipoResponsable .filter-checkbox[data-filter="equipo_responsable"]').forEach(cb => cb.checked = false);
    aplicarFiltrosSync();
}

// Habilitar edición de descripción
function habilitarEdicionDescripcion(idPedido) {
    const descripcionElement = document.getElementById('descripcion-' + idPedido);
    if (!descripcionElement) return;
    
    // Si ya está en modo edición, no hacer nada
    if (descripcionElement.querySelector('textarea')) return;
    
    const textoActual = descripcionElement.textContent.trim();
    const descripcionOriginal = textoActual;
    
    // Crear textarea para edición
    const textarea = document.createElement('textarea');
    textarea.className = 'modern-input win-textarea descripcion-edit-input';
    textarea.value = textoActual;
    textarea.rows = 1;
    textarea.style.cssText = 'width: 100%; box-sizing: border-box; padding: 0; border: none; background: transparent; resize: none; overflow-y: auto; min-height: 20px; height: auto; font-size: 14px; font-family: \'Google Sans\', \'Roboto\', sans-serif; color: var(--text-primary); line-height: 1.5;';
    textarea.style.border = '1px solid var(--primary-color)';
    textarea.style.borderRadius = '4px';
    textarea.style.padding = '4px 8px';
    textarea.style.background = 'white';
    textarea.style.boxShadow = '0 0 0 2px rgba(26, 115, 232, 0.1)';
    
    // Guardar al perder el foco
    textarea.addEventListener('blur', function() {
        guardarDescripcionPedido(idPedido, textarea.value.trim());
    });
    
    // Guardar al presionar Enter (sin Shift)
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            textarea.blur();
        }
        // Esc para cancelar
        if (e.key === 'Escape') {
            textarea.value = descripcionOriginal;
            textarea.blur();
        }
    });
    
    // Reemplazar contenido del div con el textarea
    descripcionElement.innerHTML = '';
    descripcionElement.appendChild(textarea);
    descripcionElement.classList.remove('descripcion-colapsada', 'descripcion-expandida');
    
    // Ajustar altura del textarea
    ajustarAlturaTextarea(textarea);
    
    // Enfocar el textarea sin seleccionar todo el texto
    setTimeout(() => {
        textarea.focus();
        // Mover el cursor al final del texto sin seleccionar
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 10);
}

// Guardar descripción del pedido
async function guardarDescripcionPedido(idPedido, nuevaDescripcion) {
    const descripcionElement = document.getElementById('descripcion-' + idPedido);
    if (!descripcionElement) return;
    
    const textarea = descripcionElement.querySelector('textarea');
    if (!textarea) return;
    
    // Validar que no esté vacía
    if (!nuevaDescripcion || nuevaDescripcion.trim() === '') {
        alert('La descripción no puede estar vacía');
        textarea.focus();
        return;
    }
    
    try {
        const response = await fetch(`/api/sync/pedidos/${idPedido}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                descripcion: nuevaDescripcion.trim()
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Restaurar el div con el nuevo texto
            const textoFinal = nuevaDescripcion.trim();
            descripcionElement.innerHTML = textoFinal;
            descripcionElement.classList.add('descripcion-colapsada');
            descripcionElement.classList.remove('descripcion-expandida');
            descripcionElement.setAttribute('title', 'Click para editar');
        } else {
            console.error('Error al actualizar descripción:', result.error);
            alert('Error al actualizar la descripción: ' + (result.error || 'Error desconocido'));
            textarea.focus();
        }
    } catch (error) {
        console.error('Error al guardar descripción:', error);
        alert('Error al guardar la descripción');
        textarea.focus();
    }
}

// Activar edición de comentario al hacer click en la celda
function activarEdicionComentario(idPedido) {
    const textarea = document.getElementById('comentario-' + idPedido);
    if (textarea) {
        textarea.focus();
        // Mover el cursor al final del texto
        setTimeout(() => {
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }, 10);
    }
}

// Formatear fecha para mostrar (YYYY-MM-DD a DD/MM/YYYY)
// Parsea manualmente para evitar problemas de zona horaria
function formatearFechaParaMostrar(fecha) {
    if (!fecha) return '';
    try {
        // Si viene como string YYYY-MM-DD, parsear directamente
        if (typeof fecha === 'string') {
            const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                const año = match[1];
                const mes = match[2];
                const dia = match[3];
                return dia + '/' + mes + '/' + año;
            }
            // Si tiene formato ISO con T, extraer solo la parte de fecha
            const matchISO = fecha.match(/^(\d{4})-(\d{2})-(\d{2})T/);
            if (matchISO) {
                const año = matchISO[1];
                const mes = matchISO[2];
                const dia = matchISO[3];
                return dia + '/' + mes + '/' + año;
            }
        }
        // Si es un objeto Date, usar componentes locales
        if (fecha instanceof Date) {
            const dia = String(fecha.getDate()).padStart(2, '0');
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const año = fecha.getFullYear();
            return dia + '/' + mes + '/' + año;
        }
        return fecha;
    } catch (e) {
        console.error('Error al formatear fecha para mostrar:', e);
        return '';
    }
}

// Formatear fecha para input (YYYY-MM-DD a DD-MM-YYYY) - para el date picker
// Parsea manualmente para evitar problemas de zona horaria
function formatearFechaParaInput(fecha) {
    if (!fecha) return '';
    try {
        // Si viene como string YYYY-MM-DD, parsear directamente
        if (typeof fecha === 'string') {
            const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                const año = match[1];
                const mes = match[2];
                const dia = match[3];
                return dia + '-' + mes + '-' + año;
            }
            // Si tiene formato ISO con T, extraer solo la parte de fecha
            const matchISO = fecha.match(/^(\d{4})-(\d{2})-(\d{2})T/);
            if (matchISO) {
                const año = matchISO[1];
                const mes = matchISO[2];
                const dia = matchISO[3];
                return dia + '-' + mes + '-' + año;
            }
        }
        // Si es un objeto Date, usar componentes locales
        if (fecha instanceof Date) {
            const dia = String(fecha.getDate()).padStart(2, '0');
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const año = fecha.getFullYear();
            return dia + '-' + mes + '-' + año;
        }
        return fecha;
    } catch (e) {
        console.error('Error al formatear fecha para input:', e);
        return '';
    }
}

// Formatear input de fecha mientras se escribe (DD-MM-YYYY)
function formatearFechaInput(input) {
    let valor = input.value.replace(/\D/g, ''); // Solo números
    if (valor.length >= 2) {
        valor = valor.substring(0, 2) + '-' + valor.substring(2);
    }
    if (valor.length >= 5) {
        valor = valor.substring(0, 5) + '-' + valor.substring(5, 9);
    }
    input.value = valor;
}

// Actualizar fecha del pedido
async function actualizarFechaPedido(idPedido, fechaTexto) {
    if (!fechaTexto || fechaTexto.trim() === '') {
        return;
    }
    
    // Convertir DD-MM-YYYY a YYYY-MM-DD
    const partes = fechaTexto.split('-');
    if (partes.length !== 3) {
        alert('Formato de fecha inválido. Use DD-MM-AAAA');
        return;
    }
    
    const dia = partes[0].padStart(2, '0');
    const mes = partes[1].padStart(2, '0');
    const año = partes[2];
    
    // Validar fecha usando componentes locales (sin problemas de zona horaria)
    const diaNum = parseInt(dia, 10);
    const mesNum = parseInt(mes, 10);
    const añoNum = parseInt(año, 10);
    
    if (diaNum < 1 || diaNum > 31 || mesNum < 1 || mesNum > 12 || añoNum < 1900 || añoNum > 2100) {
        alert('Fecha inválida');
        return;
    }
    
    // Validar que la fecha sea válida (ej: no 31 de febrero)
    const fecha = new Date(añoNum, mesNum - 1, diaNum);
    if (fecha.getDate() != diaNum || fecha.getMonth() != (mesNum - 1) || fecha.getFullYear() != añoNum) {
        alert('Fecha inválida');
        return;
    }
    
    const fechaISO = año + '-' + mes + '-' + dia;
    
    try {
        const response = await fetch(`/api/sync/pedidos/${idPedido}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fecha_planificada_entrega: fechaISO
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al actualizar la fecha');
        }
        
        // Recargar la tabla para mostrar la fecha correcta desde la base de datos
        cargarPedidos();
    } catch (error) {
        console.error('Error al actualizar fecha:', error);
        alert('Error al actualizar la fecha. Por favor, intente nuevamente.');
    }
}

// Función para remover chips de filtros
function removerChipFiltro(index) {
    if (window.chipsRemoveFunctions && window.chipsRemoveFunctions[index]) {
        window.chipsRemoveFunctions[index]();
    } else {
        // Fallback: limpiar todos los filtros
        filtrosAplicados.equipo_solicitante = null;
        filtrosAplicados.equipo_responsable = null;
        filtrosAplicados.estados = [];
        document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
        aplicarFiltrosSync();
    }
}

// Cerrar dropdowns al hacer clic fuera
document.addEventListener('click', (e) => {
    const filterEquipoSolicitante = document.getElementById('filterEquipoSolicitante');
    const filterEquipoResponsable = document.getElementById('filterEquipoResponsable');
    const filterEstados = document.getElementById('filterEstados');

    if (filterEquipoSolicitante && !e.target.closest('#filterEquipoSolicitante') && !e.target.closest('button[onclick*="toggleFilterEquipoSolicitante"]')) {
        filterEquipoSolicitante.style.display = 'none';
    }

    if (filterEquipoResponsable && !e.target.closest('#filterEquipoResponsable') && !e.target.closest('button[onclick*="toggleFilterEquipoResponsable"]')) {
        filterEquipoResponsable.style.display = 'none';
    }

    if (filterEstados && !e.target.closest('#filterEstados') && !e.target.closest('button[onclick*="toggleFilterEstados"]')) {
        filterEstados.style.display = 'none';
    }
});
