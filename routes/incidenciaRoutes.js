import express from "express";
import {
    crearIncidencia,
    obtenerIncidencia,
    obtenerIncidencias,
    obtenerIncidenciasPlanta,
    obtenerIncidenciasEstado,
    actualizarIncidencia,
    cambiarEstadoIncidencia,
    eliminarIncidencia,
    obtenerIncidenciasResumen,
    subirFotos,
    agregarMateriales,
    completarIncidencia,
    generarReportePDF,
    obtenerIncidenciaCompleta,
    eliminarFoto,
    eliminarMaterial
} from "../controllers/incidenciaController.js";
import { verificarToken, verificarRol } from "../middlewares/verificarToken.js";
import { filtrarPlantasPorRol } from "../middlewares/verificarPlantaRol.js";
import { 
    uploadCorsMiddleware, 
    uploadMultiple, 
    handleMulterError,
    preflightMiddleware 
} from "../middlewares/corsUpload.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// ==================== RUTAS DE SUBIDA DE FOTOS - ORDEN CRÍTICO ====================
// OPTIONS para preflight de fotos
router.options("/:id/fotos", uploadCorsMiddleware);

// POST para subir fotos - ESTE ORDEN ES ESENCIAL
router.post("/:id/fotos", 
    uploadCorsMiddleware,           // 1. CORS PRIMERO (configura headers)
    verificarRol(['admin', 'tecnico']), // 2. Verificar permisos
    filtrarPlantasPorRol(),         // 3. Verificar acceso a planta
    (req, res, next) => {           // 4. Multer como función middleware
        console.log('📤 [MULTER] Procesando archivos...');
        uploadMultiple(req, res, (err) => {
            if (err) {
                console.log('❌ [MULTER] Error:', err.message);
                return handleMulterError(err, req, res, next);
            }
            console.log(`✅ [MULTER] Archivos procesados: ${req.files?.length || 0}`);
            next();
        });
    },
    subirFotos                      // 5. Controlador final
);

// ==================== RUTAS DE REPORTE PDF ====================
router.get("/:id/reporte-pdf", 
    filtrarPlantasPorRol(),
    generarReportePDF
);

router.get("/:id/completa", 
    filtrarPlantasPorRol(),
    obtenerIncidenciaCompleta
);

// ==================== RUTAS DE MATERIALES ====================
router.post("/:id/materiales", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(),
    agregarMateriales
);

router.delete("/:id/materiales/:materialId", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(),
    eliminarMaterial
);

// ==================== RUTAS DE COMPLETAR INCIDENCIA ====================
router.put("/:id/completar", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(),
    completarIncidencia
);

// ==================== RUTAS DE ELIMINAR FOTOS ====================
router.delete("/:id/fotos/:fotoId", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(),
    eliminarFoto
);

// ==================== RUTAS CON PARÁMETROS ====================
router.get("/planta/:plantId", 
    filtrarPlantasPorRol(),
    obtenerIncidenciasPlanta
);

router.get("/estado/:estado", 
    filtrarPlantasPorRol(),
    obtenerIncidenciasEstado
);

// ==================== RUTAS GENERALES ====================
router.get("/:id", 
    filtrarPlantasPorRol(),
    obtenerIncidencia
);

router.put("/:id", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(),
    actualizarIncidencia
);

router.patch("/:id/estado", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(),
    cambiarEstadoIncidencia
);

router.delete("/:id", 
    verificarRol(['admin']), 
    filtrarPlantasPorRol(),
    eliminarIncidencia
);

// ==================== RUTAS SIN PARÁMETROS ====================
router.post("/", 
    filtrarPlantasPorRol(),
    crearIncidencia
);

router.get("/", 
    filtrarPlantasPorRol(),
    obtenerIncidencias
);

router.get("/resumen/dashboard", 
    filtrarPlantasPorRol(),
    obtenerIncidenciasResumen
);

// ==================== RUTAS DE PRUEBA Y DIAGNÓSTICO ====================
router.get("/test/cors", uploadCorsMiddleware, (req, res) => {
    res.json({
        success: true,
        message: "CORS test successful",
        timestamp: new Date().toISOString(),
        origin: req.headers.origin,
        headers: {
            'access-control-allow-origin': res.get('Access-Control-Allow-Origin'),
            'access-control-allow-credentials': res.get('Access-Control-Allow-Credentials')
        }
    });
});

// Ruta para probar multer sin autenticación estricta
router.post("/test/upload", 
    uploadCorsMiddleware,
    (req, res, next) => {
        console.log('📤 [TEST MULTER] Procesando archivos de prueba...');
        uploadMultiple(req, res, (err) => {
            if (err) {
                console.log('❌ [TEST MULTER] Error:', err.message);
                return res.status(400).json({
                    success: false,
                    message: `Error en test: ${err.message}`
                });
            }
            console.log(`✅ [TEST MULTER] Archivos recibidos: ${req.files?.length || 0}`);
            res.json({
                success: true,
                message: "Upload test successful",
                files: req.files?.map(f => ({
                    name: f.originalname,
                    size: f.size,
                    mimetype: f.mimetype
                })) || []
            });
        });
    }
);

// Ruta OPTIONS general para todas las demás rutas
router.options("*", (req, res) => {
    console.log('🛫 [GLOBAL OPTIONS] Preflight para:', req.path);
    
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
});

// Manejador de errores específico para multer
router.use(handleMulterError);

export default router;