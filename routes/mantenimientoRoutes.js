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
import { uploadMantenimientos } from "../middlewares/upload.js"; // ✅ CORREGIDO

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// ✅ RUTAS DE CONSULTA
router.get("/", obtenerMantenimientos);
router.get("/resumen/dashboard", obtenerMantenimientosResumen);
router.get("/:id", obtenerMantenimiento);
router.get("/:id/completo", obtenerMantenimientoCompleto);
router.get("/planta/:plantId", obtenerMantenimientosPlanta);
router.get("/tecnico/:userId", obtenerMantenimientosTecnico);

// ✅ RUTAS PARA FOTOS Y ARCHIVOS
router.post("/:id/fotos", 
    verificarRol(['admin', 'tecnico']), 
    uploadMantenimientos.array('fotos', 10), // ✅ CORREGIDO
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
    uploadMantenimientos.array('fotos', 10), 
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
    generarReportePDF
);

// ✅ SOLO ADMIN PUEDE ELIMINAR
router.delete("/:id", 
    verificarRol(['admin']), 
    eliminarMantenimiento
);

export default router;