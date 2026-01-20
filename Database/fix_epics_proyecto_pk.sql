-- ============================================================
-- Script para agregar PRIMARY KEY a tablas con claves compuestas
-- Ejecutar este script en tu cliente de PostgreSQL
-- ============================================================

-- ============================================================
-- TABLA: epics_proyecto
-- Necesita PRIMARY KEY compuesta en (id_proyecto, epic_id)
-- ============================================================

-- Paso 1: Verificar si hay duplicados en (id_proyecto, epic_id)
-- Si hay duplicados, primero ejecutar esto:
/*
SELECT id_proyecto, epic_id, COUNT(*) as count
FROM epics_proyecto 
GROUP BY id_proyecto, epic_id 
HAVING COUNT(*) > 1;
*/

-- Paso 2: Eliminar duplicados (mantener el registro más reciente)
-- Solo ejecutar si hay duplicados:
/*
DELETE FROM epics_proyecto
WHERE ctid NOT IN (
    SELECT MAX(ctid)
    FROM epics_proyecto
    GROUP BY id_proyecto, epic_id
);
*/

-- Paso 3: Agregar PRIMARY KEY compuesta si no existe
DO $$
BEGIN
    -- Verificar si ya existe una PRIMARY KEY
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'epics_proyecto'::regclass 
        AND contype = 'p'
    ) THEN
        -- Agregar PRIMARY KEY compuesta
        ALTER TABLE epics_proyecto 
        ADD CONSTRAINT epics_proyecto_pkey 
        PRIMARY KEY (id_proyecto, epic_id);
        
        RAISE NOTICE 'PRIMARY KEY agregada a epics_proyecto(id_proyecto, epic_id)';
    ELSE
        -- Verificar si la PRIMARY KEY existente es la correcta
        IF EXISTS (
            SELECT 1 
            FROM pg_constraint c
            JOIN pg_constraint_indexes ci ON c.oid = ci.constraint_oid
            WHERE c.conrelid = 'epics_proyecto'::regclass 
            AND c.contype = 'p'
            AND array_length(c.conkey, 1) = 2
            AND c.conkey[1] = (
                SELECT attnum FROM pg_attribute 
                WHERE attrelid = 'epics_proyecto'::regclass 
                AND attname = 'id_proyecto'
            )
            AND c.conkey[2] = (
                SELECT attnum FROM pg_attribute 
                WHERE attrelid = 'epics_proyecto'::regclass 
                AND attname = 'epic_id'
            )
        ) THEN
            RAISE NOTICE 'La tabla epics_proyecto ya tiene la PRIMARY KEY correcta';
        ELSE
            -- Si existe una PK diferente, eliminarla y crear la correcta
            ALTER TABLE epics_proyecto DROP CONSTRAINT epics_proyecto_pkey;
            ALTER TABLE epics_proyecto 
            ADD CONSTRAINT epics_proyecto_pkey 
            PRIMARY KEY (id_proyecto, epic_id);
            
            RAISE NOTICE 'PRIMARY KEY reemplazada en epics_proyecto(id_proyecto, epic_id)';
        END IF;
    END IF;
END $$;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- ============================================================
-- TABLA: subproyectos
-- Necesita PRIMARY KEY compuesta en (id_proyecto, proyecto_padre)
-- ============================================================

-- Paso 1: Verificar duplicados
/*
SELECT id_proyecto, proyecto_padre, COUNT(*) as count
FROM subproyectos 
GROUP BY id_proyecto, proyecto_padre 
HAVING COUNT(*) > 1;
*/

-- Paso 2: Eliminar duplicados si existen
/*
DELETE FROM subproyectos
WHERE ctid NOT IN (
    SELECT MAX(ctid)
    FROM subproyectos
    GROUP BY id_proyecto, proyecto_padre
);
*/

-- Paso 3: Agregar PRIMARY KEY compuesta
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'subproyectos'::regclass 
        AND contype = 'p'
    ) THEN
        ALTER TABLE subproyectos 
        ADD CONSTRAINT subproyectos_pkey 
        PRIMARY KEY (id_proyecto, proyecto_padre);
        
        RAISE NOTICE 'PRIMARY KEY agregada a subproyectos(id_proyecto, proyecto_padre)';
    ELSE
        RAISE NOTICE 'La tabla subproyectos ya tiene PRIMARY KEY';
    END IF;
END $$;

-- ============================================================
-- TABLA: mapeo_producto_proyecto_interno
-- Necesita PRIMARY KEY compuesta en (producto, codigo_proyecto_redmine)
-- ============================================================

-- Paso 1: Verificar duplicados
/*
SELECT producto, codigo_proyecto_redmine, COUNT(*) as count
FROM mapeo_producto_proyecto_interno 
GROUP BY producto, codigo_proyecto_redmine 
HAVING COUNT(*) > 1;
*/

-- Paso 2: Eliminar duplicados si existen
/*
DELETE FROM mapeo_producto_proyecto_interno
WHERE ctid NOT IN (
    SELECT MAX(ctid)
    FROM mapeo_producto_proyecto_interno
    GROUP BY producto, codigo_proyecto_redmine
);
*/

-- Paso 3: Agregar PRIMARY KEY compuesta (solo si la tabla existe)
DO $$
BEGIN
    -- Verificar si la tabla existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mapeo_producto_proyecto_interno'
    ) THEN
        -- Verificar si ya existe una PRIMARY KEY
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_constraint 
            WHERE conrelid = 'mapeo_producto_proyecto_interno'::regclass 
            AND contype = 'p'
        ) THEN
            ALTER TABLE mapeo_producto_proyecto_interno 
            ADD CONSTRAINT mapeo_producto_proyecto_interno_pkey 
            PRIMARY KEY (producto, codigo_proyecto_redmine);
            
            RAISE NOTICE 'PRIMARY KEY agregada a mapeo_producto_proyecto_interno(producto, codigo_proyecto_redmine)';
        ELSE
            RAISE NOTICE 'La tabla mapeo_producto_proyecto_interno ya tiene PRIMARY KEY';
        END IF;
    ELSE
        RAISE NOTICE 'La tabla mapeo_producto_proyecto_interno no existe, se omite';
    END IF;
END $$;

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================

-- Verificar que todas las PRIMARY KEYS se crearon correctamente
SELECT 
    t.table_name,
    c.constraint_name,
    c.constraint_type,
    string_agg(a.attname, ', ' ORDER BY a.attnum) AS columns
FROM information_schema.table_constraints c
JOIN information_schema.tables t 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
JOIN pg_constraint pc 
    ON pc.conname = c.constraint_name
JOIN pg_attribute a 
    ON a.attrelid = pc.conrelid 
    AND a.attnum = ANY(pc.conkey)
WHERE c.table_schema = 'public'
    AND c.constraint_type = 'PRIMARY KEY'
    AND t.table_name IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('epics_proyecto', 'subproyectos', 'mapeo_producto_proyecto_interno')
    )
GROUP BY t.table_name, c.constraint_name, c.constraint_type
ORDER BY t.table_name;
