/**
 * Funciones para manejar llamadas a la API
 * Seguimiento de Proyectos
 */

// Funciones de actualización de colores
function actualizarEstadoColor(element, value) {
    if (!value) {
        value = element.value || element.textContent.trim();
        const estadosMap = {
            '-': '',
            'Sin comenzar': 'sin comenzar',
            'En curso': 'en curso',
            'Testing': 'Testing',
            'Entregado': 'Entregado',
            'Cerrado': 'Cerrado',
            'Rework': 'Rework',
            'Bloqueado': 'Bloqueado',
            'Pendiente': 'Pendiente',
            'Realizado': 'Realizado'
        };
        value = estadosMap[value] || value;
    }
    
    element.className = 'modern-select estado-select';
    element.style.removeProperty('background');
    element.style.removeProperty('background-color');
    
    if (value === 'Entregado' || value === 'Cerrado' || value === 'Realizado') {
        element.classList.add('estado-entregado');
    } else if (value === 'sin comenzar' || value === 'Pendiente') {
        element.classList.add('estado-sin-comenzar');
    } else if (value === 'en curso' || value === 'En curso') {
        element.classList.add('estado-progreso');
    } else if (value === 'Testing') {
        element.classList.add('estado-testing');
    } else if (value === 'Rework') {
        element.classList.add('estado-rework');
    } else if (value === 'Bloqueado') {
        element.classList.add('estado-bloqueado');
    }
}

function actualizarRiesgoColor(select) {
    const value = select.value;
    select.className = 'modern-select riesgo-select';
    if (value === 'ok' || value === 'okey') {
        select.classList.add('riesgo-ok');
    } else if (value === 'red flag' || value === 'redflag') {
        select.classList.add('riesgo-red');
    }
}

// Funciones de actualización de datos
async function actualizarMantenimiento(id_proyecto, campo, valor) {
    try {
        const endpoint = '/api/mantenimiento/' + id_proyecto;
        const datos = { [campo]: valor };
        console.log('Actualizando mantenimiento:', { id_proyecto, campo, valor });
        
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(datos)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Mantenimiento actualizado correctamente:', result.data);
            // Actualizar el texto de "Última Actualización" en el modal si está abierto
            if (result.data && result.data.updated_at) {
                // Actualizar en el modal si está abierto
                if (typeof actualizarTextoUltimaActualizacion === 'function') {
                    actualizarTextoUltimaActualizacion(id_proyecto, result.data.updated_at);
                }
                // También actualizar en el array local de datos para futuras aperturas del modal
                if (typeof datosTablaActual !== 'undefined' && Array.isArray(datosTablaActual)) {
                    const proyecto = datosTablaActual.find(p => p.id_proyecto === parseInt(id_proyecto) || p.id_proyecto === id_proyecto);
                    if (proyecto) {
                        proyecto.updated_at = result.data.updated_at;
                    }
                }
            }
        } else {
            console.error('❌ Error al actualizar mantenimiento:', result.error);
            alert('Error al actualizar: ' + (result.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('❌ Error al actualizar mantenimiento:', error);
        alert('Error al actualizar: ' + error.message);
    }
}

async function actualizarProyecto(id_proyecto, campo, valor) {
    try {
        const endpoint = '/api/proyectos/' + id_proyecto;
        const datos = { [campo]: valor };
        console.log('Actualizando proyecto:', { id_proyecto, campo, valor });
        
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(datos)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Proyecto actualizado correctamente:', result.data);
            // Actualizar el texto de "Última Actualización" en el modal si está abierto
            if (result.data && result.data.updated_at) {
                // Actualizar en el modal si está abierto
                if (typeof actualizarTextoUltimaActualizacion === 'function') {
                    actualizarTextoUltimaActualizacion(id_proyecto, result.data.updated_at);
                }
                // También actualizar en el array local de datos para futuras aperturas del modal
                if (typeof datosTablaActual !== 'undefined' && Array.isArray(datosTablaActual)) {
                    const proyecto = datosTablaActual.find(p => p.id_proyecto === parseInt(id_proyecto) || p.id_proyecto === id_proyecto);
                    if (proyecto) {
                        proyecto.updated_at = result.data.updated_at;
                    }
                }
            }
        } else {
            console.error('❌ Error al actualizar proyecto:', result.error);
            alert('Error al actualizar: ' + (result.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('❌ Error al actualizar proyecto:', error);
        alert('Error al actualizar: ' + error.message);
    }
}

// Función actualizarSubproyecto eliminada - ahora los subproyectos se actualizan usando actualizarProyecto
// (los subproyectos son proyectos normales con linea_servicio = 'Hereda')
async function actualizarSubproyecto(id_proyecto, campo, valor) {
    // Usar actualizarProyecto ya que los subproyectos ahora son proyectos normales
    await actualizarProyecto(id_proyecto, campo, valor);
}

async function actualizarProyectoInterno(id_proyecto, campo, valor) {
    try {
        const endpoint = '/api/proyectos-internos/' + id_proyecto;
        const datos = { [campo]: valor };
        console.log('Actualizando proyecto interno:', { id_proyecto, campo, valor });
        
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(datos)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Proyecto interno actualizado correctamente:', result.data);
        } else {
            console.error('❌ Error al actualizar proyecto interno:', result.error);
            alert('Error al actualizar: ' + (result.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('❌ Error al actualizar proyecto interno:', error);
        alert('Error al actualizar: ' + error.message);
    }
}

// Función para actualizar estado de un accionable
async function actualizarEstadoAccionable(id_accionable, estado) {
    try {
        const endpoint = '/api/accionables/' + id_accionable;
        const datos = { estado: estado };
        
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(datos)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Estado de accionable actualizado correctamente');
            // Refrescar la tabla principal para actualizar el "Ver"
            if (typeof cargarDatos === 'function') {
                cargarDatos();
            }
        } else {
            console.error('❌ Error al actualizar estado de accionable:', result.error);
            alert('Error al actualizar estado: ' + (result.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('❌ Error al actualizar estado de accionable:', error);
        alert('Error al actualizar estado: ' + error.message);
    }
}

// Throttle para mejorar performance de la barra de progreso
let throttleTimeout = null;
function actualizarBarraProgreso(slider) {
    if (throttleTimeout) return;
    
    throttleTimeout = requestAnimationFrame(() => {
        const container = slider.closest('.progress-bar-container');
        const bar = container.querySelector('.progress-bar');
        const value = parseInt(slider.value);
        bar.style.width = value + '%';
        
        let gradient = 'linear-gradient(90deg, #66bb6a 0%, #34a853 100%)';
        if (value <= 25) {
            gradient = 'linear-gradient(90deg, #a5d6a7 0%, #81c784 100%)';
        } else if (value <= 50) {
            gradient = 'linear-gradient(90deg, #81c784 0%, #66bb6a 100%)';
        } else if (value <= 75) {
            gradient = 'linear-gradient(90deg, #66bb6a 0%, #4caf50 100%)';
        } else {
            gradient = 'linear-gradient(90deg, #4caf50 0%, #34a853 50%, #1e8e3e 100%)';
        }
        bar.style.background = gradient;
        throttleTimeout = null;
    });
}





