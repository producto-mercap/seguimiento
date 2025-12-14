const { pool } = require('../config/database');

class MapeoProductoProyectoInternoModel {
    /**
     * Obtener todos los mapeos
     * @param {Object} filtros - Filtros opcionales
     * @returns {Promise<Array>} - Array de mapeos
     */
    static async obtenerTodos(filtros = {}) {
        try {
            let query = `
                SELECT * FROM mapeo_producto_proyecto_interno
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;

            if (filtros.producto) {
                query += ` AND producto = $${paramCount}`;
                params.push(filtros.producto);
                paramCount++;
            }

            if (filtros.activo !== undefined) {
                query += ` AND activo = $${paramCount}`;
                params.push(filtros.activo);
                paramCount++;
            }

            query += ` ORDER BY producto, codigo_proyecto_redmine`;

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener mapeos:', error);
            throw error;
        }
    }

    /**
     * Obtener mapeos por producto
     * @param {string} producto - Nombre del producto
     * @returns {Promise<Array>} - Array de códigos de proyecto
     */
    static async obtenerPorProducto(producto) {
        try {
            const query = `
                SELECT codigo_proyecto_redmine 
                FROM mapeo_producto_proyecto_interno
                WHERE producto = $1 AND activo = true
                ORDER BY codigo_proyecto_redmine
            `;
            const result = await pool.query(query, [producto]);
            return result.rows.map(row => row.codigo_proyecto_redmine);
        } catch (error) {
            console.error('Error al obtener mapeos por producto:', error);
            throw error;
        }
    }

    /**
     * Crear nuevo mapeo
     * @param {Object} datos - Datos del mapeo
     * @returns {Promise<Object>} - Mapeo creado
     */
    static async crear(datos) {
        try {
            const query = `
                INSERT INTO mapeo_producto_proyecto_interno (producto, codigo_proyecto_redmine, activo)
                VALUES ($1, $2, $3)
                ON CONFLICT (producto, codigo_proyecto_redmine)
                DO UPDATE SET
                    activo = EXCLUDED.activo,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const result = await pool.query(query, [
                datos.producto,
                datos.codigo_proyecto_redmine,
                datos.activo !== undefined ? datos.activo : true
            ]);
            return result.rows[0];
        } catch (error) {
            console.error('Error al crear mapeo:', error);
            throw error;
        }
    }

    /**
     * Actualizar mapeo
     * @param {number} id - ID del mapeo
     * @param {Object} datos - Datos a actualizar
     * @returns {Promise<Object>} - Mapeo actualizado
     */
    static async actualizar(id, datos) {
        try {
            const campos = [];
            const valores = [];
            let paramCount = 1;

            if (datos.producto !== undefined) {
                campos.push(`producto = $${paramCount}`);
                valores.push(datos.producto);
                paramCount++;
            }

            if (datos.codigo_proyecto_redmine !== undefined) {
                campos.push(`codigo_proyecto_redmine = $${paramCount}`);
                valores.push(datos.codigo_proyecto_redmine);
                paramCount++;
            }

            if (datos.activo !== undefined) {
                campos.push(`activo = $${paramCount}`);
                valores.push(datos.activo);
                paramCount++;
            }

            campos.push(`updated_at = CURRENT_TIMESTAMP`);
            valores.push(id);

            const query = `
                UPDATE mapeo_producto_proyecto_interno
                SET ${campos.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;

            const result = await pool.query(query, valores);
            return result.rows[0];
        } catch (error) {
            console.error('Error al actualizar mapeo:', error);
            throw error;
        }
    }

    /**
     * Eliminar mapeo
     * @param {number} id - ID del mapeo
     * @returns {Promise<boolean>} - true si se eliminó
     */
    static async eliminar(id) {
        try {
            const query = `
                DELETE FROM mapeo_producto_proyecto_interno
                WHERE id = $1
            `;
            const result = await pool.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Error al eliminar mapeo:', error);
            throw error;
        }
    }

    /**
     * Obtener productos únicos
     * @returns {Promise<Array>} - Array de productos
     */
    static async obtenerProductos() {
        try {
            const query = `
                SELECT DISTINCT producto 
                FROM mapeo_producto_proyecto_interno
                WHERE activo = true
                ORDER BY producto
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.producto);
        } catch (error) {
            console.error('Error al obtener productos:', error);
            throw error;
        }
    }
}

module.exports = MapeoProductoProyectoInternoModel;









