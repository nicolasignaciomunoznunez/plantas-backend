import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Crear directorios si no existen
const ensureDirExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// ✅ Configurar almacenamiento para fotos de incidencias
const storageIncidencias = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '../uploads/incidencias');
        ensureDirExists(uploadsDir);
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generar nombre único
        const uniqueName = `incidencia-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// ✅ Configurar almacenamiento para fotos de mantenimientos
const storageMantenimientos = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '../uploads/mantenimientos');
        ensureDirExists(uploadsDir);
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generar nombre único
        const uniqueName = `mantenimiento-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// ✅ Filtrar solo imágenes
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'));
    }
};

// ✅ Configurar Multer para incidencias
const uploadIncidencias = multer({
    storage: storageIncidencias,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
        files: 10 // Máximo 10 archivos
    },
    fileFilter: fileFilter
});

// ✅ Configurar Multer para mantenimientos
const uploadMantenimientos = multer({
    storage: storageMantenimientos,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
        files: 10 // Máximo 10 archivos
    },
    fileFilter: fileFilter
});

// ✅ Middlewares para incidencias
export const uploadIncidenciasMultiple = uploadIncidencias.array('fotos', 10);

// ✅ Middlewares para mantenimientos
export const uploadMantenimientosMultiple = uploadMantenimientos.array('fotos', 10);

// ✅ Middleware único para subida básica (backward compatibility)
export const uploadMultiple = uploadIncidencias.array('fotos', 10);

// ✅ Middleware para manejo de errores de Multer
export const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'El archivo es demasiado grande (máximo 10MB)'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Demasiados archivos (máximo 10)'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Campo de archivo inesperado'
            });
        }
    }
    
    if (error.message.includes('Solo se permiten imágenes')) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    
    next(error);
};

// ✅ Exportar configuraciones específicas
export { 
    uploadIncidencias, 
    uploadMantenimientos 
};