import { Usuario } from "../models/usuarioModel.js";

// ✅ CORREGIDO: Usando la tabla usuario_plantas
export const filtrarPlantasPorRol = () => {
  return async (req, res, next) => {
    try {
      console.log('🔍 [FILTER MIDDLEWARE] Iniciando - usuarioId:', req.usuarioId);
      
      if (!req.usuarioId) {
        console.log('🔍 [FILTER MIDDLEWARE] Sin usuario - sin filtros');
        req.filtrosPlanta = {};
        return next();
      }

      const usuario = await Usuario.buscarPorId(req.usuarioId);

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado."
        });
      }

      req.filtrosPlanta = {};
      
      switch (usuario.rol) {
        case 'superadmin':
          // Sin filtros - ve todo
          console.log('👑 [SUPERADMIN] Acceso total a todas las plantas');
          break;
          
        case 'admin':
        case 'tecnico':
          // ✅ CORREGIDO: Obtener plantas desde usuario_plantas
          const plantasAdminTecnico = await Usuario.obtenerPlantaIdsAsignadas(usuario.id);
          req.filtrosPlanta.plantaIds = plantasAdminTecnico;
          console.log(`🔧 [${usuario.rol.toUpperCase()}] Plantas asignadas:`, plantasAdminTecnico);
          break;
          
        case 'cliente':
          // ✅ CORREGIDO: Obtener plantas desde usuario_plantas
          const plantasCliente = await Usuario.obtenerPlantaIdsAsignadas(usuario.id);
          req.filtrosPlanta.plantaIds = plantasCliente;
          console.log(`👤 [CLIENTE] Plantas asignadas:`, plantasCliente);
          break;
          
        default:
          req.filtrosPlanta.plantaIds = [];
      }

      console.log(`🔍 [FILTRO FINAL] Usuario ${usuario.rol} - Filtros:`, req.filtrosPlanta);
      next();
      
    } catch (error) {
      console.log("Error en filtrado por rol:", error);
      res.status(500).json({
        success: false,
        message: "Error del servidor en filtrado de permisos."
      });
    }
  };
};

// ✅ CORREGIDO: Solo SUPERADMIN puede crear plantas
export const prevenirCreacionPlantas = () => {
  return async (req, res, next) => {
    try {
      const usuario = await Usuario.buscarPorId(req.usuarioId);
      
      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado."
        });
      }

      // ✅ SOLO superadmin puede crear plantas
      if (usuario.rol !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: "No tienes permisos para crear plantas. Solo el superadministrador puede realizar esta acción."
        });
      }

      console.log(`✅ [CREACIÓN PLANTA] Permiso concedido para: ${usuario.rol}`);
      next();
    } catch (error) {
      console.log("Error en verificación de creación de plantas:", error);
      res.status(500).json({
        success: false,
        message: "Error del servidor en verificación de permisos."
      });
    }
  };
};