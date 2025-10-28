import express from "express";
import {
    crearPlanta,
    obtenerPlanta,
    obtenerPlantas,
    obtenerPlantasCliente,
    actualizarPlanta,
    eliminarPlanta,
    asignarPlantaUsuario,
    obtenerPlantasUsuario,
    // ✅ NUEVOS CONTROLADORES
    obtenerPlantaCompleta,
    asignarMultiplesTecnicos,
    asignarMultiplesClientes,
    obtenerPlantasCompletas
} from "../controllers/plantaController.js";
import { verificarToken, verificarRol } from "../middlewares/verificarToken.js";
import { 
    filtrarPlantasPorRol,
    prevenirCreacionPlantas 
} from "../middlewares/verificarPlantaRol.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// ==================== RUTAS GENERALES DE PLANTAS ====================
router.get("/", filtrarPlantasPorRol(), obtenerPlantas);
router.get("/:id", filtrarPlantasPorRol(), obtenerPlanta);
router.get("/cliente/:clienteId", verificarRol(['superadmin', 'admin']), obtenerPlantasCliente);

// ==================== RUTAS DE GESTIÓN ====================
// ✅ CORREGIDO: Solo superadmin puede crear plantas
router.post("/", prevenirCreacionPlantas(), crearPlanta);

// ✅ CORREGIDO: Solo superadmin y admin pueden actualizar/eliminar
router.put("/:id", verificarRol(['superadmin', 'admin']), actualizarPlanta);
router.delete("/:id", verificarRol(['superadmin', 'admin']), eliminarPlanta);

// ==================== RUTAS DE ASIGNACIÓN ====================
router.post('/asignar', verificarRol(['superadmin', 'admin']), asignarPlantaUsuario);
router.get('/usuario/:usuarioId', verificarRol(['superadmin', 'admin']), obtenerPlantasUsuario);

// ==================== RUTAS MUCHOS-A-MUCHOS ====================
// Obtener planta completa con técnicos y clientes
router.get('/:id/completa', filtrarPlantasPorRol(), obtenerPlantaCompleta);

// Asignar múltiples técnicos a una planta
router.post('/:id/asignar-tecnicos', verificarRol(['superadmin', 'admin']), asignarMultiplesTecnicos);

// Asignar múltiples clientes a una planta  
router.post('/:id/asignar-clientes', verificarRol(['superadmin', 'admin']), asignarMultiplesClientes);

// Obtener todas las plantas con relaciones completas (solo superadmin)
router.get('/completas/completas', verificarRol(['superadmin']), obtenerPlantasCompletas);

export default router;