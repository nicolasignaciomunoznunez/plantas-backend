import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from "dotenv";

// Cargar variables de entorno PRIMERO
dotenv.config();

// Importar después de dotenv.config()
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// 🔧 DIAGNÓSTICO MEJORADO - AL INICIO
console.log('🚀 ==========================================');
console.log('🚀 INFRAEXPERT API - PRODUCCIÓN');
console.log('🚀 ==========================================');
console.log('📋 CONFIGURACIÓN CARGADA:');
console.log(`   PORT: ${PORT}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   CLIENT_URL: ${process.env.CLIENT_URL}`);
console.log(`   DB: ${process.env.MYSQLUSER}@${process.env.MYSQLHOST}`);
console.log(`   DATABASE: ${process.env.MYSQLDATABASE}`);
console.log('🚀 ==========================================');

// ==================== CONFIGURACIÓN CORS PARA PRODUCCIÓN ====================
const allowedOrigins = [
  'https://infraexpert.vercel.app',  // Frontend en Vercel
  'https://infraexpert.cl',           // Dominio personalizado
  'http://localhost:3000',            // Desarrollo local
  process.env.CLIENT_URL              // Variable de entorno
].filter(Boolean);  // Remueve valores undefined/null

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requests sin origen (como mobile apps o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`⚠️  Origen bloqueado por CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));

// ==================== MIDDLEWARES DE SEGURIDAD ====================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: [
        "'self'", 
        "https://infraexpert.cl", 
        "https://infraexpert.vercel.app",
        "wss:"
      ],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      formAction: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true
  }
}));

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ==================== RATE LIMITING ====================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Límites diferentes
  message: { 
    success: false, 
    message: 'Demasiadas solicitudes desde esta IP, por favor intente después de 15 minutos' 
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Aplicar rate limiting solo a rutas API
app.use('/api/', apiLimiter);

// ==================== TRUST PROXY (IMPORTANTE PARA NGINX) ====================
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

// ==================== LOGGING ====================
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - IP: ${req.ip} - Origin: ${req.headers.origin}`);
  next();
});

// ==================== SERVIR ARCHIVOS ESTÁTICOS ====================
// Configurar múltiples directorios de uploads
const staticDirs = [
  { route: '/uploads', path: path.join(__dirname, 'uploads') },
  { route: '/uploads/incidencias', path: path.join(__dirname, 'uploads/incidencias') },
  { route: '/uploads/mantenimientos', path: path.join(__dirname, 'uploads/mantenimientos') },
  { route: '/uploads/usuarios', path: path.join(__dirname, 'uploads/usuarios') }
];

staticDirs.forEach(({ route, path: dirPath }) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Directorio creado: ${dirPath}`);
  }
  app.use(route, express.static(dirPath, {
    maxAge: '30d',
    setHeaders: (res, path) => {
      res.set('Cache-Control', 'public, max-age=2592000'); // 30 días
    }
  }));
});

// ==================== RUTAS DE LA API ====================
app.use("/api/auth", authRoutes);
app.use("/api/plantas", plantaRoutes);
app.use("/api/datos-planta", datoPlantaRoutes);
app.use("/api/incidencias", incidenciaRoutes);
app.use("/api/mantenimientos", mantenimientoRoutes);
app.use("/api/reportes", reporteRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ==================== RUTAS DE DIAGNÓSTICO ====================

// Health check mejorado
app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = await testConnection();
    res.json({
      success: true,
      message: "✅ API funcionando correctamente",
      status: "healthy",
      timestamp: new Date().toISOString(),
      server: {
        environment: process.env.NODE_ENV,
        port: PORT,
        uptime: process.uptime(),
        nodeVersion: process.version
      },
      database: {
        connected: dbStatus ? true : false,
        status: dbStatus ? "connected" : "disconnected"
      },
      services: {
        email: !!process.env.EMAIL_APP_PASSWORD,
        uploads: true,
        cors: allowedOrigins
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "❌ Error en health check",
      error: error.message
    });
  }
});

// Endpoint para verificar configuración
app.get("/api/config", (req, res) => {
  res.json({
    success: true,
    api: {
      version: "1.0.0",
      environment: process.env.NODE_ENV,
      baseUrl: process.env.API_URL || `http://${req.headers.host}`,
      cors: {
        enabled: true,
        allowedOrigins: allowedOrigins
      }
    },
    services: {
      database: {
        host: process.env.MYSQLHOST,
        database: process.env.MYSQLDATABASE,
        user: process.env.MYSQLUSER
      },
      email: {
        service: process.env.EMAIL_SERVICE,
        from: process.env.EMAIL_FROM_ADDRESS,
        configured: !!(process.env.EMAIL_APP_PASSWORD && process.env.EMAIL_FROM_ADDRESS)
      }
    }
  });
});

// ==================== RUTA PRINCIPAL ====================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🏭 API InfraExpert - Sistema de Gestión de Plantas Industriales",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    documentation: {
      health: "/api/health",
      config: "/api/config",
      emailConfig: "/api/email-config",
      endpoints: {
        auth: "/api/auth",
        plantas: "/api/plantas",
        incidencias: "/api/incidencias",
        mantenimientos: "/api/mantenimientos",
        reportes: "/api/reportes",
        dashboard: "/api/dashboard"
      }
    },
    support: {
      email: process.env.EMAIL_FROM_ADDRESS,
      status: "operational"
    }
  });
});

// ==================== MANEJO DE ERRORES ====================
// 404 - Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
    requestedUrl: req.originalUrl,
    availableEndpoints: [
      "/api/health",
      "/api/config",
      "/api/auth",
      "/api/plantas"
    ]
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err.stack);
  
  // Si es error de CORS
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: "Acceso no permitido desde este origen",
      allowedOrigins: allowedOrigins
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    requestId: req.id || Date.now().toString(36)
  });
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, '0.0.0.0', async () => {
  console.log("==========================================");
  console.log(`🚀 SERVIDOR INICIADO EN PUERTO: ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🌐 Externa: https://infraexpert.cl`);
  console.log(`🎯 Frontend: https://infraexpert.vercel.app`);
  console.log("==========================================");
  
  // Verificar conexiones
  try {
    const dbConnected = await testConnection();
    console.log("🗄️  Base de datos:", dbConnected ? "✅ CONECTADA" : "❌ ERROR");
  } catch (error) {
    console.error("❌ Error conectando a DB:", error.message);
  }
  
  console.log("📁 Archivos estáticos: ✅ CONFIGURADOS");
  console.log("🔒 CORS configurado para:", allowedOrigins);
  console.log("==========================================");
});