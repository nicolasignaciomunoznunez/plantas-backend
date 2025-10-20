import { Planta } from "../models/plantaModel.js";



export const crearPlanta = async (req, res) => {
    try {
        const { nombre, ubicacion, clienteId } = req.body;

        if (!nombre || !ubicacion || !clienteId) {
            return res.status(400).json({
                success: false,
                message: "Nombre, ubicación y clienteId son requeridos"
            });
        }

        const nuevaPlanta = await Planta.crear({
            nombre,
            ubicacion,
            clienteId
        });

        res.status(201).json({
            success: true,
            message: "Planta creada correctamente",
            planta: nuevaPlanta
        });
    } catch (error) {
        console.log("Error al crear planta:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerPlanta = async (req, res) => {
    try {
        const { id } = req.params;
        const planta = await Planta.buscarPorId(id);

        if (!planta) {
            return res.status(404).json({
                success: false,
                message: "Planta no encontrada"
            });
        }

        res.status(200).json({
            success: true,
            planta
        });
    } catch (error) {
        console.log("Error al obtener planta:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerPlantas = async (req, res) => {
    try {
        const { limite = 50, pagina = 1 } = req.query;
        const { filtrosPlanta = {} } = req; // ← AGREGAR = {} para valor por defecto
        
        console.log('🔍 [CONTROLLER] Filtros aplicados:', filtrosPlanta);
        console.log('👤 [CONTROLLER] Usuario:', req.usuario?.email, 'Rol:', req.usuario?.rol);
        
        // Pasar los filtros al modelo
        const plantas = await Planta.obtenerTodas(limite, pagina, filtrosPlanta);

        res.status(200).json({
            success: true,
            plantas,
            paginacion: {
                limite: parseInt(limite),
                pagina: parseInt(pagina)
            }
        });
    } catch (error) {
        console.log("❌ [CONTROLLER] Error al obtener plantas:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


export const obtenerPlantasCliente = async (req, res) => {
    try {
        const { clienteId } = req.params;
        const plantas = await Planta.obtenerPorCliente(clienteId);

        res.status(200).json({
            success: true,
            plantas
        });
    } catch (error) {
        console.log("Error al obtener plantas del cliente:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const actualizarPlanta = async (req, res) => {
    try {
        const { id } = req.params;
        const datosActualizados = req.body;

        const plantaActualizada = await Planta.actualizar(id, datosActualizados);

        res.status(200).json({
            success: true,
            message: "Planta actualizada correctamente",
            planta: plantaActualizada
        });
    } catch (error) {
        console.log("Error al actualizar planta:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const eliminarPlanta = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🗑️ Intentando eliminar planta ID:', id);

        const eliminado = await Planta.eliminar(id);

        if (!eliminado) {
            return res.status(404).json({
                success: false,
                message: "Planta no encontrada"
            });
        }

        console.log('✅ Planta eliminada exitosamente');
        res.status(200).json({
            success: true,
            message: "Planta y todos sus registros relacionados eliminados correctamente"
        });
    } catch (error) {
        console.log("Error al eliminar planta:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};