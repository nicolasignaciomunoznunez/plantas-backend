// backend/routes/mantenimientoRouter.js
import express from "express";
import {
    crearMantenimiento,
    obtenerMantenimiento,
    obtenerMantenimientos, // ✅ AGREGAR ESTA FUNCIÓN
    obtenerMantenimientosPlanta,
    obtenerMantenimientosTecnico,
    actualizarMantenimiento,
    cambiarEstadoMantenimiento,
    agregarItemChecklist,
    actualizarItemChecklist,
    eliminarMantenimiento
} from "../controllers/mantenimientoController.js";
import { verificarToken, verificarRol } from "../middlewares/verificarToken.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// ✅ AGREGAR ESTA RUTA - Obtener todos los mantenimientos
router.get("/", obtenerMantenimientos);

// Solo admin y técnicos pueden crear mantenimientos
router.post("/", verificarRol(['admin', 'tecnico']), crearMantenimiento);

// Rutas de consulta
router.get("/:id", obtenerMantenimiento);
router.get("/planta/:plantId", obtenerMantenimientosPlanta);
router.get("/tecnico/:userId", obtenerMantenimientosTecnico);

// Rutas para actualizar (solo admin y técnicos)
router.put("/:id", verificarRol(['admin', 'tecnico']), actualizarMantenimiento);
router.patch("/:id/estado", verificarRol(['admin', 'tecnico']), cambiarEstadoMantenimiento);

// Rutas para checklist
router.post("/:id/checklist", verificarRol(['admin', 'tecnico']), agregarItemChecklist);
router.put("/checklist/:itemId", verificarRol(['admin', 'tecnico']), actualizarItemChecklist);

// Solo admin puede eliminar
router.delete("/:id", verificarRol(['admin']), eliminarMantenimiento);

export default router;