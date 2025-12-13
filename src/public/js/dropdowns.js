/**
 * Funciones para crear y manejar dropdowns personalizados
 * Seguimiento de Proyectos
 */

// Funciones helper para crear dropdowns personalizados
function crearDropdownOverall(idProyecto, campo, valorActual, clasesAdicionales) {
    const esSubproyecto = clasesAdicionales && clasesAdicionales.includes('subproyecto');
    const dropdownId = esSubproyecto ? 'dropdown-' + campo + '-sub-' + idProyecto : 'dropdown-' + campo + '-' + idProyecto;
    const valorActualClass = valorActual ? 'color-' + valorActual : '';
    const opciones = [
        { valor: '', texto: '-', icono: '-' },
        { valor: 'verde', texto: '🟢', icono: '🟢' },
        { valor: 'amarillo', texto: '🟡', icono: '🟡' },
        { valor: 'rojo', texto: '🔴', icono: '🔴' }
    ];
    const textoMostrado = valorActual ? opciones.find(o => o.valor === valorActual)?.icono || '-' : '-';
    let bgColor = '#f8f9fa';
    if (valorActual === 'verde') bgColor = '#e6f4ea';
    else if (valorActual === 'amarillo') bgColor = '#fef7e0';
    else if (valorActual === 'rojo') bgColor = '#fce8e6';
    
    let html = '<div style="position: relative; display: inline-block;">';
    html += '<button class="modern-select overall-select ' + valorActualClass + ' ' + clasesAdicionales + '" onclick="toggleCustomDropdown(\'' + dropdownId + '\', this)" style="text-align: center; border: none; background: ' + bgColor + '; padding: 4px 6px; border-radius: 12px; cursor: pointer; font-size: 16px; min-width: 36px; height: 28px; white-space: nowrap;">' + textoMostrado + '</button>';
    html += '<div id="' + dropdownId + '" class="custom-dropdown" style="display: none; position: absolute; top: 100%; left: 0; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10000; margin-top: 4px; overflow: hidden; min-width: 60px;">';
    opciones.forEach(opcion => {
        const isSelected = opcion.valor === valorActual;
        const onclickFunc = esSubproyecto ? 'seleccionarDropdownOptionSubproyecto' : 'seleccionarDropdownOption';
        html += '<div onclick="' + onclickFunc + '(\'' + dropdownId + '\', \'' + campo + '\', ' + idProyecto + ', \'' + opcion.valor + '\', this)" style="padding: 8px 12px; cursor: pointer; transition: background 0.2s; text-align: center; font-size: 20px; background: ' + (isSelected ? '#e8f0fe' : 'white') + '; color: ' + (isSelected ? 'var(--primary-color)' : 'var(--text-primary)') + '; white-space: nowrap;" onmouseover="this.style.background=\'#f1f3f4\'" onmouseout="this.style.background=\'' + (isSelected ? '#e8f0fe' : 'white') + '\'">' + opcion.icono + '</div>';
    });
    html += '</div></div>';
    return html;
}

