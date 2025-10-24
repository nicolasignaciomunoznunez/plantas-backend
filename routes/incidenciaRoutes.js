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
import { uploadMultiple } from "../middlewares/upload.js"; // ✅ Importar Multer

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// ✅ RUTAS EXISTENTES (se mantienen igual)
router.post("/", crearIncidencia);
router.get("/", obtenerIncidencias);
router.get("/:id", obtenerIncidencia);
router.get("/planta/:plantId", obtenerIncidenciasPlanta);
router.get("/estado/:estado", obtenerIncidenciasEstado);
router.put("/:id", verificarRol(['admin', 'tecnico']), actualizarIncidencia);
router.patch("/:id/estado", verificarRol(['admin', 'tecnico']), cambiarEstadoIncidencia);
router.delete("/:id", verificarRol(['admin']), eliminarIncidencia);

// ✅ NUEVAS RUTAS PARA FOTOS Y ARCHIVOS
// Subir múltiples fotos a una incidencia
router.post("/:id/fotos", 
    verificarRol(['admin', 'tecnico']), 
    uploadMultiple, // ✅ Middleware de Multer para múltiples archivos
    subirFotos
);

// Eliminar una foto específica
router.delete("/:id/fotos/:fotoId", 
    verificarRol(['admin', 'tecnico']), 
    eliminarFoto
);

// ✅ NUEVAS RUTAS PARA MATERIALES
// Agregar materiales a una incidencia
router.post("/:id/materiales", 
    verificarRol(['admin', 'tecnico']), 
    agregarMateriales
);

// Eliminar un material específico
router.delete("/:id/materiales/:materialId", 
    verificarRol(['admin', 'tecnico']), 
    eliminarMaterial
);

// ✅ NUEVA RUTA PARA COMPLETAR INCIDENCIA
// Completar incidencia con resumen y materiales
router.put("/:id/completar", 
    verificarRol(['admin', 'tecnico']), 
    completarIncidencia
);

// ✅ NUEVA RUTA PARA REPORTE PDF
// Generar reporte PDF de la incidencia
router.get("/:id/reporte-pdf", 
    generarReportePDF // ✅ Todos los roles autenticados pueden ver el PDF
);

// ✅ NUEVA RUTA PARA OBTENER INCIDENCIA COMPLETA
// Obtener incidencia con fotos y materiales incluidos
router.get("/:id/completa", 
    obtenerIncidenciaCompleta
);

// ✅ RUTA PARA RESUMEN (dashboard)
router.get("/resumen/dashboard", 
    obtenerIncidenciasResumen
);

export default router;