import express from "express";
import {
    crearPlanta,
    obtenerPlanta,
    obtenerPlantas,
    obtenerPlantasCliente,
    actualizarPlanta,
    eliminarPlanta,
    asignarPlantaUsuario,
    obtenerPlantasUsuario
} from "../controllers/plantaController.js";
import { verificarToken, verificarRol } from "../middlewares/verificarToken.js";
import { filtrarPlantasPorRol } from "../middlewares/verificarPlantaRol.js";

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


// En routes/plantas.js - agregar estas rutas
router.post('/asignar', verificarToken, verificarRol(['superadmin', 'admin']), asignarPlantaUsuario);
router.get('/usuario/:usuarioId', verificarToken, verificarRol(['superadmin', 'admin']), obtenerPlantasUsuario);

export default router;