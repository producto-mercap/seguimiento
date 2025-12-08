const MantenimientoModel = require('../models/MantenimientoModel');
const ProyectosExternosModel = require('../models/ProyectosExternosModel');
const ProductosEquiposModel = require('../models/ProductosEquiposModel');
const EpicsProyectoModel = require('../models/EpicsProyectoModel');
const SubproyectosModel = require('../models/SubproyectosModel');
const { obtenerEpics, mapearEpic } = require('../services/redmineService');

/**
 * Renderizar página principal de seguimiento
 */
async function index(req, res) {
    try {
        const producto = req.query.producto || null;
        const equipo = req.query.equipo || null;
        const tipo = req.query.tipo || 'mantenimiento';
        
        // Obtener productos con equipos
        const productosEquipos = await ProductosEquiposModel.obtenerTodos();
        
        // Obtener nombre del equipo actual si existe
        let equipoNombre = null;
        if (equipo) {
            for (const item of productosEquipos) {
                const equipoEncontrado = item.equipos?.find(e => e.id_equipo_redmine === equipo);
                if (equipoEncontrado) {
                    equipoNombre = equipoEncontrado.equipo;
                    break;
                }
            }
        }
        
        res.render('pages/index', {
            title: 'Seguimiento de Proyectos',
            productosEquipos: productosEquipos,
            productoActual: producto,
            equipoActual: equipo,
            equipoNombre: equipoNombre,
            tipoActual: tipo,
            activeMenu: 'seguimiento',
            isAdmin: req.isAdmin || false
        });
    } catch (error) {
        console.error('Error en index:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            error: 'Error al cargar la página'
        });
    }
}

/**
 * Obtener datos de mantenimiento
 */
async function obtenerMantenimiento(req, res) {
    try {
        const producto = req.query.producto || null;
        const equipo = req.query.equipo || null;
        const filtros = {
            producto: producto,
            equipo: equipo,
            busqueda: req.query.busqueda || null,
            orden: req.query.orden || 'nombre_proyecto',
            direccion: req.query.direccion || 'asc'
        };
        
        const mantenimientos = await MantenimientoModel.obtenerTodos(filtros);
        
        res.json({
            success: true,
            data: mantenimientos
        });
    } catch (error) {
        console.error('Error al obtener mantenimiento:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos de mantenimiento'
        });
    }
}

/**
 * Obtener datos de proyectos externos
 */
async function obtenerProyectosExternos(req, res) {
    try {
        const producto = req.query.producto || null;
        const filtros = {
            producto: producto,
            busqueda: req.query.busqueda || null,
            orden: req.query.orden || 'nombre_proyecto',
            direccion: req.query.direccion || 'asc'
        };
        
        const proyectos = await ProyectosExternosModel.obtenerTodos(filtros);
        
        res.json({
            success: true,
            data: proyectos
        });
    } catch (error) {
        console.error('Error al obtener proyectos externos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos de proyectos externos'
        });
    }
}

/**
 * Obtener datos de proyectos (renombrado desde proyectos externos)
 */
async function obtenerProyectos(req, res) {
    try {
        const producto = req.query.producto || null;
        const equipo = req.query.equipo || null;
        const filtros = {
            producto: producto,
            equipo: equipo,
            busqueda: req.query.busqueda || null,
            orden: req.query.orden || 'nombre_proyecto',
            direccion: req.query.direccion || 'asc'
        };
        
        console.log('📊 Obteniendo proyectos con filtros:', {
            producto: filtros.producto,
            equipo: filtros.equipo,
            busqueda: filtros.busqueda
        });
        
        const proyectos = await ProyectosExternosModel.obtenerTodos(filtros);
        
        console.log(`✅ Proyectos obtenidos de BD: ${proyectos.length}`);
        
        // Obtener epics secundarios para todos los proyectos (solo para detectar si tiene subproyectos)
        const ids_proyectos = proyectos.map(p => p.id_proyecto);
        const epicsSecundarios = await EpicsProyectoModel.obtenerEpicsSecundariosPorProyectos(ids_proyectos);
        
        // Solo marcar si tiene subproyectos, pero NO cargar los subproyectos todavía (carga lazy)
        const proyectosConInfoSubproyectos = proyectos.map(proyecto => {
            const epicsDelProyecto = epicsSecundarios[proyecto.id_proyecto] || [];
            // Agrupar epics por proyecto_padre para contar subproyectos únicos
            const proyectosSecundariosUnicos = {};
            epicsDelProyecto.forEach(epic => {
                const proyectoPadre = epic.proyecto_padre;
                if (proyectoPadre && !proyectosSecundariosUnicos[proyectoPadre]) {
                    proyectosSecundariosUnicos[proyectoPadre] = true;
                }
            });
            const tieneSubproyectos = Object.keys(proyectosSecundariosUnicos).length > 0;
            
            return {
                ...proyecto,
                tiene_subproyectos: tieneSubproyectos,
                subproyectos: [] // No cargar todavía, se cargarán bajo demanda
            };
        });
        
        res.json({
            success: true,
            data: proyectosConInfoSubproyectos
        });
    } catch (error) {
        console.error('Error al obtener proyectos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos de proyectos'
        });
    }
}

