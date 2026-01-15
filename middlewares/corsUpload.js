// corsUpload.js - VERSIÓN DEFINITIVA CORREGIDA
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuración de multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/incidencias/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, uniqueSuffix + '-' + safeFilename);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|webp|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido'));
    }
};

// Crear middleware de multer
export const uploadMultiple = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: fileFilter
}).array('fotos', 10); // 'fotos' es el nombre del campo, 10 archivos máximo

// MIDDLEWARE CORS CORREGIDO - SE EJECUTA ANTES DE MULTER
export const uploadCorsMiddleware = (req, res, next) => {
    console.log('🔧 [UPLOAD CORS FIXED] Iniciando middleware CORS para uploads');
    console.log(`🌐 Origen: ${req.headers.origin}`);
    console.log(`📤 Ruta: ${req.path}`);
    console.log(`🔧 Método: ${req.method}`);
    
    // Configurar CORS MANUALMENTE - CRÍTICO
    const allowedOrigins = [
        'https://www.infraexpert.cl',
        'https://infraexpert.cl',
        'http://infraexpert.cl',
        'http://localhost:3000',
        'http://localhost:5173',
        'https://api.infraexpert.cl'
    ];
    
    const origin = req.headers.origin;
    
    // IMPORTANTE: Usar setHeader() no header()
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        console.log(`✅ [UPLOAD CORS] Origen permitido: ${origin}`);
    } else if (origin) {
        console.log(`⚠️ [UPLOAD CORS] Origen no en lista pero permitiendo: ${origin}`);
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Auth-Token, Content-Disposition, x-auth-token'
    );
    
    // Exponer headers para el frontend
    res.setHeader('Access-Control-Expose-Headers', 
        'Content-Disposition, Content-Length, X-Filename'
    );
    
    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
        console.log('🛫 [UPLOAD CORS] Preflight request, enviando 200 OK');
        return res.status(200).end();
    }
    
    console.log('✅ [UPLOAD CORS] Headers CORS configurados, pasando a multer');
    next();
};

// Middleware para manejar errors de multer
export const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.log('❌ [UPLOAD ERROR] Error de Multer:', err.message);
        return res.status(400).json({
            success: false,
            message: `Error al subir archivo: ${err.message}`
        });
    } else if (err) {
        console.log('❌ [UPLOAD ERROR] Error general:', err.message);
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

// Middleware para preflight requests
export const preflightMiddleware = (req, res) => {
    console.log('🛫 [PREFLIGHT] Request OPTIONS para:', req.path);
    
    const allowedOrigins = [
        'https://www.infraexpert.cl',
        'https://infraexpert.cl',
        'http://infraexpert.cl',
        'http://localhost:3000',
        'http://localhost:5173',
        'https://api.infraexpert.cl'
    ];
    
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token');
    
    return res.status(200).end();
};