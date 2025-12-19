const MantenimientoModel = require('../models/MantenimientoModel');
const ProyectosExternosModel = require('../models/ProyectosExternosModel');
const AccionablesProyectoModel = require('../models/AccionablesProyectoModel');
// ProyectosInternosModel ya no se usa - proyectos internos ahora usan ProyectosExternosModel con filtro de categoría
const ProductosEquiposModel = require('../models/ProductosEquiposModel');
const EpicsProyectoModel = require('../models/EpicsProyectoModel');
const SubproyectosModel = require('../models/SubproyectosModel');
const { obtenerEpics, mapearEpic } = require('../services/redmineService');

/**
 * Renderizar página principal de seguimiento
 */
async function index(req, res) {
    try {
        const producto = req.query.producto || null;
        const equipo = req.query.equipo || null;
        const tipo = req.query.tipo || 'mantenimiento';
        const categoriaActual = req.query.categoria || null;
        
        // Obtener productos con equipos
        const productosEquipos = await ProductosEquiposModel.obtenerTodos();
        
        // Obtener nombre del equipo actual si existe
        let equipoNombre = null;
        if (equipo) {
            for (const item of productosEquipos) {
                const equipoEncontrado = item.equipos?.find(e => e.id_equipo_redmine === equipo);
                if (equipoEncontrado) {
                    equipoNombre = equipoEncontrado.equipo;
                    break;
                }
            }
        }
        
        // Obtener categorías disponibles para el equipo (para solapas dinámicas)
        let categoriasEquipo = [];
        if (equipo) {
            categoriasEquipo = await ProyectosExternosModel.obtenerCategoriasEquipo(equipo);
        }
        
        // Verificar si hay proyectos de mantenimiento para este equipo/producto
        let tieneMantenimiento = false;
        if (producto && equipo) {
            const filtrosMantenimiento = {
                producto: producto,
                equipo: equipo
            };
            const mantenimientos = await MantenimientoModel.obtenerTodos(filtrosMantenimiento);
            
            // También verificar proyectos de "On-Site"
            const filtrosOnSite = {
                producto: producto,
                equipo: equipo,
                categoria: 'On-Site'
            };
            const proyectosOnSite = await ProyectosExternosModel.obtenerTodos(filtrosOnSite);
            
            // Si hay al menos un proyecto de mantenimiento u on-site, mostrar la solapa
            tieneMantenimiento = mantenimientos.length > 0 || proyectosOnSite.length > 0;
        }
        
        // Si no hay tipo especificado o el tipo es 'mantenimiento' pero no hay proyectos de mantenimiento, redirigir a proyectos
        if (producto && equipo) {
            // Si no hay tipo o es 'mantenimiento' pero no hay mantenimiento, determinar la primera solapa disponible
            if (!tipo || tipo === 'mantenimiento') {
                if (tieneMantenimiento) {
                    // Si hay mantenimiento y el tipo es 'mantenimiento' o no está especificado, usar mantenimiento
                    if (!tipo) {
                        tipo = 'mantenimiento';
                    }
                } else {
                    // Si no hay mantenimiento, redirigir a proyectos
                    return res.redirect(`/?producto=${encodeURIComponent(producto)}&equipo=${encodeURIComponent(equipo)}&tipo=proyectos`);
                }
            }
        }
        
        res.render('pages/index', {
            title: 'Seguimiento de Proyectos',
            productosEquipos: productosEquipos,
            productoActual: producto,
            equipoActual: equipo,
            equipoNombre: equipoNombre,
            tipoActual: tipo,
            categoriaActual: categoriaActual,
            categoriasEquipo: categoriasEquipo,
            tieneMantenimiento: tieneMantenimiento,
            activeMenu: 'seguimiento',
            isAdmin: req.isAdmin || false
        });
    } catch (error) {
        console.error('Error en index:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            error: 'Error al cargar la página'
        });
    }
}

/**
 * Obtener datos de mantenimiento
 */
