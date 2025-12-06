-- Script de creación de vistas para Seguimiento de Proyectos
-- Las vistas unen datos de Redmine con datos editables

-- ============================================
-- VISTA: v_mantenimiento_completo
-- ============================================
CREATE OR REPLACE VIEW v_mantenimiento_completo AS
SELECT 
    r.id_proyecto,
    r.nombre_proyecto,
    r.codigo_proyecto,
    r.proyecto_padre,
    r.estado_redmine,
    r.producto,
    r.cliente,
    r.linea_servicio,
    r.categoria,
    r.equipo,
    r.reventa,
    r.proyecto_sponsor,
    r.fecha_creacion,
    r.sincronizado_en,
    m.id AS mantenimiento_id,
    m.estado,
    m.demanda,
    m.estabilidad,
    m.satisfaccion,
    m.win,
    m.created_at AS mantenimiento_created_at,
    m.updated_at AS mantenimiento_updated_at
FROM redmine_mantenimiento r
LEFT JOIN mantenimiento m ON r.id_proyecto = m.id_proyecto;

-- ============================================
-- VISTA: v_proyectos_externos_completo
-- ============================================
CREATE OR REPLACE VIEW v_proyectos_externos_completo AS
SELECT 
    r.id_proyecto,
    r.nombre_proyecto,
    r.codigo_proyecto,
    r.proyecto_padre,
    r.estado_redmine,
    r.producto,
    r.cliente,
    r.linea_servicio,
    r.categoria,
    r.equipo,
    r.reventa,
    r.proyecto_sponsor,
    r.fecha_creacion,
    r.sincronizado_en,
    p.id AS proyecto_externo_id,
    p.estado,
    p.overall,
    p.alcance,
    p.costo,
    p.plazos,
    p.avance,
    p.fecha_inicio,
    p.fecha_fin,
    p.win,
    p.riesgos,
    p.created_at AS proyecto_created_at,
    p.updated_at AS proyecto_updated_at
FROM redmine_proyectos_externos r
LEFT JOIN proyectos_externos p ON r.id_proyecto = p.id_proyecto;

-- ============================================
-- VISTA: v_proyectos_internos_completo
-- ============================================
CREATE OR REPLACE VIEW v_proyectos_internos_completo AS
SELECT 
    r.id_proyecto,
    r.nombre_proyecto,
    r.codigo_proyecto,
    r.proyecto_padre,
    r.estado_redmine,
    r.producto,
    r.cliente,
    r.linea_servicio,
    r.categoria,
    r.equipo,
    r.reventa,
    r.proyecto_sponsor,
    r.fecha_creacion,
    r.sincronizado_en,
    p.id AS proyecto_interno_id,
    p.estado,
    p.overall,
    p.alcance,
    p.costo,
    p.plazos,
    p.avance,
    p.fecha_inicio,
    p.fecha_fin,
    p.win,
    p.riesgos,
    p.created_at AS proyecto_created_at,
    p.updated_at AS proyecto_updated_at
FROM redmine_proyectos_internos r
LEFT JOIN proyectos_internos p ON r.id_proyecto = p.id_proyecto;

