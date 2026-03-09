const PedidosEquiposModel = require('../models/PedidosEquiposModel');
const ProductosEquiposModel = require('../models/ProductosEquiposModel');

/**
 * Renderizar página principal de Sync
 */
async function index(req, res) {
    try {
        // Obtener productos con equipos para el sidebar
        const productosEquipos = await ProductosEquiposModel.obtenerTodos();

        res.render('pages/sync', {
            title: 'Sync - Pedidos entre Equipos',
            productosEquipos: productosEquipos,
            productoActual: null,
            equipoActual: null,
            tipoActual: null,
            activeMenu: 'sync',
            isAdmin: req.isAdmin || false
        });
    } catch (error) {
        console.error('Error en index de Sync:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            error: 'Error al cargar la página de Sync'
        });
    }
}

/**
 * API: Obtener todos los pedidos con filtros opcionales
 */
async function obtenerPedidos(req, res) {
    try {
        // Parsear query string manualmente para manejar múltiples valores del mismo parámetro
        // Express por defecto puede no parsear correctamente múltiples valores del mismo parámetro
        let equipo_solicitante = null;
        let equipo_responsable = null;
        
        // Parsear query string manualmente para obtener todos los valores
        // Express puede no parsear correctamente múltiples valores del mismo parámetro
        const url = require('url');
        const fullUrl = req.originalUrl || req.url;
        const parsedUrl = url.parse(fullUrl, true);
        
        // Intentar obtener de req.query primero (Express puede haber parseado algunos valores)
        if (req.query.equipo_solicitante) {
            if (Array.isArray(req.query.equipo_solicitante)) {
                equipo_solicitante = req.query.equipo_solicitante.filter(e => e && String(e).trim() !== '');
            } else {
                equipo_solicitante = [req.query.equipo_solicitante].filter(e => e && String(e).trim() !== '');
            }
            if (equipo_solicitante.length === 0) {
                equipo_solicitante = null;
            }
        }
        
        if (req.query.equipo_responsable) {
            if (Array.isArray(req.query.equipo_responsable)) {
                equipo_responsable = req.query.equipo_responsable.filter(e => e && String(e).trim() !== '');
            } else {
                equipo_responsable = [req.query.equipo_responsable].filter(e => e && String(e).trim() !== '');
            }
            if (equipo_responsable.length === 0) {
                equipo_responsable = null;
            }
        }
        
        // Si no se encontraron valores en req.query, parsear manualmente la query string
        // Esto es necesario porque Express puede no parsear correctamente múltiples valores del mismo parámetro
        if ((!equipo_solicitante || !equipo_responsable)) {
            const queryString = fullUrl.includes('?') ? fullUrl.split('?')[1] : '';
            if (queryString) {
                const params = {};
                const pairs = queryString.split('&');
                
                for (const pair of pairs) {
                    const equalIndex = pair.indexOf('=');
                    if (equalIndex > 0) {
                        const key = decodeURIComponent(pair.substring(0, equalIndex));
                        const value = decodeURIComponent(pair.substring(equalIndex + 1));
                        if (key) {
                            if (!params[key]) {
                                params[key] = [];
                            }
                            if (value) {
                                params[key].push(value);
                            }
                        }
                    }
                }
                
                // Solo actualizar si no se encontró antes
                if (!equipo_solicitante && params.equipo_solicitante && params.equipo_solicitante.length > 0) {
                    equipo_solicitante = params.equipo_solicitante.filter(e => e && e.trim() !== '');
                    if (equipo_solicitante.length === 0) {
                        equipo_solicitante = null;
                    }
                }
                
                if (!equipo_responsable && params.equipo_responsable && params.equipo_responsable.length > 0) {
                    equipo_responsable = params.equipo_responsable.filter(e => e && e.trim() !== '');
                    if (equipo_responsable.length === 0) {
                        equipo_responsable = null;
                    }
                }
            }
        }

        const filtros = {
            equipo_solicitante: equipo_solicitante,
            equipo_responsable: equipo_responsable,
            estados: req.query.estados ? (Array.isArray(req.query.estados) ? req.query.estados : [req.query.estados]) : null,
            fecha_desde: req.query.fecha_desde || null,
            fecha_hasta: req.query.fecha_hasta || null,
            busqueda: req.query.busqueda || null,
            ordenPor: req.query.ordenPor || 'created_at',
            ordenDireccion: req.query.ordenDireccion || 'DESC'
        };

        // Limpiar filtros nulos o vacíos
        Object.keys(filtros).forEach(key => {
            if (filtros[key] === null || filtros[key] === '' || 
                (Array.isArray(filtros[key]) && filtros[key].length === 0)) {
                delete filtros[key];
            }
        });

        // Debug: Log de filtros para diagnóstico
        if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Filtros aplicados:', JSON.stringify(filtros, null, 2));
            console.log('🔍 Query string original:', req.originalUrl || req.url);
            console.log('🔍 req.query:', JSON.stringify(req.query, null, 2));
        }

        const pedidos = await PedidosEquiposModel.obtenerTodos(filtros);

        res.json({
            success: true,
            data: pedidos
        });
    } catch (error) {
        console.error('❌ Error al obtener pedidos:', error);
        console.error('❌ Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Error al obtener pedidos',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
        });
    }
}