async function obtenerMantenimiento(req, res) {
    try {
        const producto = req.query.producto || null;
        const equipo = req.query.equipo || null;
        const filtros = {
            producto: producto,
            equipo: equipo,
            busqueda: req.query.busqueda || null,
            orden: req.query.orden || 'nombre_proyecto',
            direccion: req.query.direccion || 'asc'
        };
        
        // Obtener proyectos de mantenimiento (Mantenimiento + On-Site)
        const mantenimientos = await MantenimientoModel.obtenerTodos(filtros);
        
        const todosLosProyectos = mantenimientos;
        
        // Aplicar ordenamiento
        const ordenValido = ['nombre_proyecto', 'cliente', 'equipo', 'producto', 'fecha_creacion'];
        const orden = ordenValido.includes(filtros.orden) ? filtros.orden : 'nombre_proyecto';
        const direccion = filtros.direccion === 'asc' ? 'ASC' : 'DESC';
        
        todosLosProyectos.sort((a, b) => {
            const aVal = a[orden] || '';
            const bVal = b[orden] || '';
            if (direccion === 'ASC') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
        
        res.json({
            success: true,
            data: todosLosProyectos
        });
    } catch (error) {
        console.error('Error al obtener mantenimiento:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos de mantenimiento'
        });
    }
}

/**
 * Obtener datos de proyectos externos
 */
async function obtenerProyectosExternos(req, res) {
    try {
        const producto = req.query.producto || null;
        const filtros = {
            producto: producto,
            busqueda: req.query.busqueda || null,
            orden: req.query.orden || 'nombre_proyecto',
            direccion: req.query.direccion || 'asc'
        };
        
        const proyectos = await ProyectosExternosModel.obtenerTodos(filtros);
        
        res.json({
            success: true,
            data: proyectos
        });
    } catch (error) {
        console.error('Error al obtener proyectos externos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos de proyectos externos'
        });
    }
}

/**
 * Obtener datos de proyectos (renombrado desde proyectos externos)
 */
