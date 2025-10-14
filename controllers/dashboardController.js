import { Planta } from '../models/plantaModel.js';
import { DatoPlanta } from '../models/datoPlantaModel.js';
import { Incidencia } from '../models/incidenciaModel.js';

export const obtenerMetricas = async (req, res) => {
  try {
    const plantas = await Planta.obtenerTodas();
    const ultimosDatos = await DatoPlanta.obtenerUltimosDatos();
    const incidenciasPendientes = await Incidencia.obtenerPorEstado('pendiente');

    const metricas = {
      totalPlantas: plantas.length,
      plantasActivas: ultimosDatos.filter(d => d.nivelLocal > 20).length,
      incidenciasActivas: incidenciasPendientes.length,
      eficienciaPromedio: ultimosDatos.length > 0 
        ? (ultimosDatos.reduce((acc, d) => acc + (d.nivelLocal || 0), 0) / ultimosDatos.length).toFixed(1)
        : 0
    };

    res.status(200).json({
      success: true,
      metricas
    });
  } catch (error) {
    console.log("Error al obtener métricas:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};