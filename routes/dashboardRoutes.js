import express from "express";
import { 
  obtenerMetricas, 
  obtenerPlantasDashboard,
  obtenerDashboardCompleto,
  invalidarCacheDashboard,
  obtenerEstadoCache
} from "../controllers/dashboardController.js";
import { verificarToken } from "../middlewares/verificarToken.js";
import { 
  filtrarPlantasPorRol 
} from "../middlewares/verificarPlantaRol.js";

const router = express.Router();

router.use(verificarToken);

// ==================== RUTAS DEL DASHBOARD ====================
router.get("/metricas", 
  filtrarPlantasPorRol(), // ✅ Filtra métricas por plantas del usuario
  obtenerMetricas
);

router.get("/plantas", 
  filtrarPlantasPorRol(), // ✅ Filtra plantas por rol del usuario
  obtenerPlantasDashboard
);

router.get("/completo", 
  filtrarPlantasPorRol(), // ✅ Filtra datos completos por plantas del usuario
  obtenerDashboardCompleto
);

// ==================== RUTAS ADMIN/DEBUG ====================
router.delete("/cache", 
  filtrarPlantasPorRol(), // ✅ Solo afecta cache de sus plantas
  invalidarCacheDashboard
);

router.get("/cache/estado", 
  filtrarPlantasPorRol(), // ✅ Solo ve estado de cache de sus plantas
  obtenerEstadoCache
);

export default router;