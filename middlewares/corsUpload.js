export const uploadCorsMiddleware = (req, res, next) => {
    console.log('🔧 [UPLOAD CORS] Aplicando CORS para subida de archivos');
    console.log('🌐 Origen:', req.headers.origin);
    console.log('📤 Ruta:', req.path);
    console.log('🔧 Método:', req.method);
    
    // Lista de orígenes permitidos (ACTUALIZADA)
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
    
    // IMPORTANTE: Para requests con credenciales, NO usar '*'
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        console.log(`✅ [UPLOAD CORS] Origen permitido: ${origin}`);
    } else {
        // Si no está en la lista, aún así permitirlo (para desarrollo)
        res.header('Access-Control-Allow-Origin', origin || '*');
        console.log(`⚠️ [UPLOAD CORS] Origen: ${origin || 'sin-origen'}, permitiendo acceso`);
    }
    
    // CRÍTICO: Headers para uploads con archivos
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Auth-Token, Content-Disposition'
    );
    
    // IMPORTANTE: Exponer headers para que el frontend pueda leerlos
    res.header('Access-Control-Expose-Headers', 
        'Content-Disposition, Content-Length, X-Filename, X-Total-Files'
    );
    
    // Si es OPTIONS, responder inmediatamente
    if (req.method === 'OPTIONS') {
        console.log('🛫 [UPLOAD CORS] Preflight request, enviando 200 OK');
        return res.status(200).end();
    }
    
    next();
};

// MIDDLEWARE SIMPLIFICADO para preflight general
export const preflightMiddleware = (req, res, next) => {
    // SOLO aplicar a rutas específicas que necesitan OPTIONS
    if (req.method === 'OPTIONS') {
        console.log('🛫 [PREFLIGHT] Request OPTIONS para:', req.path);
        
        // Configuración básica
        const origin = req.headers.origin;
        const allowedOrigins = [
            'https://www.infraexpert.cl',
            'https://infraexpert.cl',
            'http://infraexpert.cl',
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:8080',
            'https://api.infraexpert.cl'
        ];
        
        if (origin && allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
        }
        
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        
        return res.status(200).end();
    }
    next();
};