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
import EmailService from "./services/BrevoService.js";

// Importar rutas
import authRoutes from "./routes/authRoutes.js";
import plantaRoutes from "./routes/plantaRoutes.js";
import datoPlantaRoutes from "./routes/datoPlantaRoutes.js";
import incidenciaRoutes from "./routes/incidenciaRoutes.js";
import mantenimientoRoutes from "./routes/mantenimientoRoutes.js";
import reporteRoutes from "./routes/reporteRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

// ✅ NUEVO: Importar rutas de contacto
import contactRoutes from "./routes/contactRoutes.js";

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
console.log(`   CONTACT_EMAIL: ${process.env.CONTACT_EMAIL || 'contactoinfraexpert@gmail.com'}`);
console.log('🚀 ==========================================');

// ==================== CONFIGURACIÓN CORS CORREGIDA ====================
const allowedOrigins = [
  // Dominios de producción
  'https://www.infraexpert.cl',
  'https://plantas-frontend-xly86glqe.vercel.app',
  'https://plantas-frontend.vercel.app',
  'https://infraexpert.cl',
  'http://infraexpert.cl',
  'http://www.infraexpert.cl',
  
  // Dominios de desarrollo
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  
  // Subdominio API (si necesitas acceso directo)
  'https://api.infraexpert.cl',
  'http://api.infraexpert.cl',
  
  // ✅ NUEVO: Agregar dominio del frontend de contacto
  'https://infraexpert.vercel.app',
  'http://infraexpert.vercel.app'
];

console.log('🔒 Dominios permitidos por CORS:', allowedOrigins);

// MIDDLEWARE CORS MANUAL - MÁS CONFIABLE
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  console.log(`🌐 [CORS] Request desde origen: ${origin} a ${req.method} ${req.path}`);
  
  // Si el origen está en la lista permitida
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`✅ [CORS] Origen permitido: ${origin}`);
  } else if (!origin) {
    // Permitir requests sin origen (Postman, curl, etc.)
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log(`⚠️ [CORS] Request sin origen, permitiendo acceso`);
  } else {
    console.log(`❌ [CORS] Origen NO permitido: ${origin}`);
    // Aún permitimos pero logueamos
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Auth-Token, x-auth-token');
  
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🛫 [CORS] Preflight request recibida, enviando 200 OK');
    return res.status(200).end();
  }
  
  next();
});

// También configurar CORS con el paquete como respaldo
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origen
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ [CORS-PKG] Origen bloqueado por paquete cors: ${origin}`);
      callback(null, true); // Temporalmente permitimos todo
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-auth-token']
};

app.use(cors(corsOptions));

// ==================== MIDDLEWARES DE SEGURIDAD ====================
app.use(helmet({
  crossOriginResourcePolicy: false, // IMPORTANTE: Desactivar para permitir recursos cruzados
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: [
        "'self'", 
        "https://*.infraexpert.cl",
        "http://*.infraexpert.cl",
        "wss:"
      ],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      formAction: ["'self'"]
    }
  },
  hsts: false // Temporalmente desactivado para testing
}));

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ==================== RATE LIMITING ====================
// Rate limit más específico para contacto (para prevenir spam)
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 solicitudes por ventana
  message: { 
    success: false, 
    message: 'Demasiadas solicitudes de contacto. Por favor, espera 15 minutos antes de intentar nuevamente.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

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

// Aplicar rate limiting
app.use('/api/', apiLimiter);

// ==================== TRUST PROXY (IMPORTANTE PARA NGINX) ====================
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal', '172.26.10.94']);

// ==================== LOGGING MEJORADO ====================
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
      // Agregar headers CORS para archivos estáticos también
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Credentials', 'true');
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

// ✅ NUEVO: Rutas de contacto
app.use("/api/contact", contactLimiter, contactRoutes);

// ==================== RUTAS DE DIAGNÓSTICO ====================

// Health check mejorado
app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = await testConnection();
    
    // Importar y probar BrevoService dinámicamente para evitar errores de importación
    let emailStatus = "unknown";
    try {
      const { BrevoService } = await import("./services/BrevoService.js");
      emailStatus = await BrevoService.testConnection() ? "connected" : "disconnected";
    } catch (emailError) {
      console.log("⚠️ No se pudo verificar email service:", emailError.message);
      emailStatus = "service_unavailable";
    }
    
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
        email: {
          configured: !!(process.env.EMAIL_APP_PASSWORD && process.env.EMAIL_FROM_ADDRESS),
          status: emailStatus,
          contact_email: process.env.CONTACT_EMAIL || 'contactoinfraexpert@gmail.com'
        },
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
        contact: process.env.CONTACT_EMAIL || 'contactoinfraexpert@gmail.com',
        configured: !!(process.env.EMAIL_APP_PASSWORD && process.env.EMAIL_FROM_ADDRESS)
      }
    },
    endpoints: {
      contact: {
        send: "/api/contact/send",
        test: "/api/contact/test",
        health: "/api/contact/health"
      }
    }
  });
});

// ✅ NUEVO: Endpoint específico para probar email
app.get("/api/email-status", async (req, res) => {
  try {
    const { BrevoService } = await import("./services/BrevoService.js");
    const smtpTest = await BrevoService.testConnection();
    
    res.json({
      success: true,
      service: "Brevo SMTP",
      status: smtpTest ? "connected" : "disconnected",
      configured: {
        host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
        port: process.env.EMAIL_PORT || 587,
        from: process.env.EMAIL_FROM_ADDRESS,
        contact: process.env.CONTACT_EMAIL
      },
      test_endpoint: "POST /api/contact/send"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verificando email service",
      error: error.message
    });
  }
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
      emailStatus: "/api/email-status",
      endpoints: {
        auth: "/api/auth",
        plantas: "/api/plantas",
        incidencias: "/api/incidencias",
        mantenimientos: "/api/mantenimientos",
        reportes: "/api/reportes",
        dashboard: "/api/dashboard",
        // ✅ NUEVO: Contacto
        contact: {
          send: "/api/contact/send (POST)",
          test: "/api/contact/test (GET)",
          health: "/api/contact/health (GET)"
        }
      }
    },
    support: {
      email: process.env.EMAIL_FROM_ADDRESS || process.env.CONTACT_EMAIL || 'contactoinfraexpert@gmail.com',
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
      "/api/email-status",
      "/api/auth",
      "/api/plantas",
      // ✅ NUEVO
      "/api/contact/send (POST)",
      "/api/contact/test (GET)"
    ]
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err.message);
  console.error('❌ Stack:', err.stack);
  
  // Si es error de CORS
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: "Acceso no permitido desde este origen",
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin
    });
  }
  
  // Si es error de rate limit
  if (err.message && err.message.includes('Too many requests')) {
    return res.status(429).json({
      success: false,
      message: err.message
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    requestId: Date.now().toString(36)
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
  
  // ✅ NUEVO: Verificar servicio de email
  try {
    const { BrevoService } = await import("./services/BrevoService.js");
    const emailTest = await BrevoService.testConnection();
    console.log("📧 Servicio de email:", emailTest ? "✅ CONECTADO" : "❌ ERROR");
    
    if (emailTest) {
      console.log(`   📩 Contacto: ${process.env.CONTACT_EMAIL || 'contactoinfraexpert@gmail.com'}`);
    }
  } catch (error) {
    console.error("❌ Error verificando email service:", error.message);
  }
  
  console.log("📁 Archivos estáticos: ✅ CONFIGURADOS");
  console.log("🔒 CORS configurado para:", allowedOrigins);
  console.log("📞 Contacto: POST /api/contact/send");
  console.log("==========================================");
});