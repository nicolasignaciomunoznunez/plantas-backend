import { Planta } from '../models/plantaModel.js';
import { DatoPlanta } from '../models/datoPlantaModel.js';
import { Incidencia } from '../models/incidenciaModel.js';
import { Mantenimiento } from '../models/mantenimientoModel.js';

// ✅ CACHE EN MEMORIA MEJORADO (soporta múltiples usuarios)
let dashboardCache = {
  data: {}, // Objeto para almacenar cache por usuario
  CACHE_TTL: 5 * 60 * 1000, // 5 minutos
};

// ✅ FUNCIONES DE CACHE MEJORADAS
const getDashboardCache = (usuarioId, key) => {
  const cacheKey = `${usuarioId}:${key}`;
  
  if (dashboardCache.data[cacheKey] && 
      (Date.now() - dashboardCache.data[cacheKey].timestamp) < dashboardCache.CACHE_TTL) {
    console.log('✅ [DASHBOARD CACHE] Usando cache para:', cacheKey);
    return dashboardCache.data[cacheKey].data;
  }
  return null;
};

const updateDashboardCache = (usuarioId, key, data) => {
  const cacheKey = `${usuarioId}:${key}`;
  dashboardCache.data[cacheKey] = {
    data,
    timestamp: Date.now()
  };
  console.log('✅ [DASHBOARD CACHE] Actualizado cache para:', cacheKey);
};

const clearUserCache = (usuarioId) => {
  Object.keys(dashboardCache.data).forEach(key => {
    if (key.startsWith(`${usuarioId}:`)) {
      delete dashboardCache.data[key];
    }
  });
  console.log(`✅ [DASHBOARD CACHE] Cache limpiado para usuario: ${usuarioId}`);
};

const clearAllCache = () => {
  dashboardCache.data = {};
  console.log('✅ [DASHBOARD CACHE] Cache global limpiado');
};

