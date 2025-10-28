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
import { 
    filtrarPlantasPorRol 
} from "../middlewares/verificarPlantaRol.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// ==================== RUTAS DE CREACIÓN ====================
router.post("/", 
    verificarRol(['admin', 'tecnico']), 
    filtrarPlantasPorRol(), // ✅ Para validar la plantaId del body
    crearReporte
);

// ==================== RUTAS DE CONSULTA ====================
router.get("/", 
    filtrarPlantasPorRol(), // ✅ Filtra reportes por plantas del usuario
    obtenerReportes
);

router.get("/:id", 
    filtrarPlantasPorRol(), // ✅ Verifica acceso al reporte
    obtenerReporte
);

router.get("/planta/:plantId", 
    filtrarPlantasPorRol(), // ✅ Filtra por plantas del usuario
    obtenerReportesPlanta
);

router.get("/usuario/:usuarioId", 
    filtrarPlantasPorRol(), // ✅ Filtra por plantas del usuario
    obtenerReportesUsuario
);

router.get("/descargar/:id", 
    filtrarPlantasPorRol(), // ✅ Verifica acceso al reporte
    descargarReporte
);

// ==================== RUTA DE ELIMINACIÓN ====================
router.delete("/:id", 
    verificarRol(['admin']), 
    filtrarPlantasPorRol(), // ✅ Verifica que sea de su planta
    eliminarReporte
);

export default router;