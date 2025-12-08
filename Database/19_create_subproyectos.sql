-- Crear tabla de subproyectos
CREATE TABLE IF NOT EXISTS subproyectos (
    id_subproyecto SERIAL PRIMARY KEY,
    id_proyecto INTEGER NOT NULL REFERENCES proyectos_externos(id_proyecto) ON DELETE CASCADE,
    proyecto_padre INTEGER NOT NULL, -- ID del proyecto padre en Redmine
    nombre VARCHAR(500) NOT NULL, -- nombre_proyecto_padre de los epics
    estado VARCHAR(50),
    overall VARCHAR(20),
    alcance VARCHAR(20),
    costo VARCHAR(20),
    plazos VARCHAR(20),
    riesgos VARCHAR(20),
    avance INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_proyecto, proyecto_padre)
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_subproyectos_id_proyecto ON subproyectos(id_proyecto);
CREATE INDEX IF NOT EXISTS idx_subproyectos_proyecto_padre ON subproyectos(proyecto_padre);

-- Comentarios
COMMENT ON TABLE subproyectos IS 'Subproyectos asociados a proyectos externos, basados en epics con proyecto_padre diferente';
COMMENT ON COLUMN subproyectos.id_proyecto IS 'ID del proyecto principal en proyectos_externos';
COMMENT ON COLUMN subproyectos.proyecto_padre IS 'ID del proyecto padre en Redmine (proyecto_padre de epics_proyecto)';
COMMENT ON COLUMN subproyectos.nombre IS 'Nombre del proyecto secundario (nombre_proyecto_padre de los epics)';

