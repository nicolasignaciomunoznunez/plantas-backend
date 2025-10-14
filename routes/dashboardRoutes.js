import express from "express";
import { obtenerMetricas } from "../controllers/dashboardController.js";
import { verificarToken } from "../middlewares/verificarToken.js";

const router = express.Router();

router.use(verificarToken);

router.get("/metricas", obtenerMetricas);

export default router;