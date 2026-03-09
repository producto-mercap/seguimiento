/**
 * Funciones para el modal de pedidos
 * Sync - Seguimiento de Proyectos
 */

let pedidoEditando = null;
let pedidoActual = null; // Guardar el pedido completo cuando se edita

// Abrir modal para crear o editar pedido
async function abrirModalPedido(id = null) {
    const modal = document.getElementById('modalPedido');
    const modalBody = document.getElementById('modalPedidoBody');
    const modalTitulo = document.getElementById('modalPedidoTitulo');
    
    if (!modal || !modalBody || !modalTitulo) return;

    pedidoEditando = id;

    if (id) {
        // Modo edición: cargar datos del pedido
        try {
            const response = await fetch(`/api/sync/pedidos/${id}`);
            const data = await response.json();
            
            if (data.success) {
                pedidoActual = data.data; // Guardar el pedido completo para preservar campos como estado
                mostrarFormularioPedido(data.data);
                modalTitulo.textContent = 'Editar Pedido';
            } else {
                alert('Error al cargar el pedido: ' + (data.error || 'Error desconocido'));
                return;
            }
        } catch (error) {
            console.error('Error al cargar pedido:', error);
            alert('Error al cargar el pedido');
            return;
        }
    } else {
        // Modo creación: mostrar formulario vacío
        pedidoActual = null; // Limpiar pedido actual en modo creación
        mostrarFormularioPedido(null);
        modalTitulo.textContent = 'Nuevo Pedido';
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Función helper para formatear fecha de YYYY-MM-DD a DD-MM-YYYY
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
        return fecha;
    }
}

// Función helper para convertir DD-MM-YYYY a YYYY-MM-DD
function convertirFechaParaAPI(fecha) {
    if (!fecha) return '';
    try {
        const partes = fecha.split('-');
        if (partes.length === 3) {
            return partes[2] + '-' + partes[1] + '-' + partes[0];
        }
        return fecha;
    } catch (e) {
        return fecha;
    }
}

// Validar fecha del formulario
function validarFechaFormulario() {
    const input = document.getElementById('fechaPlanificada');
    if (!input) return;
    
    const valor = input.value.trim();
    if (!valor) return;
    
    // Validar formato DD-MM-YYYY
    const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
    if (!regex.test(valor)) {
        input.setCustomValidity('Formato de fecha inválido. Use DD-MM-AAAA');
        return;
    }
    
    const partes = valor.split('-');
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const año = parseInt(partes[2], 10);
    
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || año < 1900 || año > 2100) {
        input.setCustomValidity('Fecha inválida');
        return;
    }
    
    input.setCustomValidity('');
}