function crearDropdownIconos(idProyecto, campo, valorActual, tipo, clasesAdicionales) {
    const dropdownId = 'dropdown-' + campo + '-' + idProyecto;
    let opciones = [];
    if (tipo === 'demanda') {
        opciones = [
            { valor: '', texto: '-', icono: '-' },
            { valor: 'llama', texto: '🔥', icono: '🔥' },
            { valor: 'congelado', texto: '❄️', icono: '❄️' },
            { valor: 'herramientas', texto: '🔧', icono: '🔧' },
            { valor: 'palmera', texto: '🌴', icono: '🌴' }
        ];
    } else if (tipo === 'estabilidad') {
        opciones = [
            { valor: '', texto: '-', icono: '-' },
            { valor: 'llama', texto: '🔥', icono: '🔥' },
            { valor: 'herramientas', texto: '🔧', icono: '🔧' },
            { valor: 'cohete', texto: '🚀', icono: '🚀' }
        ];
    }
    const textoMostrado = valorActual ? opciones.find(o => o.valor === valorActual)?.icono || '-' : '-';
    const valorActualClass = valorActual ? tipo + '-' + valorActual : '';
    
    let html = '<div style="position: relative; display: inline-block;">';
    html += '<button class="modern-select icon-select ' + valorActualClass + ' ' + clasesAdicionales + '" onclick="toggleCustomDropdown(\'' + dropdownId + '\', this)" style="text-align: left; border: none; background: #f8f9fa; padding: 6px 10px; border-radius: 16px; cursor: pointer; font-size: 20px; min-width: 50px; white-space: nowrap;">' + textoMostrado + '</button>';
    html += '<div id="' + dropdownId + '" class="custom-dropdown" style="display: none; position: absolute; top: 100%; left: 0; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10000; margin-top: 4px; overflow: hidden; min-width: 60px;">';
    opciones.forEach(opcion => {
        const isSelected = opcion.valor === valorActual;
        html += '<div onclick="seleccionarDropdownOption(\'' + dropdownId + '\', \'' + campo + '\', ' + idProyecto + ', \'' + opcion.valor + '\', this)" style="padding: 8px 12px; cursor: pointer; transition: background 0.2s; text-align: center; font-size: 20px; background: ' + (isSelected ? '#e8f0fe' : 'white') + '; color: ' + (isSelected ? 'var(--primary-color)' : 'var(--text-primary)') + '; white-space: nowrap;" onmouseover="this.style.background=\'#f1f3f4\'" onmouseout="this.style.background=\'' + (isSelected ? '#e8f0fe' : 'white') + '\'">' + opcion.icono + '</div>';
    });
    html += '</div></div>';
    return html;
}

function crearDropdownCaras(idProyecto, campo, valorActual, clasesAdicionales) {
    const dropdownId = 'dropdown-' + campo + '-' + idProyecto;
    const opciones = [
        { valor: '', texto: '-', icono: '-' },
        { valor: 'feliz', texto: '😄', icono: '😄' },
        { valor: 'buena', texto: '😊', icono: '😊' },
        { valor: 'regular', texto: '😐', icono: '😐' },
        { valor: 'mala', texto: '😞', icono: '😞' },
        { valor: 'enojado', texto: '😠', icono: '😠' },
        { valor: 'calavera', texto: '💀', icono: '💀' }
    ];
    const textoMostrado = valorActual ? opciones.find(o => o.valor === valorActual)?.icono || '-' : '-';
    const valorActualClass = valorActual ? 'satisfaccion-' + valorActual : '';
    
    let html = '<div style="position: relative; display: inline-block;">';
    html += '<button class="modern-select face-select ' + valorActualClass + ' ' + clasesAdicionales + '" onclick="toggleCustomDropdown(\'' + dropdownId + '\', this)" style="text-align: left; border: none; background: ' + (valorActualClass === 'satisfaccion-calavera' ? '#000000' : '#f8f9fa') + '; padding: 6px 10px; border-radius: 16px; cursor: pointer; font-size: 20px; min-width: 50px; white-space: nowrap; color: ' + (valorActualClass === 'satisfaccion-calavera' ? '#ffffff' : 'var(--text-primary)') + ';">' + textoMostrado + '</button>';
    html += '<div id="' + dropdownId + '" class="custom-dropdown" style="display: none; position: absolute; top: 100%; left: 0; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10000; margin-top: 4px; overflow: hidden; min-width: 60px;">';
    opciones.forEach(opcion => {
        const isSelected = opcion.valor === valorActual;
        html += '<div onclick="seleccionarDropdownOption(\'' + dropdownId + '\', \'' + campo + '\', ' + idProyecto + ', \'' + opcion.valor + '\', this)" style="padding: 8px 12px; cursor: pointer; transition: background 0.2s; text-align: center; font-size: 20px; background: ' + (isSelected ? '#e8f0fe' : 'white') + '; color: ' + (isSelected ? 'var(--primary-color)' : 'var(--text-primary)') + '; white-space: nowrap;" onmouseover="this.style.background=\'#f1f3f4\'" onmouseout="this.style.background=\'' + (isSelected ? '#e8f0fe' : 'white') + '\'">' + opcion.icono + '</div>';
    });
    html += '</div></div>';
    return html;
}

