-- Script para permitir que un equipo tenga el mismo id_equipo_redmine en múltiples productos
-- Elimina la restricción única en id_equipo_redmine y crea una restricción única compuesta

-- Eliminar la restricción única existente en id_equipo_redmine
ALTER TABLE productos_equipos 
DROP CONSTRAINT IF EXISTS unique_id_equipo_redmine;

-- Crear una restricción única compuesta que permita:
-- - El mismo id_equipo_redmine en diferentes productos
-- - Pero evite duplicados exactos de (producto, id_equipo_redmine)
-- Esto permite que un equipo esté en varios productos con el mismo ID de Redmine
ALTER TABLE productos_equipos 
ADD CONSTRAINT unique_producto_id_equipo_redmine 
UNIQUE (producto, id_equipo_redmine);