/**
 * Actualizar datos editables de mantenimiento
 */
async function actualizarMantenimiento(req, res) {
    try {
        const { id_proyecto } = req.params;
        const datos = req.body;
        
        const resultado = await MantenimientoModel.actualizar(id_proyecto, datos);
        
        if (!resultado) {
            return res.status(404).json({
                success: false,
                error: 'Mantenimiento no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al actualizar mantenimiento:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar mantenimiento'
        });
    }
}

/**
 * Actualizar datos editables de proyecto externo
 */
async function actualizarProyectoExterno(req, res) {
    try {
        const { id_proyecto } = req.params;
        const datos = req.body;
        
        const resultado = await ProyectosExternosModel.actualizar(id_proyecto, datos);
        
        if (!resultado) {
            return res.status(404).json({
                success: false,
                error: 'Proyecto externo no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al actualizar proyecto externo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar proyecto externo'
        });
    }
}

/**
 * Actualizar datos editables de proyecto
 */
async function actualizarProyecto(req, res) {
    try {
        const { id_proyecto } = req.params;
        const datos = req.body;
        
        const resultado = await ProyectosExternosModel.actualizar(id_proyecto, datos);
        
        if (!resultado) {
            return res.status(404).json({
                success: false,
                error: 'Proyecto no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al actualizar proyecto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar proyecto'
        });
    }
}

/**
 * Obtener sugerencias de búsqueda para mantenimiento
 */
async function obtenerSugerenciasMantenimiento(req, res) {
    try {
        const query = req.query.q || '';
        
        if (!query || query.length < 2) {
            return res.json({
                success: true,
                sugerencias: []
            });
        }
        
        const filtros = {
            producto: req.query.producto || null,
            equipo: req.query.equipo || null,
            busqueda: query
        };
        
        const mantenimientos = await MantenimientoModel.obtenerTodos(filtros);
        
        // Limitar a 8 sugerencias
        const sugerencias = mantenimientos.slice(0, 8).map(item => ({
            id_proyecto: item.id_proyecto,
            nombre_proyecto: item.nombre_proyecto || 'Sin nombre',
            cliente: item.cliente || '',
            producto: item.producto || ''
        }));
        
        res.json({
            success: true,
            sugerencias
        });
    } catch (error) {
        console.error('Error al obtener sugerencias de mantenimiento:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener sugerencias'
        });
    }
}

/**
 * Obtener sugerencias de búsqueda para proyectos
 */
async function obtenerSugerenciasProyectos(req, res) {
    try {
        const query = req.query.q || '';
        
        if (!query || query.length < 2) {
            return res.json({
                success: true,
                sugerencias: []
            });
        }
        
        const filtros = {
            producto: req.query.producto || null,
            equipo: req.query.equipo || null,
            busqueda: query
        };
        
        const proyectos = await ProyectosExternosModel.obtenerTodos(filtros);
        
        // Limitar a 8 sugerencias
        const sugerencias = proyectos.slice(0, 8).map(item => ({
            id_proyecto: item.id_proyecto,
            nombre_proyecto: item.nombre_proyecto || 'Sin nombre',
            cliente: item.cliente || '',
            producto: item.producto || ''
        }));
        
        res.json({
            success: true,
            sugerencias
        });
    } catch (error) {
        console.error('Error al obtener sugerencias de proyectos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener sugerencias'
        });
    }
}

/**
 * Sincronizar epics de un proyecto
 */
async function sincronizarEpics(req, res) {
    try {
        const { id_proyecto, codigo_proyecto } = req.body;
        
        if (!id_proyecto || !codigo_proyecto) {
            return res.status(400).json({
                success: false,
                error: 'ID de proyecto y código son requeridos'
            });
        }
        
        // Obtener epics de Redmine
        const epics = await obtenerEpics(codigo_proyecto);
        
        // Mapear epics
        const epicsMapeados = epics.map(mapearEpic);
        
        // Guardar en base de datos
        const resultado = await EpicsProyectoModel.guardarEpics(id_proyecto, epicsMapeados);
        
        // Obtener totales actualizados
        const totales = await EpicsProyectoModel.obtenerTotalesPorProyecto(id_proyecto);
        
        // Actualizar fechas del proyecto si hay epics
        if (totales.total_epics > 0) {
            await ProyectosExternosModel.actualizar(id_proyecto, {
                fecha_inicio: totales.fecha_inicio_minima,
                fecha_fin: totales.fecha_fin_maxima
            });
        }
        
        res.json({
            success: true,
            data: {
                insertados: resultado.insertados,
                actualizados: resultado.actualizados,
                total: resultado.total,
                horas_estimadas: totales.horas_estimadas,
                horas_realizadas: totales.horas_realizadas,
                fecha_inicio: totales.fecha_inicio_minima,
                fecha_fin: totales.fecha_fin_maxima
            }
        });
    } catch (error) {
        console.error('Error al sincronizar epics:', error);
        res.status(500).json({
            success: false,
            error: 'Error al sincronizar epics: ' + error.message
        });
    }
}

/**
 * Obtener epics de un proyecto desde la base de datos
 */
async function obtenerEpicsProyecto(req, res) {
    try {
        const id_proyecto = parseInt(req.params.id_proyecto);
        
        if (!id_proyecto) {
            return res.status(400).json({
                success: false,
                error: 'ID de proyecto es requerido'
            });
        }
        
        const epics = await EpicsProyectoModel.obtenerPorProyecto(id_proyecto);
        
        res.json({
            success: true,
            data: epics
        });
    } catch (error) {
        console.error('Error al obtener epics:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener epics'
        });
    }
}

