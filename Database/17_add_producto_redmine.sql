-- Script para agregar columna producto_redmine a la tabla productos_equipos
-- Esta columna almacenará el nombre del producto tal como se usa en Redmine

-- Agregar columna producto_redmine
ALTER TABLE productos_equipos 
ADD COLUMN IF NOT EXISTS producto_redmine VARCHAR(255);

-- Actualizar valores existentes con mapeo por defecto
UPDATE productos_equipos 
SET producto_redmine = CASE 
    WHEN producto = 'Portfolio' THEN 'mp'
    WHEN producto = 'Order Management' THEN 'Order Management'
    WHEN producto = 'Portfolio Cloud' THEN 'portfolio cloud'
    WHEN producto = 'Trading Room' THEN 'Trading Room'
    WHEN producto = 'Abbaco' THEN 'Abbaco'
    WHEN producto = 'Unitrade' THEN 'Unitrade'
    WHEN producto = 'Pepper' THEN 'Pepper'
    ELSE producto
END
WHERE producto_redmine IS NULL;

-- Crear índice para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_productos_equipos_producto_redmine 
ON productos_equipos(producto_redmine);

