// Servicio para sincronizar datos de Redmine con la base de datos local
const { pool, query, transaction } = require('../config/database');
const redmineService = require('./redmineService');
const ProductosEquiposModel = require('../models/ProductosEquiposModel');

/**
 * Sincronizar proyectos de mantenimiento desde Redmine
 * @param {string} producto - Producto a sincronizar
 * @param {string} equipo - ID del equipo en Redmine (cf_75)
 * @param {number} maxTotal - Límite máximo de proyectos (null = sin límite)
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
async function sincronizarMantenimiento(producto = null, equipo = null, maxTotal = null) {
    console.log('\n🔄 =================================');
    console.log('   INICIANDO SINCRONIZACIÓN MANTENIMIENTO');
    console.log('   =================================\n');
    console.log(`   Producto: ${producto || 'todos'}`);
    console.log(`   Equipo: ${equipo || 'todos'}`);
            console.log(`   Categoría: Mantenimiento + On-Site`);
    console.log(`   Línea de Servicio: Si`);
    console.log(`   Límite: ${maxTotal || 'sin límite'}\n`);
    
    try {
        // 1. Obtener proyectos de Redmine con filtros (hacer dos llamados: Mantenimiento y On-Site)
        console.log('📥 Obteniendo proyectos de Redmine...');
        
        // Obtener código de proyecto padre si existe
        let codigoProyectoPadre = null;
        if (producto) {
            try {
                const productosEquipos = await ProductosEquiposModel.obtenerTodos();
                const productoData = productosEquipos.find(p => p.producto === producto);
                if (productoData && productoData.equipos) {
                    // Si hay un equipo específico, buscar en ese equipo
                    if (equipo && equipo !== '*') {
                        const equipoData = productoData.equipos.find(e => e.id_equipo_redmine === equipo);
                        if (equipoData && equipoData.codigo_proyecto_padre) {
                            codigoProyectoPadre = equipoData.codigo_proyecto_padre;
                        }
                    } else {
                        // Si equipo es '*' o null, buscar el primer equipo del producto que tenga codigo_proyecto_padre
                        const equipoConPadre = productoData.equipos.find(e => e.codigo_proyecto_padre);
                        if (equipoConPadre && equipoConPadre.codigo_proyecto_padre) {
                            codigoProyectoPadre = equipoConPadre.codigo_proyecto_padre;
                        }
                    }
                    if (codigoProyectoPadre) {
                        console.log(`   🔍 Usando código proyecto padre: ${codigoProyectoPadre}`);
                    }
                }
            } catch (error) {
                console.warn(`   ⚠️ Error al obtener código proyecto padre: ${error.message}`);
            }
        }
        
        // Llamado para categoría "Mantenimiento"
        console.log('   📋 Request: Categoría "Mantenimiento"');
        const proyectosMantenimiento = await redmineService.obtenerProyectosMapeados({
            producto,
            equipo,
            categoria: 'Mantenimiento',
            codigo_proyecto_padre: codigoProyectoPadre,
            maxTotal
        });
        
        // Llamado para categoría "On-Site"
        console.log('   📋 Request: Categoría "On-Site"');
        const proyectosOnSite = await redmineService.obtenerProyectosMapeados({
            producto,
            equipo,
            categoria: 'On-Site',
            codigo_proyecto_padre: codigoProyectoPadre,
            maxTotal
        });
        
        // Combinar todos los resultados y eliminar duplicados por id_proyecto
        const proyectosMap = new Map();
        [...proyectosMantenimiento, ...proyectosOnSite].forEach(p => {
            if (!proyectosMap.has(p.id_proyecto)) {
                proyectosMap.set(p.id_proyecto, p);
            }
        });
        
        // No excluir proyectos cuyo cliente sea "Mercap" (solicitado por el usuario)
        let proyectosExcluidos = 0;
        const proyectosMapeados = Array.from(proyectosMap.values());
        
        // Filtrar proyectos excluyendo "Licencias"
        const proyectosMantenimientoFiltrados = proyectosMapeados.filter(p => {
            if (p.categoria === 'Licencias') {
                proyectosExcluidos++;
                return false;
            }
            return true;
        });
        
        if (proyectosMantenimientoFiltrados.length === 0) {
            console.log('⚠️ No se encontraron proyectos para sincronizar');
            return {
                success: true,
                message: 'No hay proyectos para sincronizar',
                insertados: 0,
                actualizados: 0,
                total: 0
            };
        }
        
        console.log(`\n   📊 Resumen: ${proyectosMantenimientoFiltrados.length} proyectos a sincronizar | ${proyectosExcluidos} proyectos excluidos\n`);
        
        // 3. Insertar/actualizar en redmine_mantenimiento
        console.log('💾 Sincronizando proyectos en la base de datos...');
        
        let insertados = 0;
        let actualizados = 0;
        
        for (const proyecto of proyectosMantenimientoFiltrados) {
            try {
                const result = await query(`
                    INSERT INTO redmine_mantenimiento (
                        id_proyecto, nombre_proyecto, codigo_proyecto, proyecto_padre,
                        estado_redmine, producto, cliente, linea_servicio, categoria,
                        equipo, reventa, proyecto_sponsor, fecha_creacion, sincronizado_en
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
                    ON CONFLICT (id_proyecto) 
                    DO UPDATE SET
                        nombre_proyecto = EXCLUDED.nombre_proyecto,
                        codigo_proyecto = EXCLUDED.codigo_proyecto,
                        proyecto_padre = EXCLUDED.proyecto_padre,
                        estado_redmine = EXCLUDED.estado_redmine,
                        producto = EXCLUDED.producto,
                        cliente = EXCLUDED.cliente,
                        linea_servicio = EXCLUDED.linea_servicio,
                        categoria = EXCLUDED.categoria,
                        equipo = EXCLUDED.equipo,
                        reventa = EXCLUDED.reventa,
                        proyecto_sponsor = EXCLUDED.proyecto_sponsor,
                        fecha_creacion = EXCLUDED.fecha_creacion,
                        sincronizado_en = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted
                `, [
                    proyecto.id_proyecto,
                    proyecto.nombre_proyecto,
                    proyecto.codigo_proyecto,
                    proyecto.proyecto_padre,
                    proyecto.estado_redmine,
                    proyecto.producto,
                    proyecto.cliente,
                    proyecto.linea_servicio,
                    proyecto.categoria,
                    proyecto.equipo,
                    proyecto.reventa,
                    proyecto.proyecto_sponsor,
                    proyecto.fecha_creacion
                ]);
                
                if (result.rows[0].inserted) {
                    insertados++;
                } else {
                    actualizados++;
                }
            } catch (error) {
                console.error(`❌ Error al guardar proyecto ${proyecto.id_proyecto}:`, error.message);
            }
        }
        
        console.log(`   ✅ Proyectos sincronizados: ${insertados} insertados, ${actualizados} actualizados\n`);
        
        // 4. Crear registros editables vacíos para proyectos nuevos
        console.log('🔄 Paso 3: Creando registros editables para proyectos nuevos...');
        
        const syncResult = await query(`
            INSERT INTO mantenimiento (id_proyecto)
            SELECT r.id_proyecto
            FROM redmine_mantenimiento r
            WHERE NOT EXISTS (
                SELECT 1 FROM mantenimiento m WHERE m.id_proyecto = r.id_proyecto
            )
            RETURNING id, id_proyecto;
        `);
        
        const mantenimientosNuevos = syncResult.rowCount;
        console.log(`✅ ${mantenimientosNuevos} registros editables nuevos creados\n`);
        
        console.log('🎉 =================================');
        console.log('   SINCRONIZACIÓN MANTENIMIENTO COMPLETADA');
        console.log('   =================================\n');
        
        return {
            success: true,
            message: 'Sincronización de mantenimiento completada exitosamente',
            redmine_mantenimiento: {
                insertados,
                actualizados,
                total: proyectosMantenimientoFiltrados.length
            },
            mantenimiento: {
                nuevos: mantenimientosNuevos
            }
        };
        
    } catch (error) {
        console.error('\n❌ ERROR EN SINCRONIZACIÓN MANTENIMIENTO:', error.message);
        console.error('   Stack:', error.stack);
        
        return {
            success: false,
            message: 'Error en la sincronización de mantenimiento',
            error: error.message
        };
    }
}

/**
 * Sincronizar proyectos desde Redmine
 * @param {string} producto - Producto a sincronizar
 * @param {string} equipo - ID del equipo en Redmine (cf_75)
 * @param {number} maxTotal - Límite máximo de proyectos (null = sin límite)
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
async function sincronizarProyectos(producto = null, equipo = null, maxTotal = null) {
    console.log('\n🔄 =================================');
    console.log('   INICIANDO SINCRONIZACIÓN PROYECTOS');
    console.log('   =================================\n');
    console.log(`   Producto: ${producto || 'todos'}`);
    console.log(`   Equipo: ${equipo || 'todos'}`);
    console.log(`   Categoría: Proyectos (distinto a Mantenimiento)`);
    console.log(`   Línea de Servicio: Si`);
    console.log(`   Límite: ${maxTotal || 'sin límite'}\n`);
    
    try {
        // Obtener código de proyecto padre si existe
        let codigoProyectoPadre = null;
        if (producto) {
            try {
                const productosEquipos = await ProductosEquiposModel.obtenerTodos();
                const productoData = productosEquipos.find(p => p.producto === producto);
                if (productoData && productoData.equipos) {
                    // Si hay un equipo específico, buscar en ese equipo
                    if (equipo && equipo !== '*') {
                        const equipoData = productoData.equipos.find(e => e.id_equipo_redmine === equipo);
                        if (equipoData && equipoData.codigo_proyecto_padre) {
                            codigoProyectoPadre = equipoData.codigo_proyecto_padre;
                        }
                    } else {
                        // Si equipo es '*' o null, buscar el primer equipo del producto que tenga codigo_proyecto_padre
                        const equipoConPadre = productoData.equipos.find(e => e.codigo_proyecto_padre);
                        if (equipoConPadre && equipoConPadre.codigo_proyecto_padre) {
                            codigoProyectoPadre = equipoConPadre.codigo_proyecto_padre;
                        }
                    }
                    if (codigoProyectoPadre) {
                        console.log(`   🔍 Usando código proyecto padre: ${codigoProyectoPadre}`);
                    }
                }
            } catch (error) {
                console.warn(`   ⚠️ Error al obtener código proyecto padre: ${error.message}`);
            }
        }
        
        // 1. Obtener proyectos de Redmine con línea de servicio "Si" (proyectos principales)
        console.log('📥 Obteniendo proyectos de Redmine...');
        console.log('   📋 Request: Línea de servicio "Si"');
        const proyectosPrincipales = await redmineService.obtenerProyectosMapeados({
            producto,
            equipo,
            codigo_proyecto_padre: codigoProyectoPadre,
            linea_servicio: 'Si',
            maxTotal
        });
        
        // 2. Obtener proyectos de Redmine con línea de servicio "Hereda" (subproyectos)
        console.log('   📋 Request: Línea de servicio "Hereda"');
        const proyectosHeredados = await redmineService.obtenerProyectosMapeados({
            producto,
            equipo,
            codigo_proyecto_padre: codigoProyectoPadre,
            linea_servicio: 'Hereda',
            maxTotal
        });
        
        // Combinar ambos arrays
        const todosLosProyectos = [...proyectosPrincipales, ...proyectosHeredados];
        
        // Filtrar proyectos que NO sean de categoría "Mantenimiento" ni "Licencias"
        let proyectosExcluidos = 0;
        const proyectosFiltrados = todosLosProyectos.filter(p => {
            if (p.categoria === 'Mantenimiento' || p.categoria === 'Licencias' || !p.categoria || p.categoria === '') {
                proyectosExcluidos++;
                return false;
            }
            return true;
        });
        
        if (proyectosFiltrados.length === 0) {
            console.log('⚠️ No se encontraron proyectos para sincronizar');
            return {
                success: true,
                message: 'No hay proyectos para sincronizar',
                insertados: 0,
                actualizados: 0,
                total: 0
            };
        }
        
        console.log(`\n   📊 Resumen: ${proyectosFiltrados.length} proyectos a sincronizar | ${proyectosExcluidos} proyectos excluidos\n`);
        
        // 3. Insertar/actualizar en redmine_proyectos_externos
        console.log('💾 Sincronizando proyectos en la base de datos...');
        
        let insertados = 0;
        let actualizados = 0;
        
        for (const proyecto of proyectosFiltrados) {
            try {
                const result = await query(`
                    INSERT INTO redmine_proyectos_externos (
                        id_proyecto, nombre_proyecto, codigo_proyecto, proyecto_padre,
                        estado_redmine, producto, cliente, linea_servicio, categoria,
                        equipo, reventa, proyecto_sponsor, fecha_creacion, sincronizado_en
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
                    ON CONFLICT (id_proyecto) 
                    DO UPDATE SET
                        nombre_proyecto = EXCLUDED.nombre_proyecto,
                        codigo_proyecto = EXCLUDED.codigo_proyecto,
                        proyecto_padre = EXCLUDED.proyecto_padre,
                        estado_redmine = EXCLUDED.estado_redmine,
                        producto = EXCLUDED.producto,
                        cliente = EXCLUDED.cliente,
                        linea_servicio = EXCLUDED.linea_servicio,
                        categoria = EXCLUDED.categoria,
                        equipo = EXCLUDED.equipo,
                        reventa = EXCLUDED.reventa,
                        proyecto_sponsor = EXCLUDED.proyecto_sponsor,
                        fecha_creacion = EXCLUDED.fecha_creacion,
                        sincronizado_en = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted
                `, [
                    proyecto.id_proyecto,
                    proyecto.nombre_proyecto,
                    proyecto.codigo_proyecto,
                    proyecto.proyecto_padre,
                    proyecto.estado_redmine,
                    proyecto.producto,
                    proyecto.cliente,
                    proyecto.linea_servicio,
                    proyecto.categoria,
                    proyecto.equipo,
                    proyecto.reventa,
                    proyecto.proyecto_sponsor,
                    proyecto.fecha_creacion
                ]);
                
                if (result.rows[0].inserted) {
                    insertados++;
                } else {
                    actualizados++;
                }
            } catch (error) {
                console.error(`❌ Error al guardar proyecto ${proyecto.id_proyecto}:`, error.message);
            }
        }
        
        console.log(`   ✅ Proyectos sincronizados: ${insertados} insertados, ${actualizados} actualizados\n`);
        
        // 4. Crear registros editables vacíos para proyectos nuevos
        console.log('🔄 Paso 3: Creando registros editables para proyectos nuevos...');
        
        const syncResult = await query(`
            INSERT INTO proyectos_externos (id_proyecto)
            SELECT r.id_proyecto
            FROM redmine_proyectos_externos r
            WHERE NOT EXISTS (
                SELECT 1 FROM proyectos_externos p WHERE p.id_proyecto = r.id_proyecto
            )
            RETURNING id, id_proyecto;
        `);
        
        const proyectosNuevos = syncResult.rowCount;
        console.log(`✅ ${proyectosNuevos} registros editables nuevos creados\n`);
        
        console.log('🎉 =================================');
        console.log('   SINCRONIZACIÓN PROYECTOS COMPLETADA');
        console.log('   =================================\n');
        
        return {
            success: true,
            message: 'Sincronización de proyectos completada exitosamente',
            redmine_proyectos_externos: {
                insertados,
                actualizados,
                total: proyectosFiltrados.length
            },
            proyectos_externos: {
                nuevos: proyectosNuevos
            }
        };
        
    } catch (error) {
        console.error('\n❌ ERROR EN SINCRONIZACIÓN PROYECTOS:', error.message);
        console.error('   Stack:', error.stack);
        
        return {
            success: false,
            message: 'Error en la sincronización de proyectos',
            error: error.message
        };
    }
}

/**
 * Sincronizar proyectos internos desde Redmine
 * @param {string} producto - Producto a sincronizar
 * @param {number} maxTotal - Límite máximo de proyectos (null = sin límite)
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
async function sincronizarProyectosInternos(producto = null, maxTotal = null) {
    console.log('\n🔄 =================================');
    console.log('   INICIANDO SINCRONIZACIÓN PROYECTOS INTERNOS');
    console.log('   =================================\n');
    console.log(`   Producto: ${producto || 'todos'}`);
    console.log(`   Categoría: Proyectos Internos`);
    console.log(`   Límite: ${maxTotal || 'sin límite'}\n`);
    
    try {
        if (!producto) {
            throw new Error('El producto es requerido para sincronizar proyectos internos');
        }
        
        // Obtener código de proyecto padre si existe
        let codigoProyectoPadre = null;
        try {
            const productosEquipos = await ProductosEquiposModel.obtenerTodos();
            const productoData = productosEquipos.find(p => p.producto === producto);
            if (productoData && productoData.equipos) {
                const equipoConPadre = productoData.equipos.find(e => e.codigo_proyecto_padre);
                if (equipoConPadre && equipoConPadre.codigo_proyecto_padre) {
                    codigoProyectoPadre = equipoConPadre.codigo_proyecto_padre;
                    console.log(`   🔍 Usando código proyecto padre: ${codigoProyectoPadre}`);
                }
            }
        } catch (error) {
            console.warn(`   ⚠️ Error al obtener código proyecto padre: ${error.message}`);
        }
                    
        // 1. Obtener proyectos de Redmine con filtro de categoría "Proyectos Internos"
        console.log('   📋 Request: Categoría "Proyectos Internos"');
        const proyectosMapeados = await redmineService.obtenerProyectosMapeados({
            producto,
            equipo: null, // No filtrar por equipo
            categoria: 'Proyectos Internos',
            codigo_proyecto_padre: codigoProyectoPadre,
            maxTotal
        });
        
        if (proyectosMapeados.length === 0) {
            console.log('⚠️ No se encontraron proyectos para sincronizar');
            return {
                success: true,
                message: 'No hay proyectos para sincronizar',
                insertados: 0,
                actualizados: 0,
                total: 0
            };
        }
        
        console.log(`\n   📊 Resumen: ${proyectosMapeados.length} proyectos a sincronizar | 0 proyectos excluidos\n`);
        
        // 2. Insertar/actualizar en redmine_proyectos_externos (misma tabla que proyectos)
        console.log('💾 Sincronizando proyectos en la base de datos...');
        
        let insertados = 0;
        let actualizados = 0;
        
        for (const proyecto of proyectosMapeados) {
            try {
                const result = await query(`
                    INSERT INTO redmine_proyectos_externos (
                        id_proyecto, nombre_proyecto, codigo_proyecto, proyecto_padre,
                        estado_redmine, producto, cliente, linea_servicio, categoria,
                        equipo, reventa, proyecto_sponsor, fecha_creacion, sincronizado_en
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
                    ON CONFLICT (id_proyecto) 
                    DO UPDATE SET
                        nombre_proyecto = EXCLUDED.nombre_proyecto,
                        codigo_proyecto = EXCLUDED.codigo_proyecto,
                        proyecto_padre = EXCLUDED.proyecto_padre,
                        estado_redmine = EXCLUDED.estado_redmine,
                        producto = EXCLUDED.producto,
                        cliente = EXCLUDED.cliente,
                        linea_servicio = EXCLUDED.linea_servicio,
                        categoria = EXCLUDED.categoria,
                        equipo = EXCLUDED.equipo,
                        reventa = EXCLUDED.reventa,
                        proyecto_sponsor = EXCLUDED.proyecto_sponsor,
                        fecha_creacion = EXCLUDED.fecha_creacion,
                        sincronizado_en = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted
                `, [
                    proyecto.id_proyecto,
                    proyecto.nombre_proyecto,
                    proyecto.codigo_proyecto,
                    proyecto.proyecto_padre,
                    proyecto.estado_redmine,
                    proyecto.producto,
                    proyecto.cliente,
                    proyecto.linea_servicio,
                    proyecto.categoria,
                    proyecto.equipo,
                    proyecto.reventa || null,
                    proyecto.proyecto_sponsor || null,
                    proyecto.fecha_creacion
                ]);
                
                if (result.rows[0].inserted) {
                    insertados++;
                } else {
                    actualizados++;
                }
            } catch (error) {
                console.error(`❌ Error al guardar proyecto ${proyecto.id_proyecto}:`, error.message);
            }
        }
        
        console.log(`   ✅ Proyectos sincronizados: ${insertados} insertados, ${actualizados} actualizados\n`);
        
        // 3. Crear registros editables vacíos para proyectos nuevos (en proyectos_externos)
        console.log('🔄 Paso 3: Creando registros editables para proyectos nuevos...');
        
        const syncResult = await query(`
            INSERT INTO proyectos_externos (id_proyecto)
            SELECT r.id_proyecto
            FROM redmine_proyectos_externos r
            WHERE r.categoria = 'Proyectos Internos'
            AND NOT EXISTS (
                SELECT 1 FROM proyectos_externos p WHERE p.id_proyecto = r.id_proyecto
            )
            RETURNING id_proyecto;
        `);
        
        const proyectosNuevos = syncResult.rowCount;
        console.log(`✅ ${proyectosNuevos} registros editables nuevos creados\n`);
        
        console.log('🎉 =================================');
        console.log('   SINCRONIZACIÓN PROYECTOS INTERNOS COMPLETADA');
        console.log('   =================================\n');
        
        return {
            success: true,
            message: 'Sincronización de proyectos internos completada exitosamente',
            redmine_proyectos_externos: {
                insertados,
                actualizados,
                total: proyectosMapeados.length
            },
            proyectos_externos: {
                nuevos: proyectosNuevos
            }
        };
        
    } catch (error) {
        console.error('\n❌ ERROR EN SINCRONIZACIÓN PROYECTOS INTERNOS:', error.message);
        console.error('   Stack:', error.stack);
        
        return {
            success: false,
            message: 'Error en la sincronización de proyectos internos',
            error: error.message
        };
    }
}

module.exports = {
    sincronizarMantenimiento,
    sincronizarProyectos,
    sincronizarProyectosInternos
};

