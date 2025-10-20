import jwt from "jsonwebtoken";
import { Usuario } from "../models/usuarioModel.js";

// ✅ NUEVA VERSIÓN: Middleware que NO bloquea cuando no hay token
export const verificarTokenOpcional = async (req, res, next) => {
  let token;
  
  // Buscar token en headers o cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('🔐 [MIDDLEWARE] Token encontrado en Authorization header');
  } else if (req.cookies.token) {
    token = req.cookies.token;
    console.log('🔐 [MIDDLEWARE] Token encontrado en cookies');
  }
  
  // ✅ CAMBIO CRÍTICO: Si no hay token, CONTINUAR sin error
  if (!token) {
    console.log('🔐 [MIDDLEWARE] No hay token - continuando sin autenticación');
    req.usuarioId = null;
    req.usuario = null;
    return next();
  }
  
  try {
    const decodificado = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decodificado) {
      console.log('❌ [MIDDLEWARE] Token inválido - continuando sin autenticación');
      req.usuarioId = null;
      req.usuario = null;
      return next();
    }

    // Verificar que el usuario existe en la base de datos
    const usuario = await Usuario.buscarPorId(decodificado.usuarioId);
    
    if (!usuario) {
      console.log('❌ [MIDDLEWARE] Usuario no encontrado - continuando sin autenticación');
      req.usuarioId = null;
      req.usuario = null;
      return next();
    }

    // ✅ Opcional: verificar si el usuario está verificado
    if (!usuario.estaVerificado) {
      console.log('⚠️ [MIDDLEWARE] Usuario no verificado - continuando sin autenticación');
      req.usuarioId = null;
      req.usuario = null;
      return next();
    }

    req.usuarioId = decodificado.usuarioId;
    req.usuario = usuario;
    console.log('✅ [MIDDLEWARE] Usuario autenticado:', usuario.email);
    next();
  } catch (error) {
    console.log("❌ [MIDDLEWARE] Error verificando token:", error.message);
    
    // ✅ LIMPIAR cookie si el token es inválido
    res.clearCookie("token");
    
    req.usuarioId = null;
    req.usuario = null;
    next();
  }
};

// ✅ CORREGIR NOMBRE: Cambiar "verificarTokenRequerido" por "verificarToken"
export const verificarToken = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('🔐 [MIDDLEWARE REQUERIDO] Token encontrado en headers');
  } else if (req.cookies.token) {
    token = req.cookies.token;
    console.log('🔐 [MIDDLEWARE REQUERIDO] Token encontrado en cookies');
  }
  
  if (!token) {
    console.log('❌ [MIDDLEWARE REQUERIDO] No hay token - ERROR 401');
    return res.status(401).json({ 
      success: false, 
      message: "No estás autorizado para ver este contenido" 
    });
  }
  
  try {
    const decodificado = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.buscarPorId(decodificado.usuarioId);
    
    if (!usuario) {
      console.log('❌ [MIDDLEWARE REQUERIDO] Usuario no encontrado - ERROR 401');
      return res.status(401).json({ 
        success: false, 
        message: "Usuario no encontrado" 
      });
    }

    req.usuarioId = decodificado.usuarioId;
    req.usuario = usuario;
    console.log('✅ [MIDDLEWARE REQUERIDO] Usuario autenticado:', usuario.email);
    next();
  } catch (error) {
    console.log("❌ [MIDDLEWARE REQUERIDO] Error:", error.message);
    res.clearCookie("token");
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: "Token expirado" });
    }
    
    return res.status(401).json({ success: false, message: "Token inválido" });
  }
};

// Middleware para verificar rol específico
export const verificarRol = (rolesPermitidos = []) => {
  return async (req, res, next) => {
    try {
      const usuario = await Usuario.buscarPorId(req.usuarioId);
      
      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado."
        });
      }

      // ✅ SUPERADMIN tiene acceso total sin importar rolesPermitidos
      if (usuario.rol === 'superadmin') {
        console.log('✅ [SUPERADMIN] Acceso total concedido');
        return next();
      }

      // ✅ Para otros roles, verificar si están en los permitidos
      if (!rolesPermitidos.includes(usuario.rol)) {
        return res.status(403).json({
          success: false,
          message: "No tienes permisos para realizar esta acción."
        });
      }

      console.log(`✅ [${usuario.rol}] Acceso concedido para roles:`, rolesPermitidos);
      next();
    } catch (error) {
      console.log("Error en verificación de rol:", error);
      res.status(500).json({
        success: false,
        message: "Error del servidor en verificación de permisos."
      });
    }
  };
};

// ✅ CORREGIR: Actualizar la referencia aquí también
export const autenticarYAutorizar = (rolesPermitidos = []) => {
  return [
    verificarToken, // ✅ Ahora esta función existe
    verificarRol(rolesPermitidos)
  ];
};