-- Migración: Convertir equipo_solicitante y equipo_responsable a arrays JSONB (labels)
-- Permite asignar múltiples equipos como solicitantes o responsables

-- Paso 1: Agregar nuevas columnas temporales como JSONB
ALTER TABLE pedidos_equipos 
ADD COLUMN IF NOT EXISTS equipos_solicitantes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS equipos_responsables JSONB DEFAULT '[]'::jsonb;

-- Paso 2: Migrar datos existentes (convertir strings a arrays JSON)
UPDATE pedidos_equipos
SET 
    equipos_solicitantes = CASE 
        WHEN equipo_solicitante IS NOT NULL AND equipo_solicitante != '' 
        THEN jsonb_build_array(equipo_solicitante)
        ELSE '[]'::jsonb
    END,
    equipos_responsables = CASE 
        WHEN equipo_responsable IS NOT NULL AND equipo_responsable != '' 
        THEN jsonb_build_array(equipo_responsable)
        ELSE '[]'::jsonb
    END;

-- Paso 3: Renombrar las nuevas columnas a los nombres originales para mantener compatibilidad
ALTER TABLE pedidos_equipos RENAME COLUMN equipos_solicitantes TO equipo_solicitante;
ALTER TABLE pedidos_equipos RENAME COLUMN equipos_responsables TO equipo_responsable;

-- Paso 4: Eliminar columnas antiguas (si aún existen con el nombre antiguo)
-- Esto ya se hizo en el paso 3, pero por si acaso:
-- ALTER TABLE pedidos_equipos DROP COLUMN IF EXISTS equipo_solicitante;
-- ALTER TABLE pedidos_equipos DROP COLUMN IF EXISTS equipo_responsable;

-- Crear índices GIN para búsquedas eficientes en arrays JSONB
CREATE INDEX IF NOT EXISTS idx_pedidos_equipos_solicitantes ON pedidos_equipos USING GIN (equipo_solicitante);
CREATE INDEX IF NOT EXISTS idx_pedidos_equipos_responsables ON pedidos_equipos USING GIN (equipo_responsable);

