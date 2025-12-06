const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'seguimiento-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h'; // 24 horas

/**
 * Generar token JWT para un usuario autenticado
 * @param {boolean} isAdmin - Si el usuario es administrador
 */
function generateToken(isAdmin = false) {
    return jwt.sign(
        { authenticated: true, isAdmin, timestamp: Date.now() },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verificar token JWT
 */
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { valid: true, data: decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

/**
 * Middleware de autenticación JWT
 * Verifica si el usuario tiene un token válido en las cookies
 */
function requireAuthJWT(req, res, next) {
    // Extraer token de las cookies
    const cookieHeader = req.headers.cookie || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    
    if (!token) {
        if (process.env.DEBUG_SESSIONS === 'true' || process.env.NODE_ENV === 'production') {
            console.log('❌ No hay token JWT - Redirigiendo a /login');
        }
        return res.redirect('/login');
    }
    
    // Verificar token
    const verification = verifyToken(token);
    
    if (!verification.valid) {
        if (process.env.DEBUG_SESSIONS === 'true' || process.env.NODE_ENV === 'production') {
            console.log('❌ Token JWT inválido:', verification.error);
        }
        // Limpiar cookie inválida
        res.clearCookie('auth_token');
        return res.redirect('/login');
    }
    
    // Token válido - continuar
    if (process.env.DEBUG_SESSIONS === 'true') {
        console.log('✅ Token JWT válido - Autenticado', verification.data.isAdmin ? '(Admin)' : '(Usuario)');
    }
    
    // Agregar información de autenticación al request
    req.authenticated = true;
    req.authData = verification.data;
    req.isAdmin = verification.data.isAdmin || false;
    
    next();
}

module.exports = {
    generateToken,
    verifyToken,
    requireAuthJWT
};

