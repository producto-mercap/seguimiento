const { pool } = require('../config/database');

class PedidosEquiposModel {
    /**
     * Obtener todos los pedidos con filtros opcionales
     * @param {Object} filtros - Filtros de búsqueda
     * @returns {Promise<Array>} - Array de pedidos
     */
    static async obtenerTodos(filtros = {}) {
        try {
            let query = `
                SELECT * FROM pedidos_equipos
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;

            // Filtro por equipo solicitante
            if (filtros.equipo_solicitante) {
                query += ` AND equipo_solicitante = $${paramCount}`;
                params.push(filtros.equipo_solicitante);
                paramCount++;
            }

            // Filtro por equipo responsable
            if (filtros.equipo_responsable) {
                query += ` AND equipo_responsable = $${paramCount}`;
                params.push(filtros.equipo_responsable);
                paramCount++;
            }

            // Filtro por estado (puede ser array de estados)
            if (filtros.estados && Array.isArray(filtros.estados) && filtros.estados.length > 0) {
                const placeholders = filtros.estados.map((_, i) => `$${paramCount + i}`).join(', ');
                query += ` AND estado IN (${placeholders})`;
                params.push(...filtros.estados);
                paramCount += filtros.estados.length;
            } else if (filtros.estado) {
                query += ` AND estado = $${paramCount}`;
                params.push(filtros.estado);
                paramCount++;
            }

            // Filtro por rango de fechas
            if (filtros.fecha_desde) {
                query += ` AND fecha_planificada_entrega >= $${paramCount}`;
                params.push(filtros.fecha_desde);
                paramCount++;
            }

            if (filtros.fecha_hasta) {
                query += ` AND fecha_planificada_entrega <= $${paramCount}`;
                params.push(filtros.fecha_hasta);
                paramCount++;
            }

            // Filtro por búsqueda en descripción o comentario
            if (filtros.busqueda) {
                query += ` AND (
                    descripcion ILIKE $${paramCount} OR 
                    comentario ILIKE $${paramCount}
                )`;
                params.push(`%${filtros.busqueda}%`);
                paramCount++;
            }

            // Ordenamiento
            const ordenPor = filtros.ordenPor || 'created_at';
            const ordenDireccion = filtros.ordenDireccion || 'DESC';
            query += ` ORDER BY ${ordenPor} ${ordenDireccion}`;

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener pedidos:', error);
            throw error;
        }
    }

    /**
     * Obtener un pedido por ID
     * @param {number} id - ID del pedido
     * @returns {Promise<Object|null>} - Pedido o null si no existe
     */
    static async obtenerPorId(id) {
        try {
            const query = `
                SELECT * FROM pedidos_equipos
                WHERE id = $1
            `;
            const result = await pool.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al obtener pedido por ID:', error);
            throw error;
        }
    }

    /**
     * Crear un nuevo pedido
     * @param {Object} datos - Datos del pedido
     * @returns {Promise<Object>} - Pedido creado
     */
    static async crear(datos) {
        try {
            const {
                equipo_solicitante,
                equipo_responsable,
                descripcion,
                fecha_planificada_entrega,
                estado,
                comentario
            } = datos;

            const query = `
                INSERT INTO pedidos_equipos 
                (equipo_solicitante, equipo_responsable, descripcion, fecha_planificada_entrega, estado, comentario)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const params = [
                equipo_solicitante,
                equipo_responsable,
                descripcion,
                fecha_planificada_entrega,
                estado,
                comentario || null
            ];

            const result = await pool.query(query, params);
            return result.rows[0];
        } catch (error) {
            console.error('Error al crear pedido:', error);
            throw error;
        }
    }

    /**
     * Actualizar un pedido existente
     * @param {number} id - ID del pedido
     * @param {Object} datos - Datos a actualizar
     * @returns {Promise<Object>} - Pedido actualizado
     */
    static async actualizar(id, datos) {
        try {
            const {
                equipo_solicitante,
                equipo_responsable,
                descripcion,
                fecha_planificada_entrega,
                estado,
                comentario
            } = datos;

            const query = `
                UPDATE pedidos_equipos
                SET equipo_solicitante = $1,
                    equipo_responsable = $2,
                    descripcion = $3,
                    fecha_planificada_entrega = $4,
                    estado = $5,
                    comentario = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                RETURNING *
            `;
            const params = [
                equipo_solicitante,
                equipo_responsable,
                descripcion,
                fecha_planificada_entrega,
                estado,
                comentario || null,
                id
            ];

            const result = await pool.query(query, params);
            if (result.rows.length === 0) {
                throw new Error('Pedido no encontrado');
            }
            return result.rows[0];
        } catch (error) {
            console.error('Error al actualizar pedido:', error);
            throw error;
        }
    }

    /**
     * Eliminar un pedido
     * @param {number} id - ID del pedido
     * @returns {Promise<boolean>} - true si se eliminó correctamente
     */
    static async eliminar(id) {
        try {
            const query = `
                DELETE FROM pedidos_equipos
                WHERE id = $1
                RETURNING id
            `;
            const result = await pool.query(query, [id]);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Error al eliminar pedido:', error);
            throw error;
        }
    }

    /**
     * Obtener lista única de equipos desde productos_equipos
     * @returns {Promise<Array>} - Array de equipos únicos
     */
    static async obtenerEquipos() {
        try {
            const query = `
                SELECT DISTINCT equipo
                FROM productos_equipos
                WHERE equipo IS NOT NULL
                ORDER BY equipo
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.equipo);
        } catch (error) {
            console.error('Error al obtener equipos:', error);
            throw error;
        }
    }
}

module.exports = PedidosEquiposModel;

