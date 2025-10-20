import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { testConnection } from "./db/connectDB.js";
import { verifyEmailConnection } from "./config/emailConfig.js";

// Importar rutas
import authRoutes from "./routes/authRoutes.js";
import plantaRoutes from "./routes/plantaRoutes.js";
import datoPlantaRoutes from "./routes/datoPlantaRoutes.js";
import incidenciaRoutes from "./routes/incidenciaRoutes.js";
import mantenimientoRoutes from "./routes/mantenimientoRoutes.js";
import reporteRoutes from "./routes/reporteRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

const app = express();
const PORT = process.env.PORT || 8080;

// 🔧 DIAGNÓSTICO MEJORADO - AL INICIO
console.log('🔧 [EMAIL ENV DEBUG] === VERIFICANDO VARIABLES DE EMAIL ===');
const emailVars = [
  'EMAIL_SERVICE',
  'EMAIL_USER', 
  'EMAIL_APP_PASSWORD',
  'EMAIL_FROM_NAME',
  'EMAIL_FROM_ADDRESS'
];

emailVars.forEach(key => {
  const value = process.env[key];
  if (value) {
    if (key.includes('PASSWORD')) {
      console.log(`   ✅ ${key}: ✅ PRESENTE (${value.length} caracteres)`);
      console.log(`      Inicia con SG.: ${value.startsWith('SG.') ? '✅ SÍ' : '❌ NO'}`);
    } else {
      console.log(`   ✅ ${key}: ${value}`);
    }
  } else {
    console.log(`   ❌ ${key}: UNDEFINED`);
  }
});
console.log('==========================================');

console.log('🚀 INICIANDO EN PUERTO:', PORT);

// CORS permisivo
app.use(cors({ origin: true, credentials: true }));

// Middlewares
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Demasiadas solicitudes' }
}));

// Trust proxy
app.set('trust proxy', 1);

// Logging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/plantas", plantaRoutes);
app.use("/api/datos-planta", datoPlantaRoutes);
app.use("/api/incidencias", incidenciaRoutes);
app.use("/api/mantenimientos", mantenimientoRoutes);
app.use("/api/reportes", reporteRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ✅ RUTA DE TEST EMAIL MEJORADA
app.post("/api/test-sendgrid-api", async (req, res) => {
  try {
    console.log('🧪 [SENDGRID API TEST] Iniciando...');
    
    // Verificar configuración antes de importar
    console.log('🔧 [TEST] Configuración actual:');
    console.log('   EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? `✅ (${process.env.EMAIL_APP_PASSWORD.length} chars)` : '❌ Faltante');
    console.log('   EMAIL_FROM_ADDRESS:', process.env.EMAIL_FROM_ADDRESS || '❌ Faltante');
    console.log('   EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME || '❌ Faltante');
    
    if (!process.env.EMAIL_APP_PASSWORD || !process.env.EMAIL_FROM_ADDRESS) {
      return res.status(500).json({
        success: false,
        error: 'Configuración de email incompleta',
        missing: {
          EMAIL_APP_PASSWORD: !process.env.EMAIL_APP_PASSWORD,
          EMAIL_FROM_ADDRESS: !process.env.EMAIL_FROM_ADDRESS
        }
      });
    }
    
    const { SendGridService } = await import('./services/sendgridService.js');
    
    const result = await SendGridService.sendVerificationEmail(
      process.env.EMAIL_FROM_ADDRESS, // Enviar a ti mismo
      '123456', 
      'Test User'
    );
    
    console.log('🧪 Resultado:', result);
    
    res.json({
      success: result.success,
      message: result.success ? '✅ Email enviado via SendGrid API' : '❌ Error',
      result: result
    });
    
  } catch (error) {
    console.error('🧪 ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

// ✅ NUEVO: ENDPOINT DE CONFIGURACIÓN DE EMAIL COMPLETA
app.get("/api/email-config", (req, res) => {
  const config = {
    EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'UNDEFINED',
    EMAIL_USER: process.env.EMAIL_USER || 'UNDEFINED',
    EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD ? 
      `PRESENTE (${process.env.EMAIL_APP_PASSWORD.length} chars, starts with SG.: ${process.env.EMAIL_APP_PASSWORD.startsWith('SG.')})` : 'UNDEFINED',
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'UNDEFINED',
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'UNDEFINED',
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
  const allEmailVars = Object.keys(process.env).filter(key => 
    key.includes('EMAIL') || key.includes('SENDGRID')
  );
  
  res.json({
    success: true,
    emailConfig: config,
    allEmailVariables: allEmailVars,
    status: {
      hasAppPassword: !!process.env.EMAIL_APP_PASSWORD,
      hasFromAddress: !!process.env.EMAIL_FROM_ADDRESS,
      isValidApiKey: process.env.EMAIL_APP_PASSWORD ? process.env.EMAIL_APP_PASSWORD.startsWith('SG.') : false,
      canSendEmail: !!process.env.EMAIL_APP_PASSWORD && !!process.env.EMAIL_FROM_ADDRESS
    }
  });
});

// Health check en raíz
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "✅ API de Plantas funcionando",
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV
  });
});

app.get("/api/health", async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    success: true,
    message: "✅ Health check OK",
    database: dbStatus ? "connected" : "disconnected",
    port: PORT
  });
});

app.get("/api/debug-env", (req, res) => {
  res.json({
    emailAppPassword: process.env.EMAIL_APP_PASSWORD ? 
      `✅ Presente (${process.env.EMAIL_APP_PASSWORD.length} caracteres)` : '❌ FALTANTE',
    emailFromAddress: process.env.EMAIL_FROM_ADDRESS || '❌ FALTANTE',
    emailFromName: process.env.EMAIL_FROM_NAME || '❌ FALTANTE',
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('EMAIL') || key.includes('SENDGRID')
    )
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', async () => {
  console.log("==========================================");
  console.log(`🚀 SERVIDOR INICIADO EN PUERTO: ${PORT}`);
  console.log("==========================================");
  
  const dbConnected = await testConnection();
  console.log("🗄️ Base de datos:", dbConnected ? "✅ CONECTADA" : "❌ DESCONECTADA");
  
  // ✅ VERIFICAR CONEXIÓN DE EMAIL AL INICIAR
 // console.log("📧 Verificando configuración de email...");
 // const emailConnected = await verifyEmailConnection();
 // console.log("📧 Email service:", emailConnected ? "✅ CONECTADO" : "❌ ERROR");
  
  console.log("🌍 Entorno:", process.env.NODE_ENV);
  console.log("🔗 El dominio debería funcionar ahora");
  console.log("==========================================");
});

// Manejo de errores
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: "Ruta no encontrada" });
});