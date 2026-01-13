// middlewares/corsUpload.js

// Middleware CORS específico para subida de archivos
export const uploadCorsMiddleware = (req, res, next) => {
    console.log('🔧 [UPLOAD CORS] Aplicando CORS para subida de archivos');
    console.log('🌐 Origen:', req.headers.origin);
    console.log('📤 Ruta:', req.path);
    console.log('🔧 Método:', req.method);
    
    // Lista de orígenes permitidos
    const allowedOrigins = [
        'https://www.infraexpert.cl',
        'https://infraexpert.cl',
        'http://infraexpert.cl',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'https://api.infraexpert.cl'
    ];
    
    const origin = req.headers.origin;
    
    // Configurar headers CORS
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        console.log(`✅ [UPLOAD CORS] Origen permitido: ${origin}`);
    } else if (!origin) {
        // Permitir requests sin origen (Postman, curl, etc.)
        res.header('Access-Control-Allow-Origin', '*');
        console.log('⚠️ [UPLOAD CORS] Request sin origen, permitiendo acceso');
    } else {
        res.header('Access-Control-Allow-Origin', '*');
        console.log(`⚠️ [UPLOAD CORS] Origen no reconocido: ${origin}, permitiendo acceso temporal`);
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Auth-Token, Content-Disposition');
    
    // Exponer headers adicionales si es necesario
    res.header('Access-Control-Expose-Headers', 'Content-Disposition');
    
    // Manejar preflight requests (OPTIONS)
    if (req.method === 'OPTIONS') {
        console.log('🛫 [UPLOAD CORS] Preflight request recibida, enviando 200 OK');
        return res.status(200).end();
    }
    
    next();
};

// Middleware para preflight requests generales
export const preflightMiddleware = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        console.log('🛫 [PREFLIGHT] Request OPTIONS para:', req.path);
        
        // Configurar headers CORS
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        
        return res.status(200).end();
    }
    next();
};

// Middleware ultra-permisivo temporal (solo para desarrollo)
export const corsDevMiddleware = (req, res, next) => {
    console.log('⚠️ [CORS DEV] Usando CORS ultra-permisivo');
    
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Access-Control-Allow-Headers', '*');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
};