const express = require('express');
const router = express.Router();
const seguimientoController = require('../controllers/seguimientoController');
const sincronizacionService = require('../services/sincronizacionService');

// Rutas para obtener datos
router.get('/mantenimiento', seguimientoController.obtenerMantenimiento);
router.get('/proyectos-externos', seguimientoController.obtenerProyectosExternos);
router.get('/proyectos-internos', seguimientoController.obtenerProyectosInternos);

// Rutas para actualizar datos editables
router.put('/mantenimiento/:id_proyecto', seguimientoController.actualizarMantenimiento);
router.put('/proyectos-externos/:id_proyecto', seguimientoController.actualizarProyectoExterno);
router.put('/proyectos-internos/:id_proyecto', seguimientoController.actualizarProyectoInterno);

// Rutas para sincronización con Redmine
router.post('/sincronizar/mantenimiento', async (req, res) => {
    try {
        const { producto, maxTotal } = req.body;
        const resultado = await sincronizacionService.sincronizarMantenimiento(producto, maxTotal);
        res.json(resultado);
    } catch (error) {
        console.error('Error en sincronización de mantenimiento:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/sincronizar/proyectos-externos', async (req, res) => {
    try {
        const { producto, maxTotal } = req.body;
        const resultado = await sincronizacionService.sincronizarProyectosExternos(producto, maxTotal);
        res.json(resultado);
    } catch (error) {
        console.error('Error en sincronización de proyectos externos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/sincronizar/proyectos-internos', async (req, res) => {
    try {
        const { producto, maxTotal } = req.body;
        const resultado = await sincronizacionService.sincronizarProyectosInternos(producto, maxTotal);
        res.json(resultado);
    } catch (error) {
        console.error('Error en sincronización de proyectos internos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;

