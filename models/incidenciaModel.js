import { pool } from "../db/connectDB.js";

export class Incidencia {
    constructor(incidencia) {
        this.id = incidencia.id;
        this.plantId = incidencia.plantId;
        this.userId = incidencia.userId;
        this.titulo = incidencia.titulo;
        this.descripcion = incidencia.descripcion;
        this.estado = incidencia.estado;
        this.fechaReporte = incidencia.fechaReporte;
        this.fechaResolucion = incidencia.fechaResolucion;
        this.usuario = incidencia.usuario;
        this.planta = incidencia.planta;
        this.plantaNombre = incidencia.plantaNombre;
        this.usuarioNombre = incidencia.usuarioNombre;
    }

    // Crear nueva incidencia
    static async crear(datosIncidencia) {
        try {
            const [resultado] = await pool.execute(
                `INSERT INTO incidencias (plantId, userId, titulo, descripcion, estado) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    datosIncidencia.plantId,
                    datosIncidencia.userId,
                    datosIncidencia.titulo,
                    datosIncidencia.descripcion,
                    datosIncidencia.estado || 'pendiente'
                ]
            );

            return await this.buscarPorId(resultado.insertId);
        } catch (error) {
            throw new Error(`Error al crear incidencia: ${error.message}`);
        }
    }

    // Buscar incidencia por ID
    static async buscarPorId(id) {
        try {
            const [incidencias] = await pool.execute(
                `SELECT i.*, u.nombre as usuarioNombre, p.nombre as plantaNombre 
                 FROM incidencias i 
                 LEFT JOIN users u ON i.userId = u.id 
                 LEFT JOIN plants p ON i.plantId = p.id 
                 WHERE i.id = ?`,
                [id]
            );

            if (incidencias.length === 0) {
                return null;
            }

            return new Incidencia(incidencias[0]);
        } catch (error) {
            throw new Error(`Error al buscar incidencia por ID: ${error.message}`);
        }
    }

   // Obtener todas las incidencias - ALTERNATIVA MÁS SEGURA
static async obtenerTodas(limite = 10, pagina = 1, filtros = {}) {
    try {
        const limiteNum = Number(limite);
        const paginaNum = Number(pagina);
        
        if (isNaN(limiteNum) || isNaN(paginaNum) || limiteNum < 1 || paginaNum < 1) {
            throw new Error('Parámetros de paginación inválidos');
        }
        
        const offset = (paginaNum - 1) * limiteNum;
        
        let query = `
            SELECT i.*, u.nombre as usuarioNombre, p.nombre as plantaNombre 
            FROM incidencias i 
            LEFT JOIN users u ON i.userId = u.id 
            LEFT JOIN plants p ON i.plantId = p.id 
        `;
        
        const condiciones = [];
        const parametros = [];
        
        if (filtros.userId) {
            condiciones.push('i.userId = ?');
            parametros.push(filtros.userId);
        }
        
        if (filtros.plantId) {
            condiciones.push('i.plantId = ?');
            parametros.push(filtros.plantId);
        }
        
        if (filtros.estado) {
            condiciones.push('i.estado = ?');
            parametros.push(filtros.estado);
        }
        
        if (condiciones.length > 0) {
            query += ` WHERE ${condiciones.join(' AND ')}`;
        }
        
        // ✅ ALTERNATIVA: Usar template literals para números (más seguro)
        query += ` ORDER BY i.fechaReporte DESC LIMIT ${limiteNum} OFFSET ${offset}`;
        
        console.log('🔍 [MODEL] Query obtenerTodas:', { query, parametros });
        
        const [incidencias] = await pool.execute(query, parametros);
        
        return incidencias.map(incidencia => new Incidencia(incidencia));
    } catch (error) {
        console.error('❌ Error en obtenerTodas incidencias:', error);
        throw new Error(`Error al obtener incidencias: ${error.message}`);
    }
}

    // Obtener incidencias por planta - MODIFICADO PARA ACEPTAR FILTROS
    static async obtenerPorPlanta(plantId, filtros = {}) {
        try {
            let query = `
                SELECT i.*, u.nombre as usuarioNombre, p.nombre as plantaNombre 
                FROM incidencias i 
                LEFT JOIN users u ON i.userId = u.id 
                LEFT JOIN plants p ON i.plantId = p.id 
                WHERE i.plantId = ? 
            `;
            
            const parametros = [plantId];
            
            if (filtros.userId) {
                query += ` AND i.userId = ?`;
                parametros.push(filtros.userId);
            }
            
            if (filtros.estado) {
                query += ` AND i.estado = ?`;
                parametros.push(filtros.estado);
            }
            
            query += ` ORDER BY i.fechaReporte DESC`;
            
            console.log('🔍 [MODEL] Query obtenerPorPlanta:', { query, parametros });
            
            const [incidencias] = await pool.execute(query, parametros);

            return incidencias.map(incidencia => new Incidencia(incidencia));
        } catch (error) {
            throw new Error(`Error al obtener incidencias por planta: ${error.message}`);
        }
    }

    // Obtener incidencias por estado - MODIFICADO PARA ACEPTAR FILTROS
    static async obtenerPorEstado(estado, filtros = {}) {
        try {
            let query = `
                SELECT i.*, u.nombre as usuarioNombre, p.nombre as plantaNombre 
                FROM incidencias i 
                LEFT JOIN users u ON i.userId = u.id 
                LEFT JOIN plants p ON i.plantId = p.id 
                WHERE i.estado = ? 
            `;
            
            const parametros = [estado];
            
            if (filtros.userId) {
                query += ` AND i.userId = ?`;
                parametros.push(filtros.userId);
            }
            
            if (filtros.plantId) {
                query += ` AND i.plantId = ?`;
                parametros.push(filtros.plantId);
            }
            
            query += ` ORDER BY i.fechaReporte DESC`;
            
            console.log('🔍 [MODEL] Query obtenerPorEstado:', { query, parametros });
            
            const [incidencias] = await pool.execute(query, parametros);

            return incidencias.map(incidencia => new Incidencia(incidencia));
        } catch (error) {
            throw new Error(`Error al obtener incidencias por estado: ${error.message}`);
        }
    }

    // Actualizar incidencia
    static async actualizar(id, datosActualizados) {
        try {
            const camposPermitidos = ['titulo', 'descripcion', 'estado', 'fechaResolucion'];
            const camposParaActualizar = [];
            const valores = [];

            for (const campo of camposPermitidos) {
                if (datosActualizados[campo] !== undefined) {
                    camposParaActualizar.push(`${campo} = ?`);
                    valores.push(datosActualizados[campo]);
                }
            }

            if (camposParaActualizar.length === 0) {
                throw new Error('No hay campos válidos para actualizar');
            }

            valores.push(id);

            const consulta = `UPDATE incidencias SET ${camposParaActualizar.join(', ')} WHERE id = ?`;
            await pool.execute(consulta, valores);

            return await this.buscarPorId(id);
        } catch (error) {
            throw new Error(`Error al actualizar incidencia: ${error.message}`);
        }
    }

    // Cambiar estado de incidencia
    static async cambiarEstado(id, estado) {
        try {
            let fechaResolucion = null;
            if (estado === 'resuelto') {
                fechaResolucion = new Date();
            }

            await pool.execute(
                `UPDATE incidencias SET estado = ?, fechaResolucion = ? WHERE id = ?`,
                [estado, fechaResolucion, id]
            );

            return await this.buscarPorId(id);
        } catch (error) {
            throw new Error(`Error al cambiar estado de incidencia: ${error.message}`);
        }
    }

    // Eliminar incidencia
    static async eliminar(id) {
        try {
            const [resultado] = await pool.execute(
                `DELETE FROM incidencias WHERE id = ?`,
                [id]
            );

            return resultado.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al eliminar incidencia: ${error.message}`);
        }
    }


