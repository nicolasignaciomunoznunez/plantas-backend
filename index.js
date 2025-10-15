import express from "express";
// ELIMINA dotenv - Railway ya inyecta las variables
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
// DEBUG PROFUNDO RAILWAY
// ========================
console.log('🔍 DEBUG PROFUNDO RAILWAY VARIABLES:');
console.log('=== PROCESS.ENV ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'CONFIGURADO' : 'NO CONFIGURADO');

// Verificar si estamos en Railway
console.log('=== RAILWAY DETECTION ===');
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('RAILWAY_PROJECT_NAME:', process.env.RAILWAY_PROJECT_NAME);
console.log('RAILWAY_SERVICE_NAME:', process.env.RAILWAY_SERVICE_NAME);

// Listar TODAS las variables de entorno (solo nombres)
console.log('=== ALL ENV VARS ===');
Object.keys(process.env).forEach(key => {
  if (key.includes('DB_') || key.includes('RAILWAY') || key === 'NODE_ENV' || key === 'PORT') {
    console.log(`   ${key}: ${process.env[key]}`);
  }
});

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// ========================
// MIDDLEWARES (igual que antes)
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
  max: isProduction ? 500 : 1000,
  message: { success: false, message: 'Demasiadas solicitudes' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// CORS
const allowedOrigins = isProduction 
  ? [
      'https://plantas-frontend.vercel.app',
      'https://plantas-frontend-git-main-nicolas-ignacio-munoz-nunezs-projects.vercel.app',
      'https://plantas-frontend-pe5bmfn2i.vercel.app',
      process.env.CLIENT_URL
    ].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 CORS bloqueado:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
}));
app.options('*', cors());

// Trust proxy para Railway
app.set('trust proxy', 1);

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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

// Health Check con más info
app.get("/api/health", async (req, res) => {
  const dbStatus = await testConnection();
  res.status(dbStatus ? 200 : 503).json({
    success: dbStatus,
    message: dbStatus ? "✅ API funcionando" : "⚠️ API activa pero BD no conectada",
    environment: process.env.NODE_ENV,
    database: dbStatus ? "connected" : "disconnected",
    railway: {
      dbHost: process.env.DB_HOST ? "configured" : "missing",
      dbName: process.env.DB_NAME ? "configured" : "missing"
    }
  });
});

// ========================
// INICIAR SERVIDOR
// ========================
app.listen(PORT, '0.0.0.0', async () => {
  console.log("==========================================");
  console.log("🚀 SERVIDOR INICIADO EN RAILWAY");
  console.log("==========================================");
  console.log("✅ Puerto:", PORT);
  console.log("🌍 Entorno:", process.env.NODE_ENV);
  
  // Probar conexión a BD
  const dbConnected = await testConnection();
  console.log("🗄️ Base de datos:", dbConnected ? "✅ CONECTADA" : "❌ DESCONECTADA");
  
  if (!dbConnected && !process.env.DB_HOST) {
    console.log("\n🔧 PROBLEMA IDENTIFICADO:");
    console.log("   Las variables de BD NO se están inyectando desde Railway");
    console.log("   Solución: Contacta soporte de Railway o recrea el servicio");
  }
  
  console.log("==========================================");
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});