import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { testConnection } from "./db/connectDB.js";

// Importar rutas
import authRoutes from "./routes/authRoutes.js";
import plantaRoutes from "./routes/plantaRoutes.js";
import datoPlantaRoutes from "./routes/datoPlantaRoutes.js";
import incidenciaRoutes from "./routes/incidenciaRoutes.js";
import mantenimientoRoutes from "./routes/mantenimientoRoutes.js";
import reporteRoutes from "./routes/reporteRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

const app = express();
const PORT = process.env.PORT || 8080; // ← PUERTO ESTÁNDAR RAILWAY

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
  
  console.log("🌍 Entorno:", process.env.NODE_ENV);
  console.log("🔗 El dominio debería funcionar ahora");
  console.log("==========================================");
});

// Manejo de errores
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: "Ruta no encontrada" });
});