function crearDropdownEstado(idProyecto, valorActual, clasesAdicionales) {
    const esSubproyecto = clasesAdicionales && clasesAdicionales.includes('subproyecto');
    const dropdownId = esSubproyecto ? 'dropdown-estado-sub-' + idProyecto : 'dropdown-estado-' + idProyecto;
    
    if (esSubproyecto) {
        console.log('🔵 crearDropdownEstado para SUBPROYECTO - idProyecto:', idProyecto, 'dropdownId:', dropdownId, 'clasesAdicionales:', clasesAdicionales);
    }
    const opciones = [
        { valor: '', texto: '-', label: '-' },
        { valor: 'sin comenzar', texto: 'Sin comenzar', label: 'Sin comenzar' },
        { valor: 'en curso', texto: 'En curso', label: 'En curso' },
        { valor: 'Testing', texto: 'Testing', label: 'Testing' },
        { valor: 'Entregado', texto: 'Entregado', label: 'Entregado' },
        { valor: 'Cerrado', texto: 'Cerrado', label: 'Cerrado' },
        { valor: 'Rework', texto: 'Rework', label: 'Rework' },
        { valor: 'Bloqueado', texto: 'Bloqueado', label: 'Bloqueado' }
    ];
    const textoMostrado = valorActual ? opciones.find(o => o.valor === valorActual)?.label || '-' : '-';
    let estadoClass = '';
    if (valorActual === 'Entregado' || valorActual === 'Cerrado') {
        estadoClass = 'estado-entregado';
    } else if (valorActual === 'sin comenzar') {
        estadoClass = 'estado-sin-comenzar';
    } else if (valorActual === 'en curso') {
        estadoClass = 'estado-progreso';
    } else if (valorActual === 'Testing') {
        estadoClass = 'estado-testing';
    } else if (valorActual === 'Rework') {
        estadoClass = 'estado-rework';
    } else if (valorActual === 'Bloqueado') {
        estadoClass = 'estado-bloqueado';
    }
    
    let html = '<div style="position: relative; display: inline-block;">';
    html += '<button class="modern-select estado-select ' + estadoClass + ' ' + clasesAdicionales + '" onclick="toggleCustomDropdown(\'' + dropdownId + '\', this)" style="text-align: center; border: none; padding: 4px 8px; border-radius: 14px; cursor: pointer; font-size: 11px; font-weight: 500; font-family: \'Google Sans\', \'Roboto\', sans-serif; min-width: 80px; height: 28px; white-space: nowrap;">' + textoMostrado + '</button>';
    html += '<div id="' + dropdownId + '" class="custom-dropdown" style="display: none; position: absolute; top: 100%; left: 0; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10000; margin-top: 4px; overflow: hidden; min-width: 120px;">';
    opciones.forEach(opcion => {
        const isSelected = opcion.valor === valorActual;
        const onclickFunc = esSubproyecto ? 'seleccionarDropdownEstadoSubproyecto' : 'seleccionarDropdownEstado';
        
        if (esSubproyecto) {
            console.log('🔵 Generando opción de dropdown SUBPROYECTO - onclickFunc:', onclickFunc, 'idProyecto:', idProyecto);
        }
        
        html += '<div onclick="' + onclickFunc + '(\'' + dropdownId + '\', ' + idProyecto + ', \'' + opcion.valor + '\', this)" style="padding: 8px 12px; cursor: pointer; transition: background 0.2s; text-align: center; font-size: 13px; background: ' + (isSelected ? '#e8f0fe' : 'white') + '; color: ' + (isSelected ? 'var(--primary-color)' : 'var(--text-primary)') + '; white-space: nowrap;" onmouseover="this.style.background=\'#f1f3f4\'" onmouseout="this.style.background=\'' + (isSelected ? '#e8f0fe' : 'white') + '\'">' + opcion.label + '</div>';
    });
    html += '</div></div>';
    return html;
}

