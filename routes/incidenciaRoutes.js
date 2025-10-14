import express from "express";
import {
    crearIncidencia,
    obtenerIncidencia,
    obtenerIncidencias,
    obtenerIncidenciasPlanta,
    obtenerIncidenciasEstado,
    actualizarIncidencia,
    cambiarEstadoIncidencia,
    eliminarIncidencia
} from "../controllers/incidenciaController.js";
import { verificarToken, verificarRol } from "../middlewares/verificarToken.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Cualquier usuario autenticado puede reportar incidencias
router.post("/", crearIncidencia);

// Rutas de consulta
router.get("/", obtenerIncidencias);
router.get("/:id", obtenerIncidencia);
router.get("/planta/:plantId", obtenerIncidenciasPlanta);
router.get("/estado/:estado", obtenerIncidenciasEstado);

// Rutas para actualizar (solo admin y técnicos)
router.put("/:id", verificarRol(['admin', 'tecnico']), actualizarIncidencia);
router.patch("/:id/estado", verificarRol(['admin', 'tecnico']), cambiarEstadoIncidencia);

// Solo admin puede eliminar
router.delete("/:id", verificarRol(['admin']), eliminarIncidencia);

export default router;