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

// ========================
// CONFIGURACIÓN ENTORNO
// ========================
// Solo cargar dotenv en desarrollo (Railway ya inyecta las variables)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// ========================
// DIAGNÓSTICO RAILWAY (solo en inicio)
// ========================
console.log('🚄 RAILWAY ENVIRONMENT DIAGNOSTIC:');
console.log('   PORT:', process.env.PORT || '5000 (default)');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('   DB_HOST:', process.env.DB_HOST ? '✅ ' + process.env.DB_HOST : '❌ NO CONFIGURADO');
console.log('   DB_PORT:', process.env.DB_PORT ? '✅ ' + process.env.DB_PORT : '❌ NO CONFIGURADO');
console.log('   DB_USER:', process.env.DB_USER ? '✅ ' + process.env.DB_USER : '❌ NO CONFIGURADO');
console.log('   DB_NAME:', process.env.DB_NAME ? '✅ ' + process.env.DB_NAME : '❌ NO CONFIGURADO');
console.log('   CLIENT_URL:', process.env.CLIENT_URL || 'NO CONFIGURADO');

// ========================
// SECURITY MIDDLEWARES
// ========================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

app.use(compression({
  level: 6,
  threshold: 100 * 1024
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ========================
// RATE LIMITING
// ========================
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

// ========================
// CORS CONFIGURATION
// ========================
const allowedOrigins = isProduction 
  ? [
      'https://plantas-frontend.vercel.app',
      'https://plantas-frontend-git-main-nicolas-ignacio-munoz-nunezs-projects.vercel.app',
      'https://plantas-frontend-pe5bmfn2i.vercel.app',
      process.env.CLIENT_URL
    ].filter(Boolean)
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174'
    ];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin
    )) {
      callback(null, true);
    } else {
      console.log('🚫 CORS bloqueado para origen:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
}));

app.options('*', cors());

// ========================
// TRUST PROXY (CRÍTICO PARA RAILWAY)
// ========================
app.set('trust proxy', 1);

// ========================
// REQUEST LOGGING
// ========================
app.use((req, res, next) => {
  if (isProduction) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  }
  next();
});

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
// HEALTH CHECK MEJORADO PARA RAILWAY
// ========================
app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = await testConnection();
    
    res.status(dbStatus ? 200 : 503).json({
      success: dbStatus,
      message: dbStatus 
        ? "✅ API de Gestión de Plantas funcionando correctamente" 
        : "⚠️ API funcionando pero BD no conectada",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: "1.0.0",
      services: {
        database: dbStatus ? "connected" : "disconnected",
        server: "running"
      },
      railway: {
        dbConfigured: !!(process.env.DB_HOST && process.env.DB_NAME),
        nodeEnv: process.env.NODE_ENV || "not set"
      },
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "❌ Health check failed",
      database: "disconnected",
      error: error.message
    });
  }
});

// Ruta de salud adicional (mantener compatibilidad)
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
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origen no permitido por CORS'
    });
  }
  
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
// GRACEFUL SHUTDOWN
// ========================
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido, cerrando servidor gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

// ========================
// SERVER START
// ========================
app.listen(PORT, '0.0.0.0', async () => {
  try {
    console.log("==========================================");
    console.log("🚀 INICIANDO SERVICIO BACKEND EN RAILWAY");
    console.log("==========================================");
    
    // Probar conexión a BD
    const dbConnected = await testConnection();
    
    console.log("✅ Puerto:", PORT);
    console.log("🌍 Entorno:", process.env.NODE_ENV || "development");
    console.log("🎯 Producción:", isProduction);
    console.log("📊 Orígenes permitidos:", allowedOrigins);
    console.log("🗄️  Base de datos:", dbConnected ? "✅ CONECTADA" : "❌ DESCONECTADA");
    console.log("");
    
    if (dbConnected) {
      console.log("🔗 Health Check: https://tu-app.railway.app/api/health");
      console.log("🎉 ¡Sistema de gestión de plantas listo para producción!");
    } else {
      console.log("⚠️  Servidor iniciado PERO base de datos no conectada");
      console.log("🔧 Verifica las variables de entorno en Railway Dashboard");
    }
    
    console.log("==========================================");
    
  } catch (error) {
    console.error("❌ ERROR CRÍTICO INICIANDO EL SERVIDOR:");
    console.error("   Mensaje:", error.message);
    
    // Diagnóstico adicional
    console.log("🔧 DIAGNÓSTICO FINAL:");
    console.log("   DB_HOST:", process.env.DB_HOST || "NO CONFIGURADO");
    console.log("   DB_PORT:", process.env.DB_PORT || "NO CONFIGURADO");
    console.log("   DB_USER:", process.env.DB_USER || "NO CONFIGURADO");
    console.log("   DB_NAME:", process.env.DB_NAME || "NO CONFIGURADO");
    
    process.exit(1);
  }
});