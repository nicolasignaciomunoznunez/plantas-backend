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
const isProduction = process.env.NODE_ENV === 'production';

// ========================
// CORS CONFIGURACIÓN MEJORADA
// ========================
const allowedOrigins = [
  'https://plantas-frontend.vercel.app',
  'https://plantas-frontend-git-main-nicolas-ignacio-munoz-nunezs-projects.vercel.app',
  'https://plantas-frontend-pe5bmfn2i.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174'
];

// Configuración CORS más permisiva para desarrollo
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, postman, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS bloqueado para origen:', origin);
      // En desarrollo, permitir todos los orígenes para debugging
      if (!isProduction) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
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
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Aplicar CORS antes de otros middlewares
app.use(cors(corsOptions));

// Manejar preflight OPTIONS requests explícitamente
app.options('*', cors(corsOptions));

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
  max: isProduction ? 500 : 1000,
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
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
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
// HEALTH CHECK MEJORADO
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
      cors: {
        allowedOrigins: allowedOrigins,
        currentOrigin: req.headers.origin || 'No origin'
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

// Ruta de prueba CORS
app.get("/api/test-cors", (req, res) => {
  res.json({
    success: true,
    message: "✅ CORS funcionando correctamente",
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'No origin',
    cors: "Configurado"
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
  
  // Error de CORS
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origen no permitido por CORS',
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin
    });
  }
  
  // Rate limit error
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? 'Error interno del servidor' : err.message,
    ...(!isProduction && { stack: err.stack })
  });
});

// 404 Handler
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      message: `Endpoint API no encontrado: ${req.originalUrl}`
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Ruta no encontrada'
    });
  }
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
  console.log("🎯 Producción:", isProduction);
  console.log("📊 Orígenes CORS permitidos:", allowedOrigins);
  
  // Probar conexión a BD
  const dbConnected = await testConnection();
  console.log("🗄️ Base de datos:", dbConnected ? "✅ CONECTADA" : "❌ DESCONECTADA");
  
  console.log("");
  console.log("🔗 Health Check: https://plantas-backend-production.up.railway.app/api/health");
  console.log("🔗 Test CORS: https://plantas-backend-production.up.railway.app/api/test-cors");
  console.log("");
  console.log("🔐 Sistema de gestión de plantas listo para producción!");
  console.log("==========================================");
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido, cerrando servidor gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recibido, cerrando servidor...');
  process.exit(0);
});