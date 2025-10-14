import express from "express";
import {
    crearDato,
    obtenerDatosPlanta,
    obtenerDatosRangoFechas,
    obtenerUltimosDatos
} from "../controllers/datoPlantaController.js";
import { verificarToken, verificarRol } from "../middlewares/verificarToken.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas para crear datos (sistemas automáticos o técnicos)
router.post("/", verificarRol(['admin', 'tecnico']), crearDato);

// Rutas para consultar datos
router.get("/planta/:plantId", obtenerDatosPlanta);
router.get("/planta/:plantId/rango", obtenerDatosRangoFechas);
router.get("/ultimos", obtenerUltimosDatos);

export default router;