-- Script de creación de tabla de sesiones para express-session
-- Usa connect-pg-simple para almacenar sesiones en PostgreSQL

-- La tabla se crea automáticamente por connect-pg-simple si createTableIfMissing: true
-- Este script es solo para referencia o creación manual si es necesario

CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    CONSTRAINT session_pkey PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);

