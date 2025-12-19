const express = require('express');
const router = express.Router();
const seguimientoController = require('../controllers/seguimientoController');
const adminController = require('../controllers/adminController');
const sincronizacionService = require('../services/sincronizacionService');
const { requireAuthJWT, requireAdmin } = require('../middleware/authJWT');

// Rutas para obtener datos
router.get('/mantenimiento', seguimientoController.obtenerMantenimiento);
router.get('/proyectos/:id_proyecto', seguimientoController.obtenerProyectoPorId); // Debe ir antes de /proyectos para que Express lo capture correctamente
router.get('/proyectos', seguimientoController.obtenerProyectos);
router.get('/proyectos-internos', seguimientoController.obtenerProyectosInternos);
router.get('/epics/:id_proyecto', seguimientoController.obtenerEpics);
// Endpoint de subproyectos eliminado - ahora se obtienen directamente en obtenerProyectos
router.get('/dashboard/metricas', seguimientoController.obtenerMetricasDashboard);

// Rutas para sugerencias de búsqueda
router.get('/mantenimiento/sugerencias', seguimientoController.obtenerSugerenciasMantenimiento);
router.get('/proyectos/sugerencias', seguimientoController.obtenerSugerenciasProyectos);
router.get('/proyectos-internos/sugerencias', seguimientoController.obtenerSugerenciasProyectosInternos);

// Rutas para actualizar datos editables
router.put('/mantenimiento/:id_proyecto', seguimientoController.actualizarMantenimiento);
router.put('/proyectos/:id_proyecto', seguimientoController.actualizarProyecto);
router.put('/proyectos/:id_proyecto/accionables', seguimientoController.actualizarAccionables);
router.put('/proyectos-internos/:id_proyecto', seguimientoController.actualizarProyectoInterno);
router.put('/subproyectos/:id_subproyecto', seguimientoController.actualizarSubproyecto);

// Rutas para accionables múltiples
router.get('/proyectos/:id_proyecto/accionables', seguimientoController.obtenerAccionablesProyecto);
router.post('/proyectos/:id_proyecto/accionables', seguimientoController.crearAccionable);
router.put('/accionables/:id', seguimientoController.actualizarAccionable);
router.delete('/accionables/:id', seguimientoController.eliminarAccionable);

// Rutas para sincronización con Redmine
router.post('/sincronizar/mantenimiento', async (req, res) => {
    console.log('\n📡 =================================');
    console.log('   REQUEST: /api/sincronizar/mantenimiento');
    console.log('   =================================');
    console.log('   Body recibido:', JSON.stringify(req.body, null, 2));
    console.log('   Timestamp:', new Date().toISOString());
    console.log('   =================================\n');
    
    try {
        const { producto, equipo, maxTotal } = req.body;
        console.log('   Parámetros extraídos:');
        console.log('   - producto:', producto);
        console.log('   - equipo:', equipo);
        console.log('   - maxTotal:', maxTotal);
        console.log('');
        
        const resultado = await sincronizacionService.sincronizarMantenimiento(producto, equipo, maxTotal);
        
        console.log('\n✅ =================================');
        console.log('   RESPUESTA: /api/sincronizar/mantenimiento');
        console.log('   =================================');
        console.log('   Success:', resultado.success);
        console.log('   =================================\n');
        
        res.json(resultado);
    } catch (error) {
        console.error('\n❌ =================================');
        console.error('   ERROR en sincronización de mantenimiento');
        console.error('   =================================');
        console.error('   Mensaje:', error.message);
        console.error('   Stack:', error.stack);
        console.error('   =================================\n');
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/sincronizar/proyectos', async (req, res) => {
    console.log('\n📡 =================================');
    console.log('   REQUEST: /api/sincronizar/proyectos');
    console.log('   =================================');
    console.log('   Body recibido:', JSON.stringify(req.body, null, 2));
    console.log('   Timestamp:', new Date().toISOString());
    console.log('   =================================\n');
    
    try {
        const { producto, equipo, maxTotal } = req.body;
        console.log('   Parámetros extraídos:');
        console.log('   - producto:', producto);
        console.log('   - equipo:', equipo);
        console.log('   - maxTotal:', maxTotal);
        console.log('');
        
        const resultado = await sincronizacionService.sincronizarProyectos(producto, equipo, maxTotal);
        
        console.log('\n✅ =================================');
        console.log('   RESPUESTA: /api/sincronizar/proyectos');
        console.log('   =================================');
        console.log('   Success:', resultado.success);
        console.log('   =================================\n');
        
        res.json(resultado);
    } catch (error) {
        console.error('\n❌ =================================');
        console.error('   ERROR en sincronización de proyectos');
        console.error('   =================================');
        console.error('   Mensaje:', error.message);
        console.error('   Stack:', error.stack);
        console.error('   =================================\n');
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/sincronizar/epics', requireAuthJWT, seguimientoController.sincronizarEpics);

router.post('/sincronizar/proyectos-internos', async (req, res) => {
    console.log('\n📡 =================================');
    console.log('   REQUEST: /api/sincronizar/proyectos-internos');
    console.log('   =================================');
    console.log('   Body recibido:', JSON.stringify(req.body, null, 2));
    console.log('   Timestamp:', new Date().toISOString());
    console.log('   =================================\n');
    
    try {
        const { producto, maxTotal } = req.body;
        console.log('   Parámetros extraídos:');
        console.log('   - producto:', producto);
        console.log('   - maxTotal:', maxTotal);
        console.log('');
        
        const resultado = await sincronizacionService.sincronizarProyectosInternos(producto, maxTotal);
        
        console.log('\n✅ =================================');
        console.log('   RESPUESTA: /api/sincronizar/proyectos-internos');
        console.log('   =================================');
        console.log('   Success:', resultado.success);
        console.log('   =================================\n');
        
        res.json(resultado);
    } catch (error) {
        console.error('\n❌ =================================');
        console.error('   ERROR en sincronización de proyectos internos');
        console.error('   =================================');
        console.error('   Mensaje:', error.message);
        console.error('   Stack:', error.stack);
        console.error('   =================================\n');
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rutas de administración (requieren admin)
router.get('/admin/productos-equipos', requireAdmin, adminController.obtenerProductosEquipos);
router.get('/admin/productos-equipos/unicos', requireAdmin, adminController.obtenerProductosYEquiposUnicos);
router.post('/admin/productos-equipos', requireAdmin, adminController.crearProductoEquipo);
router.put('/admin/productos-equipos/:id', requireAdmin, adminController.actualizarProductoEquipo);
router.delete('/admin/productos-equipos/:id', requireAdmin, adminController.eliminarProductoEquipo);

module.exports = router;