function crearDropdownRiesgo(idProyecto, valorActual, clasesAdicionales) {
    const esSubproyecto = clasesAdicionales && clasesAdicionales.includes('subproyecto');
    const dropdownId = esSubproyecto ? 'dropdown-riesgos-sub-' + idProyecto : 'dropdown-riesgos-' + idProyecto;
    const opciones = [
        { valor: '', texto: '-', icono: '-' },
        { valor: 'ok', texto: '✓', icono: '✓' },
        { valor: 'red flag', texto: '🚩', icono: '🚩' }
    ];
    const textoMostrado = valorActual ? opciones.find(o => o.valor === valorActual || (valorActual === 'okey' && o.valor === 'ok') || (valorActual === 'redflag' && o.valor === 'red flag'))?.icono || '-' : '-';
    let riesgoClass = '';
    if (valorActual === 'ok' || valorActual === 'okey') {
        riesgoClass = 'riesgo-ok';
    } else if (valorActual === 'red flag' || valorActual === 'redflag') {
        riesgoClass = 'riesgo-red';
    }
    
    let html = '<div style="position: relative; display: inline-block;">';
    html += '<button class="modern-select riesgo-select ' + riesgoClass + ' ' + clasesAdicionales + '" onclick="toggleCustomDropdown(\'' + dropdownId + '\', this)" style="text-align: center; border: none; background: #f8f9fa; padding: 4px 6px; border-radius: 12px; cursor: pointer; font-size: 16px; min-width: 36px; height: 28px; white-space: nowrap;">' + textoMostrado + '</button>';
    html += '<div id="' + dropdownId + '" class="custom-dropdown" style="display: none; position: absolute; top: 100%; left: 0; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10000; margin-top: 4px; overflow: hidden; min-width: 60px;">';
    opciones.forEach(opcion => {
        const isSelected = opcion.valor === valorActual || (valorActual === 'okey' && opcion.valor === 'ok') || (valorActual === 'redflag' && opcion.valor === 'red flag');
        const onclickFunc = esSubproyecto ? 'seleccionarDropdownRiesgoSubproyecto' : 'seleccionarDropdownRiesgo';
        html += '<div onclick="' + onclickFunc + '(\'' + dropdownId + '\', ' + idProyecto + ', \'' + opcion.valor + '\', this)" style="padding: 8px 12px; cursor: pointer; transition: background 0.2s; text-align: center; font-size: 20px; background: ' + (isSelected ? '#e8f0fe' : 'white') + '; color: ' + (isSelected ? 'var(--primary-color)' : 'var(--text-primary)') + '; white-space: nowrap;" onmouseover="this.style.background=\'#f1f3f4\'" onmouseout="this.style.background=\'' + (isSelected ? '#e8f0fe' : 'white') + '\'">' + opcion.icono + '</div>';
    });
    html += '</div></div>';
    return html;
}

