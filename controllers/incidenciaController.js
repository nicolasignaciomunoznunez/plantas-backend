import { Incidencia } from "../models/incidenciaModel.js";

export const crearIncidencia = async (req, res) => {
    try {
        const { plantId, titulo, descripcion, estado } = req.body;
        const userId = req.usuarioId;

        if (!plantId || !titulo || !descripcion) {
            return res.status(400).json({
                success: false,
                message: "plantId, título y descripción son requeridos"
            });
        }

        const nuevaIncidencia = await Incidencia.crear({
            plantId,
            userId,
            titulo,
            descripcion,
            estado
        });

        res.status(201).json({
            success: true,
            message: "Incidencia reportada correctamente",
            incidencia: nuevaIncidencia
        });
    } catch (error) {
        console.log("Error al crear incidencia:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerIncidencia = async (req, res) => {
    try {
        const { id } = req.params;
        const incidencia = await Incidencia.buscarPorId(id);

        if (!incidencia) {
            return res.status(404).json({
                success: false,
                message: "Incidencia no encontrada"
            });
        }

        // ✅ VERIFICAR PERMISOS: Si es cliente, solo puede ver SUS incidencias
        if (req.usuario?.rol === 'cliente' && incidencia.userId !== req.usuarioId) {
            return res.status(403).json({
                success: false,
                message: "No tienes permisos para ver esta incidencia"
            });
        }

        res.status(200).json({
            success: true,
            incidencia
        });
    } catch (error) {
        console.log("Error al obtener incidencia:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerIncidencias = async (req, res) => {
    try {
        const { limite = 10, pagina = 1 } = req.query;
        
        console.log('🔐 [CONTROLLER] Usuario solicitando incidencias:', {
            usuarioId: req.usuarioId,
            usuario: req.usuario,
            rol: req.usuario?.rol
        });

        // ✅ CONFIGURAR FILTROS SEGÚN ROL
        let filtros = {};
        
        // ✅ SI ES CLIENTE, SOLO VER SUS PROPIAS INCIDENCIAS
        if (req.usuario?.rol === 'cliente') {
            filtros.userId = req.usuarioId;
            console.log('👤 [CONTROLLER] Filtrando para cliente - userId:', req.usuarioId);
        }
        // ✅ Técnicos y Admin ven TODAS las incidencias (sin filtro)
        
        const incidencias = await Incidencia.obtenerTodas(
            parseInt(limite), 
            parseInt(pagina),
            filtros // ✅ Pasar los filtros al modelo
        );

        console.log('✅ [CONTROLLER] Incidencias devueltas:', incidencias.length, 'para rol:', req.usuario?.rol);

        res.status(200).json({
            success: true,
            incidencias,
            paginacion: {
                limite: parseInt(limite),
                pagina: parseInt(pagina),
                total: incidencias.length
            },
            filtro: req.usuario?.rol === 'cliente' ? 'mis_incidencias' : 'todas'
        });
    } catch (error) {
        console.log("Error al obtener incidencias:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerIncidenciasPlanta = async (req, res) => {
    try {
        const { plantId } = req.params;
        
        console.log('🔐 [CONTROLLER] Usuario solicitando incidencias de planta:', {
            usuarioId: req.usuarioId,
            rol: req.usuario?.rol,
            plantId
        });

        let filtros = { plantId };
        
        // ✅ SI ES CLIENTE, SOLO VER SUS INCIDENCIAS EN ESA PLANTA
        if (req.usuario?.rol === 'cliente') {
            filtros.userId = req.usuarioId;
            console.log('👤 [CONTROLLER] Filtrando para cliente en planta:', filtros);
        }
        
        const incidencias = await Incidencia.obtenerPorPlanta(plantId, filtros);

        res.status(200).json({
            success: true,
            incidencias,
            total: incidencias.length,
            filtro: req.usuario?.rol === 'cliente' ? 'mis_incidencias' : 'todas'
        });
    } catch (error) {
        console.log("Error al obtener incidencias de planta:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerIncidenciasEstado = async (req, res) => {
    try {
        const { estado } = req.params;
        
        console.log('🔐 [CONTROLLER] Usuario solicitando incidencias por estado:', {
            usuarioId: req.usuarioId,
            rol: req.usuario?.rol,
            estado
        });

        let filtros = { estado };
        
        // ✅ SI ES CLIENTE, SOLO VER SUS INCIDENCIAS EN ESE ESTADO
        if (req.usuario?.rol === 'cliente') {
            filtros.userId = req.usuarioId;
            console.log('👤 [CONTROLLER] Filtrando para cliente por estado:', filtros);
        }
        
        const incidencias = await Incidencia.obtenerPorEstado(estado, filtros);

        res.status(200).json({
            success: true,
            incidencias,
            total: incidencias.length,
            filtro: req.usuario?.rol === 'cliente' ? 'mis_incidencias' : 'todas'
        });
    } catch (error) {
        console.log("Error al obtener incidencias por estado:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const actualizarIncidencia = async (req, res) => {
    try {
        const { id } = req.params;
        const datosActualizados = req.body;

        // ✅ VERIFICAR PERMISOS: Si es cliente, solo puede actualizar SUS incidencias
        if (req.usuario?.rol === 'cliente') {
            const incidencia = await Incidencia.buscarPorId(id);
            if (!incidencia) {
                return res.status(404).json({
                    success: false,
                    message: "Incidencia no encontrada"
                });
            }
            
            if (incidencia.userId !== req.usuarioId) {
                return res.status(403).json({
                    success: false,
                    message: "No tienes permisos para actualizar esta incidencia"
                });
            }
            
            // ✅ Clientes NO pueden cambiar el estado (solo técnicos/admin)
            if (datosActualizados.estado) {
                return res.status(403).json({
                    success: false,
                    message: "No puedes cambiar el estado de la incidencia"
                });
            }
        }

        const incidenciaActualizada = await Incidencia.actualizar(id, datosActualizados);

        res.status(200).json({
            success: true,
            message: "Incidencia actualizada correctamente",
            incidencia: incidenciaActualizada
        });
    } catch (error) {
        console.log("Error al actualizar incidencia:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const cambiarEstadoIncidencia = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                success: false,
                message: "Estado es requerido"
            });
        }

        // ✅ SOLO TÉCNICOS Y ADMIN PUEDEN CAMBIAR ESTADO
        if (req.usuario?.rol === 'cliente') {
            return res.status(403).json({
                success: false,
                message: "No tienes permisos para cambiar el estado de incidencias"
            });
        }

        const incidenciaActualizada = await Incidencia.cambiarEstado(id, estado);

        res.status(200).json({
            success: true,
            message: `Incidencia marcada como ${estado}`,
            incidencia: incidenciaActualizada
        });
    } catch (error) {
        console.log("Error al cambiar estado de incidencia:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const eliminarIncidencia = async (req, res) => {
    try {
        const { id } = req.params;
        
        // ✅ CLIENTES NO PUEDEN ELIMINAR INCIDENCIAS
        if (req.usuario?.rol === 'cliente') {
            return res.status(403).json({
                success: false,
                message: "No tienes permisos para eliminar incidencias"
            });
        }

        const eliminado = await Incidencia.eliminar(id);

        if (!eliminado) {
            return res.status(404).json({
                success: false,
                message: "Incidencia no encontrada"
            });
        }

        res.status(200).json({
            success: true,
            message: "Incidencia eliminada correctamente"
        });
    } catch (error) {
        console.log("Error al eliminar incidencia:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};