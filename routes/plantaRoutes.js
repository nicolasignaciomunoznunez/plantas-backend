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
import { filtrarPlantasPorRol } from "../middlewares/verificarPlantRol.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles para admin y técnicos
router.post("/", verificarRol(['admin', 'tecnico']), crearPlanta);
router.get("/", filtrarPlantasPorRol(), obtenerPlantas); // ← Agregar middleware
router.get("/:id", obtenerPlanta);
router.get("/cliente/:clienteId", obtenerPlantasCliente);
router.put("/:id", verificarRol(['admin', 'tecnico']), actualizarPlanta);
router.delete("/:id", verificarRol(['admin']), eliminarPlanta);

export default router;