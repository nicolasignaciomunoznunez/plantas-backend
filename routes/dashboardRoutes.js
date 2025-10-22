import express from "express";
import { 
  obtenerMetricas, 
  obtenerPlantasDashboard,
  obtenerDashboardCompleto,
  invalidarCacheDashboard,
  obtenerEstadoCache
} from "../controllers/dashboardController.js";
import { verificarToken } from "../middlewares/verificarToken.js";

const router = express.Router();

router.use(verificarToken);

// ✅ RUTAS EXISTENTES (mantener compatibilidad)
router.get("/metricas", obtenerMetricas);

// ✅ RUTAS NUEVAS OPTIMIZADAS
router.get("/plantas", obtenerPlantasDashboard);
router.get("/completo", obtenerDashboardCompleto);

// ✅ RUTAS ADMIN/DEBUG (opcionales)
router.delete("/cache", invalidarCacheDashboard);
router.get("/cache/estado", obtenerEstadoCache);

export default router;