// Mostrar formulario de pedido
function mostrarFormularioPedido(pedido) {
    const modalBody = document.getElementById('modalPedidoBody');
    if (!modalBody) return;

    // Obtener equipos seleccionados (pueden ser arrays o strings)
    const equiposSolicitantesSeleccionados = pedido && pedido.equipo_solicitante 
        ? (Array.isArray(pedido.equipo_solicitante) ? pedido.equipo_solicitante : [pedido.equipo_solicitante])
        : [];
    const equiposResponsablesSeleccionados = pedido && pedido.equipo_responsable 
        ? (Array.isArray(pedido.equipo_responsable) ? pedido.equipo_responsable : [pedido.equipo_responsable])
        : [];

    // Generar checkboxes para equipos solicitantes
    const checkboxesSolicitantes = equiposDisponibles.map(equipo => {
        const isSelected = equiposSolicitantesSeleccionados.includes(equipo);
        return `
            <label style="display: flex; align-items: center; padding: 8px 12px; cursor: pointer; transition: background 0.2s; border-radius: 4px;" 
                onmouseover="this.style.background='#f1f3f4'" onmouseout="this.style.background='transparent'">
                <input type="checkbox" class="equipo-checkbox-solicitante" value="${equipo}" ${isSelected ? 'checked' : ''} 
                    style="margin-right: 8px; cursor: pointer;" onchange="actualizarTagsEquipos('solicitante')" />
                <span style="font-size: 14px;">${equipo}</span>
            </label>
        `;
    }).join('');

    // Generar checkboxes para equipos responsables
    const checkboxesResponsables = equiposDisponibles.map(equipo => {
        const isSelected = equiposResponsablesSeleccionados.includes(equipo);
        return `
            <label style="display: flex; align-items: center; padding: 8px 12px; cursor: pointer; transition: background 0.2s; border-radius: 4px;" 
                onmouseover="this.style.background='#f1f3f4'" onmouseout="this.style.background='transparent'">
                <input type="checkbox" class="equipo-checkbox-responsable" value="${equipo}" ${isSelected ? 'checked' : ''} 
                    style="margin-right: 8px; cursor: pointer;" onchange="actualizarTagsEquipos('responsable')" />
                <span style="font-size: 14px;">${equipo}</span>
            </label>
        `;
    }).join('');

    const fechaPlanificada = pedido && pedido.fecha_planificada_entrega ? 
        pedido.fecha_planificada_entrega : '';

    const html = `
        <form id="formPedido" onsubmit="guardarPedido(event)">
            <div style="display: flex; flex-direction: column; gap: 24px;">
                <!-- Sección de Equipos -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <!-- Equipo Solicitante -->
                    <div style="position: relative;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 500; font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Google Sans', 'Roboto', sans-serif;">Equipos Solicitantes *</label>
                        <div id="tagsContainerSolicitante" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; min-height: 32px; padding: 8px; border: 1px solid var(--border-color); border-radius: 8px; background: white;">
                            ${equiposSolicitantesSeleccionados.map(equipo => `
                                <span class="equipo-tag" data-tipo="solicitante" data-equipo="${equipo}" style="display: inline-flex; align-items: center; padding: 4px 10px; background: rgba(26, 115, 232, 0.1); color: rgb(26, 115, 232); border-radius: 12px; font-size: 12px; font-weight: 500; font-family: 'Google Sans', 'Roboto', sans-serif;">
                                    ${equipo}
                                    <button type="button" onclick="removerTagEquipo('solicitante', '${equipo}')" style="background: none; border: none; color: rgb(26, 115, 232); cursor: pointer; margin-left: 6px; padding: 0; display: flex; align-items: center; font-size: 14px; font-weight: bold;">×</button>
                                </span>
                            `).join('')}
                            ${equiposSolicitantesSeleccionados.length === 0 ? '<span style="color: var(--text-secondary); font-size: 13px;">Seleccione equipos...</span>' : ''}
                        </div>
                        <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; background: white; padding: 4px;">
                            ${checkboxesSolicitantes}
                        </div>
                    </div>

                    <!-- Equipo Responsable -->
                    <div style="position: relative;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 500; font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Google Sans', 'Roboto', sans-serif;">Equipos Responsables *</label>
                        <div id="tagsContainerResponsable" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; min-height: 32px; padding: 8px; border: 1px solid var(--border-color); border-radius: 8px; background: white;">
                            ${equiposResponsablesSeleccionados.map(equipo => `
                                <span class="equipo-tag" data-tipo="responsable" data-equipo="${equipo}" style="display: inline-flex; align-items: center; padding: 4px 10px; background: rgba(217, 119, 6, 0.1); color: rgb(217, 119, 6); border-radius: 12px; font-size: 12px; font-weight: 500; font-family: 'Google Sans', 'Roboto', sans-serif;">
                                    ${equipo}
                                    <button type="button" onclick="removerTagEquipo('responsable', '${equipo}')" style="background: none; border: none; color: rgb(217, 119, 6); cursor: pointer; margin-left: 6px; padding: 0; display: flex; align-items: center; font-size: 14px; font-weight: bold;">×</button>
                                </span>
                            `).join('')}
                            ${equiposResponsablesSeleccionados.length === 0 ? '<span style="color: var(--text-secondary); font-size: 13px;">Seleccione equipos...</span>' : ''}
                        </div>
                        <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; background: white; padding: 4px;">
                            ${checkboxesResponsables}
                        </div>
                    </div>
                </div>

                <!-- Separador visual -->
                <div style="height: 1px; background: linear-gradient(to right, transparent, var(--border-color), transparent); margin: 8px 0;"></div>

                <!-- Descripción -->
                <div>
                    <label style="display: block; margin-bottom: 10px; font-weight: 500; font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Google Sans', 'Roboto', sans-serif;">Descripción del Pedido *</label>
                    <textarea id="descripcion" name="descripcion" class="input" required 
                        style="width: 100%; padding: 12px 16px; min-height: 120px; resize: vertical; font-family: 'Google Sans', 'Roboto', sans-serif; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; line-height: 1.6; transition: all 0.2s; background: white;"
                        placeholder="Describir claramente qué se solicita..."
                        onfocus="this.style.borderColor='var(--primary-color)'; this.style.boxShadow='0 0 0 2px rgba(26, 115, 232, 0.1)'"
                        onblur="this.style.borderColor='var(--border-color)'; this.style.boxShadow='none'">${pedido ? (pedido.descripcion || '') : ''}</textarea>
                </div>

                <!-- Fecha Planificada de Entrega -->
                <div>
                    <label style="display: block; margin-bottom: 10px; font-weight: 500; font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Google Sans', 'Roboto', sans-serif;">Fecha Planificada de Entrega *</label>
                    <div class="date-input-wrapper" style="position: relative; display: flex; align-items: center;">
                        <input type="text" class="input date-input" id="fechaPlanificada" name="fecha_planificada_entrega" 
                            value="${fechaPlanificada ? formatearFechaParaInput(fechaPlanificada) : ''}" 
                            placeholder="DD-MM-AAAA" maxlength="10" required
                            style="width: 100%; padding: 12px 16px; padding-right: 40px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; font-family: 'Google Sans', 'Roboto', sans-serif; box-sizing: border-box; background: white; transition: all 0.2s;"
                            onchange="validarFechaFormulario()" oninput="validarFechaFormulario()"
                            onfocus="this.style.borderColor='var(--primary-color)'; this.style.boxShadow='0 0 0 2px rgba(26, 115, 232, 0.1)'"
                            onblur="this.style.borderColor='var(--border-color)'; this.style.boxShadow='none'">
                        <button type="button" class="date-picker-icon-btn" onclick="abrirDatePicker('fechaPlanificada')" title="Seleccionar fecha" style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="color: #5f6368;">
                                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Separador visual antes de botones -->
                <div style="height: 1px; background: linear-gradient(to right, transparent, var(--border-color), transparent); margin: 8px 0;"></div>

                <!-- Botones -->
                <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 4px;">
                    <button type="button" class="button button-secondary" onclick="cerrarModalPedido()" style="min-width: 100px;">Cancelar</button>
                    <button type="submit" class="button" style="min-width: 100px;">Guardar</button>
                </div>
            </div>
        </form>
    `;

    modalBody.innerHTML = html;
}

