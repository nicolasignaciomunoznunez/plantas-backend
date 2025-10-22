import { Mantenimiento } from "../models/mantenimientoModel.js";

export const crearMantenimiento = async (req, res) => {
    try {
        const { plantId, tipo, descripcion, fechaProgramada, estado } = req.body;
        const userId = req.usuarioId;

        if (!plantId || !descripcion || !fechaProgramada) {
            return res.status(400).json({
                success: false,
                message: "plantId, descripción y fechaProgramada son requeridos"
            });
        }

        const nuevoMantenimiento = await Mantenimiento.crear({
            plantId,
            userId,
            tipo,
            descripcion,
            fechaProgramada,
            estado
        });

        res.status(201).json({
            success: true,
            message: "Mantenimiento programado correctamente",
            mantenimiento: nuevoMantenimiento
        });
    } catch (error) {
        console.log("Error al crear mantenimiento:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerMantenimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const mantenimiento = await Mantenimiento.buscarPorId(id);

        if (!mantenimiento) {
            return res.status(404).json({
                success: false,
                message: "Mantenimiento no encontrado"
            });
        }

        res.status(200).json({
            success: true,
            mantenimiento
        });
    } catch (error) {
        console.log("Error al obtener mantenimiento:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerMantenimientosPlanta = async (req, res) => {
    try {
        const { plantId } = req.params;
        const mantenimientos = await Mantenimiento.obtenerPorPlanta(plantId);

        res.status(200).json({
            success: true,
            mantenimientos
        });
    } catch (error) {
        console.log("Error al obtener mantenimientos de planta:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerMantenimientosTecnico = async (req, res) => {
    try {
        const { userId } = req.params;
        const mantenimientos = await Mantenimiento.obtenerPorTecnico(userId);

        res.status(200).json({
            success: true,
            mantenimientos
        });
    } catch (error) {
        console.log("Error al obtener mantenimientos del técnico:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const actualizarMantenimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const datosActualizados = req.body;

        const mantenimientoActualizado = await Mantenimiento.actualizar(id, datosActualizados);

        res.status(200).json({
            success: true,
            message: "Mantenimiento actualizado correctamente",
            mantenimiento: mantenimientoActualizado
        });
    } catch (error) {
        console.log("Error al actualizar mantenimiento:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const cambiarEstadoMantenimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                success: false,
                message: "Estado es requerido"
            });
        }

        const mantenimientoActualizado = await Mantenimiento.cambiarEstado(id, estado);

        res.status(200).json({
            success: true,
            message: `Mantenimiento marcado como ${estado}`,
            mantenimiento: mantenimientoActualizado
        });
    } catch (error) {
        console.log("Error al cambiar estado de mantenimiento:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const agregarItemChecklist = async (req, res) => {
    try {
        const { id } = req.params;
        const { item } = req.body;

        if (!item) {
            return res.status(400).json({
                success: false,
                message: "El item es requerido"
            });
        }

        const itemId = await Mantenimiento.agregarItemChecklist(id, item);

        res.status(201).json({
            success: true,
            message: "Item agregado al checklist",
            itemId
        });
    } catch (error) {
        console.log("Error al agregar item al checklist:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const actualizarItemChecklist = async (req, res) => {
    try {
        const { itemId } = req.params;
        const datosActualizados = req.body;

        await Mantenimiento.actualizarItemChecklist(itemId, datosActualizados);

        res.status(200).json({
            success: true,
            message: "Item actualizado correctamente"
        });
    } catch (error) {
        console.log("Error al actualizar item del checklist:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const eliminarMantenimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const eliminado = await Mantenimiento.eliminar(id);

        if (!eliminado) {
            return res.status(404).json({
                success: false,
                message: "Mantenimiento no encontrado"
            });
        }

        res.status(200).json({
            success: true,
            message: "Mantenimiento eliminado correctamente"
        });
    } catch (error) {
        console.log("Error al eliminar mantenimiento:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerMantenimientos = async (req, res) => {
    try {
        const { limite = 50, pagina = 1 } = req.query;
        
        const offset = (pagina - 1) * limite;
        
        // Obtener todos los mantenimientos con paginación
        const mantenimientos = await Mantenimiento.obtenerTodos({
            limite: parseInt(limite),
            offset: parseInt(offset)
        });

        res.status(200).json({
            success: true,
            mantenimientos: mantenimientos.rows || mantenimientos,
            total: mantenimientos.count || mantenimientos.length,
            pagina: parseInt(pagina),
            totalPaginas: Math.ceil((mantenimientos.count || mantenimientos.length) / limite)
        });
    } catch (error) {
        console.log("Error al obtener mantenimientos:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// Agregar método optimizado para dashboard
export const obtenerMantenimientosResumen = async (req, res) => {
  try {
    const resumen = await Mantenimiento.obtenerResumenDashboard();
    res.json({ success: true, ...resumen });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};