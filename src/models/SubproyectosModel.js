const { pool } = require('../config/database');

class SubproyectosModel {
    /**
     * Obtener todos los subproyectos de un proyecto (optimizado con índice)
     * @param {number} id_proyecto - ID del proyecto
     * @returns {Promise<Array>} - Array de subproyectos
     */
    static async obtenerPorProyecto(id_proyecto) {
        try {
            const query = `
                SELECT 
                    id_subproyecto,
                    id_proyecto,
                    proyecto_padre,
                    nombre,
                    estado,
                    overall,
                    alcance,
                    costo,
                    plazos,
                    riesgos,
                    avance,
                    created_at,
                    updated_at
                FROM subproyectos
                WHERE id_proyecto = $1
                ORDER BY nombre ASC
            `;
            const result = await pool.query(query, [id_proyecto]);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener subproyectos del proyecto:', error);
            throw error;
        }
    }

    /**
     * Obtener subproyectos para múltiples proyectos
     * @param {Array<number>} ids_proyectos - Array de IDs de proyectos
     * @returns {Promise<Object>} - Objeto con id_proyecto como clave y array de subproyectos como valor
     */
    static async obtenerPorProyectos(ids_proyectos) {
        try {
            if (!ids_proyectos || ids_proyectos.length === 0) {
                return {};
            }
            
            const query = `
                SELECT *
                FROM subproyectos
                WHERE id_proyecto = ANY($1::int[])
                ORDER BY id_proyecto, nombre ASC
            `;
            const result = await pool.query(query, [ids_proyectos]);
            
            // Agrupar por id_proyecto
            const subproyectosPorProyecto = {};
            result.rows.forEach(subproyecto => {
                if (!subproyectosPorProyecto[subproyecto.id_proyecto]) {
                    subproyectosPorProyecto[subproyecto.id_proyecto] = [];
                }
                subproyectosPorProyecto[subproyecto.id_proyecto].push(subproyecto);
            });
            
            return subproyectosPorProyecto;
        } catch (error) {
            console.error('Error al obtener subproyectos:', error);
            throw error;
        }
    }

    /**
     * Crear o actualizar un subproyecto basado en epics
     * @param {number} id_proyecto - ID del proyecto
     * @param {number} proyecto_padre - ID del proyecto padre en Redmine
     * @param {string} nombre - Nombre del subproyecto
     * @returns {Promise<Object>} - Subproyecto creado o actualizado
     */
    static async crearOActualizar(id_proyecto, proyecto_padre, nombre) {
        try {
            const query = `
                INSERT INTO subproyectos (id_proyecto, proyecto_padre, nombre)
                VALUES ($1, $2, $3)
                ON CONFLICT (id_proyecto, proyecto_padre)
                DO UPDATE SET
                    nombre = EXCLUDED.nombre,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const result = await pool.query(query, [id_proyecto, proyecto_padre, nombre]);
            return result.rows[0];
        } catch (error) {
            console.error('Error al crear/actualizar subproyecto:', error);
            throw error;
        }
    }

    /**
     * Actualizar datos editables de un subproyecto
     * @param {number} id_subproyecto - ID del subproyecto
     * @param {Object} datos - Datos a actualizar
     * @returns {Promise<Object>} - Subproyecto actualizado
     */
    static async actualizar(id_subproyecto, datos) {
        try {
            console.log('📝 SubproyectosModel.actualizar - id_subproyecto:', id_subproyecto, 'datos:', datos);
            
            // Verificar que el subproyecto existe
            const checkQuery = `SELECT id_subproyecto FROM subproyectos WHERE id_subproyecto = $1`;
            const checkResult = await pool.query(checkQuery, [id_subproyecto]);
            
            if (checkResult.rows.length === 0) {
                throw new Error(`El subproyecto con id_subproyecto=${id_subproyecto} no existe.`);
            }
            
            const campos = [];
            const valores = [];
            let paramCount = 1;

            if ('estado' in datos) {
                campos.push(`estado = $${paramCount}`);
                valores.push(datos.estado);
                paramCount++;
            }
            if ('overall' in datos) {
                campos.push(`overall = $${paramCount}`);
                valores.push(datos.overall);
                paramCount++;
            }
            if ('alcance' in datos) {
                campos.push(`alcance = $${paramCount}`);
                valores.push(datos.alcance);
                paramCount++;
            }
            if ('costo' in datos) {
                campos.push(`costo = $${paramCount}`);
                valores.push(datos.costo);
                paramCount++;
            }
            if ('plazos' in datos) {
                campos.push(`plazos = $${paramCount}`);
                valores.push(datos.plazos);
                paramCount++;
            }
            if ('riesgos' in datos) {
                campos.push(`riesgos = $${paramCount}`);
                valores.push(datos.riesgos);
                paramCount++;
            }
            if ('avance' in datos) {
                campos.push(`avance = $${paramCount}`);
                valores.push(datos.avance);
                paramCount++;
            }

            if (campos.length === 0) {
                throw new Error('No hay campos para actualizar');
            }

            campos.push(`updated_at = CURRENT_TIMESTAMP`);
            valores.push(id_subproyecto);

            const query = `
                UPDATE subproyectos
                SET ${campos.join(', ')}
                WHERE id_subproyecto = $${paramCount}
                RETURNING *
            `;

            const result = await pool.query(query, valores);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al actualizar subproyecto:', error);
            throw error;
        }
    }

    /**
     * Sincronizar subproyectos desde epics secundarios
     * @param {number} id_proyecto - ID del proyecto
     * @param {Array} epicsSecundarios - Array de epics secundarios
     * @returns {Promise<Object>} - Resultado de la sincronización
     */
    static async sincronizarDesdeEpics(id_proyecto, epicsSecundarios) {
        try {
            // Agrupar epics por proyecto_padre y obtener nombre único
            const proyectosSecundariosUnicos = {};
            epicsSecundarios.forEach(epic => {
                const proyectoPadre = epic.proyecto_padre;
                const nombre = epic.nombre_proyecto_padre || 'Sin nombre';
                if (proyectoPadre && !proyectosSecundariosUnicos[proyectoPadre]) {
                    proyectosSecundariosUnicos[proyectoPadre] = nombre;
                }
            });

            // Optimizar: crear/actualizar todos los subproyectos en una sola transacción
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                let creados = 0;
                const subproyectosPromises = Object.entries(proyectosSecundariosUnicos).map(async ([proyectoPadre, nombre]) => {
                    const query = `
                        INSERT INTO subproyectos (id_proyecto, proyecto_padre, nombre)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (id_proyecto, proyecto_padre)
                        DO UPDATE SET
                            nombre = EXCLUDED.nombre,
                            updated_at = CURRENT_TIMESTAMP
                        RETURNING (xmax = 0) AS inserted
                    `;
                    const result = await client.query(query, [id_proyecto, parseInt(proyectoPadre), nombre]);
                    if (result.rows[0]?.inserted) {
                        creados++;
                    }
                });
                
                await Promise.all(subproyectosPromises);
                await client.query('COMMIT');
                
                return {
                    success: true,
                    creados,
                    actualizados: Object.keys(proyectosSecundariosUnicos).length - creados,
                    total: Object.keys(proyectosSecundariosUnicos).length
                };
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Error al sincronizar subproyectos desde epics:', error);
            throw error;
        }
    }
}

module.exports = SubproyectosModel;

