import { Planta } from "../models/plantaModel.js";
import { Usuario } from "../models/usuarioModel.js";

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
        const { filtrosPlanta = {} } = req;
        
        console.log('🔍 [CONTROLLER] Filtros aplicados:', filtrosPlanta);
        console.log('👤 [CONTROLLER] Usuario:', req.usuario?.email, 'Rol:', req.usuario?.rol);
        
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
    
    console.log('🔍 [CONTROLLER] Obteniendo plantas para cliente:', clienteId);
    
    // ✅ USAR EL MÉTODO CORRECTO que consulta usuario_plantas
    const plantas = await Planta.obtenerPorCliente(clienteId);
    
    console.log('📊 [CONTROLLER] Plantas encontradas:', plantas.length);
    
    res.status(200).json({
      success: true,
      plantas
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error obteniendo plantas del cliente:', error);
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

// ✅ ASIGNAR/DESASIGNAR PLANTA A USUARIO - VERSIÓN CORREGIDA
export const asignarPlantaUsuario = async (req, res) => {
  try {
    const { usuarioId, plantaId, accion } = req.body;

    console.log('🏭 [PLANTA CONTROLLER] Asignando planta:', { usuarioId, plantaId, accion });

    // Verificar permisos
    if (!['superadmin', 'admin'].includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para asignar plantas"
      });
    }

    // Validar datos
    if (!usuarioId || !plantaId || !accion) {
      return res.status(400).json({
        success: false,
        message: "Datos incompletos"
      });
    }

    // Obtener usuario y planta
    const usuario = await Usuario.buscarPorId(usuarioId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    const planta = await Planta.buscarPorId(plantaId);
    if (!planta) {
      return res.status(404).json({
        success: false,
        message: "Planta no encontrada"
      });
    }

    let plantaActualizada;

    if (accion === 'asignar') {
      if (usuario.rol === 'tecnico') {
        // ✅ TÉCNICO: Sistema muchos-a-muchos
        const plantaCompleta = await Planta.obtenerPlantasCompletas(plantaId);
        const tecnicosActuales = plantaCompleta?.tecnicos?.map(t => t.id) || [];
        
        if (tecnicosActuales.includes(parseInt(usuarioId))) {
          return res.status(400).json({
            success: false,
            message: "El técnico ya está asignado a esta planta"
          });
        }

        const nuevosTecnicos = [...tecnicosActuales, parseInt(usuarioId)];
        plantaActualizada = await Planta.asignarTecnicos(plantaId, nuevosTecnicos);
        
      } else if (usuario.rol === 'cliente') {
        // ✅ CLIENTE: Sistema muchos-a-muchos (pero con restricción de 1 planta por cliente)
        const plantaCompleta = await Planta.obtenerPlantasCompletas(plantaId);
        const clientesActuales = plantaCompleta?.clientes?.map(c => c.id) || [];
        
        // Verificar que el cliente no tenga ya una planta asignada (en CUALQUIER planta)
        const plantasDelCliente = await Planta.obtenerPorCliente(usuarioId);
        if (plantasDelCliente.length > 0) {
          return res.status(400).json({
            success: false,
            message: "El cliente ya tiene una planta asignada"
          });
        }

        // Verificar si ya está en esta planta
        if (clientesActuales.includes(parseInt(usuarioId))) {
          return res.status(400).json({
            success: false,
            message: "El cliente ya está asignado a esta planta"
          });
        }

        // Agregar el nuevo cliente
        const nuevosClientes = [...clientesActuales, parseInt(usuarioId)];
        plantaActualizada = await Planta.asignarClientes(plantaId, nuevosClientes);
      } else {
        return res.status(400).json({
          success: false,
          message: "Solo se pueden asignar plantas a técnicos y clientes"
        });
      }
    } else if (accion === 'desasignar') {
      if (usuario.rol === 'tecnico') {
        // ✅ TÉCNICO: Quitar de lista
        const plantaCompleta = await Planta.obtenerPlantasCompletas(plantaId);
        const tecnicosActuales = plantaCompleta?.tecnicos?.map(t => t.id) || [];
        
        const nuevosTecnicos = tecnicosActuales.filter(id => id !== parseInt(usuarioId));
        plantaActualizada = await Planta.asignarTecnicos(plantaId, nuevosTecnicos);
        
      } else if (usuario.rol === 'cliente') {
        // ✅ CLIENTE: Quitar de lista
        const plantaCompleta = await Planta.obtenerPlantasCompletas(plantaId);
        const clientesActuales = plantaCompleta?.clientes?.map(c => c.id) || [];
        
        const nuevosClientes = clientesActuales.filter(id => id !== parseInt(usuarioId));
        plantaActualizada = await Planta.asignarClientes(plantaId, nuevosClientes);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Acción no válida"
      });
    }

    res.status(200).json({
      success: true,
      message: `Planta ${accion === 'asignar' ? 'asignada' : 'desasignada'} correctamente`,
      planta: plantaActualizada
    });

  } catch (error) {
    console.log("❌ [PLANTA CONTROLLER] Error asignando planta:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ Obtener plantas por usuario
export const obtenerPlantasUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;

    console.log('🔍 [PLANTA CONTROLLER] Obteniendo plantas para usuario:', usuarioId);

    const usuario = await Usuario.buscarPorId(usuarioId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    let plantas;

    if (usuario.rol === 'tecnico') {
      plantas = await Planta.obtenerPorTecnico(usuarioId);
    } else if (usuario.rol === 'cliente') {
      plantas = await Planta.obtenerPorCliente(usuarioId);
    } else {
      return res.status(400).json({
        success: false,
        message: "Solo se pueden obtener plantas de técnicos y clientes"
      });
    }

    res.status(200).json({
      success: true,
      plantas
    });

  } catch (error) {
    console.log("❌ [PLANTA CONTROLLER] Error obteniendo plantas usuario:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ Obtener planta completa con técnicos y clientes
export const obtenerPlantaCompleta = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 [PLANTA CONTROLLER] Obteniendo planta completa:', id);

    const plantaCompleta = await Planta.obtenerPlantasCompletas(id);

    if (!plantaCompleta) {
      return res.status(404).json({
        success: false,
        message: "Planta no encontrada"
      });
    }

    res.status(200).json({
      success: true,
      planta: plantaCompleta
    });

  } catch (error) {
    console.log("❌ [PLANTA CONTROLLER] Error obteniendo planta completa:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ Asignar múltiples técnicos a una planta
export const asignarMultiplesTecnicos = async (req, res) => {
  try {
    const { id } = req.params;
    const { tecnicosIds } = req.body;

    console.log('👥 [PLANTA CONTROLLER] Asignando múltiples técnicos:', { plantaId: id, tecnicosIds });

    if (!tecnicosIds || !Array.isArray(tecnicosIds)) {
      return res.status(400).json({
        success: false,
        message: "Lista de técnicos es requerida"
      });
    }

    const plantaActualizada = await Planta.asignarTecnicos(id, tecnicosIds);

    res.status(200).json({
      success: true,
      message: `${tecnicosIds.length} técnicos asignados correctamente a la planta`,
      planta: plantaActualizada
    });

  } catch (error) {
    console.log("❌ [PLANTA CONTROLLER] Error asignando múltiples técnicos:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ Asignar múltiples clientes a una planta
export const asignarMultiplesClientes = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientesIds } = req.body;

    console.log('👥 [PLANTA CONTROLLER] Asignando múltiples clientes:', { plantaId: id, clientesIds });

    if (!clientesIds || !Array.isArray(clientesIds)) {
      return res.status(400).json({
        success: false,
        message: "Lista de clientes es requerida"
      });
    }

    // Verificar que ningún cliente ya tenga planta asignada
    for (const clienteId of clientesIds) {
      const plantasDelCliente = await Planta.obtenerPorCliente(clienteId);
      if (plantasDelCliente.length > 0) {
        return res.status(400).json({
          success: false,
          message: `El cliente ${clienteId} ya tiene una planta asignada`
        });
      }
    }

    const plantaActualizada = await Planta.asignarClientes(id, clientesIds);

    res.status(200).json({
      success: true,
      message: `${clientesIds.length} clientes asignados correctamente a la planta`,
      planta: plantaActualizada
    });

  } catch (error) {
    console.log("❌ [PLANTA CONTROLLER] Error asignando múltiples clientes:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ Obtener todas las plantas con relaciones completas
export const obtenerPlantasCompletas = async (req, res) => {
  try {
    const { limite = 50, pagina = 1 } = req.query;

    console.log('🔍 [PLANTA CONTROLLER] Obteniendo todas las plantas completas');

    const plantas = await Planta.obtenerTodas(limite, pagina);

    const plantasCompletas = await Promise.all(
      plantas.map(async (planta) => {
        try {
          return await Planta.obtenerPlantasCompletas(planta.id);
        } catch (error) {
          console.error(`Error obteniendo planta completa ${planta.id}:`, error);
          return planta;
        }
      })
    );

    res.status(200).json({
      success: true,
      plantas: plantasCompletas,
      paginacion: {
        limite: parseInt(limite),
        pagina: parseInt(pagina)
      }
    });

  } catch (error) {
    console.log("❌ [PLANTA CONTROLLER] Error obteniendo plantas completas:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


