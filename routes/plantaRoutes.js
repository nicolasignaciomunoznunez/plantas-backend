import express from "express";
import {
    crearPlanta,
    obtenerPlanta,
    obtenerPlantas,
    obtenerPlantasCliente,
    actualizarPlanta,
    eliminarPlanta
} from "../controllers/plantaController.js";
import { verificarToken, verificarRol } from "../middlewares/verificarToken.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles para admin y técnicos
router.post("/", verificarRol(['admin', 'tecnico']), crearPlanta);
router.get("/", obtenerPlantas);
router.get("/:id", obtenerPlanta);
router.get("/cliente/:clienteId", obtenerPlantasCliente);
router.put("/:id", verificarRol(['admin', 'tecnico']), actualizarPlanta);
router.delete("/:id", verificarRol(['admin']), eliminarPlanta);

export default router;