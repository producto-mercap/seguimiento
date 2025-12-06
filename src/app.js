// Cargar variables de entorno
require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();

// Configuración de vistas (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Deshabilitar cache de vistas en desarrollo
if (process.env.NODE_ENV !== 'production') {
    app.set('view cache', false);
}

// Middleware para archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para parsear JSON y form data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de autenticación JWT
const { requireAuthJWT } = require('./middleware/authJWT');
const requireAuth = requireAuthJWT;

// Rutas
const indexRoutes = require('./routes/indexRoutes');
const apiRoutes = require('./routes/apiRoutes');
const authRoutes = require('./routes/authRoutes');

// Rutas públicas
app.use('/login', authRoutes);

// Rutas protegidas
app.use('/', requireAuth, indexRoutes);
app.use('/api', requireAuth, apiRoutes);

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('pages/404', {
        title: '404 - Página no encontrada'
    });
});

// Manejo de errores del servidor
app.use((err, req, res, next) => {
    console.error('Error del servidor:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Ha ocurrido un error'
    });
});

// Iniciar servidor solo en desarrollo (Vercel maneja producción)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
        console.log(`📁 Entorno: ${process.env.NODE_ENV || 'development'}`);
        console.log(`ℹ️  La sincronización con Redmine debe hacerse manualmente desde la UI`);
    });
}

// Exportar app para Vercel (serverless)
module.exports = app;

