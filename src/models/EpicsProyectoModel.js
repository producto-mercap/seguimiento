const { pool } = require('../config/database');

class EpicsProyectoModel {
    /**
     * Obtener todos los epics de un proyecto (busca por id_proyecto)
     * @param {number} id_proyecto - ID del proyecto
     * @returns {Promise<Array>} - Array de epics
     */
    static async obtenerPorProyecto(id_proyecto) {
        try {
            const query = `
                SELECT *
                FROM epics_proyecto
                WHERE id_proyecto = $1
                ORDER BY epic_id ASC
            `;
            const result = await pool.query(query, [id_proyecto]);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener epics del proyecto:', error);
            throw error;
        }
    }

    /**
     * Obtener totales de horas por proyecto (busca epics que pertenecen al proyecto)
     * @param {number} id_proyecto - ID del proyecto
     * @returns {Promise<Object>} - Totales de horas y fechas
     */
    static async obtenerTotalesPorProyecto(id_proyecto) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_epics,
                    COALESCE(SUM(total_estimated_hours), 0) as horas_estimadas,
                    COALESCE(SUM(total_spent_hours), 0) as horas_realizadas,
                    MIN(cf_21) as fecha_inicio_minima,
                    MAX(cf_22) as fecha_fin_maxima
                FROM epics_proyecto
                WHERE id_proyecto = $1
            `;
            const result = await pool.query(query, [id_proyecto]);
            return result.rows[0] || {
                total_epics: 0,
                horas_estimadas: 0,
                horas_realizadas: 0,
                fecha_inicio_minima: null,
                fecha_fin_maxima: null
            };
        } catch (error) {
            console.error('Error al obtener totales de epics:', error);
            throw error;
        }
    }

    /**
     * Sincronizar un epic individual
     * @param {number} id_proyecto - ID del proyecto
     * @param {Object} epic - Epic mapeado
     * @returns {Promise<Object>} - Epic guardado
     */
    static async sincronizarEpic(id_proyecto, epic) {
        try {
            const query = `
                INSERT INTO epics_proyecto (
                    id_proyecto, epic_id, subject, status, total_estimated_hours, 
                    total_spent_hours, proyecto_padre, nombre_proyecto_padre, cf_23, cf_21, cf_22, cf_15,
                    created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (id_proyecto, epic_id)
                DO UPDATE SET
                    subject = EXCLUDED.subject,
                    status = EXCLUDED.status,
                    total_estimated_hours = EXCLUDED.total_estimated_hours,
                    total_spent_hours = EXCLUDED.total_spent_hours,
                    proyecto_padre = EXCLUDED.proyecto_padre,
                    nombre_proyecto_padre = EXCLUDED.nombre_proyecto_padre,
                    cf_23 = EXCLUDED.cf_23,
                    cf_21 = EXCLUDED.cf_21,
                    cf_22 = EXCLUDED.cf_22,
                    cf_15 = EXCLUDED.cf_15,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            
            const result = await pool.query(query, [
                id_proyecto,
                epic.epic_id,
                epic.subject,
                epic.status,
                epic.total_estimated_hours,
                epic.total_spent_hours,
                epic.proyecto_padre,
                epic.nombre_proyecto_padre,
                epic.cf_23,
                epic.cf_21,
                epic.cf_22,
                epic.cf_15
            ]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Error al sincronizar epic:', error);
            throw error;
        }
    }

    /**
     * Guardar o actualizar epics de un proyecto
     * @param {number} id_proyecto - ID del proyecto
     * @param {Array} epics - Array de epics mapeados
     * @returns {Promise<Object>} - Resultado de la operación
     */
    static async guardarEpics(id_proyecto, epics) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            let insertados = 0;
            let actualizados = 0;
            
