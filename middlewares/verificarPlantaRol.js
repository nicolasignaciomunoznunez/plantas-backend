// ✅ NUEVO: Middleware para filtrar plantas según el rol del usuario
export const filtrarPlantasPorRol = () => {
  return async (req, res, next) => {
    try {
      const usuario = await Usuario.buscarPorId(req.usuarioId);
      
      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado."
        });
      }

      // Agregar filtros al request para que los controladores los usen
      req.filtrosPlanta = {};
      
      switch (usuario.rol) {
        case 'superadmin':
          // Sin filtros - ve todo
          break;
          
        case 'admin':
        case 'tecnico':
          // Solo plantas asignadas a este técnico/admin
          req.filtrosPlanta.tecnicoId = usuario.id;
          break;
          
        case 'cliente':
          // Solo su planta asignada
          req.filtrosPlanta.clienteId = usuario.id;
          break;
          
        default:
          req.filtrosPlanta.clienteId = usuario.id; // Por defecto
      }

      console.log(`🔍 [FILTRO] Usuario ${usuario.rol} - Filtros:`, req.filtrosPlanta);
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