import express from "express";
import dotenv from "dotenv";
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ========================
// SECURITY MIDDLEWARES
// ========================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000 // límite de 1000 requests por ventana
});
app.use(limiter);

// ========================
// CORS CONFIGURATION
// ========================
const allowedOrigins = [
  'https://tu-frontend.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, postman, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS bloqueado para origen:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// ========================
// API ROUTES
// ========================
app.use("/api/auth", authRoutes);
app.use("/api/plantas", plantaRoutes);
app.use("/api/datos-planta", datoPlantaRoutes);
app.use("/api/incidencias", incidenciaRoutes);
app.use("/api/mantenimientos", mantenimientoRoutes);
app.use("/api/reportes", reporteRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ========================
// HEALTH CHECK (OBLIGATORIO)
// ========================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "✅ API de Gestión de Plantas funcionando correctamente",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: "1.0.0"
  });
});

// Ruta de salud (mantener compatibilidad)
app.get("/api/salud", (req, res) => {
  res.status(200).json({
    success: true,
    message: "✅ API de Gestión de Plantas funcionando correctamente",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// ========================
// ERROR HANDLING
// ========================
// Manejo de rutas no encontradas
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.originalUrl}`
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
  
  // Error de CORS
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origen no permitido por CORS'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// ========================
// SERVER START
// ========================
app.listen(PORT, '0.0.0.0', async () => {
  try {
    await testConnection();
    console.log("==========================================");
    console.log("🚀 SERVICIO BACKEND INICIADO CORRECTAMENTE");
    console.log("==========================================");
    console.log("✅ Puerto:", PORT);
    console.log("🌍 Entorno:", process.env.NODE_ENV || "development");
    console.log("🎯 Orígenes permitidos:", allowedOrigins);
    console.log("");
    console.log("📊 Endpoints disponibles:");
    console.log("   - /api/health");
    console.log("   - /api/auth");
    console.log("   - /api/plantas");
    console.log("   - /api/datos-planta");
    console.log("   - /api/incidencias");
    console.log("   - /api/mantenimientos");
    console.log("   - /api/reportes");
    console.log("   - /api/dashboard");
    console.log("");
    console.log("🔐 Sistema de gestión de plantas listo para producción!");
    console.log("==========================================");
  } catch (error) {
    console.error("❌ Error crítico iniciando el servidor:", error);
    process.exit(1);
  }
});