export const obtenerMetricas = async (req, res) => {
  try {
    const { filtrosPlanta = {} } = req;
    
    console.log('📊 [DASHBOARD] Obteniendo métricas - Filtros:', filtrosPlanta);
    
    // ✅ CACHE MEJORADO
    const cachedMetrics = getDashboardCache(req.usuarioId, 'metricas');
    if (cachedMetrics) {
      return res.status(200).json({
        success: true,
        metricas: cachedMetrics,
        fromCache: true,
        message: "Métricas obtenidas desde cache"
      });
    }

    console.log('🔄 [DASHBOARD] Consultando base de datos para métricas...');
    
    // ✅ CORREGIDO: Pasar filtros al modelo
    const metricas = await Planta.obtenerMetricasConsolidadas(filtrosPlanta);

    // ✅ GUARDAR EN CACHE MEJORADO
    updateDashboardCache(req.usuarioId, 'metricas', metricas);

    res.status(200).json({
      success: true,
      metricas,
      fromCache: false,
      message: "Métricas obtenidas correctamente",
      filtrosAplicados: filtrosPlanta
    });
  } catch (error) {
    console.error("❌ [DASHBOARD] Error al obtener métricas:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const obtenerPlantasDashboard = async (req, res) => {
  try {
    const { filtrosPlanta = {} } = req;
    
    console.log('🏭 [DASHBOARD] Obteniendo plantas para dashboard - Filtros:', filtrosPlanta);
    
    // ✅ CACHE MEJORADO
    const cachedPlantas = getDashboardCache(req.usuarioId, 'plantas');
    if (cachedPlantas) {
      return res.status(200).json({
        success: true,
        plantas: cachedPlantas,
        fromCache: true,
        message: "Plantas obtenidas desde cache"
      });
    }

    console.log('🔄 [DASHBOARD] Consultando base de datos para plantas...');
    
    // ✅ CORREGIDO: Pasar filtros al modelo
    const plantas = await Planta.obtenerPlantasConEstados(filtrosPlanta);

    // ✅ GUARDAR EN CACHE MEJORADO
    updateDashboardCache(req.usuarioId, 'plantas', plantas);

    res.status(200).json({
      success: true,
      plantas,
      fromCache: false,
      message: "Plantas obtenidas correctamente",
      filtrosAplicados: filtrosPlanta
    });
  } catch (error) {
    console.error("❌ [DASHBOARD] Error al obtener plantas:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const obtenerDashboardCompleto = async (req, res) => {
  try {
    const { filtrosPlanta = {} } = req;
    
    console.log('🎯 [DASHBOARD] Obteniendo dashboard completo - Filtros:', filtrosPlanta);
    
    // ✅ CACHE MEJORADO
    const cachedDashboard = getDashboardCache(req.usuarioId, 'completo');
    if (cachedDashboard) {
      return res.status(200).json({
        success: true,
        ...cachedDashboard,
        fromCache: true,
        message: "Dashboard completo obtenido desde cache"
      });
    }

    console.log('🔄 [DASHBOARD] Consultando base de datos para dashboard completo...');
    
    // ✅ USAR LA VERSIÓN SIMPLE DEL MÉTODO DE MÉTRICAS
    const [metricas, plantas, incidenciasRecientes, mantenimientosPendientes] = await Promise.all([
      Planta.obtenerMetricasConsolidadas(filtrosPlanta),
      Planta.obtenerPlantasConEstados(filtrosPlanta),
      Incidencia.obtenerRecientes(10, filtrosPlanta),
      Mantenimiento.obtenerPendientesProximos(10, filtrosPlanta)
    ]);

    const dashboardData = {
      metricas,
      plantas,
      incidenciasRecientes,
      mantenimientosPendientes,
      timestamp: new Date().toISOString(),
      filtrosAplicados: filtrosPlanta
    };

    // ✅ GUARDAR EN CACHE MEJORADO
    updateDashboardCache(req.usuarioId, 'completo', dashboardData);

    res.status(200).json({
      success: true,
      ...dashboardData,
      fromCache: false,
      message: "Dashboard completo obtenido correctamente"
    });
  } catch (error) {
    console.error("❌ [DASHBOARD] Error al obtener dashboard completo:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ INVALIDAR CACHE MEJORADO
export const invalidarCacheDashboard = async (req, res) => {
  try {
    const { usuarioId } = req.query;
    
    if (usuarioId) {
      clearUserCache(usuarioId);
      console.log(`🔄 [DASHBOARD] Cache invalidado para usuario: ${usuarioId}`);
    } else {
      clearAllCache();
      console.log('🔄 [DASHBOARD] Cache global invalidado manualmente');
    }
    
    res.status(200).json({
      success: true,
      message: usuarioId 
        ? `Cache del dashboard invalidado para usuario ${usuarioId}`
        : "Cache del dashboard invalidado correctamente"
    });
  } catch (error) {
    console.error("❌ [DASHBOARD] Error al invalidar cache:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ ENDPOINT DE ESTADO DEL CACHE MEJORADO
export const obtenerEstadoCache = async (req, res) => {
  try {
    const userCaches = Object.keys(dashboardCache.data)
      .filter(key => key.startsWith(`${req.usuarioId}:`))
      .map(key => {
        const cache = dashboardCache.data[key];
        return {
          key,
          timestamp: cache.timestamp,
          tiempoDesdeActualizacion: Date.now() - cache.timestamp,
          estaExpirado: (Date.now() - cache.timestamp) > dashboardCache.CACHE_TTL
        };
      });

    const estado = {
      usuarioId: req.usuarioId,
      cachesUsuario: userCaches,
      totalCaches: Object.keys(dashboardCache.data).length,
      CACHE_TTL: dashboardCache.CACHE_TTL
    };

    res.status(200).json({
      success: true,
      estado,
      message: "Estado del cache obtenido correctamente"
    });
  } catch (error) {
    console.error("❌ [DASHBOARD] Error al obtener estado del cache:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};