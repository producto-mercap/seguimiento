-- Script de creación de tablas para Seguimiento de Proyectos
-- Base de datos: PostgreSQL (Neon)

-- ============================================
-- TABLAS DE REDMINE (Datos no editables)
-- ============================================

-- Tabla: redmine_mantenimiento
-- Almacena datos sincronizados desde Redmine para mantenimiento
CREATE TABLE IF NOT EXISTS redmine_mantenimiento (
    id_proyecto INTEGER PRIMARY KEY,
    nombre_proyecto VARCHAR(500) NOT NULL,
    codigo_proyecto VARCHAR(255),
    proyecto_padre VARCHAR(500),
    estado_redmine INTEGER,
    producto VARCHAR(255),
    cliente VARCHAR(255),
    linea_servicio VARCHAR(255),
    categoria VARCHAR(255),
    equipo VARCHAR(255),
    reventa VARCHAR(10),
    proyecto_sponsor VARCHAR(255),
    fecha_creacion TIMESTAMP,
    sincronizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_redmine_mantenimiento UNIQUE (id_proyecto)
);

-- Tabla: redmine_proyectos_externos
-- Almacena datos sincronizados desde Redmine para proyectos externos
CREATE TABLE IF NOT EXISTS redmine_proyectos_externos (
    id_proyecto INTEGER PRIMARY KEY,
    nombre_proyecto VARCHAR(500) NOT NULL,
    codigo_proyecto VARCHAR(255),
    proyecto_padre VARCHAR(500),
    estado_redmine INTEGER,
    producto VARCHAR(255),
    cliente VARCHAR(255),
    linea_servicio VARCHAR(255),
    categoria VARCHAR(255),
    equipo VARCHAR(255),
    reventa VARCHAR(10),
    proyecto_sponsor VARCHAR(255),
    fecha_creacion TIMESTAMP,
    sincronizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_redmine_proyectos_externos UNIQUE (id_proyecto)
);

-- Tabla: redmine_proyectos_internos
-- Almacena datos sincronizados desde Redmine para proyectos internos
CREATE TABLE IF NOT EXISTS redmine_proyectos_internos (
    id_proyecto INTEGER PRIMARY KEY,
    nombre_proyecto VARCHAR(500) NOT NULL,
    codigo_proyecto VARCHAR(255),
    proyecto_padre VARCHAR(500),
    estado_redmine INTEGER,
    producto VARCHAR(255),
    cliente VARCHAR(255),
    linea_servicio VARCHAR(255),
    categoria VARCHAR(255),
    equipo VARCHAR(255),
    reventa VARCHAR(10),
    proyecto_sponsor VARCHAR(255),
    fecha_creacion TIMESTAMP,
    sincronizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_redmine_proyectos_internos UNIQUE (id_proyecto)
);

-- ============================================
-- TABLAS EDITABLES (Datos editables por usuario)
-- ============================================

-- Tabla: mantenimiento
-- Almacena datos editables para mantenimiento
CREATE TABLE IF NOT EXISTS mantenimiento (
    id SERIAL PRIMARY KEY,
    id_proyecto INTEGER NOT NULL,
    estado VARCHAR(50),
    demanda TEXT,
    estabilidad VARCHAR(50),
    satisfaccion VARCHAR(50),
    win TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mantenimiento_redmine FOREIGN KEY (id_proyecto) REFERENCES redmine_mantenimiento(id_proyecto) ON DELETE CASCADE,
    CONSTRAINT unique_mantenimiento_proyecto UNIQUE (id_proyecto)
);

-- Tabla: proyectos_externos
-- Almacena datos editables para proyectos externos
CREATE TABLE IF NOT EXISTS proyectos_externos (
    id SERIAL PRIMARY KEY,
    id_proyecto INTEGER NOT NULL,
    estado VARCHAR(50),
    overall VARCHAR(50),
    alcance TEXT,
    costo DECIMAL(15, 2),
    plazos VARCHAR(50),
    avance VARCHAR(50),
    fecha_inicio DATE,
    fecha_fin DATE,
    win TEXT,
    riesgos TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_proyectos_externos_redmine FOREIGN KEY (id_proyecto) REFERENCES redmine_proyectos_externos(id_proyecto) ON DELETE CASCADE,
    CONSTRAINT unique_proyectos_externos_proyecto UNIQUE (id_proyecto)
);

-- Tabla: proyectos_internos
-- Almacena datos editables para proyectos internos
CREATE TABLE IF NOT EXISTS proyectos_internos (
    id SERIAL PRIMARY KEY,
    id_proyecto INTEGER NOT NULL,
    estado VARCHAR(50),
    overall VARCHAR(50),
    alcance TEXT,
    costo DECIMAL(15, 2),
    plazos VARCHAR(50),
    avance VARCHAR(50),
    fecha_inicio DATE,
    fecha_fin DATE,
    win TEXT,
    riesgos TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_proyectos_internos_redmine FOREIGN KEY (id_proyecto) REFERENCES redmine_proyectos_internos(id_proyecto) ON DELETE CASCADE,
    CONSTRAINT unique_proyectos_internos_proyecto UNIQUE (id_proyecto)
);

-- ============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_redmine_mantenimiento_producto ON redmine_mantenimiento(producto);
CREATE INDEX IF NOT EXISTS idx_redmine_mantenimiento_cliente ON redmine_mantenimiento(cliente);
CREATE INDEX IF NOT EXISTS idx_redmine_mantenimiento_equipo ON redmine_mantenimiento(equipo);

CREATE INDEX IF NOT EXISTS idx_redmine_proyectos_externos_producto ON redmine_proyectos_externos(producto);
CREATE INDEX IF NOT EXISTS idx_redmine_proyectos_externos_cliente ON redmine_proyectos_externos(cliente);
CREATE INDEX IF NOT EXISTS idx_redmine_proyectos_externos_equipo ON redmine_proyectos_externos(equipo);

CREATE INDEX IF NOT EXISTS idx_redmine_proyectos_internos_producto ON redmine_proyectos_internos(producto);
CREATE INDEX IF NOT EXISTS idx_redmine_proyectos_internos_cliente ON redmine_proyectos_internos(cliente);
CREATE INDEX IF NOT EXISTS idx_redmine_proyectos_internos_equipo ON redmine_proyectos_internos(equipo);

