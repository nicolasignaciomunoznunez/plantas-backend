import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { generarTokenYEstablecerCookie } from "../utils/generarTokenYEstablecerCookie.js";
import  EmailService  from "../services/BrevoService.js";
import { Usuario } from "../models/usuarioModel.js";

export const registrar = async (req, res) => {
  const { email, password, nombre, rol } = req.body;

  try {
    if (!email || !password || !nombre) {
      return res.status(400).json({ success: false, message: "Complete todos los campos" });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Formato de email inválido" });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const usuarioYaExiste = await Usuario.buscarPorEmail(email);
    console.log("Verificando si usuario existe:", usuarioYaExiste);

    if (usuarioYaExiste) {
      return res.status(400).json({ success: false, message: "El usuario ya existe" });
    }

    const contraseñaHasheada = await bcryptjs.hash(password, 10);
    
    // Generar token de verificación de email (6 dígitos)
    const tokenVerificacion = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenVerificacionExpira = new Date(Date.now() + 24 * 60 * 60 * 1000); 

    // Crear usuario con la nueva estructura
    const nuevoUsuario = await Usuario.crear({
      email,
      password_hash: contraseñaHasheada,
      nombre,
      rol: rol || 'cliente',
      verificationToken: tokenVerificacion, 
      verificationTokenExpiresAt: tokenVerificacionExpira,  
    });

    const token = generarTokenYEstablecerCookie(res, nuevoUsuario.id);

    // Enviar email de verificación
    const emailResult = await EmailService.sendVerificationEmail(
      nuevoUsuario.email, 
      tokenVerificacion, 
      nuevoUsuario.nombre
    );

    if (!emailResult.success) {
      console.warn('⚠️ Usuario creado pero email no enviado:', emailResult.error);
    }

    res.status(201).json({
      success: true,
      message: "Usuario creado correctamente" + (emailResult.success ? "" : " (pero email no enviado)"),
      usuario: {
        id: nuevoUsuario.id,
        email: nuevoUsuario.email,
        nombre: nuevoUsuario.nombre,
        rol: nuevoUsuario.rol,
        estaVerificado: false, // Siempre false al registrar
        creadoEn: nuevoUsuario.creadoEn || nuevoUsuario.createdAt,
        actualizadoEn: nuevoUsuario.actualizadoEn || nuevoUsuario.updatedAt
      },
      token: token,
    });
  } catch (error) {
    console.log("Error en registro:", error);
    if (error.message.includes('ER_DUP_ENTRY') || error.message.includes('El email ya está registrado')) {
      return res.status(400).json({ success: false, message: "El usuario ya existe" });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const verificarEmail = async (req, res) => {
  const { code } = req.body;
  
  console.log('📧 Código recibido en backend:', code);
  
  try {
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        message: "Código de verificación es requerido" 
      });
    }

    const usuario = await Usuario.buscarPorTokenVerificacion(code);
    
    if (!usuario) {
      return res.status(400).json({ success: false, message: "Código inválido o ya expirado." });
    }

    if (usuario.verificationTokenExpiresAt < new Date()) {  
      return res.status(400).json({ success: false, message: "Código inválido o ya expirado." });
    }

    const usuarioActualizado = await Usuario.verificarUsuario(usuario.id);

    // Enviar email de bienvenida
    await EmailService.sendWelcomeEmail(usuarioActualizado.email, usuarioActualizado.nombre);

    res.status(200).json({
      success: true,
      message: "Email verificado correctamente",
      usuario: usuarioActualizado
    });
  } catch (error) {
    console.log("Error en la verificación del email:", error);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
};

export const iniciarSesion = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email y contraseña son requeridos" 
      });
    }

    // Buscar usuario
    const usuario = await Usuario.buscarPorEmail(email);
    if (!usuario) {
      return res.status(400).json({ 
        success: false, 
        message: "Credenciales inválidas" 
      });
    }
    
    // Verificar si el usuario está verificado
    const estaVerificado = usuario.estaVerificado || usuario.isVerified;
    if (!estaVerificado) {
      return res.status(400).json({ 
        success: false, 
        message: "Por favor verifica tu email antes de iniciar sesión" 
      });
    }

    // Verificar contraseña
    const esContraseñaValida = await bcryptjs.compare(password, usuario.password_hash);
    if (!esContraseñaValida) {
      return res.status(400).json({ 
        success: false, 
        message: "Credenciales inválidas" 
      });
    }

    // Generar token y actualizar último inicio de sesión
    const token = generarTokenYEstablecerCookie(res, usuario.id);
    await Usuario.actualizarUltimoInicioSesion(usuario.id);
    
    // Obtener usuario actualizado
    const usuarioActualizado = await Usuario.buscarPorId(usuario.id);

    // Respuesta consistente
    res.status(200).json({
      success: true,
      message: "Conectado correctamente",
      usuario: {
        id: usuarioActualizado.id,
        email: usuarioActualizado.email,
        nombre: usuarioActualizado.nombre,
        rol: usuarioActualizado.rol,
        estaVerificado: true,
        ultimoInicioSesion: usuarioActualizado.ultimoInicioSesion || usuarioActualizado.lastLogin,
        creadoEn: usuarioActualizado.creadoEn || usuarioActualizado.createdAt,
        actualizadoEn: usuarioActualizado.actualizadoEn || usuarioActualizado.updatedAt
      },
      token: token,
    });
  } catch (error) {
    console.log("Error al iniciar sesión:", error);
    res.status(400).json({ 
      success: false, 
      message: "Error del servidor" 
    });
  }
};

