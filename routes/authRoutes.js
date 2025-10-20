// routes/authRoutes.js - VERSIÓN CORREGIDA Y COMPLETA
import express from "express";
import {
    registrar,
    verificarEmail,
    iniciarSesion,
    cerrarSesion,
    olvideContraseña,
    restablecerContraseña,
    verificarAutenticacion,
    obtenerPerfil,
    actualizarPerfil,
    cambiarContraseña,
    obtenerUsuarios,
    actualizarRolUsuario
} from "../controllers/authController.js";
import { 
  verificarToken, 
  verificarTokenOpcional,
  verificarRol  // ✅ AGREGAR ESTA IMPORTACIÓN
} from "../middlewares/verificarToken.js";

const router = express.Router();

// ==================== RUTAS PÚBLICAS ====================
router.post("/registrar", registrar);
router.post("/verificar-email", verificarEmail);
router.post("/iniciar-sesion", iniciarSesion);
router.post("/olvide-contraseña", olvideContraseña);
router.post("/restablecer-contraseña/:token", restablecerContraseña);

// ==================== RUTAS PROTEGIDAS ====================
// ✅ RUTA CORREGIDA: Usar middleware OPCIONAL para verificar-autenticacion
router.get("/verificar-autenticacion", verificarTokenOpcional, verificarAutenticacion);

// Perfil de usuario (todos los autenticados)
router.get("/perfil", verificarToken, obtenerPerfil);
router.put("/perfil", verificarToken, actualizarPerfil);
router.post("/cambiar-password", verificarToken, cambiarContraseña);
router.post("/cerrar-sesion", verificarToken, cerrarSesion);

// ==================== RUTAS DE ADMINISTRACIÓN ====================
// ✅ RUTAS NUEVAS: Gestión de usuarios (solo superadmin/admin)
router.get('/usuarios', verificarToken, verificarRol(['superadmin', 'admin']), obtenerUsuarios);
router.put('/usuarios/:usuarioId/rol', verificarToken, verificarRol(['superadmin']), actualizarRolUsuario);

export default router;