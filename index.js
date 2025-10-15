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
const PORT = process.env.PORT || 8080; // ← CAMBIADO A 8080

console.log('🔧 INICIANDO SERVIDOR EN PUERTO:', PORT);

// ========================
// CORS COMPLETAMENTE PERMISIVO
// ========================
console.log('🔓 CONFIGURANDO CORS PERMISIVO...');

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cookie', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
}));

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
    message: 'Demasiadas solicitudes' 
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Trust proxy
app.set('trust proxy', 1);

// Logging
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.path}`);
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

// Health Check en raíz también
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 API de Gestión de Plantas funcionando",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = await testConnection();
    
    res.status(200).json({
      success: true,
      message: "✅ API funcionando correctamente",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      services: {
        database: dbStatus ? "connected" : "disconnected",
        server: "running"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "❌ Health check failed",
      error: error.message
    });
  }
});

// ========================
// INICIAR SERVIDOR
// ========================
app.listen(PORT, '0.0.0.0', async () => {
  console.log("==========================================");
  console.log("🚀 SERVICIO INICIADO EN PUERTO:", PORT);
  console.log("==========================================");
  
  const dbConnected = await testConnection();
  console.log("🗄️ Base de datos:", dbConnected ? "✅ CONECTADA" : "❌ DESCONECTADA");
  
  console.log("🔗 URL: https://angelic-compassion.up.railway.app");
  console.log("🔗 Health: https://angelic-compassion.up.railway.app/api/health");
  console.log("==========================================");
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ success: false, message: 'Error interno' });
});

app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Ruta no encontrada: ${req.originalUrl}`,
    availableRoutes: ['/api/health', '/api/auth', '/api/plantas', '/api/dashboard']
  });
});