export const cerrarSesion = async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ 
    success: true, 
    message: "Sesión cerrada correctamente" 
  });
};

export const olvideContraseña = async (req, res) => {
  const { email } = req.body;
  
  try {
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "El email es requerido" 
      });
    }

    const usuario = await Usuario.buscarPorEmail(email);

    if (!usuario) {
      // Por seguridad, no revelar si el email existe
      return res.status(200).json({ 
        success: true, 
        message: "Si el email existe, se enviarán instrucciones para restablecer la contraseña" 
      });
    }

    const tokenRestablecimiento = crypto.randomBytes(20).toString("hex");
    const tokenRestablecimientoExpira = new Date(Date.now() + 1 * 60 * 60 * 1000);

    await Usuario.establecerTokenRestablecimiento(usuario.id, tokenRestablecimiento, tokenRestablecimientoExpira);

    // Enviar email de restablecimiento
    await EmailService.sendPasswordResetEmail(usuario.email, tokenRestablecimiento, usuario.nombre);

    res.status(200).json({ 
      success: true, 
      message: "Si el email existe, se enviarán instrucciones para restablecer la contraseña" 
    });
  } catch (error) {
    console.log("Error en olvideContraseña:", error);
    res.status(400).json({ 
      success: false, 
      message: "Error del servidor" 
    });
  }
};

export const restablecerContraseña = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "La contraseña debe tener al menos 6 caracteres" 
      });
    }

    const usuario = await Usuario.buscarPorTokenRestablecimiento(token);

    if (!usuario) {
      return res.status(400).json({ 
        success: false, 
        message: "Token inválido o expirado" 
      });
    }

    const contraseñaHasheada = await bcryptjs.hash(password, 10);
    await Usuario.actualizarContraseña(usuario.id, contraseñaHasheada);

    // Enviar confirmación
    await EmailService.sendPasswordResetConfirmation(usuario.email, usuario.nombre);

    res.status(200).json({ 
      success: true, 
      message: "Contraseña restablecida exitosamente" 
    });
  } catch (error) {
    console.log("Error en restablecerContraseña:", error);
    res.status(400).json({ 
      success: false, 
      message: "Error del servidor" 
    });
  }
};