// Funciones para manejar los dropdowns personalizados
function toggleCustomDropdown(dropdownId, button) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    // Cerrar todos los otros dropdowns
    document.querySelectorAll('.custom-dropdown').forEach(dd => {
        if (dd.id !== dropdownId) {
            dd.style.display = 'none';
        }
    });
    
    const isVisible = dropdown.style.display === 'block';
    if (isVisible) {
        dropdown.style.display = 'none';
    } else {
        const rect = button.getBoundingClientRect();
        
        // Mostrar temporalmente el dropdown para calcular su altura
        dropdown.style.position = 'fixed';
        dropdown.style.visibility = 'hidden';
        dropdown.style.display = 'block';
        dropdown.style.top = '0';
        dropdown.style.left = '0';
        dropdown.style.width = rect.width + 'px';
        
        const dropdownHeight = dropdown.offsetHeight || 200;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Calcular si hay suficiente espacio debajo (mínimo 200px o la altura del dropdown)
        const minSpaceNeeded = Math.min(dropdownHeight + 10, 250);
        const hasSpaceBelow = spaceBelow >= minSpaceNeeded;
        const hasSpaceAbove = spaceAbove >= minSpaceNeeded;
        
        // Configurar posición final
        dropdown.style.position = 'fixed';
        dropdown.style.left = rect.left + 'px';
        dropdown.style.width = rect.width + 'px';
        dropdown.style.zIndex = '10000';
        dropdown.style.visibility = 'visible';
        
        // Determinar si mostrar arriba o abajo
        let showAbove = false;
        if (!hasSpaceBelow && hasSpaceAbove) {
            showAbove = true;
            dropdown.style.top = (rect.top - dropdownHeight - 4) + 'px';
            dropdown.style.bottom = 'auto';
        } else {
            // Mostrar debajo por defecto
            dropdown.style.top = (rect.bottom + 4) + 'px';
            dropdown.style.bottom = 'auto';
        }
        
        // Agregar max-height y overflow para permitir scroll si es necesario
        // Usar el espacio disponible según la dirección del dropdown
        const availableSpace = showAbove ? spaceAbove - 20 : spaceBelow - 20;
        const maxHeight = Math.min(dropdownHeight, Math.max(availableSpace, 150), 400);
        dropdown.style.maxHeight = maxHeight + 'px';
        // Siempre permitir scroll si el contenido es más grande que el espacio disponible
        dropdown.style.overflowY = 'auto';
        dropdown.style.overflowX = 'hidden';
        
        dropdown.style.display = 'block';
    }
}

function seleccionarDropdownOption(dropdownId, campo, idProyecto, valor, elemento) {
    const dropdown = document.getElementById(dropdownId);
    const button = dropdown.previousElementSibling;
    
    // Actualizar el botón
    const opciones = Array.from(dropdown.children);
    opciones.forEach(op => {
        op.style.background = 'white';
        op.style.color = 'var(--text-primary)';
    });
    elemento.style.background = '#e8f0fe';
    elemento.style.color = 'var(--primary-color)';
    
    // Cerrar dropdown
    dropdown.style.display = 'none';
    
    // Detectar si estamos en proyectos internos
    const esProyectoInterno = typeof tipoActual !== 'undefined' && tipoActual === 'proyectos-internos';
    
    // Actualizar valor
    // Proyectos internos ahora usan la misma tabla que proyectos externos, así que usamos actualizarProyecto
    if (campo === 'overall' || campo === 'alcance' || campo === 'costo' || campo === 'plazos') {
        // Usar actualizarProyecto para ambos (proyectos internos y externos usan la misma tabla)
        actualizarProyecto(idProyecto, campo, valor);
        button.className = 'modern-select overall-select ' + (valor ? 'color-' + valor : '');
        button.textContent = valor === 'verde' ? '🟢' : valor === 'amarillo' ? '🟡' : valor === 'rojo' ? '🔴' : '-';
        if (valor === 'verde') button.style.background = '#e6f4ea';
        else if (valor === 'amarillo') button.style.background = '#fef7e0';
        else if (valor === 'rojo') button.style.background = '#fce8e6';
        else button.style.background = '#f8f9fa';
    } else if (campo === 'estado') {
        // Para todas las categorías de proyectos (no mantenimiento), usar actualizarProyecto
        // Para mantenimiento, usar actualizarMantenimiento
        if (esProyectoInterno || (typeof tipoActual !== 'undefined' && tipoActual !== 'mantenimiento')) {
            actualizarProyecto(idProyecto, campo, valor);
        } else {
            actualizarMantenimiento(idProyecto, campo, valor);
        }
        button.className = 'modern-select overall-select ' + (valor ? 'color-' + valor : '');
        button.textContent = valor === 'verde' ? '🟢' : valor === 'amarillo' ? '🟡' : valor === 'rojo' ? '🔴' : '-';
        if (valor === 'verde') button.style.background = '#e6f4ea';
        else if (valor === 'amarillo') button.style.background = '#fef7e0';
        else if (valor === 'rojo') button.style.background = '#fce8e6';
        else button.style.background = '#f8f9fa';
    } else if (campo === 'demanda' || campo === 'estabilidad') {
        actualizarMantenimiento(idProyecto, campo, valor);
        const tipo = campo === 'demanda' ? 'demanda' : 'estabilidad';
        button.className = 'modern-select icon-select ' + (valor ? tipo + '-' + valor : '');
        const iconos = {
            'demanda': { 'llama': '🔥', 'congelado': '❄️', 'herramientas': '🔧', 'palmera': '🌴' },
            'estabilidad': { 'llama': '🔥', 'herramientas': '🔧', 'cohete': '🚀' }
        };
        button.textContent = valor ? (iconos[tipo][valor] || '-') : '-';
    } else if (campo === 'satisfaccion') {
        actualizarMantenimiento(idProyecto, campo, valor);
        button.className = 'modern-select face-select ' + (valor ? 'satisfaccion-' + valor : '');
        const caras = { 'feliz': '😄', 'buena': '😊', 'regular': '😐', 'mala': '😞', 'enojado': '😠', 'calavera': '💀' };
        button.textContent = valor ? (caras[valor] || '-') : '-';
        if (valor === 'calavera') {
            button.style.background = '#000000';
            button.style.color = '#ffffff';
        } else {
            button.style.background = '#f8f9fa';
            button.style.color = 'var(--text-primary)';
        }
    }
}

