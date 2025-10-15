import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { testConnection } from "./db/connectDB.js";
import { verifyEmailConnection } from "./config/emailConfig.js"; // 👈 IMPORTAR

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
app.post("/api/test-sendgrid", async (req, res) => {
  try {
    console.log('🧪 TEST SENDGRID - Iniciando...');
    
    // Importar dinámicamente para evitar ciclos
    const { EmailService } = await import('./services/emailService.js');
    
    console.log('🧪 Configuración actual:');
    console.log('   EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
    console.log('   EMAIL_USER:', process.env.EMAIL_USER);
    console.log('   EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? '✅ Configurada' : '❌ Faltante');
    console.log('   EMAIL_FROM_ADDRESS:', process.env.EMAIL_FROM_ADDRESS);
    
    // Test simple de email
    const result = await EmailService.sendVerificationEmail(
      process.env.EMAIL_FROM_ADDRESS, // Enviar a ti mismo
      '999999', 
      'Test User'
    );
    
    console.log('🧪 Resultado del test:', result);
    
    res.json({
      success: result.success,
      message: result.success ? '✅ Email enviado correctamente' : '❌ Error enviando email',
      result: result,
      config: {
        emailService: process.env.EMAIL_SERVICE,
        emailUser: process.env.EMAIL_USER,
        emailFrom: process.env.EMAIL_FROM_ADDRESS,
        apiKeyLength: process.env.EMAIL_APP_PASSWORD ? process.env.EMAIL_APP_PASSWORD.length : 0
      }
    });
    
  } catch (error) {
    console.error('🧪 ERROR en test:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

// ✅ AGREGAR RUTA DE TEST EMAIL TEMPORAL
app.post("/api/test-email", async (req, res) => {
  try {
    const { EmailService } = await import("./services/emailService.js");
    const result = await EmailService.sendVerificationEmail(
      process.env.EMAIL_USER, // Enviar a ti mismo para prueba
      '999999', 
      'Test User'
    );
    
    res.json({ 
      success: true, 
      result,
      config: {
        emailUser: process.env.EMAIL_USER ? "✅ Configurado" : "❌ Faltante",
        emailPass: process.env.EMAIL_APP_PASSWORD ? "✅ Configurado" : "❌ Faltante",
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
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

// Iniciar servidor
app.listen(PORT, '0.0.0.0', async () => {
  console.log("==========================================");
  console.log(`🚀 SERVIDOR INICIADO EN PUERTO: ${PORT}`);
  console.log("==========================================");
  
  const dbConnected = await testConnection();
  console.log("🗄️ Base de datos:", dbConnected ? "✅ CONECTADA" : "❌ DESCONECTADA");
  
  // ✅ VERIFICAR CONEXIÓN DE EMAIL AL INICIAR
  console.log("📧 Verificando configuración de email...");
  const emailConnected = await verifyEmailConnection();
  console.log("📧 Email service:", emailConnected ? "✅ CONECTADO" : "❌ ERROR");
  
  console.log("🌍 Entorno:", process.env.NODE_ENV);
  console.log("🔗 El dominio debería funcionar ahora");
  console.log("==========================================");
});

// Manejo de errores
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: "Ruta no encontrada" });
});