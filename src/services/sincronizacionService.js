// Servicio para sincronizar datos de Redmine con la base de datos local
const { pool, query, transaction } = require('../config/database');
const redmineService = require('./redmineService');

/**
 * Sincronizar proyectos de mantenimiento desde Redmine
 * @param {string} producto - Producto a sincronizar (opcional)
 * @param {number} maxTotal - Límite máximo de proyectos (null = sin límite)
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
async function sincronizarMantenimiento(producto = null, maxTotal = null) {
    console.log('\n🔄 =================================');
    console.log('   INICIANDO SINCRONIZACIÓN MANTENIMIENTO');
    console.log('   =================================\n');
    console.log(`   Producto: ${producto || 'todos'}`);
    console.log(`   Límite: ${maxTotal || 'sin límite'}\n`);
    
    try {
        // 1. Obtener proyectos de Redmine
        console.log('📥 Paso 1: Obteniendo proyectos de Redmine...');
        const proyectosMapeados = await redmineService.obtenerProyectosMapeados({
            producto,
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
        
        console.log(`✅ ${proyectosMapeados.length} proyectos obtenidos de Redmine\n`);
        
        // 2. Filtrar solo proyectos de mantenimiento
        const proyectosMantenimiento = redmineService.filtrarProyectosPorTipo(proyectosMapeados, 'mantenimiento');
        console.log(`✅ ${proyectosMantenimiento.length} proyectos de mantenimiento filtrados\n`);
        
        // 3. Insertar/actualizar en redmine_mantenimiento
        console.log('💾 Paso 2: Guardando proyectos en la base de datos...');
        
        let insertados = 0;
        let actualizados = 0;
        
        for (const proyecto of proyectosMantenimiento) {
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
        
        console.log(`✅ Proyectos guardados: ${insertados} insertados, ${actualizados} actualizados\n`);
        
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
                total: proyectosMantenimiento.length
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
 * Sincronizar proyectos externos desde Redmine
 * @param {string} producto - Producto a sincronizar (opcional)
 * @param {number} maxTotal - Límite máximo de proyectos (null = sin límite)
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
async function sincronizarProyectosExternos(producto = null, maxTotal = null) {
    console.log('\n🔄 =================================');
    console.log('   INICIANDO SINCRONIZACIÓN PROYECTOS EXTERNOS');
    console.log('   =================================\n');
    console.log(`   Producto: ${producto || 'todos'}`);
    console.log(`   Límite: ${maxTotal || 'sin límite'}\n`);
    
    try {
        // 1. Obtener proyectos de Redmine
        console.log('📥 Paso 1: Obteniendo proyectos de Redmine...');
        const proyectosMapeados = await redmineService.obtenerProyectosMapeados({
            producto,
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
        
        console.log(`✅ ${proyectosMapeados.length} proyectos obtenidos de Redmine\n`);
        
        // 2. Filtrar solo proyectos externos
        const proyectosExternos = redmineService.filtrarProyectosPorTipo(proyectosMapeados, 'externos');
        console.log(`✅ ${proyectosExternos.length} proyectos externos filtrados\n`);
        
        // 3. Insertar/actualizar en redmine_proyectos_externos
        console.log('💾 Paso 2: Guardando proyectos en la base de datos...');
        
        let insertados = 0;
        let actualizados = 0;
        
        for (const proyecto of proyectosExternos) {
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
        
        console.log(`✅ Proyectos guardados: ${insertados} insertados, ${actualizados} actualizados\n`);
        
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
        console.log('   SINCRONIZACIÓN PROYECTOS EXTERNOS COMPLETADA');
        console.log('   =================================\n');
        
        return {
            success: true,
            message: 'Sincronización de proyectos externos completada exitosamente',
            redmine_proyectos_externos: {
                insertados,
                actualizados,
                total: proyectosExternos.length
            },
            proyectos_externos: {
                nuevos: proyectosNuevos
            }
        };
        
    } catch (error) {
        console.error('\n❌ ERROR EN SINCRONIZACIÓN PROYECTOS EXTERNOS:', error.message);
        console.error('   Stack:', error.stack);
        
        return {
            success: false,
            message: 'Error en la sincronización de proyectos externos',
            error: error.message
        };
    }
}

/**
 * Sincronizar proyectos internos desde Redmine
 * @param {string} producto - Producto a sincronizar (opcional)
 * @param {number} maxTotal - Límite máximo de proyectos (null = sin límite)
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
async function sincronizarProyectosInternos(producto = null, maxTotal = null) {
    console.log('\n🔄 =================================');
    console.log('   INICIANDO SINCRONIZACIÓN PROYECTOS INTERNOS');
    console.log('   =================================\n');
    console.log(`   Producto: ${producto || 'todos'}`);
    console.log(`   Límite: ${maxTotal || 'sin límite'}\n`);
    
    try {
        // 1. Obtener proyectos de Redmine
        console.log('📥 Paso 1: Obteniendo proyectos de Redmine...');
        const proyectosMapeados = await redmineService.obtenerProyectosMapeados({
            producto,
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
        
        console.log(`✅ ${proyectosMapeados.length} proyectos obtenidos de Redmine\n`);
        
        // 2. Filtrar solo proyectos internos
        const proyectosInternos = redmineService.filtrarProyectosPorTipo(proyectosMapeados, 'internos');
        console.log(`✅ ${proyectosInternos.length} proyectos internos filtrados\n`);
        
        // 3. Insertar/actualizar en redmine_proyectos_internos
        console.log('💾 Paso 2: Guardando proyectos en la base de datos...');
        
        let insertados = 0;
        let actualizados = 0;
        
        for (const proyecto of proyectosInternos) {
            try {
                const result = await query(`
                    INSERT INTO redmine_proyectos_internos (
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
        
        console.log(`✅ Proyectos guardados: ${insertados} insertados, ${actualizados} actualizados\n`);
        
        // 4. Crear registros editables vacíos para proyectos nuevos
        console.log('🔄 Paso 3: Creando registros editables para proyectos nuevos...');
        
        const syncResult = await query(`
            INSERT INTO proyectos_internos (id_proyecto)
            SELECT r.id_proyecto
            FROM redmine_proyectos_internos r
            WHERE NOT EXISTS (
                SELECT 1 FROM proyectos_internos p WHERE p.id_proyecto = r.id_proyecto
            )
            RETURNING id, id_proyecto;
        `);
        
        const proyectosNuevos = syncResult.rowCount;
        console.log(`✅ ${proyectosNuevos} registros editables nuevos creados\n`);
        
        console.log('🎉 =================================');
        console.log('   SINCRONIZACIÓN PROYECTOS INTERNOS COMPLETADA');
        console.log('   =================================\n');
        
        return {
            success: true,
            message: 'Sincronización de proyectos internos completada exitosamente',
            redmine_proyectos_internos: {
                insertados,
                actualizados,
                total: proyectosInternos.length
            },
            proyectos_internos: {
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
    sincronizarProyectosExternos,
    sincronizarProyectosInternos
};