export const verificarAutenticacion = async (req, res) => {
  try {
    console.log('🔐 [AUTH CONTROLLER] Verificando autenticación - usuarioId:', req.usuarioId);
    
    if (!req.usuarioId) {
      console.log('❌ [AUTH CONTROLLER] Usuario NO autenticado');
      return res.status(200).json({ 
        success: false, 
        message: "No autenticado",
        usuario: null 
      });
    }

    // ✅ CRÍTICO: Obtener el usuario ACTUALIZADO de la base de datos
    const usuarioActual = await Usuario.buscarPorId(req.usuarioId);
    
    if (!usuarioActual) {
      console.log('❌ [AUTH CONTROLLER] Usuario no encontrado en BD');
      return res.status(200).json({ 
        success: false, 
        message: "Usuario no encontrado",
        usuario: null 
      });
    }

    console.log('🔐 [AUTH CONTROLLER] Usuario de BD:', {
      id: usuarioActual.id,
      email: usuarioActual.email,
      rol: usuarioActual.rol // ← Este es el rol REAL de la base de datos
    });

    const usuarioSinContraseña = {
      id: usuarioActual.id,
      email: usuarioActual.email,
      nombre: usuarioActual.nombre,
      rol: usuarioActual.rol, // ← Usar el rol de la BD, no del req.usuario
      estaVerificado: usuarioActual.estaVerificado || usuarioActual.isVerified || false,
      ultimoInicioSesion: usuarioActual.ultimoInicioSesion || usuarioActual.lastLogin,
      creadoEn: usuarioActual.creadoEn || usuarioActual.createdAt,
      actualizadoEn: usuarioActual.actualizadoEn || usuarioActual.updatedAt
    };

    console.log('✅ [AUTH CONTROLLER] Usuario autenticado:', usuarioSinContraseña.email, 'Rol:', usuarioSinContraseña.rol);
    res.status(200).json({ 
      success: true, 
      usuario: usuarioSinContraseña 
    });
  } catch (error) {
    console.log("Error en verificarAutenticacion:", error);
    res.status(200).json({ 
      success: false, 
      message: "Error de autenticación",
      usuario: null
    });
  }
};

export const obtenerPerfil = async (req, res) => {
  try {
    console.log('🔄 [AUTH CONTROLLER] Obteniendo perfil usuario:', req.usuarioId);
    
    const usuario = await Usuario.buscarPorId(req.usuarioId);
    
    if (!usuario) {
      return res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado" 
      });
    }

    res.status(200).json({
      success: true,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        estaVerificado: usuario.estaVerificado || usuario.isVerified || false,
        ultimoInicioSesion: usuario.ultimoInicioSesion || usuario.lastLogin,
        creadoEn: usuario.creadoEn || usuario.createdAt,
        actualizadoEn: usuario.actualizadoEn || usuario.updatedAt
      }
    });
  } catch (error) {
    console.log("❌ [AUTH CONTROLLER] Error en obtenerPerfil:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error del servidor" 
    });
  }
};

