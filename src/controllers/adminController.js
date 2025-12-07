const ProductosEquiposModel = require('../models/ProductosEquiposModel');

/**
 * Renderizar página de administración
 */
async function index(req, res) {
    try {
        const productosEquipos = await ProductosEquiposModel.obtenerTodos();
        
        res.render('pages/admin', {
            title: 'Administración - Productos y Equipos',
            productosEquipos: productosEquipos,
            activeMenu: 'admin'
        });
    } catch (error) {
        console.error('Error en admin index:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            error: 'Error al cargar la página de administración'
        });
    }
}

/**
 * Obtener todos los productos y equipos
 */
async function obtenerProductosEquipos(req, res) {
    try {
        const productosEquipos = await ProductosEquiposModel.obtenerTodos();
        
        res.json({
            success: true,
            data: productosEquipos
        });
    } catch (error) {
        console.error('Error al obtener productos y equipos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener productos y equipos'
        });
    }
}

/**
 * Obtener productos y equipos únicos para los desplegables
 */
async function obtenerProductosYEquiposUnicos(req, res) {
    try {
        const productos = await ProductosEquiposModel.obtenerProductos();
        const equipos = await ProductosEquiposModel.obtenerEquipos();
        
        res.json({
            success: true,
            data: {
                productos,
                equipos
            }
        });
    } catch (error) {
        console.error('Error al obtener productos y equipos únicos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener productos y equipos únicos'
        });
    }
}

/**
 * Crear nuevo producto/equipo
 */
async function crearProductoEquipo(req, res) {
    try {
        const { producto, equipo, id_equipo_redmine, producto_redmine } = req.body;
        
        if (!producto || !equipo || !id_equipo_redmine) {
            return res.status(400).json({
                success: false,
                error: 'Faltan datos requeridos: producto, equipo, id_equipo_redmine'
            });
        }
        
        const resultado = await ProductosEquiposModel.crear({
            producto,
            equipo,
            id_equipo_redmine,
            producto_redmine: producto_redmine || null
        });
        
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al crear producto/equipo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear producto/equipo: ' + error.message
        });
    }
}

/**
 * Actualizar producto/equipo
 */
async function actualizarProductoEquipo(req, res) {
    try {
        const { id } = req.params;
        const { producto, equipo, id_equipo_redmine, producto_redmine } = req.body;
        
        const resultado = await ProductosEquiposModel.actualizar(id, {
            producto,
            equipo,
            id_equipo_redmine,
            producto_redmine: producto_redmine || null
        });
        
        if (!resultado) {
            return res.status(404).json({
                success: false,
                error: 'Producto/equipo no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al actualizar producto/equipo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar producto/equipo: ' + error.message
        });
    }
}

/**
 * Eliminar producto/equipo
 */
async function eliminarProductoEquipo(req, res) {
    try {
        const { id } = req.params;
        
        const eliminado = await ProductosEquiposModel.eliminar(id);
        
        if (!eliminado) {
            return res.status(404).json({
                success: false,
                error: 'Producto/equipo no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Producto/equipo eliminado correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar producto/equipo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar producto/equipo: ' + error.message
        });
    }
}

module.exports = {
    index,
    obtenerProductosEquipos,
    obtenerProductosYEquiposUnicos,
    crearProductoEquipo,
    actualizarProductoEquipo,
    eliminarProductoEquipo
};



