import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { testConnection } from "./db/connectDB.js";

// Importar todas las rutas
import authRoutes from "./routes/authRoutes.js";
import plantaRoutes from "./routes/plantaRoutes.js";
import datoPlantaRoutes from "./routes/datoPlantaRoutes.js";
import incidenciaRoutes from "./routes/incidenciaRoutes.js";
import mantenimientoRoutes from "./routes/mantenimientoRoutes.js";
import reporteRoutes from "./routes/reporteRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

// ========================
// CONFIGURACIÓN INICIAL
// ========================
const app = express();
const PORT = process.env.PORT || 5000;

// ========================
// CORS COMPLETAMENTE PERMISIVO
// ========================
console.log('🔓 CONFIGURANDO CORS PERMISIVO...');

app.use(cors({
  origin: true, // PERMITIR TODOS LOS ORÍGENES
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cookie', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Set-Cookie']
}));

// Manejar preflight OPTIONS explícitamente
app.options('*', cors());

// ========================
// MIDDLEWARES
// ========================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { 
    success: false, 
    message: 'Demasiadas solicitudes desde esta IP, intenta nuevamente en 15 minutos' 
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Trust proxy para Railway
app.set('trust proxy', 1);

// Logging de requests
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// ========================
// RUTAS
// ========================
app.use("/api/auth", authRoutes);
app.use("/api/plantas", plantaRoutes);
app.use("/api/datos-planta", datoPlantaRoutes);
app.use("/api/incidencias", incidenciaRoutes);
app.use("/api/mantenimientos", mantenimientoRoutes);
app.use("/api/reportes", reporteRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ========================
// HEALTH CHECK
// ========================
app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = await testConnection();
    
    res.status(200).json({
      success: true,
      message: "✅ API de Gestión de Plantas funcionando correctamente",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: "1.0.0",
      services: {
        database: dbStatus ? "connected" : "disconnected",
        server: "running"
      },
      cors: "permissive",
      origin: req.headers.origin || 'No origin'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "❌ Health check failed",
      error: error.message
    });
  }
});

// Ruta de prueba CORS
app.get("/api/test-cors", (req, res) => {
  res.json({
    success: true,
    message: "✅ CORS funcionando correctamente",
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'No origin',
    cors: "Permisivo - Todos los orígenes permitidos"
  });
});

// Ruta específica para probar login CORS
app.post("/api/auth/test-cors", (req, res) => {
  res.json({
    success: true,
    message: "✅ Ruta de login accesible via CORS",
    timestamp: new Date().toISOString(),
    origin: req.headers.origin,
    method: "POST",
    cors: "Funcionando"
  });
});

// Ruta de salud adicional
app.get("/api/salud", (req, res) => {
  res.status(200).json({
    success: true,
    message: "✅ API de Gestión de Plantas funcionando correctamente",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// ========================
// MANEJO DE ERRORES
// ========================
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err.message);
  
  res.status(err.status || 500).json({
    success: false,
    message: 'Error interno del servidor',
    origin: req.headers.origin
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.originalUrl}`,
    origin: req.headers.origin
  });
});

// ========================
// INICIAR SERVIDOR
// ========================
app.listen(PORT, '0.0.0.0', async () => {
  console.log("==========================================");
  console.log("🚀 SERVICIO BACKEND INICIADO CORRECTAMENTE");
  console.log("==========================================");
  console.log("✅ Puerto:", PORT);
  console.log("🌍 Entorno:", process.env.NODE_ENV || "development");
  
  const dbConnected = await testConnection();
  console.log("🗄️ Base de datos:", dbConnected ? "✅ CONECTADA" : "❌ DESCONECTADA");
  console.log("🔓 CORS: PERMITIENDO TODOS LOS ORÍGENES");
  
  console.log("");
  console.log("🔗 Health Check: https://angelic-compassion.up.railway.app/api/health");
  console.log("🔗 Test CORS: https://angelic-compassion.up.railway.app/api/test-cors");
  console.log("🔗 Test Login CORS: https://angelic-compassion.up.railway.app/api/auth/test-cors");
  console.log("");
  console.log("🔐 Sistema de gestión de plantas listo para producción!");
  console.log("==========================================");
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recibido, cerrando servidor...');
  process.exit(0);
});