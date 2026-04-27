const { pool } = require('../config/database');

/** Orden alfabético estable para arrays de equipos (persistencia y criterio único). */
function ordenarEquiposAlfabeticamente(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    return [...arr].map(String).sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' })
    );
}

const COLUMNAS_ORDEN_PERMITIDAS = new Set([
    'created_at',
    'updated_at',
    'id',
    'descripcion',
    'fecha_planificada_entrega',
    'estado',
    'comentario'
]);

class PedidosEquiposModel {
    /**
     * Obtener todos los pedidos con filtros opcionales
     * @param {Object} filtros - Filtros de búsqueda
     * @returns {Promise<Array>} - Array de pedidos
     */
    static async obtenerTodos(filtros = {}) {
        let query = '';
        let params = [];
        try {
            query = `
                SELECT * FROM pedidos_equipos
                WHERE 1=1
            `;
            params = [];
            let paramCount = 1;

            // Filtro por equipo solicitante (puede ser string o array)
            if (filtros.equipo_solicitante) {
                if (Array.isArray(filtros.equipo_solicitante) && filtros.equipo_solicitante.length > 0) {
                    // Si es array, buscar pedidos que contengan cualquiera de los equipos
                    // Manejar tanto JSONB como VARCHAR/text
                    // Usar LOWER() para comparación case-insensitive
                    const condiciones = filtros.equipo_solicitante.map((equipo, i) => {
                        // Calcular placeholder basado en paramCount actual + índice
                        const placeholder = `$${paramCount + i}`;
                        // Usar un subquery que maneje ambos casos: JSONB array o texto simple
                        return `(
                            CASE 
                                WHEN equipo_solicitante::text ~ '^\\[.*\\]$' THEN
                                    EXISTS (SELECT 1 FROM jsonb_array_elements_text(equipo_solicitante::jsonb) AS elem WHERE LOWER(elem) = LOWER(${placeholder}))
                                ELSE
                                    LOWER(equipo_solicitante::text) = LOWER(${placeholder})
                            END
                        )`;
                    });
                    // Agregar todos los parámetros al array después de calcular los placeholders
                    params.push(...filtros.equipo_solicitante);
                    paramCount += filtros.equipo_solicitante.length;
                    query += ` AND (${condiciones.join(' OR ')})`;
                } else if (typeof filtros.equipo_solicitante === 'string') {
                    // Si es string, buscar pedidos que contengan ese equipo
                    // Manejar tanto JSONB como VARCHAR/text
                    query += ` AND (
                        CASE 
                            WHEN equipo_solicitante::text ~ '^\\[.*\\]$' THEN
                                EXISTS (SELECT 1 FROM jsonb_array_elements_text(equipo_solicitante::jsonb) AS elem WHERE LOWER(elem) = LOWER($${paramCount}))
                            ELSE
                                LOWER(equipo_solicitante::text) = LOWER($${paramCount})
                        END
                    )`;
                    params.push(filtros.equipo_solicitante);
                    paramCount++;
                }
            }

            // Filtro por equipo responsable (puede ser string o array)
            if (filtros.equipo_responsable) {
                if (Array.isArray(filtros.equipo_responsable) && filtros.equipo_responsable.length > 0) {
                    // Si es array, buscar pedidos que contengan cualquiera de los equipos
                    // Manejar tanto JSONB como VARCHAR/text
                    // Usar LOWER() para comparación case-insensitive
                    const condiciones = filtros.equipo_responsable.map((equipo, i) => {
                        // Calcular placeholder basado en paramCount actual + índice
                        const placeholder = `$${paramCount + i}`;
                        // Usar un subquery que maneje ambos casos: JSONB array o texto simple
                        return `(
                            CASE 
                                WHEN equipo_responsable::text ~ '^\\[.*\\]$' THEN
                                    EXISTS (SELECT 1 FROM jsonb_array_elements_text(equipo_responsable::jsonb) AS elem WHERE LOWER(elem) = LOWER(${placeholder}))
                                ELSE
                                    LOWER(equipo_responsable::text) = LOWER(${placeholder})
                            END
                        )`;
                    });
                    // Agregar todos los parámetros al array después de calcular los placeholders
                    params.push(...filtros.equipo_responsable);
                    paramCount += filtros.equipo_responsable.length;
                    query += ` AND (${condiciones.join(' OR ')})`;
                } else if (typeof filtros.equipo_responsable === 'string') {
                    // Si es string, buscar pedidos que contengan ese equipo
                    // Manejar tanto JSONB como VARCHAR/text
                    query += ` AND (
                        CASE 
                            WHEN equipo_responsable::text ~ '^\\[.*\\]$' THEN
                                EXISTS (SELECT 1 FROM jsonb_array_elements_text(equipo_responsable::jsonb) AS elem WHERE LOWER(elem) = LOWER($${paramCount}))
                            ELSE
                                LOWER(equipo_responsable::text) = LOWER($${paramCount})
                        END
                    )`;
                    params.push(filtros.equipo_responsable);
                    paramCount++;
                }
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

            // Ordenamiento (sanitizar dirección; columnas permitidas para evitar inyección)
            let ordenPor = filtros.ordenPor || 'created_at';
            if (!COLUMNAS_ORDEN_PERMITIDAS.has(ordenPor) &&
                ordenPor !== 'equipo_solicitante' &&
                ordenPor !== 'equipo_responsable') {
                ordenPor = 'created_at';
            }
            const ordenDireccion =
                String(filtros.ordenDireccion || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            /**
             * Orden alfabético por el primer equipo en orden lexicográfico entre los asignados
             * (no por posición en el JSON). Compatible con JSONB o texto legacy.
             */
            const exprOrdenEquipo = (col) => `(
                CASE
                    WHEN ${col}::text ~ '^\\[.*\\]$' THEN
                        (SELECT MIN(LOWER(TRIM(elem)))
                         FROM jsonb_array_elements_text(${col}::jsonb) AS elem)
                    ELSE LOWER(TRIM(${col}::text))
                END
            )`;

            if (ordenPor === 'equipo_solicitante' || ordenPor === 'equipo_responsable') {
                query += ` ORDER BY ${exprOrdenEquipo(ordenPor)} ${ordenDireccion} NULLS LAST`;
            } else {
                query += ` ORDER BY ${ordenPor} ${ordenDireccion}`;
            }

            // Debug: Log de query y params en desarrollo
            if (process.env.NODE_ENV === 'development') {
                console.log('📊 Query SQL:', query);
                console.log('📊 Params:', params);
            }
            
            const result = await pool.query(query, params);
            // Convertir JSONB arrays a arrays JavaScript
            return result.rows.map(row => {
                // Parsear JSONB si es necesario
                let equiposSolicitantes = row.equipo_solicitante;
                let equiposResponsables = row.equipo_responsable;
                
                if (equiposSolicitantes && typeof equiposSolicitantes === 'string') {
                    try {
                        equiposSolicitantes = JSON.parse(equiposSolicitantes);
                    } catch (e) {
                        equiposSolicitantes = [];
                    }
                }
                if (!Array.isArray(equiposSolicitantes)) {
                    equiposSolicitantes = equiposSolicitantes ? [equiposSolicitantes] : [];
                }
                
                if (equiposResponsables && typeof equiposResponsables === 'string') {
                    try {
                        equiposResponsables = JSON.parse(equiposResponsables);
                    } catch (e) {
                        equiposResponsables = [];
                    }
                }
                if (!Array.isArray(equiposResponsables)) {
                    equiposResponsables = equiposResponsables ? [equiposResponsables] : [];
                }
                
                return {
                    ...row,
                    equipo_solicitante: equiposSolicitantes,
                    equipo_responsable: equiposResponsables
                };
            });
        } catch (error) {
            console.error('❌ Error al obtener pedidos:', error);
            console.error('❌ Stack trace:', error.stack);
            if (process.env.NODE_ENV === 'development') {
                console.error('❌ Query que falló:', query);
                console.error('❌ Params que fallaron:', params);
            }
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
            if (!result.rows[0]) return null;
            // Convertir JSONB arrays a arrays JavaScript
            const row = result.rows[0];
            
            let equiposSolicitantes = row.equipo_solicitante;
            let equiposResponsables = row.equipo_responsable;
            
            if (equiposSolicitantes && typeof equiposSolicitantes === 'string') {
                try {
                    equiposSolicitantes = JSON.parse(equiposSolicitantes);
                } catch (e) {
                    equiposSolicitantes = [];
                }
            }
            if (!Array.isArray(equiposSolicitantes)) {
                equiposSolicitantes = equiposSolicitantes ? [equiposSolicitantes] : [];
            }
            
            if (equiposResponsables && typeof equiposResponsables === 'string') {
                try {
                    equiposResponsables = JSON.parse(equiposResponsables);
                } catch (e) {
                    equiposResponsables = [];
                }
            }
            if (!Array.isArray(equiposResponsables)) {
                equiposResponsables = equiposResponsables ? [equiposResponsables] : [];
            }
            
            return {
                ...row,
                equipo_solicitante: equiposSolicitantes,
                equipo_responsable: equiposResponsables
            };
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

            // Convertir arrays a JSONB; orden alfabético fijo entre equipos para criterio único
            const sol = ordenarEquiposAlfabeticamente(
                Array.isArray(equipo_solicitante)
                    ? equipo_solicitante
                    : equipo_solicitante
                      ? [equipo_solicitante]
                      : []
            );
            const resp = ordenarEquiposAlfabeticamente(
                Array.isArray(equipo_responsable)
                    ? equipo_responsable
                    : equipo_responsable
                      ? [equipo_responsable]
                      : []
            );
            const equiposSolicitantesJSON = JSON.stringify(sol);
            const equiposResponsablesJSON = JSON.stringify(resp);

            const query = `
                INSERT INTO pedidos_equipos 
                (equipo_solicitante, equipo_responsable, descripcion, fecha_planificada_entrega, estado, comentario)
                VALUES ($1::jsonb, $2::jsonb, $3, $4, $5, $6)
                RETURNING *
            `;
            const params = [
                equiposSolicitantesJSON,
                equiposResponsablesJSON,
                descripcion,
                fecha_planificada_entrega,
                estado,
                comentario || null
            ];

            const result = await pool.query(query, params);
            // Convertir JSONB arrays a arrays JavaScript
            const row = result.rows[0];
            
            let equiposSolicitantes = row.equipo_solicitante;
            let equiposResponsables = row.equipo_responsable;
            
            if (equiposSolicitantes && typeof equiposSolicitantes === 'string') {
                try {
                    equiposSolicitantes = JSON.parse(equiposSolicitantes);
                } catch (e) {
                    equiposSolicitantes = [];
                }
            }
            if (!Array.isArray(equiposSolicitantes)) {
                equiposSolicitantes = equiposSolicitantes ? [equiposSolicitantes] : [];
            }
            
            if (equiposResponsables && typeof equiposResponsables === 'string') {
                try {
                    equiposResponsables = JSON.parse(equiposResponsables);
                } catch (e) {
                    equiposResponsables = [];
                }
            }
            if (!Array.isArray(equiposResponsables)) {
                equiposResponsables = equiposResponsables ? [equiposResponsables] : [];
            }
            
            return {
                ...row,
                equipo_solicitante: equiposSolicitantes,
                equipo_responsable: equiposResponsables
            };
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

            const sol = ordenarEquiposAlfabeticamente(
                Array.isArray(equipo_solicitante)
                    ? equipo_solicitante
                    : equipo_solicitante
                      ? [equipo_solicitante]
                      : []
            );
            const resp = ordenarEquiposAlfabeticamente(
                Array.isArray(equipo_responsable)
                    ? equipo_responsable
                    : equipo_responsable
                      ? [equipo_responsable]
                      : []
            );
            const equiposSolicitantesJSON = JSON.stringify(sol);
            const equiposResponsablesJSON = JSON.stringify(resp);

            const query = `
                UPDATE pedidos_equipos
                SET equipo_solicitante = $1::jsonb,
                    equipo_responsable = $2::jsonb,
                    descripcion = $3,
                    fecha_planificada_entrega = $4,
                    estado = $5,
                    comentario = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                RETURNING *
            `;
            const params = [
                equiposSolicitantesJSON,
                equiposResponsablesJSON,
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
            // Convertir JSONB arrays a arrays JavaScript
            const row = result.rows[0];
            
            let equiposSolicitantes = row.equipo_solicitante;
            let equiposResponsables = row.equipo_responsable;
            
            if (equiposSolicitantes && typeof equiposSolicitantes === 'string') {
                try {
                    equiposSolicitantes = JSON.parse(equiposSolicitantes);
                } catch (e) {
                    equiposSolicitantes = [];
                }
            }
            if (!Array.isArray(equiposSolicitantes)) {
                equiposSolicitantes = equiposSolicitantes ? [equiposSolicitantes] : [];
            }
            
            if (equiposResponsables && typeof equiposResponsables === 'string') {
                try {
                    equiposResponsables = JSON.parse(equiposResponsables);
                } catch (e) {
                    equiposResponsables = [];
                }
            }
            if (!Array.isArray(equiposResponsables)) {
                equiposResponsables = equiposResponsables ? [equiposResponsables] : [];
            }
            
            return {
                ...row,
                equipo_solicitante: equiposSolicitantes,
                equipo_responsable: equiposResponsables
            };
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