async function obtenerProyectos(req, res) {
    try {
        const producto = req.query.producto || null;
        const equipo = req.query.equipo || null;
        const categoria = req.query.categoria || null;
        const proyecto_padre = req.query.proyecto_padre || null; // Nuevo filtro para obtener subproyectos de un proyecto padre
        const orden = req.query.orden || 'cliente';
        // Si no se especifica dirección y la columna es 'cliente', usar 'desc' por defecto
        const direccionDefault = (orden === 'cliente' && !req.query.direccion) ? 'desc' : 'asc';
        const incluirCerrados = req.query.incluirCerrados === 'true' || req.query.incluirCerrados === true;
        
        // Si se especifica proyecto_padre, devolver solo los subproyectos de ese proyecto
        if (proyecto_padre) {
            const proyectoPadreId = parseInt(proyecto_padre);
            if (!proyectoPadreId) {
                return res.status(400).json({
                    success: false,
                    error: 'ID de proyecto padre inválido'
                });
            }
            
            const subproyectos = await ProyectosExternosModel.obtenerSubproyectos([proyectoPadreId]);
            return res.json({
                success: true,
                data: subproyectos
            });
        }
        
        const filtros = {
            producto: producto,
            equipo: equipo,
            categoria: categoria,
            busqueda: req.query.busqueda || null,
            orden: orden,
            direccion: req.query.direccion || direccionDefault,
            incluirCerrados: incluirCerrados
        };
        
        // Si no hay categoría específica, excluir mantenimiento y on-site (se muestran en la solapa mantenimiento)
        // Esto permite que la solapa "Proyectos" muestre todas las categorías excepto mantenimiento
        if (!categoria) {
            // No filtrar por categoría, pero excluir mantenimiento y on-site en la query
            filtros.excluirCategorias = ['Mantenimiento', 'On-Site'];
        }
        
        console.log('📊 Obteniendo proyectos con filtros:', {
            producto: filtros.producto,
            equipo: filtros.equipo,
            categoria: filtros.categoria,
            busqueda: filtros.busqueda,
            excluirCategorias: filtros.excluirCategorias
        });
        
        // Obtener proyectos principales (linea_servicio != 'Hereda' o NULL)
        const proyectos = await ProyectosExternosModel.obtenerTodos(filtros);
        
        console.log(`✅ Proyectos obtenidos de BD: ${proyectos.length}`);
        
        // Obtener subproyectos (proyectos con linea_servicio = 'Hereda' y proyecto_padre en los proyectos principales)
        const ids_proyectos = proyectos.map(p => p.id_proyecto);
        const subproyectos = await ProyectosExternosModel.obtenerSubproyectos(ids_proyectos);
        
        // Agrupar subproyectos por proyecto padre (usar comparación como string para evitar problemas de tipos)
        const subproyectosPorPadre = {};
        subproyectos.forEach(sub => {
            const proyectoPadreId = String(sub.proyecto_padre || '');
            if (proyectoPadreId && !subproyectosPorPadre[proyectoPadreId]) {
                subproyectosPorPadre[proyectoPadreId] = [];
            }
            if (proyectoPadreId) {
                subproyectosPorPadre[proyectoPadreId].push(sub);
            }
        });
        
        // Calcular rangos de fechas por epics para todos los proyectos (padres y subproyectos)
        const todosLosIds = new Set();
        proyectos.forEach(p => {
            if (p.id_proyecto) todosLosIds.add(p.id_proyecto);
        });
        subproyectos.forEach(sp => {
            if (sp.id_proyecto) todosLosIds.add(sp.id_proyecto);
        });
        
        const totalesPorProyecto = {};
        await Promise.all(
            Array.from(todosLosIds).map(async (id) => {
                try {
                    const totales = await EpicsProyectoModel.obtenerTotalesPorProyecto(id);
                    if (totales && (totales.fecha_inicio_minima || totales.fecha_fin_maxima)) {
                        totalesPorProyecto[id] = totales;
                    }
                } catch (e) {
                    console.error('Error al obtener totales de epics para proyecto', id, e);
                }
            })
        );
        
        // Obtener información de qué proyectos tienen accionables
        const todosLosIdsProyectos = [...ids_proyectos];
        subproyectos.forEach(sub => {
            if (sub.id_proyecto && !todosLosIdsProyectos.includes(sub.id_proyecto)) {
                todosLosIdsProyectos.push(sub.id_proyecto);
            }
        });
        
        const proyectosConAccionablesMap = await AccionablesProyectoModel.verificarProyectosConAccionables(todosLosIdsProyectos);
        
        // Agregar subproyectos y fechas agregadas (inicio mínimo / fin máximo) a cada proyecto padre
        const proyectosConSubproyectosYFechas = proyectos.map(proyecto => {
            const proyectoId = proyecto.id_proyecto;
            const proyectoIdStr = String(proyectoId);
            const subproyectosDelProyecto = subproyectosPorPadre[proyectoIdStr] || [];
            
            // Candidatos de fechas para calcular rango global
            const candidatosInicio = [];
            const candidatosFin = [];
            
            const totalesPadre = totalesPorProyecto[proyectoId];
            if (totalesPadre) {
                if (totalesPadre.fecha_inicio_minima) candidatosInicio.push(totalesPadre.fecha_inicio_minima);
                if (totalesPadre.fecha_fin_maxima) candidatosFin.push(totalesPadre.fecha_fin_maxima);
            }
            if (proyecto.fecha_inicio) candidatosInicio.push(proyecto.fecha_inicio);
            if (proyecto.fecha_fin) candidatosFin.push(proyecto.fecha_fin);
            
            // Enriquecer subproyectos con fechas de epics y acumular en candidatos
            const subproyectosEnriquecidos = subproyectosDelProyecto.map(sub => {
                const totalesSub = totalesPorProyecto[sub.id_proyecto] || {};
                const inicioSub = totalesSub.fecha_inicio_minima || sub.fecha_inicio || null;
                const finSub = totalesSub.fecha_fin_maxima || sub.fecha_fin || null;
                
                if (inicioSub) candidatosInicio.push(inicioSub);
                if (finSub) candidatosFin.push(finSub);
                
                return {
                    ...sub,
                    fecha_inicio: inicioSub || sub.fecha_inicio,
                    fecha_fin: finSub || sub.fecha_fin
                };
            });
            
            // Calcular inicio mínimo y fin máximo global
            let fechaInicioGlobal = proyecto.fecha_inicio || null;
            let fechaFinGlobal = proyecto.fecha_fin || null;
            if (candidatosInicio.length > 0) {
                fechaInicioGlobal = candidatosInicio.slice().sort()[0];
            }
            if (candidatosFin.length > 0) {
                fechaFinGlobal = candidatosFin.slice().sort().reverse()[0];
            }
            
            // Agregar tiene_accionables a cada subproyecto
            const subproyectosConAccionables = subproyectosEnriquecidos.map(sub => ({
                ...sub,
                tiene_accionables: proyectosConAccionablesMap[sub.id_proyecto] || false
            }));
            
            return {
                ...proyecto,
                fecha_inicio: fechaInicioGlobal,
                fecha_fin: fechaFinGlobal,
                tiene_subproyectos: subproyectosConAccionables.length > 0,
                subproyectos: subproyectosConAccionables,
                tiene_accionables: proyectosConAccionablesMap[proyectoId] || false
            };
        });
        
        res.json({
            success: true,
            data: proyectosConSubproyectosYFechas
        });
    } catch (error) {
        console.error('Error al obtener proyectos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos de proyectos'
        });
    }
}

