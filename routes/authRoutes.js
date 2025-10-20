// routes/authRoutes.js - VERSIÓN CORREGIDA
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
  verificarTokenOpcional  // ✅ Importar ambas funciones
} from "../middlewares/verificarToken.js";

const router = express.Router();

// Rutas públicas
router.post("/registrar", registrar);
router.post("/verificar-email", verificarEmail);
router.post("/iniciar-sesion", iniciarSesion);
router.post("/olvide-contraseña", olvideContraseña);
router.post("/restablecer-contraseña/:token", restablecerContraseña);
router.put('/perfil', verificarToken, actualizarPerfil);
router.post('/cambiar-password', verificarToken, cambiarContraseña);

// ✅ RUTA CORREGIDA: Usar middleware OPCIONAL para verificar-autenticacion
router.get("/verificar-autenticacion", verificarTokenOpcional, verificarAutenticacion);

// Rutas protegidas (requieren autenticación)
router.get("/perfil", verificarToken, obtenerPerfil);
router.post("/cerrar-sesion", verificarToken, cerrarSesion);

// En routes/auth.js - agregar estas rutas
router.get('/usuarios', verificarToken, verificarRol(['superadmin', 'admin']), obtenerUsuarios);
router.put('/usuarios/:usuarioId/rol', verificarToken, verificarRol(['superadmin']), actualizarRolUsuario);

export default router;