            for (const epic of epics) {
                // Primero verificar si el epic ya existe
                const checkQuery = `SELECT created_at, updated_at FROM epics_proyecto WHERE id_proyecto = $1 AND epic_id = $2`;
                const checkResult = await client.query(checkQuery, [id_proyecto, epic.epic_id]);
                const existe = checkResult.rows.length > 0;
                
                const query = `
                    INSERT INTO epics_proyecto (
                        id_proyecto, epic_id, subject, status, total_estimated_hours, 
                        total_spent_hours, proyecto_padre, nombre_proyecto_padre, cf_23, cf_21, cf_22, cf_15,
                        created_at, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (id_proyecto, epic_id)
                    DO UPDATE SET
                        subject = EXCLUDED.subject,
                        status = EXCLUDED.status,
                        total_estimated_hours = EXCLUDED.total_estimated_hours,
                        total_spent_hours = EXCLUDED.total_spent_hours,
                        proyecto_padre = EXCLUDED.proyecto_padre,
                        nombre_proyecto_padre = EXCLUDED.nombre_proyecto_padre,
                        cf_23 = EXCLUDED.cf_23,
                        cf_21 = EXCLUDED.cf_21,
                        cf_22 = EXCLUDED.cf_22,
                        cf_15 = EXCLUDED.cf_15,
                        updated_at = CURRENT_TIMESTAMP
                `;
                
                await client.query(query, [
                    id_proyecto,
                    epic.epic_id,
                    epic.subject,
                    epic.status,
                    epic.total_estimated_hours,
                    epic.total_spent_hours,
                    epic.proyecto_padre,
                    epic.nombre_proyecto_padre,
                    epic.cf_23,
                    epic.cf_21,
                    epic.cf_22,
                    epic.cf_15
                ]);
                
                if (existe) {
                    actualizados++;
                } else {
                    insertados++;
                }
            }
            
            await client.query('COMMIT');
            
            return {
                success: true,
                insertados,
                actualizados,
                total: epics.length
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error al guardar epics:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Verificar si un proyecto tiene epics (busca por id_proyecto)
     * @param {number} id_proyecto - ID del proyecto
     * @returns {Promise<boolean>} - true si tiene epics
     */
    static async tieneEpics(id_proyecto) {
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM epics_proyecto
                WHERE id_proyecto = $1
            `;
            const result = await pool.query(query, [id_proyecto]);
            return parseInt(result.rows[0].count) > 0;
        } catch (error) {
            console.error('Error al verificar epics:', error);
            throw error;
        }
    }

    /**
     * Obtener epics secundarios (donde proyecto_padre <> id_proyecto) para múltiples proyectos
     * @param {Array<number>} ids_proyectos - Array de IDs de proyectos
     * @returns {Promise<Object>} - Objeto con id_proyecto como clave y array de epics secundarios como valor
     */
    static async obtenerEpicsSecundariosPorProyectos(ids_proyectos) {
        try {
            if (!ids_proyectos || ids_proyectos.length === 0) {
                return {};
            }
            
            // Optimizar: solo seleccionar columnas necesarias y usar COUNT para verificar existencia
            const query = `
                SELECT 
                    id_proyecto,
                    proyecto_padre,
                    nombre_proyecto_padre
                FROM epics_proyecto
                WHERE id_proyecto = ANY($1::int[])
                AND proyecto_padre IS NOT NULL
                AND proyecto_padre != id_proyecto
                GROUP BY id_proyecto, proyecto_padre, nombre_proyecto_padre
                ORDER BY id_proyecto, proyecto_padre ASC
            `;
            const result = await pool.query(query, [ids_proyectos]);
            
            // Agrupar por id_proyecto (solo necesitamos saber si tiene epics secundarios)
            const epicsPorProyecto = {};
            result.rows.forEach(epic => {
                if (!epicsPorProyecto[epic.id_proyecto]) {
                    epicsPorProyecto[epic.id_proyecto] = [];
                }
                // Solo guardar la información mínima necesaria
                epicsPorProyecto[epic.id_proyecto].push({
                    proyecto_padre: epic.proyecto_padre,
                    nombre_proyecto_padre: epic.nombre_proyecto_padre
                });
            });
            
            return epicsPorProyecto;
        } catch (error) {
            console.error('Error al obtener epics secundarios:', error);
            throw error;
        }
    }
}

module.exports = EpicsProyectoModel;