/**
 * API: Obtener un pedido por ID
 */
async function obtenerPedidoPorId(req, res) {
    try {
        const { id } = req.params;
        const pedido = await PedidosEquiposModel.obtenerPorId(id);

        if (!pedido) {
            return res.status(404).json({
                success: false,
                error: 'Pedido no encontrado'
            });
        }

        res.json({
            success: true,
            data: pedido
        });
    } catch (error) {
        console.error('Error al obtener pedido por ID:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener pedido',
            message: error.message
        });
    }
}

/**
 * API: Obtener lista de equipos
 */
async function obtenerEquipos(req, res) {
    try {
        const equipos = await PedidosEquiposModel.obtenerEquipos();

        res.json({
            success: true,
            data: equipos
        });
    } catch (error) {
        console.error('Error al obtener equipos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener equipos',
            message: error.message
        });
    }
}

/**
 * API: Crear un nuevo pedido
 */
async function crearPedido(req, res) {
    try {
        let {
            equipo_solicitante,
            equipo_responsable,
            descripcion,
            fecha_planificada_entrega,
            estado,
            comentario
        } = req.body;

        // Convertir strings a arrays si es necesario
        if (equipo_solicitante && !Array.isArray(equipo_solicitante)) {
            equipo_solicitante = [equipo_solicitante];
        }
        if (equipo_responsable && !Array.isArray(equipo_responsable)) {
            equipo_responsable = [equipo_responsable];
        }

        // Validaciones
        if (!equipo_solicitante || equipo_solicitante.length === 0 || 
            !equipo_responsable || equipo_responsable.length === 0 || 
            !descripcion || !fecha_planificada_entrega || !estado) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos obligatorios'
            });
        }

        const estadosValidos = ['Pendiente', 'En curso', 'Bloqueado', 'Realizado'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                error: 'Estado inválido'
            });
        }

        const pedido = await PedidosEquiposModel.crear({
            equipo_solicitante,
            equipo_responsable,
            descripcion,
            fecha_planificada_entrega,
            estado,
            comentario
        });

        res.status(201).json({
            success: true,
            data: pedido,
            message: 'Pedido creado correctamente'
        });
    } catch (error) {
        console.error('Error al crear pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear pedido',
            message: error.message
        });
    }
}

/**
 * API: Actualizar un pedido existente
 */
async function actualizarPedido(req, res) {
    try {
        const { id } = req.params;
        
        // Obtener pedido actual para validaciones
        const pedidoActual = await PedidosEquiposModel.obtenerPorId(id);
        if (!pedidoActual) {
            return res.status(404).json({
                success: false,
                error: 'Pedido no encontrado'
            });
        }

        // Permitir actualización parcial: usar valores del pedido actual si no se proporcionan
        let {
            equipo_solicitante = pedidoActual.equipo_solicitante,
            equipo_responsable = pedidoActual.equipo_responsable,
            descripcion = pedidoActual.descripcion,
            fecha_planificada_entrega = pedidoActual.fecha_planificada_entrega,
            estado = pedidoActual.estado,
            comentario = pedidoActual.comentario
        } = req.body;

        // Convertir strings a arrays si es necesario
        if (equipo_solicitante && !Array.isArray(equipo_solicitante)) {
            equipo_solicitante = [equipo_solicitante];
        }
        if (equipo_responsable && !Array.isArray(equipo_responsable)) {
            equipo_responsable = [equipo_responsable];
        }

        // Validaciones solo si se están actualizando esos campos
        if (req.body.estado !== undefined) {
            const estadosValidos = ['Pendiente', 'En curso', 'Bloqueado', 'Realizado'];
            if (!estadosValidos.includes(estado)) {
                return res.status(400).json({
                    success: false,
                    error: 'Estado inválido'
                });
            }
        }

        const pedido = await PedidosEquiposModel.actualizar(id, {
            equipo_solicitante,
            equipo_responsable,
            descripcion,
            fecha_planificada_entrega,
            estado,
            comentario: comentario || null
        });

        res.json({
            success: true,
            data: pedido,
            message: 'Pedido actualizado correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar pedido',
            message: error.message
        });
    }
}

/**
 * API: Eliminar un pedido
 */
async function eliminarPedido(req, res) {
    try {
        const { id } = req.params;
        const eliminado = await PedidosEquiposModel.eliminar(id);

        if (!eliminado) {
            return res.status(404).json({
                success: false,
                error: 'Pedido no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Pedido eliminado correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar pedido',
            message: error.message
        });
    }
}

module.exports = {
    index,
    obtenerPedidos,
    obtenerPedidoPorId,
    obtenerEquipos,
    crearPedido,
    actualizarPedido,
    eliminarPedido
};

