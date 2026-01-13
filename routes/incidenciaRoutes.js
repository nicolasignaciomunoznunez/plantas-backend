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
import { 
    filtrarPlantasPorRol 
} from "../middlewares/verificarPlantaRol.js";
import { uploadMultiple } from "../middlewares/upload.js";
import { uploadCorsMiddleware, preflightMiddleware } from "../middlewares/corsUpload.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// ==================== MIDDLEWARE PARA PREFLIGHT REQUEST ====================
router.options("*", preflightMiddleware);

// ==================== RUTAS ESPECÍFICAS CON CORS ESPECIAL ====================

// ✅ RUTA DE SUBIDA DE FOTOS - CON CORS ESPECÍFICO
router.post("/:id/fotos", 
    uploadCorsMiddleware, // ✅ CORS para uploads
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(),
    uploadMultiple,
    subirFotos
);

// ✅ OPCIÓN ESPECÍFICA PARA PREFLIGHT DE FOTOS
router.options("/:id/fotos", uploadCorsMiddleware);

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

// ==================== RUTA DE PRUEBA DE CORS ====================
router.get("/test/cors", (req, res) => {
    res.json({
        success: true,
        message: "CORS test successful",
        headers: {
            origin: req.headers.origin,
            'access-control-allow-origin': res.get('Access-Control-Allow-Origin'),
            'access-control-allow-credentials': res.get('Access-Control-Allow-Credentials')
        }
    });
});

export default router;