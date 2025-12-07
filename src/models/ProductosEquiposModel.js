const { pool } = require('../config/database');

class ProductosEquiposModel {
    /**
     * Obtener todos los productos con sus equipos
     * @returns {Promise<Array>} - Array de productos con equipos
     */
    static async obtenerTodos() {
        try {
            const query = `
                SELECT 
                    producto,
                    MAX(producto_redmine) as producto_redmine,
                    array_agg(
                        json_build_object(
                            'id', id,
                            'equipo', equipo,
                            'id_equipo_redmine', id_equipo_redmine
                        ) ORDER BY equipo
                    ) as equipos
                FROM productos_equipos
                GROUP BY producto
                ORDER BY producto
            `;
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener productos y equipos:', error);
            throw error;
        }
    }

    /**
     * Obtener equipos de un producto específico
     * @param {string} producto - Nombre del producto
     * @returns {Promise<Array>} - Array de equipos
     */
    static async obtenerEquiposPorProducto(producto) {
        try {
            const query = `
                SELECT id, equipo, id_equipo_redmine
                FROM productos_equipos
                WHERE producto = $1
                ORDER BY equipo
            `;
            const result = await pool.query(query, [producto]);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener equipos por producto:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los productos únicos
     * @returns {Promise<Array>} - Array de productos
     */
    static async obtenerProductos() {
        try {
            const query = `
                SELECT DISTINCT producto
                FROM productos_equipos
                ORDER BY producto
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.producto);
        } catch (error) {
            console.error('Error al obtener productos:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los equipos únicos
     * @returns {Promise<Array>} - Array de equipos
     */
    static async obtenerEquipos() {
        try {
            const query = `
                SELECT DISTINCT equipo
                FROM productos_equipos
                ORDER BY equipo
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.equipo);
        } catch (error) {
            console.error('Error al obtener equipos:', error);
            throw error;
        }
    }

    /**
     * Agregar nuevo producto con equipo
     * @param {Object} datos - Datos del producto y equipo
     * @returns {Promise<Object>} - Producto creado
     */
    static async crear(datos) {
        try {
            const query = `
                INSERT INTO productos_equipos (producto, equipo, id_equipo_redmine, producto_redmine)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const result = await pool.query(query, [
                datos.producto,
                datos.equipo,
                datos.id_equipo_redmine,
                datos.producto_redmine || null
            ]);
            return result.rows[0];
        } catch (error) {
            console.error('Error al crear producto/equipo:', error);
            throw error;
        }
    }

    /**
     * Actualizar producto/equipo
     * @param {number} id - ID del registro
     * @param {Object} datos - Datos a actualizar
     * @returns {Promise<Object>} - Registro actualizado
     */
    static async actualizar(id, datos) {
        try {
            const query = `
                UPDATE productos_equipos
                SET producto = $1,
                    equipo = $2,
                    id_equipo_redmine = $3,
                    producto_redmine = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $5
                RETURNING *
            `;
            const result = await pool.query(query, [
                datos.producto,
                datos.equipo,
                datos.id_equipo_redmine,
                datos.producto_redmine || null,
                id
            ]);
            return result.rows[0];
        } catch (error) {
            console.error('Error al actualizar producto/equipo:', error);
            throw error;
        }
    }

    /**
     * Eliminar producto/equipo
     * @param {number} id - ID del registro
     * @returns {Promise<boolean>} - true si se eliminó
     */
    static async eliminar(id) {
        try {
            const query = 'DELETE FROM productos_equipos WHERE id = $1 RETURNING *';
            const result = await pool.query(query, [id]);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Error al eliminar producto/equipo:', error);
            throw error;
        }
    }

    /**
     * Obtener id_equipo_redmine por nombre de equipo y producto
     * @param {string} producto - Nombre del producto
     * @param {string} equipo - Nombre del equipo
     * @returns {Promise<string|null>} - ID del equipo en Redmine
     */
    static async obtenerIdEquipoRedmine(producto, equipo) {
        try {
            const query = `
                SELECT id_equipo_redmine
                FROM productos_equipos
                WHERE producto = $1 AND equipo = $2
                LIMIT 1
            `;
            const result = await pool.query(query, [producto, equipo]);
            return result.rows[0]?.id_equipo_redmine || null;
        } catch (error) {
            console.error('Error al obtener id_equipo_redmine:', error);
            throw error;
        }
    }

    /**
     * Obtener producto_redmine por nombre de producto
     * @param {string} producto - Nombre del producto
     * @returns {Promise<string|null>} - Nombre del producto en Redmine
     */
    static async obtenerProductoRedmine(producto) {
        try {
            const query = `
                SELECT DISTINCT producto_redmine
                FROM productos_equipos
                WHERE producto = $1 AND producto_redmine IS NOT NULL
                LIMIT 1
            `;
            const result = await pool.query(query, [producto]);
            return result.rows[0]?.producto_redmine || null;
        } catch (error) {
            console.error('Error al obtener producto_redmine:', error);
            throw error;
        }
    }
}

module.exports = ProductosEquiposModel;



