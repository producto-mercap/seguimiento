const express = require('express');
const router = express.Router();
const seguimientoController = require('../controllers/seguimientoController');
const adminController = require('../controllers/adminController');
const sincronizacionService = require('../services/sincronizacionService');
const { requireAuthJWT, requireAdmin } = require('../middleware/authJWT');

// Rutas para obtener datos
router.get('/mantenimiento', seguimientoController.obtenerMantenimiento);
router.get('/proyectos', seguimientoController.obtenerProyectos);
router.get('/epics/:id_proyecto', seguimientoController.obtenerEpics);

// Rutas para sugerencias de búsqueda
router.get('/mantenimiento/sugerencias', seguimientoController.obtenerSugerenciasMantenimiento);
router.get('/proyectos/sugerencias', seguimientoController.obtenerSugerenciasProyectos);

// Rutas para actualizar datos editables
router.put('/mantenimiento/:id_proyecto', seguimientoController.actualizarMantenimiento);
router.put('/proyectos/:id_proyecto', seguimientoController.actualizarProyecto);

// Rutas para sincronización con Redmine
router.post('/sincronizar/mantenimiento', async (req, res) => {
    try {
        const { producto, equipo, maxTotal } = req.body;
        const resultado = await sincronizacionService.sincronizarMantenimiento(producto, equipo, maxTotal);
        res.json(resultado);
    } catch (error) {
        console.error('Error en sincronización de mantenimiento:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/sincronizar/proyectos', async (req, res) => {
    try {
        const { producto, equipo, maxTotal } = req.body;
        const resultado = await sincronizacionService.sincronizarProyectos(producto, equipo, maxTotal);
        res.json(resultado);
    } catch (error) {
        console.error('Error en sincronización de proyectos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/sincronizar/epics', requireAuthJWT, seguimientoController.sincronizarEpics);

// Rutas de administración (requieren admin)
router.get('/admin/productos-equipos', requireAdmin, adminController.obtenerProductosEquipos);
router.get('/admin/productos-equipos/unicos', requireAdmin, adminController.obtenerProductosYEquiposUnicos);
router.post('/admin/productos-equipos', requireAdmin, adminController.crearProductoEquipo);
router.put('/admin/productos-equipos/:id', requireAdmin, adminController.actualizarProductoEquipo);
router.delete('/admin/productos-equipos/:id', requireAdmin, adminController.eliminarProductoEquipo);

module.exports = router;

