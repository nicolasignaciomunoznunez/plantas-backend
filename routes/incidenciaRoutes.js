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

router.get("/:id/reporte-pdf", (req, res, next) => {
    console.log('🎯 [ROUTE DEBUG] Ruta PDF accedida para incidencia:', req.params.id);
    console.log('🎯 [ROUTE DEBUG] Usuario:', req.usuario?.email);
    console.log('🎯 [ROUTE DEBUG] Método:', req.method);
    console.log('🎯 [ROUTE DEBUG] URL completa:', req.originalUrl);
    next();
}, generarReportePDF)// ✅ ESTA PRIMERO
router.get("/:id/completa", obtenerIncidenciaCompleta);
router.post("/:id/fotos", verificarRol(['admin', 'tecnico']), uploadMultiple, subirFotos);
router.delete("/:id/fotos/:fotoId", verificarRol(['admin', 'tecnico']), eliminarFoto);
router.post("/:id/materiales", verificarRol(['admin', 'tecnico']), agregarMateriales);
router.delete("/:id/materiales/:materialId", verificarRol(['admin', 'tecnico']), eliminarMaterial);
router.put("/:id/completar", verificarRol(['admin', 'tecnico']), completarIncidencia);

// ✅ SEGUNDO: Rutas con parámetros específicos
router.get("/planta/:plantId", obtenerIncidenciasPlanta);
router.get("/estado/:estado", obtenerIncidenciasEstado);

// ✅ TERCERO: Rutas GENERALES (más generales después)
router.get("/:id", obtenerIncidencia); // ✅ ESTA ÚLTIMA
router.put("/:id", verificarRol(['admin', 'tecnico']), actualizarIncidencia);
router.patch("/:id/estado", verificarRol(['admin', 'tecnico']), cambiarEstadoIncidencia);
router.delete("/:id", verificarRol(['admin']), eliminarIncidencia);

// ✅ CUARTO: Rutas sin parámetros
router.post("/", crearIncidencia);
router.get("/", obtenerIncidencias);
router.get("/resumen/dashboard", obtenerIncidenciasResumen);

export default router;