    // AGREGAR AL MODELO Incidencia (después del método obtenerPorPlanta)

// Obtener incidencias por planta y rango de fechas - NUEVO MÉTODO
static async obtenerPorPlantaYRangoFechas(plantId, fechaInicio, fechaFin) {
    try {
        const query = `
            SELECT i.*, u.nombre as usuarioNombre, p.nombre as plantaNombre 
            FROM incidencias i 
            LEFT JOIN users u ON i.userId = u.id 
            LEFT JOIN plants p ON i.plantId = p.id 
            WHERE i.plantId = ? 
            AND i.fechaReporte BETWEEN ? AND ?
            ORDER BY i.fechaReporte DESC
        `;
        
        const parametros = [plantId, fechaInicio, fechaFin];
        
        console.log('🔍 [MODEL] Query obtenerPorPlantaYRangoFechas:', { 
            query, 
            plantId, 
            fechaInicio: fechaInicio.toISOString(), 
            fechaFin: fechaFin.toISOString() 
        });
        
        const [incidencias] = await pool.execute(query, parametros);

        console.log('📊 [MODEL] Incidencias encontradas:', incidencias.length);
        
        return incidencias.map(incidencia => new Incidencia(incidencia));
    } catch (error) {
        throw new Error(`Error al obtener incidencias por planta y rango de fechas: ${error.message}`);
    }
}






