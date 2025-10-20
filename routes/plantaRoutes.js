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

// ==================== RUTAS GENERALES DE PLANTAS ====================
router.get("/", filtrarPlantasPorRol(), obtenerPlantas);
router.get("/:id", obtenerPlanta);
router.get("/cliente/:clienteId", obtenerPlantasCliente);

// ==================== RUTAS DE GESTIÓN (ADMIN/TÉCNICO) ====================
router.post("/", verificarRol(['superadmin', 'admin', 'tecnico']), crearPlanta);
router.put("/:id", verificarRol(['superadmin', 'admin', 'tecnico']), actualizarPlanta);
router.delete("/:id", verificarRol(['superadmin', 'admin']), eliminarPlanta);

// ==================== RUTAS DE ASIGNACIÓN (SUPERADMIN/ADMIN) ====================
router.post('/asignar', verificarRol(['superadmin', 'admin']), asignarPlantaUsuario);
router.get('/usuario/:usuarioId', verificarRol(['superadmin', 'admin']), obtenerPlantasUsuario);

export default router;