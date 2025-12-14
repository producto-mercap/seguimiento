const { pool } = require('../config/database');

class ProyectosExternosModel {
    /**
     * Obtener categorías disponibles para un equipo (desde redmine_proyectos_externos)
     * @param {string} equipo - ID del equipo
     * @returns {Promise<Array>} - Array de categorías
     */
    static async obtenerCategoriasEquipo(equipo) {
        try {
            let query = `
                SELECT DISTINCT categoria
                FROM redmine_proyectos_externos
                WHERE categoria IS NOT NULL AND categoria != ''
                AND categoria != 'Bolsa de Horas'
                AND categoria != 'On-Site'
                AND categoria != 'Mantenimiento'
            `;
            const params = [];
            let paramCount = 1;

            if (equipo && equipo !== '*' && equipo !== 'null') {
                query += ` AND equipo = $${paramCount}`;
                params.push(equipo);
                paramCount++;
            }

            query += ` ORDER BY categoria ASC`;

            const result = await pool.query(query, params);
            return result.rows.map(row => row.categoria);
        } catch (error) {
            console.error('Error al obtener categorías del equipo:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los proyectos externos con datos completos (vista)
     * @param {Object} filtros - Filtros de búsqueda
     * @returns {Promise<Array>} - Array de proyectos externos
     */
    static async obtenerTodos(filtros = {}) {
        try {
            let query = `
                SELECT * FROM v_proyectos_externos_completo
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;

            // Filtro por producto
            if (filtros.producto) {
                query += ` AND producto = $${paramCount}`;
                params.push(filtros.producto);
                paramCount++;
            }

            // Filtro por cliente
            if (filtros.cliente) {
                query += ` AND cliente = $${paramCount}`;
                params.push(filtros.cliente);
                paramCount++;
            }

            // Filtro por equipo (solo si se especifica y no es '*')
            if (filtros.equipo && filtros.equipo !== '*' && filtros.equipo !== 'null') {
                query += ` AND equipo = $${paramCount}`;
                params.push(filtros.equipo);
                paramCount++;
            }

            // Filtro por categoría
            if (filtros.categoria) {
                query += ` AND categoria = $${paramCount}`;
                params.push(filtros.categoria);
                paramCount++;
            }

            // Excluir categorías específicas (para la solapa "Proyectos" que agrupa todas las categorías excepto mantenimiento)
            if (filtros.excluirCategorias && Array.isArray(filtros.excluirCategorias) && filtros.excluirCategorias.length > 0) {
                const placeholders = filtros.excluirCategorias.map((_, i) => `$${paramCount + i}`).join(', ');
                query += ` AND categoria NOT IN (${placeholders})`;
                params.push(...filtros.excluirCategorias);
                paramCount += filtros.excluirCategorias.length;
            }

            // Excluir proyectos heredados (linea_servicio = 'Hereda') de la consulta principal
            // EXCEPTO si no tienen proyecto_padre (se muestran como proyectos comunes)
            // Los subproyectos con proyecto_padre se obtienen por separado
            query += ` AND (linea_servicio IS NULL OR linea_servicio != 'Hereda' OR (linea_servicio = 'Hereda' AND proyecto_padre IS NULL))`;
            
            // Filtro por búsqueda
            if (filtros.busqueda) {
                query += ` AND (
                    nombre_proyecto ILIKE $${paramCount} OR 
                    cliente ILIKE $${paramCount} OR 
                    linea_servicio ILIKE $${paramCount}
                )`;
                params.push(`%${filtros.busqueda}%`);
                paramCount++;
            }

            // Ordenamiento
            const ordenValido = ['nombre_proyecto', 'cliente', 'equipo', 'producto', 'fecha_creacion', 'fecha_inicio', 'fecha_fin'];
            const orden = ordenValido.includes(filtros.orden) ? filtros.orden : 'nombre_proyecto';
            const direccion = filtros.direccion === 'asc' ? 'ASC' : 'DESC';
            query += ` ORDER BY ${orden} ${direccion} NULLS LAST`;

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener proyectos externos:', error);
            throw error;
        }
    }

    /**
     * Obtener proyecto externo por ID de proyecto
     * @param {number} id_proyecto - ID del proyecto en Redmine
     * @returns {Promise<Object|null>} - Proyecto externo o null
     */
    static async obtenerPorId(id_proyecto) {
        try {
            const query = `
                SELECT * FROM v_proyectos_externos_completo
                WHERE id_proyecto = $1
            `;
            const result = await pool.query(query, [id_proyecto]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al obtener proyecto externo:', error);
            throw error;
        }
    }

    /**
     * Actualizar datos editables de proyecto externo
     * @param {number} id_proyecto - ID del proyecto en Redmine
     * @param {Object} datos - Datos a actualizar
     * @param {boolean} actualizarTimestamp - Si debe actualizar updated_at (default: true)
     * @returns {Promise<Object>} - Proyecto externo actualizado
     */
    static async actualizar(id_proyecto, datos, actualizarTimestamp = true) {
        try {
            // Verificar primero que el proyecto existe en redmine_proyectos_externos
            // Esto es necesario porque hay una foreign key constraint
            const checkQuery = `SELECT id_proyecto FROM redmine_proyectos_externos WHERE id_proyecto = $1`;
            const checkResult = await pool.query(checkQuery, [id_proyecto]);
            
            if (checkResult.rows.length === 0) {
                throw new Error(`El proyecto con id_proyecto=${id_proyecto} no existe en redmine_proyectos_externos. Debe sincronizarse primero desde Redmine.`);
            }
            
            // Construir dinámicamente los campos a actualizar usando EXCLUDED
            const campos = [];
            
            // Solo incluir campos que están presentes en datos
            if ('estado' in datos) {
                campos.push(`estado = EXCLUDED.estado`);
            }
            if ('overall' in datos) {
                campos.push(`overall = EXCLUDED.overall`);
            }
            if ('alcance' in datos) {
                campos.push(`alcance = EXCLUDED.alcance`);
            }
            if ('costo' in datos) {
                campos.push(`costo = EXCLUDED.costo`);
            }
            if ('plazos' in datos) {
                campos.push(`plazos = EXCLUDED.plazos`);
            }
            if ('avance' in datos) {
                campos.push(`avance = EXCLUDED.avance`);
            }
            if ('fecha_inicio' in datos) {
                campos.push(`fecha_inicio = EXCLUDED.fecha_inicio`);
            }
            if ('fecha_fin' in datos) {
                campos.push(`fecha_fin = EXCLUDED.fecha_fin`);
            }
            if ('win' in datos) {
                campos.push(`win = EXCLUDED.win`);
            }
            if ('riesgos' in datos) {
                campos.push(`riesgos = EXCLUDED.riesgos`);
            }
            if ('accionables' in datos) {
                campos.push(`accionables = EXCLUDED.accionables`);
            }
            if ('fecha_accionable' in datos) {
                campos.push(`fecha_accionable = EXCLUDED.fecha_accionable`);
            }
            if ('asignado_accionable' in datos) {
                campos.push(`asignado_accionable = EXCLUDED.asignado_accionable`);
            }
            
            if (campos.length === 0) {
                return await this.obtenerPorId(id_proyecto);
            }
            
            // Construir valores para INSERT (todos los campos, usando los valores de datos o null)
            const insertValores = [
                id_proyecto,
                'estado' in datos ? (datos.estado || null) : null,
                'overall' in datos ? (datos.overall || null) : null,
                'alcance' in datos ? (datos.alcance || null) : null,
                'costo' in datos ? (datos.costo || null) : null,
                'plazos' in datos ? (datos.plazos || null) : null,
                'avance' in datos ? (datos.avance ? parseInt(datos.avance) : null) : null,
                'fecha_inicio' in datos ? (datos.fecha_inicio || null) : null,
                'fecha_fin' in datos ? (datos.fecha_fin || null) : null,
                'win' in datos ? (datos.win || null) : null,
                'riesgos' in datos ? (datos.riesgos || null) : null,
                'accionables' in datos ? (datos.accionables || null) : null,
                'fecha_accionable' in datos ? (datos.fecha_accionable || null) : null,
                'asignado_accionable' in datos ? (datos.asignado_accionable || null) : null
            ];
            
            // Usar UPSERT (INSERT ... ON CONFLICT DO UPDATE) para crear o actualizar
            // Ahora es seguro porque ya verificamos que existe en redmine_proyectos_externos
            const updateTimestamp = actualizarTimestamp ? ', updated_at = CURRENT_TIMESTAMP' : '';
            const query = `
                INSERT INTO proyectos_externos (id_proyecto, estado, overall, alcance, costo, plazos, avance, fecha_inicio, fecha_fin, win, riesgos, accionables, fecha_accionable, asignado_accionable, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (id_proyecto) 
                DO UPDATE SET
                    ${campos.join(', ')}${updateTimestamp}
                RETURNING *
            `;
            
            const result = await pool.query(query, insertValores);
            
            if (!result.rows[0]) {
                return null;
            }
            
            // Obtener los datos completos del proyecto y añadir updated_at del resultado
            const proyectoCompleto = await this.obtenerPorId(id_proyecto);
            if (proyectoCompleto && result.rows[0].updated_at) {
                proyectoCompleto.updated_at = result.rows[0].updated_at;
            }
            return proyectoCompleto;
        } catch (error) {
            console.error('Error al actualizar proyecto externo:', error);
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
                FROM redmine_proyectos_externos 
                WHERE producto IS NOT NULL 
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
     * Obtener clientes únicos
     * @returns {Promise<Array>} - Array de clientes
     */
    static async obtenerClientes() {
        try {
            const query = `
                SELECT DISTINCT cliente 
                FROM redmine_proyectos_externos 
                WHERE cliente IS NOT NULL 
                ORDER BY cliente
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.cliente);
        } catch (error) {
            console.error('Error al obtener clientes:', error);
            throw error;
        }
    }

    /**
     * Obtener equipos únicos
     * @returns {Promise<Array>} - Array de equipos
     */
    static async obtenerEquipos() {
        try {
            const query = `
                SELECT DISTINCT equipo 
                FROM redmine_proyectos_externos 
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

    /**
     * Obtener subproyectos (proyectos con linea_servicio = 'Hereda') para proyectos padres específicos
     * @param {Array<number>} ids_proyectos_padre - Array de IDs de proyectos padre
     * @returns {Promise<Array>} - Array de subproyectos
     */
    static async obtenerSubproyectos(ids_proyectos_padre) {
        try {
            if (!ids_proyectos_padre || ids_proyectos_padre.length === 0) {
                return [];
            }
            
            const placeholders = ids_proyectos_padre.map((_, i) => `$${i + 1}`).join(', ');
            const query = `
                SELECT * FROM v_proyectos_externos_completo
                WHERE linea_servicio = 'Hereda'
                AND proyecto_padre IN (${placeholders})
                ORDER BY proyecto_padre, nombre_proyecto
            `;
            
            const result = await pool.query(query, ids_proyectos_padre);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener subproyectos:', error);
            throw error;
        }
    }

    /**
     * Obtener métricas del dashboard por producto
     * @returns {Promise<Array>} - Array de métricas por producto
     */
    static async obtenerMetricasDashboard() {
        try {
            const query = `
                SELECT 
                    producto,
                    COUNT(DISTINCT equipo) as total_equipos,
                    COUNT(DISTINCT cliente) as total_clientes,
                    COUNT(CASE WHEN estado IN ('En curso', 'en curso', 'Testing', 'Entregado', 'Rework') THEN 1 END) as proyectos_en_curso
                FROM v_proyectos_externos_completo
                WHERE producto IS NOT NULL
                GROUP BY producto
                ORDER BY producto
            `;
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener métricas del dashboard:', error);
            throw error;
        }
    }
}

module.exports = ProyectosExternosModel;

