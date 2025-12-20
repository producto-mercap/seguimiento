const { pool } = require('../config/database');

class AccionablesProyectoModel {
    /**
     * Obtener todos los accionables de un proyecto
     * @param {number} id_proyecto - ID del proyecto
     * @returns {Promise<Array>} - Array de accionables
     */
    static async obtenerPorProyecto(id_proyecto) {
        try {
            const query = `
                SELECT 
                    id,
                    id_proyecto,
                    fecha_accionable,
                    asignado_accionable,
                    accionable,
                    estado,
                    created_at,
                    updated_at
                FROM accionables_proyectos
                WHERE id_proyecto = $1
                ORDER BY fecha_accionable DESC, created_at DESC
            `;
            
            const result = await pool.query(query, [id_proyecto]);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener accionables:', error);
            throw error;
        }
    }

    /**
     * Crear un nuevo accionable
     * @param {number} id_proyecto - ID del proyecto
     * @param {Object} datos - Datos del accionable
     * @returns {Promise<Object>} - Accionable creado
     */
    static async crear(id_proyecto, datos) {
        try {
            const query = `
                INSERT INTO accionables_proyectos (
                    id_proyecto,
                    fecha_accionable,
                    asignado_accionable,
                    accionable,
                    estado,
                    created_at,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING *
            `;
            
            const result = await pool.query(query, [
                id_proyecto,
                datos.fecha_accionable || null,
                datos.asignado_accionable || null,
                datos.accionable || null,
                datos.estado || null
            ]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Error al crear accionable:', error);
            throw error;
        }
    }

    /**
     * Actualizar un accionable
     * @param {number} id - ID del accionable
     * @param {Object} datos - Datos a actualizar
     * @returns {Promise<Object>} - Accionable actualizado
     */
    static async actualizar(id, datos) {
        try {
            const campos = [];
            const valores = [];
            let paramCount = 1;

            if ('fecha_accionable' in datos) {
                campos.push(`fecha_accionable = $${paramCount}`);
                valores.push(datos.fecha_accionable || null);
                paramCount++;
            }
            if ('asignado_accionable' in datos) {
                campos.push(`asignado_accionable = $${paramCount}`);
                valores.push(datos.asignado_accionable || null);
                paramCount++;
            }
            if ('accionable' in datos) {
                campos.push(`accionable = $${paramCount}`);
                valores.push(datos.accionable || null);
                paramCount++;
            }
            if ('estado' in datos) {
                campos.push(`estado = $${paramCount}`);
                valores.push(datos.estado || null);
                paramCount++;
            }

            if (campos.length === 0) {
                return await this.obtenerPorId(id);
            }

            campos.push(`updated_at = CURRENT_TIMESTAMP`);
            valores.push(id);

            const query = `
                UPDATE accionables_proyectos
                SET ${campos.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;

            const result = await pool.query(query, valores);
            return result.rows[0];
        } catch (error) {
            console.error('Error al actualizar accionable:', error);
            throw error;
        }
    }

    /**
     * Obtener un accionable por ID
     * @param {number} id - ID del accionable
     * @returns {Promise<Object>} - Accionable
     */
    static async obtenerPorId(id) {
        try {
            const query = `
                SELECT * FROM accionables_proyectos
                WHERE id = $1
            `;
            
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Error al obtener accionable:', error);
            throw error;
        }
    }

    /**
     * Eliminar un accionable
     * @param {number} id - ID del accionable
     * @returns {Promise<boolean>} - true si se eliminó correctamente
     */
    static async eliminar(id) {
        try {
            const query = `
                DELETE FROM accionables_proyectos
                WHERE id = $1
                RETURNING id
            `;
            
            const result = await pool.query(query, [id]);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Error al eliminar accionable:', error);
            throw error;
        }
    }

    /**
     * Verificar qué proyectos tienen accionables (para mostrar "Ver" en la tabla)
     * @param {Array<number>} ids_proyectos - Array de IDs de proyectos
     * @returns {Promise<Object>} - Objeto con id_proyecto como clave y boolean como valor
     */
    static async verificarProyectosConAccionables(ids_proyectos) {
        try {
            if (!ids_proyectos || ids_proyectos.length === 0) {
                return {};
            }

            const placeholders = ids_proyectos.map((_, i) => `$${i + 1}`).join(', ');
            const query = `
                SELECT DISTINCT id_proyecto
                FROM accionables_proyectos
                WHERE id_proyecto IN (${placeholders})
            `;
            
            const result = await pool.query(query, ids_proyectos);
            
            // Crear objeto con todos los IDs como false, luego marcar los que tienen accionables
            const proyectosConAccionables = {};
            ids_proyectos.forEach(id => {
                proyectosConAccionables[id] = false;
            });
            
            result.rows.forEach(row => {
                proyectosConAccionables[row.id_proyecto] = true;
            });
            
            return proyectosConAccionables;
        } catch (error) {
            console.error('Error al verificar proyectos con accionables:', error);
            throw error;
        }
    }
}

module.exports = AccionablesProyectoModel;








