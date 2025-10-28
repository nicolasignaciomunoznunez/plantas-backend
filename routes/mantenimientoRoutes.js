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
    // ✅ AGREGAR LOS NUEVOS CONTROLADORES
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
import { uploadMantenimientos } from "../middlewares/upload.js"; // ✅ Usar tu config de Multer

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// ✅ RUTAS DE CONSULTA
router.get("/", obtenerMantenimientos);
router.get("/resumen/dashboard", obtenerMantenimientosResumen); // ✅ Para dashboard
router.get("/:id", obtenerMantenimiento);
router.get("/:id/completo", obtenerMantenimientoCompleto); // ✅ Con fotos y materiales
router.get("/planta/:plantId", obtenerMantenimientosPlanta);
router.get("/tecnico/:userId", obtenerMantenimientosTecnico);

// ✅ RUTAS PARA FOTOS Y ARCHIVOS
router.post("/:id/fotos", 
    verificarRol(['admin', 'tecnico']), 
    uploadMantenimientosMultiple, // ✅ Usar la configuración específica
    subirFotos
);

router.delete("/:id/fotos/:fotoId", 
    verificarRol(['admin', 'tecnico']), 
    eliminarFoto
);

// ✅ RUTAS PARA MATERIALES
router.post("/:id/materiales", 
    verificarRol(['admin', 'tecnico']), 
    agregarMateriales
);

router.delete("/:id/materiales/:materialId", 
    verificarRol(['admin', 'tecnico']), 
    eliminarMaterial
);

// ✅ RUTAS PARA GESTIÓN DE MANTENIMIENTO
router.post("/", 
    verificarRol(['admin', 'tecnico']), 
    crearMantenimiento
);

router.post("/:id/iniciar", 
    verificarRol(['admin', 'tecnico']), 
    iniciarMantenimiento
);

router.post("/:id/completar", 
    verificarRol(['admin', 'tecnico']), 
    completarMantenimiento
);

// ✅ RUTAS PARA ACTUALIZACIÓN
router.put("/:id", 
    verificarRol(['admin', 'tecnico']), 
    actualizarMantenimiento
);

router.patch("/:id/estado", 
    verificarRol(['admin', 'tecnico']), 
    cambiarEstadoMantenimiento
);

// ✅ RUTAS PARA CHECKLIST
router.post("/:id/checklist", 
    verificarRol(['admin', 'tecnico']), 
    agregarItemChecklist
);

router.put("/checklist/:itemId", 
    verificarRol(['admin', 'tecnico']), 
    actualizarItemChecklist
);

// ✅ RUTA PARA REPORTE PDF
router.get("/:id/reporte-pdf", 
    generarReportePDF // ✅ Accesible para todos los roles autenticados
);

// ✅ SOLO ADMIN PUEDE ELIMINAR
router.delete("/:id", 
    verificarRol(['admin']), 
    eliminarMantenimiento
);

export default router;