export const obtenerTodosLosUsuarios = async (req, res) => {
  try {
    const { limite = 10, pagina = 1 } = req.query;
    const usuarios = await Usuario.obtenerTodos(parseInt(limite), parseInt(pagina));

    res.status(200).json({
      success: true,
      usuarios,
      paginacion: {
        limite: parseInt(limite),
        pagina: parseInt(pagina)
      }
    });
  } catch (error) {
    console.log("Error al obtener usuarios:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const actualizarPerfil = async (req, res) => {
  try {
    const { nombre, email } = req.body;
    console.log('🔄 [AUTH CONTROLLER] Actualizando perfil usuario:', req.usuarioId);
    
    if (!nombre || !email) {
      return res.status(400).json({ 
        success: false, 
        message: "Nombre y email son requeridos" 
      });
    }

    const usuarioActualizado = await Usuario.actualizarPerfil(req.usuarioId, {
      nombre,
      email
    });

    res.status(200).json({
      success: true,
      message: "Perfil actualizado correctamente",
      usuario: {
        id: usuarioActualizado.id,
        email: usuarioActualizado.email,
        nombre: usuarioActualizado.nombre,
        rol: usuarioActualizado.rol,
        estaVerificado: usuarioActualizado.estaVerificado || usuarioActualizado.isVerified || false,
        ultimoInicioSesion: usuarioActualizado.ultimoInicioSesion || usuarioActualizado.lastLogin,
        creadoEn: usuarioActualizado.creadoEn || usuarioActualizado.createdAt,
        actualizadoEn: usuarioActualizado.actualizadoEn || usuarioActualizado.updatedAt
      }
    });
  } catch (error) {
    console.log("❌ [AUTH CONTROLLER] Error en actualizarPerfil:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const cambiarContraseña = async (req, res) => {
  try {
    const { contraseñaActual, nuevaContraseña } = req.body;
    console.log('🔄 [AUTH CONTROLLER] Cambiando contraseña usuario:', req.usuarioId);
    
    if (!contraseñaActual || !nuevaContraseña) {
      console.log('❌ [AUTH CONTROLLER] Campos faltantes');
      return res.status(400).json({ 
        success: false, 
        message: "Todos los campos son requeridos" 
      });
    }

    if (nuevaContraseña.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "La nueva contraseña debe tener al menos 6 caracteres" 
      });
    }

    const usuario = await Usuario.buscarPorId(req.usuarioId);
    
    if (!usuario) {
      console.log('❌ [AUTH CONTROLLER] Usuario no encontrado');
      return res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado" 
      });
    }

    console.log('🔑 [AUTH CONTROLLER] Verificando contraseña actual...');
    const esContraseñaValida = await bcryptjs.compare(contraseñaActual, usuario.password_hash);
    
    if (!esContraseñaValida) {
      console.log('❌ [AUTH CONTROLLER] Contraseña actual incorrecta');
      return res.status(400).json({ 
        success: false, 
        message: "La contraseña actual es incorrecta" 
      });
    }

    console.log('🔑 [AUTH CONTROLLER] Hasheando nueva contraseña...');
    const nuevaContraseñaHasheada = await bcryptjs.hash(nuevaContraseña, 10);
    await Usuario.actualizarContraseña(req.usuarioId, nuevaContraseñaHasheada);

    console.log('✅ [AUTH CONTROLLER] Contraseña cambiada exitosamente');
    res.status(200).json({
      success: true,
      message: "Contraseña actualizada correctamente"
    });
  } catch (error) {
    console.log("❌ [AUTH CONTROLLER] Error en cambiarContraseña:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }


};

// ✅ Obtener todos los usuarios (solo superadmin/admin)
export const obtenerUsuarios = async (req, res) => {
  try {
    console.log('👥 [AUTH CONTROLLER] Obteniendo lista de usuarios');

    // Verificar permisos
    if (!['superadmin', 'admin'].includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para ver todos los usuarios"
      });
    }

    const { limite = 50, pagina = 1, rol } = req.query;
    
    // ✅ SANITIZACIÓN COMPLETA DE PARÁMETROS
    const limiteNum = Math.max(1, Math.min(100, parseInt(limite) || 50));
    const paginaNum = Math.max(1, parseInt(pagina) || 1);
    const rolProcesado = (rol && rol !== '' && ['admin', 'tecnico', 'cliente'].includes(rol)) ? rol : null;

    console.log('📊 [AUTH CONTROLLER] Parámetros sanitizados:', {
      limite: limiteNum,
      pagina: paginaNum, 
      rol: rolProcesado
    });

    // ✅ LLAMADA SEGURA AL MODELO
    const usuarios = await Usuario.obtenerTodos(limiteNum, paginaNum, rolProcesado);

    res.status(200).json({
      success: true,
      usuarios: usuarios.map(usuario => ({
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        estaVerificado: usuario.estaVerificado || usuario.isVerified || false,
        ultimoInicioSesion: usuario.ultimoInicioSesion || usuario.lastLogin,
        createdAt: usuario.creadoEn || usuario.createdAt
      })),
      paginacion: {
        limite: limiteNum,
        pagina: paginaNum
      }
    });
  } catch (error) {
    console.log("❌ [AUTH CONTROLLER] Error obteniendo usuarios:", error);
    res.status(500).json({
      success: false,
      message: "Error del servidor al obtener usuarios"
    });
  }
};

// ✅ Actualizar rol de usuario (solo superadmin)
export const actualizarRolUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { nuevoRol } = req.body;

    console.log('🔄 [AUTH CONTROLLER] Actualizando rol usuario:', { usuarioId, nuevoRol });

    // Solo superadmin puede cambiar roles
    if (req.usuario.rol !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: "Solo el superadmin puede cambiar roles de usuarios"
      });
    }

    // Validar rol
    const rolesPermitidos = ['admin', 'tecnico', 'cliente'];
    if (!rolesPermitidos.includes(nuevoRol)) {
      return res.status(400).json({
        success: false,
        message: "Rol no válido"
      });
    }

    // No permitir cambiar el rol del propio superadmin
    if (parseInt(usuarioId) === req.usuario.id) {
      return res.status(400).json({
        success: false,
        message: "No puedes cambiar tu propio rol"
      });
    }

    const usuarioActualizado = await Usuario.actualizarRol(usuarioId, nuevoRol);

    res.status(200).json({
      success: true,
      message: "Rol actualizado correctamente",
      usuario: {
        id: usuarioActualizado.id,
        nombre: usuarioActualizado.nombre,
        email: usuarioActualizado.email,
        rol: usuarioActualizado.rol
      }
    });
  } catch (error) {
    console.log("❌ [AUTH CONTROLLER] Error actualizando rol:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};