import express from "express";
import {
    crearReporte,
    obtenerReporte,
    obtenerReportes,
    obtenerReportesPlanta,
    obtenerReportesUsuario,
    eliminarReporte,
    descargarReporte
} from "../controllers/reporteController.js";
import { verificarToken, verificarRol } from "../middlewares/verificarToken.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Solo admin y técnicos pueden crear reportes
router.post("/", verificarRol(['admin', 'tecnico']), crearReporte);

// Rutas de consulta
router.get("/", obtenerReportes);
router.get("/:id", obtenerReporte);
router.get("/planta/:plantId", obtenerReportesPlanta);
router.get("/usuario/:usuarioId", obtenerReportesUsuario);
router.get("/descargar/:id", descargarReporte);
// Solo admin puede eliminar
router.delete("/:id", verificarRol(['admin']), eliminarReporte);

export default router;