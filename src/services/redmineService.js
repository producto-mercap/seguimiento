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
        proyecto_padre: proyecto.parent?.id || null,
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
 * Obtener ID del proyecto por su código (identifier)
 * @param {string} codigoProyecto - Código del proyecto (identifier)
 * @returns {Promise<number|null>} - ID del proyecto o null si no se encuentra
 */
async function obtenerIdProyectoPorCodigo(codigoProyecto) {
    if (!codigoProyecto) return null;

    validarCredenciales();

    try {
        const baseUrl = REDMINE_URL.replace(/\/+$/, '');
        const url = `${baseUrl}/projects/${codigoProyecto}.json?key=${REDMINE_TOKEN}`;
        const urlLog = url.replace(/key=[^&]+/, 'key=***');
        console.log(`🔍 Consultando proyecto por código en Redmine: ${urlLog}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Seguimiento-NodeJS/1.0'
            }
        });

        if (!response.ok) {
            console.warn(`⚠️ No se pudo obtener el proyecto con código "${codigoProyecto}": ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data.project?.id || null;
    } catch (error) {
        console.error(`❌ Error al obtener ID del proyecto "${codigoProyecto}":`, error.message);
        return null;
    }
}

/**
 * Obtener proyecto completo por su código (identifier)
 * @param {string} codigoProyecto - Código del proyecto (identifier)
 * @returns {Promise<Object|null>} - Proyecto completo o null si no se encuentra
 */
async function obtenerProyectoPorCodigo(codigoProyecto) {
    if (!codigoProyecto) return null;

    validarCredenciales();

    try {
        const baseUrl = REDMINE_URL.replace(/\/+$/, '');
        const url = `${baseUrl}/projects/${codigoProyecto}.json?key=${REDMINE_TOKEN}&include=parent`;
        const urlLog = url.replace(/key=[^&]+/, 'key=***');
        console.log(`🔍 Consultando proyecto completo por código en Redmine: ${urlLog}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Seguimiento-NodeJS/1.0'
            }
        });

        if (!response.ok) {
            console.warn(`⚠️ No se pudo obtener el proyecto con código "${codigoProyecto}": ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data.project || null;
    } catch (error) {
        console.error(`❌ Error al obtener proyecto "${codigoProyecto}":`, error.message);
        return null;
    }
}

/**
 * Obtener proyectos desde Redmine
 * @param {Object} options - Opciones de búsqueda
 * @param {string} options.producto - Filtrar por producto (cf_19)
 * @param {string} options.equipo - Filtrar por equipo (cf_75) - ID del equipo en Redmine
 * @param {string} options.categoria - Filtrar por categoría (cf_29): "Mantenimiento" o cualquier otro valor
 * @param {string} options.codigo_proyecto_padre - Código del proyecto padre para filtrar (identifier)
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

    // Filtrar por línea de servicio (cf_28): "Si" o "Hereda"
    const lineaServicio = options.linea_servicio || 'Si';
    params.set('cf_28', lineaServicio);

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
        let proyectos = data.projects || [];

        // Filtrar por proyecto padre si se especifica
        if (options.codigo_proyecto_padre) {
            const parentId = await obtenerIdProyectoPorCodigo(options.codigo_proyecto_padre);
            if (parentId) {
                // Filtrar proyectos que tienen el proyecto padre especificado
                // La API de Redmine puede devolver parent como objeto {id, name} o solo id
                proyectos = proyectos.filter(p => {
                    if (p.parent) {
                        // Si parent es un objeto con id
                        if (typeof p.parent === 'object' && p.parent.id) {
                            return p.parent.id === parentId;
                        }
                        // Si parent es solo un número
                        if (typeof p.parent === 'number') {
                            return p.parent === parentId;
                        }
                    }
                    return false;
                });
                console.log(`   🔍 Filtrado por proyecto padre (ID: ${parentId}, código: ${options.codigo_proyecto_padre}): ${proyectos.length} proyectos de ${data.projects?.length || 0} totales`);
            } else {
                console.warn(`   ⚠️ No se encontró el proyecto padre con código "${options.codigo_proyecto_padre}", no se aplicará el filtro`);
            }
        }

        // Actualizar total_count si se filtró
        const totalCount = proyectos.length;

        return {
            projects: proyectos,
            total_count: totalCount,
            offset: data.offset || offset,
            limit: data.limit || limit
        };
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
 * @param {string} options.codigo_proyecto_padre - Código del proyecto padre para filtrar (identifier)
 * @param {number} options.maxTotal - Límite máximo de proyectos (null = sin límite)
 * @returns {Promise<Array>} - Array de proyectos mapeados
 */
async function obtenerProyectosMapeados(options = {}) {
    const maxTotalSolicitado = options.maxTotal ? parseInt(options.maxTotal, 10) : null;
    const tope = maxTotalSolicitado || 100;
    const proyectos = [];
    let offset = 0;
    let hasMore = true;

    const lineaServicio = options.linea_servicio || 'Si';
    const categoria = options.categoria || 'Sin categoría';

    while (hasMore && proyectos.length < tope) {
        const restantes = tope - proyectos.length;
        const limitActual = Math.min(restantes, 100);

        const data = await obtenerProyectos({
            producto: options.producto,
            equipo: options.equipo,
            categoria: options.categoria,
            codigo_proyecto_padre: options.codigo_proyecto_padre,
            linea_servicio: lineaServicio,
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
    console.log(`   📊 Categoría: ${categoria} | Proyectos obtenidos: ${proyectosLimitados.length}`);

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

    console.log(`🔍 Consultando epics de Redmine para proyecto ${projectId}...`);

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

        const urlLog = url.toString().replace(/key=[^&]+/, 'key=***');
        console.log(`   📥 Obteniendo epics (offset: ${offset}, limit: ${limit}): ${urlLog}`);

        const response = await fetch(url.toString(), {
            headers: {
                'X-Redmine-API-Key': REDMINE_TOKEN
            }
        });

        if (!response.ok) {
            // Manejo específico para 403 Forbidden
            if (response.status === 403) {
                throw new Error(`403 Forbidden: El token de Redmine no tiene permisos para acceder al proyecto "${projectId}". Verifica que el proyecto existe y que el token tiene los permisos necesarios.`);
            }
            // Manejo específico para 404 Not Found
            if (response.status === 404) {
                throw new Error(`404 Not Found: El proyecto "${projectId}" no existe en Redmine.`);
            }
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

function parseDateIso(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    return null;
}

/**
 * Mapear epic de Redmine al formato de la base de datos
 * @param {Object} epic - Epic de Redmine
 * @returns {Object} - Epic mapeado
 */
function mapearEpic(epic) {
    const customFields = epic.custom_fields || [];

    const cf_23 = extraerCustomField(customFields, 23) || extraerCustomField(customFields, 'id_services');
    const cf_15 = extraerCustomField(customFields, 15) || extraerCustomField(customFields, 'fecha real finalización');

    // Usar campos nativos de Redmine: start_date y due_date
    // Estos reemplazan a los custom fields cf_21 y cf_22
    const start_date = parseDateIso(epic.start_date);
    const due_date = parseDateIso(epic.due_date);

    return {
        epic_id: epic.id,
        subject: epic.subject || null,
        status: epic.status?.name || null,
        total_estimated_hours: epic.total_estimated_hours || null,
        total_spent_hours: epic.total_spent_hours || null,
        proyecto_padre: epic.project?.id || null,
        nombre_proyecto_padre: epic.project?.name || null,
        cf_23: cf_23 || null,
        // Usar campos nativos: start_date y due_date (guardados en cf_21 y cf_22 para compatibilidad con BD)
        cf_21: start_date,  // start_date nativo de Redmine
        cf_22: due_date,   // due_date nativo de Redmine
        cf_15: parseDateIso(cf_15),
        // También exponer los campos nativos directamente para uso en frontend
        start_date: start_date,
        due_date: due_date
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
    mapearEpic,
    obtenerProyectoPorCodigo,
    obtenerIdProyectoPorCodigo,
    extraerCustomField
};

