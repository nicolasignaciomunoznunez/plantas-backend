import { Planta } from '../models/plantaModel.js';
import { DatoPlanta } from '../models/datoPlantaModel.js';
import { Incidencia } from '../models/incidenciaModel.js';
import { Mantenimiento } from '../models/mantenimientoModel.js';

// ✅ CACHE EN MEMORIA (mismo patrón que auth)
let dashboardCache = {
  metricas: null,
  plantas: null,
  lastFetch: null,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutos
};

// ✅ FUNCIONES DE CACHE
const getDashboardCache = (key) => {
  if (dashboardCache[key] && dashboardCache.lastFetch && 
      (Date.now() - dashboardCache.lastFetch) < dashboardCache.CACHE_TTL) {
    console.log('✅ [DASHBOARD CACHE] Usando cache para:', key);
    return dashboardCache[key];
  }
  return null;
};

const updateDashboardCache = (key, data) => {
  dashboardCache[key] = data;
  dashboardCache.lastFetch = Date.now();
  console.log('✅ [DASHBOARD CACHE] Actualizado cache para:', key);
};

const clearDashboardCache = () => {
  dashboardCache.metricas = null;
  dashboardCache.plantas = null;
  dashboardCache.lastFetch = null;
  console.log('✅ [DASHBOARD CACHE] Cache limpiado');
};

export const obtenerMetricas = async (req, res) => {
  try {
    const { filtrosPlanta = {} } = req; // ✅ AGREGAR esto
    
    console.log('📊 [DASHBOARD] Obteniendo métricas - Filtros:', filtrosPlanta);
    
    // ✅ CACHE POR USUARIO (cada usuario ve métricas diferentes)
    const cacheKey = `metricas:${req.usuarioId}`;
    const cachedMetrics = getDashboardCache(cacheKey);
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

    // ✅ GUARDAR EN CACHE CON CLAVE DE USUARIO
    updateDashboardCache(cacheKey, metricas);

    res.status(200).json({
      success: true,
      metricas,
      fromCache: false,
      message: "Métricas obtenidas correctamente",
      filtrosAplicados: filtrosPlanta // Para debug
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
    const { filtrosPlanta = {} } = req; // ✅ AGREGAR esto
    
    console.log('🏭 [DASHBOARD] Obteniendo plantas para dashboard - Filtros:', filtrosPlanta);
    
    // ✅ CACHE POR USUARIO
    const cacheKey = `plantas:${req.usuarioId}`;
    const cachedPlantas = getDashboardCache(cacheKey);
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

    // ✅ GUARDAR EN CACHE CON CLAVE DE USUARIO
    updateDashboardCache(cacheKey, plantas);

    res.status(200).json({
      success: true,
      plantas,
      fromCache: false,
      message: "Plantas obtenidas correctamente",
      filtrosAplicados: filtrosPlanta // Para debug
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
    const { filtrosPlanta = {} } = req; // ✅ AGREGAR esto
    
    console.log('🎯 [DASHBOARD] Obteniendo dashboard completo - Filtros:', filtrosPlanta);
    
    // ✅ CACHE POR USUARIO
    const cacheKey = `completo:${req.usuarioId}`;
    const cachedDashboard = getDashboardCache(cacheKey);
    if (cachedDashboard) {
      return res.status(200).json({
        success: true,
        ...cachedDashboard,
        fromCache: true,
        message: "Dashboard completo obtenido desde cache"
      });
    }

    console.log('🔄 [DASHBOARD] Consultando base de datos para dashboard completo...');
    
    // ✅ CORREGIDO: Pasar filtros a TODOS los modelos
    const [metricas, plantas, incidenciasRecientes, mantenimientosPendientes] = await Promise.all([
      Planta.obtenerMetricasConsolidadas(filtrosPlanta),
      Planta.obtenerPlantasConEstados(filtrosPlanta),
      Incidencia.obtenerRecientes(10, filtrosPlanta), // ✅ Pasar filtros
      Mantenimiento.obtenerPendientesProximos(10, filtrosPlanta) // ✅ Pasar filtros
    ]);

    const dashboardData = {
      metricas,
      plantas,
      incidenciasRecientes,
      mantenimientosPendientes,
      timestamp: new Date().toISOString(),
      filtrosAplicados: filtrosPlanta // Para debug
    };

    // ✅ GUARDAR EN CACHE CON CLAVE DE USUARIO
    updateDashboardCache(cacheKey, dashboardData);

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

// ✅ INVALIDAR CACHE CUANDO HAY CAMBIOS
// ✅ INVALIDAR CACHE CUANDO HAY CAMBIOS
export const invalidarCacheDashboard = async (req, res) => {
  try {
    const { usuarioId } = req.query; // Opcional: invalidar cache de usuario específico
    
    if (usuarioId) {
      // Invalidar solo cache de un usuario
      const keys = ['metricas', 'plantas', 'completo'].map(key => `${key}:${usuarioId}`);
      keys.forEach(key => {
        dashboardCache[key] = null;
      });
      console.log(`🔄 [DASHBOARD] Cache invalidado para usuario: ${usuarioId}`);
    } else {
      // Invalidar todo el cache
      clearDashboardCache();
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

// ✅ ENDPOINT DE ESTADO DEL CACHE (para debugging)
export const obtenerEstadoCache = async (req, res) => {
  try {
    const estado = {
      tieneCacheMetricas: !!dashboardCache.metricas,
      tieneCachePlantas: !!dashboardCache.plantas,
      lastFetch: dashboardCache.lastFetch,
      tiempoDesdeUltimaActualizacion: dashboardCache.lastFetch 
        ? Date.now() - dashboardCache.lastFetch 
        : null,
      estaExpirado: dashboardCache.lastFetch 
        ? (Date.now() - dashboardCache.lastFetch) > dashboardCache.CACHE_TTL
        : true
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