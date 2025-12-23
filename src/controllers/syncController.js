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
        const filtros = {
            equipo_solicitante: req.query.equipo_solicitante || null,
            equipo_responsable: req.query.equipo_responsable || null,
            estados: req.query.estados ? (Array.isArray(req.query.estados) ? req.query.estados : [req.query.estados]) : null,
            fecha_desde: req.query.fecha_desde || null,
            fecha_hasta: req.query.fecha_hasta || null,
            busqueda: req.query.busqueda || null,
            ordenPor: req.query.ordenPor || 'created_at',
            ordenDireccion: req.query.ordenDireccion || 'DESC'
        };

        // Limpiar filtros nulos
        Object.keys(filtros).forEach(key => {
            if (filtros[key] === null || filtros[key] === '') {
                delete filtros[key];
            }
        });

        const pedidos = await PedidosEquiposModel.obtenerTodos(filtros);

        res.json({
            success: true,
            data: pedidos
        });
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener pedidos',
            message: error.message
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
        const {
            equipo_solicitante,
            equipo_responsable,
            descripcion,
            fecha_planificada_entrega,
            estado,
            comentario
        } = req.body;

        // Validaciones
        if (!equipo_solicitante || !equipo_responsable || !descripcion || !fecha_planificada_entrega || !estado) {
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
        const {
            equipo_solicitante = pedidoActual.equipo_solicitante,
            equipo_responsable = pedidoActual.equipo_responsable,
            descripcion = pedidoActual.descripcion,
            fecha_planificada_entrega = pedidoActual.fecha_planificada_entrega,
            estado = pedidoActual.estado,
            comentario = pedidoActual.comentario
        } = req.body;

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