// Cerrar modal
function cerrarModalPedido() {
    const modal = document.getElementById('modalPedido');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    pedidoEditando = null;
    pedidoActual = null; // Limpiar pedido actual al cerrar
}

// Actualizar tags de equipos cuando se selecciona/deselecciona un checkbox
function actualizarTagsEquipos(tipo) {
    const containerId = tipo === 'solicitante' ? 'tagsContainerSolicitante' : 'tagsContainerResponsable';
    const checkboxClass = tipo === 'solicitante' ? 'equipo-checkbox-solicitante' : 'equipo-checkbox-responsable';
    const container = document.getElementById(containerId);
    if (!container) return;

    const checkboxes = document.querySelectorAll(`.${checkboxClass}:checked`);
    const equiposSeleccionados = Array.from(checkboxes).map(cb => cb.value);

    // Limpiar container
    container.innerHTML = '';

    if (equiposSeleccionados.length === 0) {
        container.innerHTML = '<span style="color: var(--text-secondary); font-size: 13px;">Seleccione equipos...</span>';
    } else {
        equiposSeleccionados.forEach(equipo => {
            const bgColor = tipo === 'solicitante' ? 'rgba(26, 115, 232, 0.1)' : 'rgba(217, 119, 6, 0.1)';
            const textColor = tipo === 'solicitante' ? 'rgb(26, 115, 232)' : 'rgb(217, 119, 6)';
            const tag = document.createElement('span');
            tag.className = 'equipo-tag';
            tag.setAttribute('data-tipo', tipo);
            tag.setAttribute('data-equipo', equipo);
            tag.style.cssText = `display: inline-flex; align-items: center; padding: 4px 10px; background: ${bgColor}; color: ${textColor}; border-radius: 12px; font-size: 12px; font-weight: 500; font-family: 'Google Sans', 'Roboto', sans-serif;`;
            tag.innerHTML = `${equipo}<button type="button" onclick="removerTagEquipo('${tipo}', '${equipo}')" style="background: none; border: none; color: ${textColor}; cursor: pointer; margin-left: 6px; padding: 0; display: flex; align-items: center; font-size: 14px; font-weight: bold;">×</button>`;
            container.appendChild(tag);
        });
    }
}

