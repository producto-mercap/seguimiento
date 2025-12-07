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
    const limiteHoras = extraerCustomField(customFields, 30) || extraerCustomField(customFields, 'Límite de Horas');
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
        limite_horas: limiteHoras || null,
        equipo: equipo || null,
        reventa: reventaNormalizada,
        proyecto_sponsor: proyectoSponsor || null,
        fecha_creacion: proyecto.created_on ? new Date(proyecto.created_on) : null
    };
}

/**
 * Normalizar nombre de producto para Redmine
 * @param {string} producto - Nombre del producto
 * @returns {Promise<string>} - Nombre normalizado para Redmine (desde BD o mapeo por defecto)
 */
async function normalizarProductoParaRedmine(producto) {
    // Intentar obtener desde BD primero
    try {
        const ProductosEquiposModel = require('../models/ProductosEquiposModel');
        const productoRedmine = await ProductosEquiposModel.obtenerProductoRedmine(producto);
        if (productoRedmine) {
            return productoRedmine;
        }
    } catch (error) {
        console.warn('⚠️ No se pudo obtener producto_redmine desde BD, usando mapeo por defecto:', error.message);
    }
    
    // Mapeo por defecto (fallback)
    const mapeo = {
        'Order Management': 'Order Management',
        'Portfolio': 'mp',
        'Portfolio Cloud': 'portfolio cloud',
        'Trading Room': 'Trading Room',
        'Abbaco': 'Abbaco',
        'Unitrade': 'Unitrade',
        'Pepper': 'Pepper'
    };
    return mapeo[producto] || producto;
}

/**
 * Obtener proyectos desde Redmine
 * @param {Object} options - Opciones de búsqueda
 * @param {string} options.producto - Filtrar por producto (cf_19)
 * @param {string} options.equipo - Filtrar por equipo (cf_75) - ID del equipo en Redmine
 * @param {string} options.categoria - Filtrar por categoría (cf_29): "Mantenimiento" o cualquier otro valor
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
        const productoNormalizado = await normalizarProductoParaRedmine(options.producto);
        params.set('cf_19', productoNormalizado);
    }
    if (options.equipo) {
        params.set('cf_75', options.equipo);
    }
    if (options.categoria) {
        params.set('cf_29', options.categoria);
    }
    
    // SIEMPRE filtrar por línea de servicio "Si" (cf_28)
    params.set('cf_28', 'Si');
    
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
 * @param {string} options.producto - Filtrar por producto (cf_19)
 * @param {string} options.equipo - Filtrar por equipo (cf_75) - ID del equipo en Redmine
 * @param {string} options.categoria - Filtrar por categoría (cf_29)
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
            producto: options.producto,
            equipo: options.equipo,
            categoria: options.categoria,
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
 * Filtrar proyectos por tipo (mantenimiento, proyectos)
 * @param {Array} proyectos - Array de proyectos mapeados
 * @param {string} tipo - Tipo de proyecto: 'mantenimiento', 'proyectos'
 * @returns {Array} - Proyectos filtrados
 */
function filtrarProyectosPorTipo(proyectos, tipo) {
    if (!Array.isArray(proyectos)) return [];
    
    switch (tipo) {
        case 'mantenimiento':
            // Mantenimiento: categoría = "Mantenimiento"
            return proyectos.filter(p => p.categoria === 'Mantenimiento');
        
        case 'proyectos':
            // Proyectos: categoría != "Mantenimiento"
            return proyectos.filter(p => p.categoria !== 'Mantenimiento' && p.categoria !== null && p.categoria !== '');
        
        default:
            return proyectos;
    }
}

/**
 * Obtener epics de un proyecto desde Redmine
 * @param {string|number} projectId - ID o identifier del proyecto
 * @returns {Promise<Array>} - Array de epics
 */
async function obtenerEpics(projectId) {
    validarCredenciales();
    
    const epics = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore) {
        const url = new URL(`${REDMINE_URL}/issues.json`);
        url.searchParams.set('project_id', projectId.toString());
        url.searchParams.set('tracker_id', '19'); // Tracker de Epics
        url.searchParams.set('limit', limit.toString());
        url.searchParams.set('offset', offset.toString());
        url.searchParams.set('status_id', '*'); // Todos los estados
        
        const response = await fetch(url.toString(), {
            headers: {
                'X-Redmine-API-Key': REDMINE_TOKEN
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error al obtener epics: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const items = data.issues || [];
        epics.push(...items);
        
        const totalCount = data.total_count || items.length;
        hasMore = totalCount > (offset + limit);
        offset += limit;
        
        if (!hasMore) {
            break;
        }
        
        // Pausa entre requests
        if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    
    console.log(`✅ Epics obtenidos para proyecto ${projectId}: ${epics.length}`);
    return epics;
}

/**
 * Mapear epic de Redmine al formato de la base de datos
 * @param {Object} epic - Epic de Redmine
 * @returns {Object} - Epic mapeado
 */
function mapearEpic(epic) {
    const customFields = epic.custom_fields || [];
    
    const cf_23 = extraerCustomField(customFields, 23) || extraerCustomField(customFields, 'id_services');
    const cf_21 = extraerCustomField(customFields, 21) || extraerCustomField(customFields, 'fecha planificada inicio');
    const cf_22 = extraerCustomField(customFields, 22) || extraerCustomField(customFields, 'fecha planificada fin');
    const cf_15 = extraerCustomField(customFields, 15) || extraerCustomField(customFields, 'fecha real finalización');
    
    // Convertir fechas
    const fecha21 = cf_21 ? new Date(cf_21) : null;
    const fecha22 = cf_22 ? new Date(cf_22) : null;
    const fecha15 = cf_15 ? new Date(cf_15) : null;
    
    return {
        epic_id: epic.id,
        subject: epic.subject || null,
        status: epic.status?.name || null,
        total_estimated_hours: epic.total_estimated_hours || null,
        total_spent_hours: epic.total_spent_hours || null,
        proyecto_padre: epic.project?.id || null,
        nombre_proyecto_padre: epic.project?.name || null,
        cf_23: cf_23 || null,
        cf_21: fecha21 && !isNaN(fecha21.getTime()) ? fecha21.toISOString().split('T')[0] : null,
        cf_22: fecha22 && !isNaN(fecha22.getTime()) ? fecha22.toISOString().split('T')[0] : null,
        cf_15: fecha15 && !isNaN(fecha15.getTime()) ? fecha15.toISOString().split('T')[0] : null
    };
}

module.exports = {
    obtenerProyectos,
    obtenerProyectosMapeados,
    mapearProyecto,
    filtrarProyectosPorTipo,
    normalizarProductoParaRedmine,
    validarCredenciales,
    obtenerEpics,
    mapearEpic
};

