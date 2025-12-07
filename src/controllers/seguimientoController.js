const MantenimientoModel = require('../models/MantenimientoModel');
const ProyectosExternosModel = require('../models/ProyectosExternosModel');
const ProductosEquiposModel = require('../models/ProductosEquiposModel');
const EpicsProyectoModel = require('../models/EpicsProyectoModel');
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
        
        const proyectos = await ProyectosExternosModel.obtenerTodos(filtros);
        
        res.json({
            success: true,
            data: proyectos
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

module.exports = {
    index,
    obtenerMantenimiento,
    obtenerProyectos,
    obtenerEpics: obtenerEpicsProyecto,
    actualizarMantenimiento,
    actualizarProyecto,
    obtenerSugerenciasMantenimiento,
    obtenerSugerenciasProyectos,
    sincronizarEpics
};

