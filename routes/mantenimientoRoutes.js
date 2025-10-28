import express from "express";
import {
    crearMantenimiento,
    obtenerMantenimiento,
    obtenerMantenimientos,
    obtenerMantenimientosPlanta,
    obtenerMantenimientosTecnico,
    actualizarMantenimiento,
    cambiarEstadoMantenimiento,
    agregarItemChecklist,
    actualizarItemChecklist,
    eliminarMantenimiento,
    subirFotos,
    agregarMateriales,
    obtenerMantenimientoCompleto,
    iniciarMantenimiento,
    completarMantenimiento,
    eliminarFoto,
    eliminarMaterial,
    generarReportePDF,
    obtenerMantenimientosResumen
} from "../controllers/mantenimientoController.js";
import { verificarToken, verificarRol } from "../middlewares/verificarToken.js";
import { 
    filtrarPlantasPorRol 
} from "../middlewares/verificarPlantaRol.js";
import { uploadMantenimientos } from "../middlewares/upload.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// ==================== RUTAS DE CONSULTA ====================
router.get("/", 
    filtrarPlantasPorRol(), // ✅ Filtra por plantas del usuario
    obtenerMantenimientos
);

router.get("/resumen/dashboard", 
    filtrarPlantasPorRol(), // ✅ Filtra resumen por plantas del usuario
    obtenerMantenimientosResumen
);

router.get("/:id", 
    filtrarPlantasPorRol(), // ✅ Verifica acceso al mantenimiento
    obtenerMantenimiento
);

router.get("/:id/completo", 
    filtrarPlantasPorRol(), // ✅ Verifica acceso al mantenimiento
    obtenerMantenimientoCompleto
);

router.get("/planta/:plantId", 
    filtrarPlantasPorRol(), // ✅ Filtra por plantas del usuario
    obtenerMantenimientosPlanta
);

router.get("/tecnico/:userId", 
    filtrarPlantasPorRol(), // ✅ Filtra por plantas del usuario
    obtenerMantenimientosTecnico
);

// ==================== RUTAS PARA FOTOS Y ARCHIVOS ====================
router.post("/:id/fotos", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    uploadMantenimientos.array('fotos', 10),
    subirFotos
);

router.delete("/:id/fotos/:fotoId", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    eliminarFoto
);

// ==================== RUTAS PARA MATERIALES ====================
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

// ==================== RUTAS PARA GESTIÓN DE MANTENIMIENTO ====================
router.post("/", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Para validar la plantaId del body
    crearMantenimiento
);

router.post("/:id/iniciar", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    iniciarMantenimiento
);

router.post("/:id/completar", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    uploadMantenimientos.array('fotos', 10), 
    completarMantenimiento
);

// ==================== RUTAS PARA ACTUALIZACIÓN ====================
router.put("/:id", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    actualizarMantenimiento
);

router.patch("/:id/estado", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    cambiarEstadoMantenimiento
);

// ==================== RUTAS PARA CHECKLIST ====================
router.post("/:id/checklist", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    agregarItemChecklist
);

router.put("/checklist/:itemId", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    actualizarItemChecklist
);

// ==================== RUTA PARA REPORTE PDF ====================
router.get("/:id/reporte-pdf", 
    filtrarPlantasPorRol(), // ✅ Verifica acceso al mantenimiento
    generarReportePDF
);

// ==================== RUTA PARA ELIMINAR ====================
router.delete("/:id", 
    verificarRol(['admin']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    eliminarMantenimiento
);

export default router;