/**
 * Obtener un proyecto por ID
 */
async function obtenerProyectoPorId(req, res) {
    try {
        const { id_proyecto } = req.params;
        const idProyectoNum = parseInt(id_proyecto);
        
        if (!idProyectoNum || isNaN(idProyectoNum)) {
            return res.status(400).json({
                success: false,
                error: 'ID de proyecto inválido'
            });
        }
        
        // Intentar obtener como proyecto externo primero
        const proyecto = await ProyectosExternosModel.obtenerPorId(idProyectoNum);
        
        if (proyecto) {
            // Verificar si tiene accionables
            const proyectosConAccionablesMap = await AccionablesProyectoModel.verificarProyectosConAccionables([idProyectoNum]);
            proyecto.tiene_accionables = proyectosConAccionablesMap[idProyectoNum] || false;
            
            return res.json({
                success: true,
                data: proyecto
            });
        }
        
        // Si no se encuentra como proyecto externo, intentar como mantenimiento
        const mantenimiento = await MantenimientoModel.obtenerPorId(idProyectoNum);
        if (mantenimiento) {
            return res.json({
                success: true,
                data: mantenimiento
            });
        }
        
        return res.status(404).json({
            success: false,
            error: 'Proyecto no encontrado'
        });
    } catch (error) {
        console.error('Error al obtener proyecto por ID:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener proyecto'
        });
    }
}

/**
 * Actualizar datos editables de mantenimiento
 */
