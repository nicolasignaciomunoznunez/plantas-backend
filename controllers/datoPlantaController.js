import { DatoPlanta } from "../models/datoPlantaModel.js";

export const crearDato = async (req, res) => {
    try {
        const { plantId, nivelLocal, presion, turbidez, cloro, energia, timestamp } = req.body;

        if (!plantId) {
            return res.status(400).json({
                success: false,
                message: "plantId es requerido"
            });
        }

        const nuevoDato = await DatoPlanta.crear({
            plantId,
            nivelLocal,
            presion,
            turbidez,
            cloro,
            energia,
            timestamp
        });

        res.status(201).json({
            success: true,
            message: "Dato registrado correctamente",
            dato: nuevoDato
        });
    } catch (error) {
        console.log("Error al crear dato:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerDatosPlanta = async (req, res) => {
    try {
        const { plantId } = req.params;
        const { limite = 100, pagina = 1 } = req.query;

        console.log('🔍 Parámetros recibidos en controlador:', {
            plantId,
            plantIdType: typeof plantId,
            limite,
            limiteType: typeof limite,
            pagina,
            paginaType: typeof pagina
        });

        // CONVERTIR plantId también a número
        const datos = await DatoPlanta.obtenerPorPlanta(
            parseInt(plantId),  // ← Agregar parseInt aquí
            parseInt(limite), 
            parseInt(pagina)
        );

        res.status(200).json({
            success: true,
            datos,
            paginacion: {
                limite: parseInt(limite),
                pagina: parseInt(pagina)
            }
        });
    } catch (error) {
        console.log("Error al obtener datos de planta:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerDatosRangoFechas = async (req, res) => {
    try {
        const { plantId } = req.params;
        const { fechaInicio, fechaFin } = req.query;

        if (!fechaInicio || !fechaFin) {
            return res.status(400).json({
                success: false,
                message: "fechaInicio y fechaFin son requeridos"
            });
        }

        const datos = await DatoPlanta.obtenerPorRangoFechas(plantId, fechaInicio, fechaFin);

        res.status(200).json({
            success: true,
            datos
        });
    } catch (error) {
        console.log("Error al obtener datos por rango de fechas:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerUltimosDatos = async (req, res) => {
    try {
        const datos = await DatoPlanta.obtenerUltimosDatos();

        res.status(200).json({
            success: true,
            datos
        });
    } catch (error) {
        console.log("Error al obtener últimos datos:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};