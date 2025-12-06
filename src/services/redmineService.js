// Servicio para consumir API de Redmine directamente
// ⚠️ SOLO PARA CONSULTAS (READ-ONLY) - NUNCA EDITAR/INSERTAR

const REDMINE_URL = process.env.REDMINE_URL;
const REDMINE_TOKEN = process.env.REDMINE_TOKEN;

/**
 * Validar que las credenciales están configuradas
 */
function validarCredenciales() {
    if (!REDMINE_URL) {
        throw new Error('❌ REDMINE_URL no está configurado en las variables de entorno');
    }
    if (!REDMINE_TOKEN) {
        throw new Error('❌ REDMINE_TOKEN no está configurado en las variables de entorno');
    }
    console.log('✅ Credenciales de Redmine configuradas');
}

/**
 * Extraer valor de custom field por ID o nombre
 * @param {Array} customFields - Array de custom fields
 * @param {string|number} fieldKey - ID o nombre del campo
 * @returns {string|null} - Valor del campo o null
 */
function extraerCustomField(customFields, fieldKey) {
    if (!Array.isArray(customFields)) return null;
    const field = customFields.find(cf => cf.id === fieldKey || cf.name === fieldKey);
    return field?.value ?? null;
}

/**
 * Mapear proyecto de Redmine al formato de la base de datos
 * @param {Object} proyecto - Proyecto de Redmine
 * @returns {Object} - Proyecto mapeado
 */
function mapearProyecto(proyecto) {
    const customFields = proyecto.custom_fields || [];
    
    // Extraer custom fields según especificación
    const producto = extraerCustomField(customFields, 19) || extraerCustomField(customFields, 'Producto');
    const cliente = extraerCustomField(customFields, 20) || extraerCustomField(customFields, 'Cliente');
    const lineaServicio = extraerCustomField(customFields, 28) || extraerCustomField(customFields, 'Línea de Servicio');
    const categoria = extraerCustomField(customFields, 29) || extraerCustomField(customFields, 'Categoría');
    const equipo = extraerCustomField(customFields, 75) || extraerCustomField(customFields, 'Equipo');
    const reventa = extraerCustomField(customFields, 93) || extraerCustomField(customFields, 'Es Reventa');
    const proyectoSponsor = extraerCustomField(customFields, 94) || extraerCustomField(customFields, 'Proyecto Sponsor');
    
    // Normalizar reventa
    let reventaNormalizada = null;
    if (reventa !== null && reventa !== undefined && reventa !== '') {
        const reventaStr = String(reventa).trim();
        if (reventaStr === '1' || reventaStr.toLowerCase() === 'si' || reventaStr.toLowerCase() === 'yes') {
            reventaNormalizada = 'Si';
        } else if (reventaStr === '0' || reventaStr.toLowerCase() === 'no') {
            reventaNormalizada = 'No';
        } else {
            reventaNormalizada = reventaStr;
        }
    }
    
    return {
        id_proyecto: proyecto.id,
        nombre_proyecto: proyecto.name || 'Sin nombre',
        codigo_proyecto: proyecto.identifier || null,
        proyecto_padre: proyecto.parent?.name || null,
        estado_redmine: proyecto.status || null,
        producto: producto || null,
        cliente: cliente || null,
        linea_servicio: lineaServicio || null,
        categoria: categoria || null,
        equipo: equipo || null,
        reventa: reventaNormalizada,
        proyecto_sponsor: proyectoSponsor || null,
        fecha_creacion: proyecto.created_on ? new Date(proyecto.created_on) : null
    };
}

/**
 * Obtener proyectos desde Redmine
 * @param {Object} options - Opciones de búsqueda
 * @param {string} options.producto - Filtrar por producto (opcional)
 * @param {string} options.linea_servicio - Filtrar por línea de servicio (opcional)
 * @param {number} options.limit - Límite de resultados (default: 100)
 * @param {number} options.offset - Offset para paginación (default: 0)
 * @returns {Promise<Object>} - Datos de Redmine
 */