/**
 * Obtener métricas del dashboard
 */
async function obtenerMetricasDashboard(req, res) {
    try {
        const metricas = await ProyectosExternosModel.obtenerMetricasDashboard();
        
        res.json({
            success: true,
            data: metricas
        });
    } catch (error) {
        console.error('Error al obtener métricas del dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener métricas del dashboard'
        });
    }
}

/**
 * Obtener subproyectos de un proyecto específico (carga lazy - optimizado)
 */
async function obtenerSubproyectos(req, res) {
    try {
        const { id_proyecto } = req.params;
        const idProyectoNum = parseInt(id_proyecto);
        
        if (isNaN(idProyectoNum)) {
            return res.status(400).json({
                success: false,
                error: 'ID de proyecto inválido'
            });
        }
        
        console.log('📦 Obteniendo subproyectos para proyecto:', idProyectoNum);
        
        // Primero verificar si ya existen subproyectos en la BD (más rápido)
        let subproyectos = await SubproyectosModel.obtenerPorProyecto(idProyectoNum);
        
        // Si no hay subproyectos, sincronizar desde epics (solo si es necesario)
        if (subproyectos.length === 0) {
            console.log('📦 No hay subproyectos en BD, sincronizando desde epics...');
            const epicsSecundarios = await EpicsProyectoModel.obtenerEpicsSecundariosPorProyectos([idProyectoNum]);
            const epicsDelProyecto = epicsSecundarios[idProyectoNum] || [];
            
            if (epicsDelProyecto.length > 0) {
                await SubproyectosModel.sincronizarDesdeEpics(idProyectoNum, epicsDelProyecto);
                // Obtener subproyectos después de sincronizar
                subproyectos = await SubproyectosModel.obtenerPorProyecto(idProyectoNum);
            }
        } else {
            console.log('✅ Subproyectos encontrados en BD:', subproyectos.length);
        }
        
        res.json({
            success: true,
            data: subproyectos
        });
    } catch (error) {
        console.error('Error al obtener subproyectos:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener subproyectos'
        });
    }
}

/**
 * Actualizar datos editables de subproyecto
 */
async function actualizarSubproyecto(req, res) {
    try {
        const { id_subproyecto } = req.params;
        const datos = req.body;
        
        console.log('📝 actualizarSubproyecto - id_subproyecto:', id_subproyecto, 'datos:', datos);
        
        // Validar que id_subproyecto es un número
        const idSubproyectoNum = parseInt(id_subproyecto);
        if (isNaN(idSubproyectoNum)) {
            return res.status(400).json({
                success: false,
                error: 'ID de subproyecto inválido'
            });
        }
        
        const resultado = await SubproyectosModel.actualizar(idSubproyectoNum, datos);
        
        if (!resultado) {
            return res.status(404).json({
                success: false,
                error: 'Subproyecto no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al actualizar subproyecto:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al actualizar subproyecto'
        });
    }
}

module.exports = {
    index,
    obtenerMantenimiento,
    obtenerProyectos,
    obtenerEpics: obtenerEpicsProyecto,
    obtenerSubproyectos,
    actualizarMantenimiento,
    actualizarProyecto,
    actualizarSubproyecto,
    obtenerSugerenciasMantenimiento,
    obtenerSugerenciasProyectos,
    sincronizarEpics,
    obtenerMetricasDashboard
};