function seleccionarDropdownEstado(dropdownId, idProyecto, valor, elemento) {
    console.log('🟢 seleccionarDropdownEstado llamado - dropdownId:', dropdownId, 'idProyecto:', idProyecto, 'valor:', valor);
    
    if (dropdownId && dropdownId.includes('-sub-')) {
        console.warn('⚠️ Dropdown de subproyecto detectado en seleccionarDropdownEstado, redirigiendo a seleccionarDropdownEstadoSubproyecto');
        const idSubproyecto = parseInt(dropdownId.split('-sub-')[1]);
        return seleccionarDropdownEstadoSubproyecto(dropdownId, idSubproyecto, valor, elemento);
    }
    
    const dropdown = document.getElementById(dropdownId);
    const button = dropdown.previousElementSibling;
    
    const opciones = Array.from(dropdown.children);
    opciones.forEach(op => {
        op.style.background = 'white';
        op.style.color = 'var(--text-primary)';
    });
    elemento.style.background = '#e8f0fe';
    elemento.style.color = 'var(--primary-color)';
    
    dropdown.style.display = 'none';
    
    // Detectar si estamos en proyectos internos
    const esProyectoInterno = typeof tipoActual !== 'undefined' && tipoActual === 'proyectos-internos';
    
    // Proyectos internos ahora usan la misma tabla que proyectos externos
    console.log('🟢 Llamando a actualizarProyecto con id_proyecto:', idProyecto);
    actualizarProyecto(idProyecto, 'estado', valor);
    
    const estados = {
        '': '-',
        'sin comenzar': 'Sin comenzar',
        'en curso': 'En curso',
        'Testing': 'Testing',
        'Entregado': 'Entregado',
        'Cerrado': 'Cerrado',
        'Rework': 'Rework',
        'Bloqueado': 'Bloqueado'
    };
    button.textContent = estados[valor] || '-';
    
    actualizarEstadoColor(button, valor);
}

function seleccionarDropdownRiesgo(dropdownId, idProyecto, valor, elemento) {
    const dropdown = document.getElementById(dropdownId);
    const button = dropdown.previousElementSibling;
    
    const opciones = Array.from(dropdown.children);
    opciones.forEach(op => {
        op.style.background = 'white';
        op.style.color = 'var(--text-primary)';
    });
    elemento.style.background = '#e8f0fe';
    elemento.style.color = 'var(--primary-color)';
    
    dropdown.style.display = 'none';
    
    // Proyectos internos ahora usan la misma tabla que proyectos externos
    actualizarProyecto(idProyecto, 'riesgos', valor);
    actualizarRiesgoColor(button);
    
    button.textContent = valor === 'ok' ? '✓' : valor === 'red flag' ? '🚩' : '-';
}