    ////////////nuevos metodos para dashboard


    static async obtenerRecientes(limite = 10) {
    try {
        console.log('🔄 [INCIDENCIA MODEL] Obteniendo incidencias recientes');
        
        const [incidencias] = await pool.execute(
            `SELECT i.*, u.nombre as usuarioNombre, p.nombre as plantaNombre 
             FROM incidencias i 
             LEFT JOIN users u ON i.userId = u.id 
             LEFT JOIN plants p ON i.plantId = p.id 
             ORDER BY i.fechaReporte DESC 
             LIMIT ?`,
            [limite]
        );

        console.log('✅ [INCIDENCIA MODEL] Incidencias recientes obtenidas:', incidencias.length);
        
        return incidencias.map(incidencia => new Incidencia(incidencia));
    } catch (error) {
        console.error('❌ [INCIDENCIA MODEL] Error en obtenerRecientes:', error);
        throw new Error(`Error obteniendo incidencias recientes: ${error.message}`);
    }
}

static async obtenerResumenDashboard() {
    try {
        console.log('📊 [INCIDENCIA MODEL] Obteniendo resumen para dashboard');
        
        const [resumen] = await pool.execute(`
            SELECT 
                estado,
                COUNT(*) as cantidad
            FROM incidencias 
            GROUP BY estado
            ORDER BY 
                CASE estado 
                    WHEN 'pendiente' THEN 1
                    WHEN 'en_progreso' THEN 2  
                    WHEN 'resuelto' THEN 3
                END
        `);

        const [recientes] = await pool.execute(`
            SELECT i.*, p.nombre as plantaNombre
            FROM incidencias i
            LEFT JOIN plants p ON i.plantId = p.id
            ORDER BY i.fechaReporte DESC
            LIMIT 5
        `);

        console.log('✅ [INCIDENCIA MODEL] Resumen dashboard obtenido');
        
        return {
            porEstado: resumen.reduce((acc, item) => {
                acc[item.estado] = parseInt(item.cantidad) || 0;
                return acc;
            }, {}),
            recientes: recientes.map(incidencia => new Incidencia(incidencia))
        };
        
    } catch (error) {
        console.error('❌ [INCIDENCIA MODEL] Error en obtenerResumenDashboard:', error);
        throw new Error(`Error obteniendo resumen dashboard: ${error.message}`);
    }
}

static async obtenerEstadisticasPorPlanta() {
    try {
        console.log('📈 [INCIDENCIA MODEL] Obteniendo estadísticas por planta');
        
        const [estadisticas] = await pool.execute(`
            SELECT 
                p.id,
                p.nombre as plantaNombre,
                COUNT(i.id) as totalIncidencias,
                COUNT(CASE WHEN i.estado = 'pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN i.estado = 'en_progreso' THEN 1 END) as enProgreso,
                COUNT(CASE WHEN i.estado = 'resuelto' THEN 1 END) as resueltas
            FROM plants p
            LEFT JOIN incidencias i ON p.id = i.plantId
            GROUP BY p.id, p.nombre
            ORDER BY totalIncidencias DESC
        `);

        console.log('✅ [INCIDENCIA MODEL] Estadísticas por planta obtenidas');
        
        return estadisticas.map(estadistica => ({
            plantaId: estadistica.id,
            plantaNombre: estadistica.plantaNombre,
            totalIncidencias: parseInt(estadistica.totalIncidencias) || 0,
            pendientes: parseInt(estadistica.pendientes) || 0,
            enProgreso: parseInt(estadistica.enProgreso) || 0,
            resueltas: parseInt(estadistica.resueltas) || 0
        }));
        
    } catch (error) {
        console.error('❌ [INCIDENCIA MODEL] Error en obtenerEstadisticasPorPlanta:', error);
        throw new Error(`Error obteniendo estadísticas por planta: ${error.message}`);
    }
}









} 
