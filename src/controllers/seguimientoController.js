const MantenimientoModel = require('../models/MantenimientoModel');
const ProyectosExternosModel = require('../models/ProyectosExternosModel');
const ProyectosInternosModel = require('../models/ProyectosInternosModel');

// Lista de productos disponibles
const PRODUCTOS = [
    'Abbaco',
    'Unitrade',
    'Trading Room',
    'OMS',
    'Portfolio',
    'Portfolio Cloud',
    'Pepper'
];

/**
 * Renderizar página principal de seguimiento
 */
async function index(req, res) {
    try {
        const producto = req.query.producto || PRODUCTOS[0];
        const tipo = req.query.tipo || 'mantenimiento';
        
        res.render('pages/index', {
            title: 'Seguimiento de Proyectos',
            productos: PRODUCTOS,
            productoActual: producto,
            tipoActual: tipo,
            activeMenu: 'seguimiento'
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
        const filtros = {
            producto: producto,
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
 * Obtener datos de proyectos internos
 */
async function obtenerProyectosInternos(req, res) {
    try {
        const producto = req.query.producto || null;
        const filtros = {
            producto: producto,
            busqueda: req.query.busqueda || null,
            orden: req.query.orden || 'nombre_proyecto',
            direccion: req.query.direccion || 'asc'
        };
        
        const proyectos = await ProyectosInternosModel.obtenerTodos(filtros);
        
        res.json({
            success: true,
            data: proyectos
        });
    } catch (error) {
        console.error('Error al obtener proyectos internos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos de proyectos internos'
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
 * Actualizar datos editables de proyecto interno
 */
async function actualizarProyectoInterno(req, res) {
    try {
        const { id_proyecto } = req.params;
        const datos = req.body;
        
        const resultado = await ProyectosInternosModel.actualizar(id_proyecto, datos);
        
        if (!resultado) {
            return res.status(404).json({
                success: false,
                error: 'Proyecto interno no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al actualizar proyecto interno:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar proyecto interno'
        });
    }
}

module.exports = {
    index,
    obtenerMantenimiento,
    obtenerProyectosExternos,
    obtenerProyectosInternos,
    actualizarMantenimiento,
    actualizarProyectoExterno,
    actualizarProyectoInterno
};