async function actualizarMantenimiento(req, res) {
    try {
        const { id_proyecto } = req.params;
        const datos = req.body;
        
        const resultado = await MantenimientoModel.actualizar(id_proyecto, datos);
        
        if (!resultado) {
            return res.status(404).json({
                success: false,
                error: 'Mantenimiento no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al actualizar mantenimiento:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar mantenimiento'
        });
    }
}

/**
 * Actualizar datos editables de proyecto externo
 */
async function actualizarProyectoExterno(req, res) {
    try {
        const { id_proyecto } = req.params;
        const datos = req.body;
        
        const resultado = await ProyectosExternosModel.actualizar(id_proyecto, datos);
        
        if (!resultado) {
            return res.status(404).json({
                success: false,
                error: 'Proyecto externo no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al actualizar proyecto externo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar proyecto externo'
        });
    }
}

/**
 * Actualizar datos editables de proyecto
 */
async function actualizarProyecto(req, res) {
    try {
        const { id_proyecto } = req.params;
        const datos = req.body;
        
        const resultado = await ProyectosExternosModel.actualizar(id_proyecto, datos);
        
        if (!resultado) {
            return res.status(404).json({
                success: false,
                error: 'Proyecto no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al actualizar proyecto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar proyecto'
        });
    }
}

// Funciones para accionables (mantener compatibilidad con código antiguo)
async function actualizarAccionables(req, res) {
    try {
        const { id_proyecto } = req.params;
        const { accionables, fecha_accionable, asignado_accionable } = req.body;
        
        const datosActualizar = {};
        if ('accionables' in req.body) {
            datosActualizar.accionables = accionables || null;
        }
        if ('fecha_accionable' in req.body) {
            datosActualizar.fecha_accionable = fecha_accionable || null;
        }
        if ('asignado_accionable' in req.body) {
            datosActualizar.asignado_accionable = asignado_accionable || null;
        }
        
        const resultado = await ProyectosExternosModel.actualizar(id_proyecto, datosActualizar);
        
        if (!resultado) {
            return res.status(404).json({
                success: false,
                error: 'Proyecto no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al actualizar accionables:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Obtener todos los accionables de un proyecto
async function obtenerAccionablesProyecto(req, res) {
    try {
        const { id_proyecto } = req.params;
        const accionables = await AccionablesProyectoModel.obtenerPorProyecto(id_proyecto);
        
        res.json({
            success: true,
            data: accionables
        });
    } catch (error) {
        console.error('Error al obtener accionables:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Crear un nuevo accionable
async function crearAccionable(req, res) {
    try {
        const { id_proyecto } = req.params;
        const { fecha_accionable, asignado_accionable, accionable, estado } = req.body;
        
        const nuevoAccionable = await AccionablesProyectoModel.crear(id_proyecto, {
            fecha_accionable: fecha_accionable || null,
            asignado_accionable: asignado_accionable || null,
            accionable: accionable || null,
            estado: estado || null
        });
        
        res.json({
            success: true,
            data: nuevoAccionable
        });
    } catch (error) {
        console.error('Error al crear accionable:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Actualizar un accionable
async function actualizarAccionable(req, res) {
    try {
        const { id } = req.params;
        const { fecha_accionable, asignado_accionable, accionable, estado } = req.body;
        
        const datosActualizar = {};
        if ('fecha_accionable' in req.body) {
            datosActualizar.fecha_accionable = fecha_accionable || null;
        }
        if ('asignado_accionable' in req.body) {
            datosActualizar.asignado_accionable = asignado_accionable || null;
        }
        if ('accionable' in req.body) {
            datosActualizar.accionable = accionable || null;
        }
        if ('estado' in req.body) {
            datosActualizar.estado = estado || null;
        }
        
        const accionableActualizado = await AccionablesProyectoModel.actualizar(id, datosActualizar);
        
        if (!accionableActualizado) {
            return res.status(404).json({
                success: false,
                error: 'Accionable no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: accionableActualizado
        });
    } catch (error) {
        console.error('Error al actualizar accionable:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Eliminar un accionable
async function eliminarAccionable(req, res) {
    try {
        const { id } = req.params;
        const eliminado = await AccionablesProyectoModel.eliminar(id);
        
        if (!eliminado) {
            return res.status(404).json({
                success: false,
                error: 'Accionable no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Accionable eliminado correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar accionable:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Obtener sugerencias de búsqueda para mantenimiento
 */
async function obtenerSugerenciasMantenimiento(req, res) {
    try {
        const query = req.query.q || '';
        
        if (!query || query.length < 2) {
            return res.json({
                success: true,
                sugerencias: []
            });
        }
        
        const filtros = {
            producto: req.query.producto || null,
            equipo: req.query.equipo || null,
            busqueda: query
        };
        
        const mantenimientos = await MantenimientoModel.obtenerTodos(filtros);
        
        // Limitar a 8 sugerencias
        const sugerencias = mantenimientos.slice(0, 8).map(item => ({
            id_proyecto: item.id_proyecto,
            nombre_proyecto: item.nombre_proyecto || 'Sin nombre',
            cliente: item.cliente || '',
            producto: item.producto || ''
        }));
        
        res.json({
            success: true,
            sugerencias
        });
    } catch (error) {
        console.error('Error al obtener sugerencias de mantenimiento:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener sugerencias'
        });
    }
}

/**
 * Obtener sugerencias de búsqueda para proyectos
 */
async function obtenerSugerenciasProyectos(req, res) {
    try {
        const query = req.query.q || '';
        
        if (!query || query.length < 2) {
            return res.json({
                success: true,
                sugerencias: []
            });
        }
        
        const filtros = {
            producto: req.query.producto || null,
            equipo: req.query.equipo || null,
            busqueda: query
        };
        
        const proyectos = await ProyectosExternosModel.obtenerTodos(filtros);
        
        // Limitar a 8 sugerencias
        const sugerencias = proyectos.slice(0, 8).map(item => ({
            id_proyecto: item.id_proyecto,
            nombre_proyecto: item.nombre_proyecto || 'Sin nombre',
            cliente: item.cliente || '',
            producto: item.producto || ''
        }));
        
        res.json({
            success: true,
            sugerencias
        });
    } catch (error) {
        console.error('Error al obtener sugerencias de proyectos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener sugerencias'
        });
    }
}

/**
 * Sincronizar epics de un proyecto
 */
async function sincronizarEpics(req, res) {
    try {
        const { id_proyecto, codigo_proyecto } = req.body;
        
        if (!id_proyecto || !codigo_proyecto) {
            return res.status(400).json({
                success: false,
                error: 'ID de proyecto y código son requeridos'
            });
        }
        
        // Verificar si el proyecto es un proyecto padre (tiene subproyectos)
        const subproyectos = await ProyectosExternosModel.obtenerSubproyectos([id_proyecto]);
        const esProyectoPadre = subproyectos && subproyectos.length > 0;
        
        // Si es proyecto padre, no sincronizar epics
        if (esProyectoPadre) {
            return res.status(400).json({
                success: false,
                error: 'Los proyectos padre no pueden sincronizar epics. Solo los subproyectos pueden tener epics.'
            });
        }
        
        // Obtener epics de Redmine
        const epics = await obtenerEpics(codigo_proyecto);
        
        // Mapear epics
        const epicsMapeados = epics.map(mapearEpic);
        
        // Guardar en base de datos
        const resultado = await EpicsProyectoModel.guardarEpics(id_proyecto, epicsMapeados);
        
        // Obtener totales actualizados
        const totales = await EpicsProyectoModel.obtenerTotalesPorProyecto(id_proyecto);
        
        // Actualizar fechas del proyecto si hay epics (sin actualizar updated_at)
        if (totales.total_epics > 0) {
            await ProyectosExternosModel.actualizar(id_proyecto, {
                fecha_inicio: totales.fecha_inicio_minima,
                fecha_fin: totales.fecha_fin_maxima
            }, false); // false = no actualizar updated_at
        }
        
        res.json({
            success: true,
            data: {
                insertados: resultado.insertados,
                actualizados: resultado.actualizados,
                total: resultado.total,
                horas_estimadas: totales.horas_estimadas,
                horas_realizadas: totales.horas_realizadas,
                fecha_inicio: totales.fecha_inicio_minima,
                fecha_fin: totales.fecha_fin_maxima
            }
        });
    } catch (error) {
        console.error('Error al sincronizar epics:', error);
        res.status(500).json({
            success: false,
            error: 'Error al sincronizar epics: ' + error.message
        });
    }
}

/**
 * Obtener epics de un proyecto desde la base de datos
 */
async function obtenerEpicsProyecto(req, res) {
    try {
        const id_proyecto = parseInt(req.params.id_proyecto);
        
        if (!id_proyecto) {
            return res.status(400).json({
                success: false,
                error: 'ID de proyecto es requerido'
            });
        }
        
        // Verificar si el proyecto es un proyecto padre (tiene subproyectos)
        const subproyectos = await ProyectosExternosModel.obtenerSubproyectos([id_proyecto]);
        const esProyectoPadre = subproyectos && subproyectos.length > 0;
        
        // Si es proyecto padre, no buscar epics (solo mostrar subproyectos)
        if (esProyectoPadre) {
            return res.json({
                success: true,
                data: [],
                es_proyecto_padre: true
            });
        }
        
        const epics = await EpicsProyectoModel.obtenerPorProyecto(id_proyecto);
        
        res.json({
            success: true,
            data: epics,
            es_proyecto_padre: false
        });
    } catch (error) {
        console.error('Error al obtener epics:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener epics'
        });
    }
}

/**
 * Obtener métricas del dashboard
 */
async function obtenerMetricasDashboard(req, res) {
    try {
        const metricas = await ProyectosExternosModel.obtenerMetricasDashboard();
        
        res.json({
            success: true,
            data: metricas
        });
    } catch (error) {
        console.error('Error al obtener métricas del dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener métricas del dashboard'
        });
    }
}

/**
 * Obtener subproyectos de un proyecto específico (carga lazy - optimizado)
 */
// Función obtenerSubproyectos eliminada - ahora los subproyectos se obtienen directamente en obtenerProyectos

/**
 * Actualizar datos editables de subproyecto
 */
async function actualizarSubproyecto(req, res) {
    try {
        const { id_subproyecto } = req.params;
        const datos = req.body;
        
        console.log('📝 actualizarSubproyecto - id_subproyecto:', id_subproyecto, 'datos:', datos);
        
        // Validar que id_subproyecto es un número
        const idSubproyectoNum = parseInt(id_subproyecto);
        if (isNaN(idSubproyectoNum)) {
            return res.status(400).json({
                success: false,
                error: 'ID de subproyecto inválido'
            });
        }
        
        const resultado = await SubproyectosModel.actualizar(idSubproyectoNum, datos);
        
        if (!resultado) {
            return res.status(404).json({
                success: false,
                error: 'Subproyecto no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al actualizar subproyecto:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al actualizar subproyecto'
        });
    }
}

/**
 * Renderizar página de proyectos internos
 */
async function proyectosInternos(req, res) {
    try {
        const producto = req.query.producto || null;
        
        // Obtener productos con equipos
        const productosEquipos = await ProductosEquiposModel.obtenerTodos();
        
        res.render('pages/proyectos-internos', {
            title: 'Proyectos Internos',
            productosEquipos: productosEquipos,
            productoActual: producto,
            activeMenu: 'proyectos-internos',
            isAdmin: req.isAdmin || false
        });
    } catch (error) {
        console.error('Error en proyectosInternos:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            error: 'Error al cargar la página de proyectos internos'
        });
    }
}

/**
 * Obtener datos de proyectos internos
 * Usa la misma tabla que proyectos externos pero con filtro de categoría "Proyectos Internos"
 */
async function obtenerProyectosInternos(req, res) {
    try {
        const producto = req.query.producto || null;
        const filtros = {
            producto: producto,
            categoria: 'Proyectos Internos', // Filtro específico para proyectos internos
            busqueda: req.query.busqueda || null,
            orden: req.query.orden || 'nombre_proyecto',
            direccion: req.query.direccion || 'asc'
        };
        
        // Usar ProyectosExternosModel con filtro de categoría
        const proyectos = await ProyectosExternosModel.obtenerTodos(filtros);
        
        // Obtener epics secundarios para detectar si tiene subproyectos (igual que en obtenerProyectos)
        const ids_proyectos = proyectos.map(p => p.id_proyecto);
        const epicsSecundarios = await EpicsProyectoModel.obtenerEpicsSecundariosPorProyectos(ids_proyectos);
        
        // Marcar si tiene subproyectos (carga lazy)
        const proyectosConInfoSubproyectos = proyectos.map(proyecto => {
            const epicsDelProyecto = epicsSecundarios[proyecto.id_proyecto] || [];
            // Agrupar epics por proyecto_padre para contar subproyectos únicos
            const proyectosSecundariosUnicos = {};
            epicsDelProyecto.forEach(epic => {
                const proyectoPadre = epic.proyecto_padre;
                if (proyectoPadre && !proyectosSecundariosUnicos[proyectoPadre]) {
                    proyectosSecundariosUnicos[proyectoPadre] = true;
                }
            });
            const tieneSubproyectos = Object.keys(proyectosSecundariosUnicos).length > 0;
            
            return {
                ...proyecto,
                tiene_subproyectos: tieneSubproyectos,
                subproyectos: [] // No cargar todavía, se cargarán bajo demanda
            };
        });
        
        res.json({
            success: true,
            data: proyectosConInfoSubproyectos
        });
    } catch (error) {
        console.error('Error al obtener proyectos internos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener datos de proyectos internos'
        });
    }
}

/**
 * Actualizar datos editables de proyecto interno
 */
async function actualizarProyectoInterno(req, res) {
    try {
        const { id_proyecto } = req.params;
        const datos = req.body;
        
        const idProyectoNum = parseInt(id_proyecto);
        if (isNaN(idProyectoNum)) {
            return res.status(400).json({
                success: false,
                error: 'ID de proyecto inválido'
            });
        }
        
        // Usar ProyectosExternosModel (misma tabla que proyectos)
        const resultado = await ProyectosExternosModel.actualizar(idProyectoNum, datos);
        
        if (!resultado) {
            return res.status(404).json({
                success: false,
                error: 'Proyecto interno no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al actualizar proyecto interno:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al actualizar proyecto interno'
        });
    }
}

/**
 * Obtener sugerencias de búsqueda para proyectos internos
 * Usa la misma tabla que proyectos externos pero con filtro de categoría "Proyectos Internos"
 */
async function obtenerSugerenciasProyectosInternos(req, res) {
    try {
        const query = req.query.q || '';
        
        if (!query || query.length < 2) {
            return res.json({
                success: true,
                sugerencias: []
            });
        }
        
        const filtros = {
            categoria: 'Proyectos Internos', // Filtro específico para proyectos internos
            busqueda: query
        };
        
        // Usar ProyectosExternosModel con filtro de categoría
        const proyectos = await ProyectosExternosModel.obtenerTodos(filtros);
        
        const sugerencias = proyectos.slice(0, 10).map(proyecto => ({
            nombre_proyecto: proyecto.nombre_proyecto,
            cliente: proyecto.cliente,
            producto: proyecto.producto
        }));
        
        res.json({
            success: true,
            sugerencias: sugerencias
        });
    } catch (error) {
        console.error('Error al obtener sugerencias de proyectos internos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener sugerencias'
        });
    }
}

module.exports = {
    index,
    obtenerMantenimiento,
    obtenerProyectos,
    obtenerProyectoPorId,
    obtenerEpics: obtenerEpicsProyecto,
    actualizarMantenimiento,
    actualizarProyecto,
    actualizarAccionables,
    actualizarSubproyecto,
    obtenerSugerenciasMantenimiento,
    obtenerSugerenciasProyectos,
    sincronizarEpics,
    obtenerMetricasDashboard,
    proyectosInternos,
    obtenerProyectosInternos,
    actualizarProyectoInterno,
    obtenerSugerenciasProyectosInternos,
    obtenerAccionablesProyecto,
    crearAccionable,
    actualizarAccionable,
    eliminarAccionable
};