// Funciones para subproyectos
function seleccionarDropdownOptionSubproyecto(dropdownId, campo, idSubproyecto, valor, elemento) {
    const dropdown = document.getElementById(dropdownId);
    const button = dropdown.previousElementSibling;
    
    const opciones = Array.from(dropdown.children);
    opciones.forEach(op => {
        op.style.background = 'white';
        op.style.color = 'var(--text-primary)';
    });
    elemento.style.background = '#e8f0fe';
    elemento.style.color = 'var(--primary-color)';
    
    dropdown.style.display = 'none';
    
    if (campo === 'overall' || campo === 'alcance' || campo === 'costo' || campo === 'plazos') {
        actualizarSubproyecto(idSubproyecto, campo, valor);
        button.className = 'modern-select overall-select ' + (valor ? 'color-' + valor : '');
        button.textContent = valor === 'verde' ? '🟢' : valor === 'amarillo' ? '🟡' : valor === 'rojo' ? '🔴' : '-';
        if (valor === 'verde') button.style.background = '#e6f4ea';
        else if (valor === 'amarillo') button.style.background = '#fef7e0';
        else if (valor === 'rojo') button.style.background = '#fce8e6';
        else button.style.background = '#f8f9fa';
    }
}

function seleccionarDropdownEstadoSubproyecto(dropdownId, idSubproyecto, valor, elemento) {
    console.log('🔵 seleccionarDropdownEstadoSubproyecto llamado - dropdownId:', dropdownId, 'idSubproyecto:', idSubproyecto, 'valor:', valor);
    
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
        console.error('❌ Dropdown no encontrado:', dropdownId);
        return;
    }
    const button = dropdown.previousElementSibling;
    
    const opciones = Array.from(dropdown.children);
    opciones.forEach(op => {
        op.style.background = 'white';
        op.style.color = 'var(--text-primary)';
    });
    elemento.style.background = '#e8f0fe';
    elemento.style.color = 'var(--primary-color)';
    
    dropdown.style.display = 'none';
    
    console.log('🔵 Llamando a actualizarSubproyecto con id_subproyecto:', idSubproyecto);
    actualizarSubproyecto(idSubproyecto, 'estado', valor);
    
    const estados = {
        '': '-',
        'sin comenzar': 'Sin comenzar',
        'en curso': 'En curso',
        'Testing': 'Testing',
        'Entregado': 'Entregado',
        'Cerrado': 'Cerrado',
        'Rework': 'Rework',
        'Bloqueado': 'Bloqueado'
    };
    button.textContent = estados[valor] || '-';
    
    actualizarEstadoColor(button, valor);
}

function seleccionarDropdownRiesgoSubproyecto(dropdownId, idSubproyecto, valor, elemento) {
    const dropdown = document.getElementById(dropdownId);
    const button = dropdown.previousElementSibling;
    
    const opciones = Array.from(dropdown.children);
    opciones.forEach(op => {
        op.style.background = 'white';
        op.style.color = 'var(--text-primary)';
    });
    elemento.style.background = '#e8f0fe';
    elemento.style.color = 'var(--primary-color)';
    
    dropdown.style.display = 'none';
    
    actualizarSubproyecto(idSubproyecto, 'riesgos', valor);
    actualizarRiesgoColor(button);
    
    button.textContent = valor === 'ok' ? '✓' : valor === 'red flag' ? '🚩' : '-';
}

// Cerrar dropdowns al hacer click fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-dropdown') && !e.target.closest('button[onclick*="toggleCustomDropdown"]')) {
        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            dd.style.display = 'none';
        });
    }
});