async function obtenerProyectos(options = {}) {
    validarCredenciales();
    
    const limit = Math.min(options.limit || 100, 100);
    const offset = options.offset || 0;
    
    const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        key: REDMINE_TOKEN
    });
    
    // Agregar filtros por custom fields si se especifican
    if (options.producto) {
        params.set('cf_19', options.producto);
    }
    if (options.linea_servicio) {
        params.set('cf_28', options.linea_servicio);
    }
    
    const baseUrl = REDMINE_URL.replace(/\/+$/, '');
    const url = `${baseUrl}/projects.json?${params.toString()}`;
    const urlLog = url.replace(/key=[^&]+/, 'key=***');
    console.log(`🔍 Consultando proyectos de Redmine: ${urlLog}`);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Seguimiento-NodeJS/1.0'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error HTTP en proyectos:', response.status);
            console.error('📄 Respuesta:', errorText.substring(0, 500));
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✅ Proyectos obtenidos: ${data.projects?.length || 0} (total Redmine: ${data.total_count || data.projects?.length || 0})`);
        return data;
    } catch (error) {
        console.error('❌ Error al obtener proyectos de Redmine:', error.message);
        throw error;
    }
}

/**
 * Obtener todos los proyectos mapeados (con paginación automática)
 * @param {Object} options - Opciones de búsqueda
 * @param {string} options.producto - Filtrar por producto (opcional)
 * @param {string} options.linea_servicio - Filtrar por línea de servicio (opcional)
 * @param {number} options.maxTotal - Límite máximo de proyectos (null = sin límite)
 * @returns {Promise<Array>} - Array de proyectos mapeados
 */
async function obtenerProyectosMapeados(options = {}) {
    const maxTotalSolicitado = options.maxTotal ? parseInt(options.maxTotal, 10) : null;
    const tope = maxTotalSolicitado || 100;
    const proyectos = [];
    let offset = 0;
    let hasMore = true;
    
    console.log('📥 Obteniendo proyectos de Redmine...');
    if (maxTotalSolicitado) {
        console.log(`   ⚠️ Modo prueba: limitado a ${maxTotalSolicitado} proyectos`);
    }
    
    while (hasMore && proyectos.length < tope) {
        const restantes = tope - proyectos.length;
        const limitActual = Math.min(restantes, 100);
        
        const data = await obtenerProyectos({
            ...options,
            limit: limitActual,
            offset
        });
        
        const items = data.projects || [];
        proyectos.push(...items);
        
        const totalCount = data.total_count || items.length;
        hasMore = totalCount > (offset + limitActual);
        offset += limitActual;
        
        if (!hasMore) {
            break;
        }
        
        // Pausa de 200ms entre requests para no saturar el servidor
        if (hasMore && proyectos.length < tope) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    
    const proyectosLimitados = proyectos.slice(0, tope);
    console.log(`✅ Proyectos preparados: ${proyectosLimitados.length}`);
    
    return proyectosLimitados.map(mapearProyecto);
}

/**
 * Filtrar proyectos por tipo (mantenimiento, proyectos externos, proyectos internos)
 * @param {Array} proyectos - Array de proyectos mapeados
 * @param {string} tipo - Tipo de proyecto: 'mantenimiento', 'externos', 'internos'
 * @returns {Array} - Proyectos filtrados
 */
function filtrarProyectosPorTipo(proyectos, tipo) {
    if (!Array.isArray(proyectos)) return [];
    
    switch (tipo) {
        case 'mantenimiento':
            // Mantenimiento: línea_servicio = "Si"
            return proyectos.filter(p => p.linea_servicio === 'Si' || p.linea_servicio === '1');
        
        case 'externos':
            // Proyectos externos: línea_servicio != "Si" y reventa = "No"
            return proyectos.filter(p => 
                (p.linea_servicio !== 'Si' && p.linea_servicio !== '1') && 
                (p.reventa === 'No' || p.reventa === '0')
            );
        
        case 'internos':
            // Proyectos internos: reventa = "Si"
            return proyectos.filter(p => p.reventa === 'Si' || p.reventa === '1');
        
        default:
            return proyectos;
    }
}

module.exports = {
    obtenerProyectos,
    obtenerProyectosMapeados,
    mapearProyecto,
    filtrarProyectosPorTipo,
    validarCredenciales
};