// Remover tag de equipo
function removerTagEquipo(tipo, equipo) {
    const checkboxClass = tipo === 'solicitante' ? 'equipo-checkbox-solicitante' : 'equipo-checkbox-responsable';
    const checkbox = document.querySelector(`.${checkboxClass}[value="${equipo}"]`);
    if (checkbox) {
        checkbox.checked = false;
        actualizarTagsEquipos(tipo);
    }
}

// Validar formulario
function validarFormularioPedido() {
    const checkboxesSolicitantes = document.querySelectorAll('.equipo-checkbox-solicitante:checked');
    const checkboxesResponsables = document.querySelectorAll('.equipo-checkbox-responsable:checked');
    const descripcion = document.getElementById('descripcion').value.trim();
    const fechaPlanificada = document.getElementById('fechaPlanificada').value;

    // Validar campos obligatorios con mensajes específicos
    if (checkboxesSolicitantes.length === 0) {
        alert('Por favor seleccione al menos un equipo solicitante');
        return false;
    }
    
    if (checkboxesResponsables.length === 0) {
        alert('Por favor seleccione al menos un equipo responsable');
        return false;
    }
    
    if (!descripcion) {
        alert('Por favor ingrese una descripción');
        return false;
    }
    
    if (!fechaPlanificada) {
        alert('Por favor seleccione una fecha planificada');
        return false;
    }

    return true;
}

// Guardar pedido (crear o actualizar)
async function guardarPedido(event) {
    if (event) event.preventDefault();

    if (!validarFormularioPedido()) {
        return;
    }

    // Convertir fecha de DD-MM-YYYY a YYYY-MM-DD
    const fechaInput = document.getElementById('fechaPlanificada').value;
    const fechaConvertida = convertirFechaParaAPI(fechaInput);
    
    // Obtener equipos seleccionados como arrays
    const checkboxesSolicitantes = document.querySelectorAll('.equipo-checkbox-solicitante:checked');
    const checkboxesResponsables = document.querySelectorAll('.equipo-checkbox-responsable:checked');
    const equiposSolicitantes = Array.from(checkboxesSolicitantes).map(cb => cb.value);
    const equiposResponsables = Array.from(checkboxesResponsables).map(cb => cb.value);
    
    // Determinar el estado: preservar el actual si se está editando, usar 'Pendiente' solo al crear
    const estadoFinal = (pedidoEditando && pedidoActual && pedidoActual.estado) 
        ? pedidoActual.estado 
        : 'Pendiente';
    
    // Determinar el comentario: preservar el actual si se está editando
    const comentarioFinal = (pedidoEditando && pedidoActual && pedidoActual.comentario !== undefined) 
        ? pedidoActual.comentario 
        : null;
    
    const formData = {
        equipo_solicitante: equiposSolicitantes,
        equipo_responsable: equiposResponsables,
        descripcion: document.getElementById('descripcion').value.trim(),
        fecha_planificada_entrega: fechaConvertida,
        estado: estadoFinal,
        comentario: comentarioFinal
    };

    try {
        const url = pedidoEditando ? `/api/sync/pedidos/${pedidoEditando}` : '/api/sync/pedidos';
        const method = pedidoEditando ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            cerrarModalPedido();
            cargarPedidos();
            // Mostrar mensaje de éxito (opcional)
            // alert(pedidoEditando ? 'Pedido actualizado correctamente' : 'Pedido creado correctamente');
        } else {
            alert('Error: ' + (data.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al guardar pedido:', error);
        alert('Error al guardar el pedido');
    }
}

// Variable global para almacenar el ID del pedido a eliminar
let pedidoIdAEliminar = null;

// Abrir modal de confirmación para eliminar pedido
function eliminarPedido(id) {
    pedidoIdAEliminar = id;
    const modal = document.getElementById('modalConfirmarEliminar');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// Cerrar modal de confirmación
function cerrarModalConfirmarEliminar() {
    const modal = document.getElementById('modalConfirmarEliminar');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    pedidoIdAEliminar = null;
}

// Confirmar y ejecutar eliminación
async function confirmarEliminarPedido() {
    if (!pedidoIdAEliminar) {
        cerrarModalConfirmarEliminar();
        return;
    }

    const id = pedidoIdAEliminar;
    pedidoIdAEliminar = null;

    try {
        const response = await fetch(`/api/sync/pedidos/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            cerrarModalConfirmarEliminar();
            cargarPedidos();
        } else {
            alert('Error: ' + (data.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al eliminar pedido:', error);
        alert('Error al eliminar el pedido');
    }
}

// El modal de pedido solo se cierra con Cancelar, Guardar o X (no al hacer clic fuera)

