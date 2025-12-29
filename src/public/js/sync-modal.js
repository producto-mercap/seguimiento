/**
 * Funciones para el modal de pedidos
 * Sync - Seguimiento de Proyectos
 */

let pedidoEditando = null;

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

    const equiposOptions = equiposDisponibles.map(equipo => 
        `<option value="${equipo}" ${pedido && pedido.equipo_solicitante === equipo ? 'selected' : ''}>${equipo}</option>`
    ).join('');

    const equiposOptionsResponsable = equiposDisponibles.map(equipo => 
        `<option value="${equipo}" ${pedido && pedido.equipo_responsable === equipo ? 'selected' : ''}>${equipo}</option>`
    ).join('');

    const fechaPlanificada = pedido && pedido.fecha_planificada_entrega ? 
        pedido.fecha_planificada_entrega : '';

    const html = `
        <form id="formPedido" onsubmit="guardarPedido(event)">
            <div style="display: flex; flex-direction: column; gap: 24px;">
                <!-- Sección de Equipos -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <!-- Equipo Solicitante -->
                    <div style="position: relative;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 500; font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Google Sans', 'Roboto', sans-serif;">Equipo Solicitante *</label>
                        <select id="equipoSolicitante" name="equipo_solicitante" class="input" required 
                            style="width: 100%; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; font-family: 'Google Sans', 'Roboto', sans-serif; background: white; transition: all 0.2s;"
                            onfocus="this.style.borderColor='var(--primary-color)'; this.style.boxShadow='0 0 0 2px rgba(26, 115, 232, 0.1)'"
                            onblur="this.style.borderColor='var(--border-color)'; this.style.boxShadow='none'">
                            <option value="">Seleccionar equipo...</option>
                            ${equiposOptions}
                        </select>
                    </div>

                    <!-- Equipo Responsable -->
                    <div style="position: relative;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 500; font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Google Sans', 'Roboto', sans-serif;">Equipo Responsable *</label>
                        <select id="equipoResponsable" name="equipo_responsable" class="input" required 
                            style="width: 100%; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; font-family: 'Google Sans', 'Roboto', sans-serif; background: white; transition: all 0.2s;"
                            onfocus="this.style.borderColor='var(--primary-color)'; this.style.boxShadow='0 0 0 2px rgba(26, 115, 232, 0.1)'"
                            onblur="this.style.borderColor='var(--border-color)'; this.style.boxShadow='none'">
                            <option value="">Seleccionar equipo...</option>
                            ${equiposOptionsResponsable}
                        </select>
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
}

// Validar formulario
function validarFormularioPedido() {
    const equipoSolicitante = document.getElementById('equipoSolicitante').value;
    const equipoResponsable = document.getElementById('equipoResponsable').value;
    const descripcion = document.getElementById('descripcion').value.trim();
    const fechaPlanificada = document.getElementById('fechaPlanificada').value;

    // Validar campos obligatorios
    if (!equipoSolicitante || !equipoResponsable || !descripcion || !fechaPlanificada) {
        alert('Por favor complete todos los campos obligatorios');
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
    
    const formData = {
        equipo_solicitante: document.getElementById('equipoSolicitante').value,
        equipo_responsable: document.getElementById('equipoResponsable').value,
        descripcion: document.getElementById('descripcion').value.trim(),
        fecha_planificada_entrega: fechaConvertida,
        estado: 'Pendiente', // Estado por defecto al crear
        comentario: null // Comentario por defecto al crear
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

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modalPedido');
    if (modal && e.target === modal) {
        cerrarModalPedido();
    }
});

