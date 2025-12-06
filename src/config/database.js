const { Pool } = require('pg');

// Agregar search_path a la URL de conexión si no está presente
let connectionString = process.env.DATABASE_URL;
if (connectionString && !connectionString.includes('search_path=')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString = `${connectionString}${separator}search_path=public`;
}

// Configuración del pool de conexiones para PostgreSQL/Neon
const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Manejo de errores del pool
pool.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
});

// Función helper para ejecutar queries con manejo de errores
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === 'development') {
            console.log('📊 Query ejecutada', { duration, rows: res.rowCount });
        }
        return res;
    } catch (error) {
        console.error('❌ Error en query:', error);
        throw error;
    }
};

// Función helper para transacciones
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Graceful shutdown
const shutdown = async () => {
    console.log('🔄 Cerrando pool de conexiones...');
    await pool.end();
    console.log('✅ Pool cerrado correctamente');
};

process.on('SIGINT', async () => {
    await shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await shutdown();
    process.exit(0);
});

module.exports = {
    pool,
    query,
    transaction
};

