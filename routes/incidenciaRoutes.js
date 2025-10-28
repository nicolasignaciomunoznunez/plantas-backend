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
    // ✅ NUEVOS MÉTODOS
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

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// ==================== RUTAS ESPECÍFICAS ====================
router.get("/:id/reporte-pdf", 
    filtrarPlantasPorRol(), // ✅ Verifica acceso a la incidencia
    generarReportePDF
);

router.get("/:id/completa", 
    filtrarPlantasPorRol(), // ✅ Verifica acceso
    obtenerIncidenciaCompleta
);

router.post("/:id/fotos", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    uploadMultiple, 
    subirFotos
);

router.delete("/:id/fotos/:fotoId", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    eliminarFoto
);

router.post("/:id/materiales", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    agregarMateriales
);

router.delete("/:id/materiales/:materialId", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    eliminarMaterial
);

router.put("/:id/completar", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    completarIncidencia
);

// ==================== RUTAS CON PARÁMETROS ====================
router.get("/planta/:plantId", 
    filtrarPlantasPorRol(), // ✅ Filtra por plantas del usuario
    obtenerIncidenciasPlanta
);

router.get("/estado/:estado", 
    filtrarPlantasPorRol(), // ✅ Filtra por plantas del usuario
    obtenerIncidenciasEstado
);

// ==================== RUTAS GENERALES ====================
router.get("/:id", 
    filtrarPlantasPorRol(), // ✅ Verifica acceso
    obtenerIncidencia
);

router.put("/:id", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    actualizarIncidencia
);

router.patch("/:id/estado", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    cambiarEstadoIncidencia
);

router.delete("/:id", 
    verificarRol(['admin']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    eliminarIncidencia
);

// ==================== RUTAS SIN PARÁMETROS ====================
router.post("/", 
    filtrarPlantasPorRol(), // ✅ Para validar la plantaId del body
    crearIncidencia
);

router.get("/", 
    filtrarPlantasPorRol(), // ✅ Filtra incidencias por plantas del usuario
    obtenerIncidencias
);

router.get("/resumen/dashboard", 
    filtrarPlantasPorRol(), // ✅ Filtra resumen por plantas del usuario
    obtenerIncidenciasResumen
);

export default router;