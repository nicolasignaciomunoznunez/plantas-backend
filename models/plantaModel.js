import { pool } from "../db/connectDB.js";

export class Planta {
    constructor(planta) {
        this.id = planta.id;
        this.nombre = planta.nombre;
        this.ubicacion = planta.ubicacion;
        this.clienteId = planta.clienteId;
        this.tecnicoId = planta.tecnicoId;
        this.cliente = planta.cliente; // Para joins
        this.tecnico = planta.tecnico; // Para joins
    }

    // Crear nueva planta
    static async crear(datosPlanta) {
        try {
            const [resultado] = await pool.execute(
                `INSERT INTO plants (nombre, ubicacion, clienteId) 
                 VALUES (?, ?, ?)`,
                [datosPlanta.nombre, datosPlanta.ubicacion, datosPlanta.clienteId]
            );

            return await this.buscarPorId(resultado.insertId);
        } catch (error) {
            throw new Error(`Error al crear planta: ${error.message}`);
        }
    }

    // Buscar planta por ID
    static async buscarPorId(id) {
        try {
            const [plantas] = await pool.execute(
                `SELECT p.*, 
                        u.nombre as clienteNombre, 
                        u.email as clienteEmail,
                        ut.nombre as tecnicoNombre,
                        ut.email as tecnicoEmail
                 FROM plants p 
                 LEFT JOIN users u ON p.clienteId = u.id 
                 LEFT JOIN users ut ON p.tecnicoId = ut.id
                 WHERE p.id = ?`,
                [id]
            );

            if (plantas.length === 0) {
                return null;
            }

            return new Planta(plantas[0]);
        } catch (error) {
            throw new Error(`Error al buscar planta por ID: ${error.message}`);
        }
    }

    // Obtener todas las plantas
static async obtenerTodas(limite = 10, pagina = 1, filtros = {}) {
    try {
        const limiteNum = Number(limite);
        const paginaNum = Number(pagina);
        
        if (isNaN(limiteNum) || isNaN(paginaNum) || limiteNum < 1 || paginaNum < 1) {
            throw new Error('Parámetros de paginación inválidos');
        }
        
        const offset = (paginaNum - 1) * limiteNum;
        
        let whereClause = 'WHERE 1=1';
        const valores = []; // ✅ NUEVO: Array para valores parametrizados
        
        // ✅ CORREGIDO: Usar filtros.plantaIds del middleware
        if (filtros.plantaIds && filtros.plantaIds.length > 0) {
            // Crear placeholders para el IN clause
            const placeholders = filtros.plantaIds.map(() => '?').join(',');
            whereClause += ` AND p.id IN (${placeholders})`;
            valores.push(...filtros.plantaIds);
            console.log('🔍 [PLANTA MODEL] Filtro por plantaIds:', filtros.plantaIds);
        }
        
        // ✅ MANTENER filtros existentes pero parametrizados
        if (filtros.tecnicoId) {
            whereClause += ` AND p.tecnicoId = ?`;
            valores.push(filtros.tecnicoId);
        }
        
        if (filtros.clienteId) {
            whereClause += ` AND p.clienteId = ?`;
            valores.push(filtros.clienteId);
        }
        
        console.log('🔍 [PLANTA MODEL] Query con filtros:', { whereClause, valores });
        
        const query = `
            SELECT p.*, 
                   u.nombre as clienteNombre,
                   ut.nombre as tecnicoNombre
            FROM plants p 
            LEFT JOIN users u ON p.clienteId = u.id 
            LEFT JOIN users ut ON p.tecnicoId = ut.id
            ${whereClause}
            ORDER BY p.nombre 
            LIMIT ? OFFSET ?
        `;
        
        // ✅ AGREGAR límite y offset a los valores
        valores.push(limiteNum, offset);
        
        console.log('🔍 [PLANTA MODEL] Query final:', query);
        console.log('🔍 [PLANTA MODEL] Valores:', valores);
        
        const [plantas] = await pool.execute(query, valores);
        
        console.log('✅ [PLANTA MODEL] Plantas encontradas:', plantas.length);
        return plantas.map(planta => new Planta(planta));
        
    } catch (error) {
        console.error('❌ [PLANTA MODEL] Error en obtenerTodas:', error);
        throw new Error(`Error al obtener plantas: ${error.message}`);
    }
}

    // ✅ CORREGIDO: Obtener plantas por cliente (busca en usuario_plantas)
    static async obtenerPorCliente(clienteId) {
        try {
            const [plantas] = await pool.execute(
                `SELECT p.* 
                 FROM plants p
                 INNER JOIN usuario_plantas up ON p.id = up.planta_id
                 WHERE up.usuario_id = ? AND up.tipo_usuario = 'cliente'
                 ORDER BY p.nombre`,
                [clienteId]
            );

            return plantas.map(planta => new Planta(planta));
        } catch (error) {
            throw new Error(`Error al obtener plantas del cliente: ${error.message}`);
        }
    }

    // Actualizar planta
    static async actualizar(id, datosActualizados) {
        try {
            const camposPermitidos = ['nombre', 'ubicacion', 'clienteId', 'tecnicoId'];
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

            const consulta = `UPDATE plants SET ${camposParaActualizar.join(', ')} WHERE id = ?`;
            await pool.execute(consulta, valores);

            return await this.buscarPorId(id);
        } catch (error) {
            throw new Error(`Error al actualizar planta: ${error.message}`);
        }
    }

    // Eliminar planta
    static async eliminar(id) {
        try {
            const [resultado] = await pool.execute(
                `DELETE FROM plants WHERE id = ?`,
                [id]
            );

            console.log('✅ Planta eliminada (con eliminación en cascada)');
            return resultado.affectedRows > 0;
            
        } catch (error) {
            console.error('❌ Error al eliminar planta:', error);
            throw new Error(`Error al eliminar planta: ${error.message}`);
        }
    }

    // ✅ MÉTODOS PARA TÉCNICOS (1-a-1 - MANTENER POR COMPATIBILIDAD)
    static async asignarTecnico(plantaId, tecnicoId) {
        try {
            const [resultado] = await pool.execute(
                `UPDATE plants SET tecnicoId = ? WHERE id = ?`,
                [tecnicoId, plantaId]
            );

            if (resultado.affectedRows === 0) {
                throw new Error('Planta no encontrada');
            }

            return await this.buscarPorId(plantaId);
        } catch (error) {
            throw new Error(`Error asignando técnico: ${error.message}`);
        }
    }

    static async desasignarTecnico(plantaId) {
        try {
            const [resultado] = await pool.execute(
                `UPDATE plants SET tecnicoId = NULL WHERE id = ?`,
                [plantaId]
            );

            if (resultado.affectedRows === 0) {
                throw new Error('Planta no encontrada');
            }

            return await this.buscarPorId(plantaId);
        } catch (error) {
            throw new Error(`Error desasignando técnico: ${error.message}`);
        }
    }

static async obtenerPorTecnico(tecnicoId) {
    try {
        const [plantas] = await pool.execute(
            `SELECT p.*, u.nombre as clienteNombre 
             FROM plants p 
             INNER JOIN usuario_plantas up ON p.id = up.planta_id
             LEFT JOIN users u ON p.clienteId = u.id 
             WHERE up.usuario_id = ? AND up.tipo_usuario = 'tecnico'
             ORDER BY p.nombre`,
            [tecnicoId]
        );

        return plantas.map(planta => new Planta(planta));
    } catch (error) {
        throw new Error(`Error obteniendo plantas del técnico: ${error.message}`);
    }
}

    // ✅ MÉTODOS MUCHOS-A-MUCHOS PARA TÉCNICOS
    static async asignarTecnicos(plantaId, tecnicosIds) {
        try {
            // Eliminar técnicos existentes para esta planta
            await pool.execute(
                `DELETE FROM usuario_plantas WHERE planta_id = ? AND tipo_usuario = 'tecnico'`,
                [plantaId]
            );

            // Insertar nuevos técnicos
            for (const tecnicoId of tecnicosIds) {
                await pool.execute(
                    `INSERT INTO usuario_plantas (usuario_id, planta_id, tipo_usuario) 
                     VALUES (?, ?, 'tecnico')`,
                    [tecnicoId, plantaId]
                );
            }

            return await this.buscarPorId(plantaId);
        } catch (error) {
            throw new Error(`Error asignando técnicos: ${error.message}`);
        }
    }

    static async obtenerTecnicos(plantaId) {
        try {
            const [tecnicos] = await pool.execute(
                `SELECT u.id, u.nombre, u.email, u.rol 
                 FROM users u
                 INNER JOIN usuario_plantas up ON u.id = up.usuario_id
                 WHERE up.planta_id = ? AND up.tipo_usuario = 'tecnico'`,
                [plantaId]
            );
            return tecnicos;
        } catch (error) {
            throw new Error(`Error obteniendo técnicos: ${error.message}`);
        }
    }

    // ✅ MÉTODOS MUCHOS-A-MUCHOS PARA CLIENTES
    static async asignarClientes(plantaId, clientesIds) {
        try {
            // Eliminar clientes existentes para esta planta
            await pool.execute(
                `DELETE FROM usuario_plantas WHERE planta_id = ? AND tipo_usuario = 'cliente'`,
                [plantaId]
            );

            // Insertar nuevos clientes
            for (const clienteId of clientesIds) {
                await pool.execute(
                    `INSERT INTO usuario_plantas (usuario_id, planta_id, tipo_usuario) 
                     VALUES (?, ?, 'cliente')`,
                    [clienteId, plantaId]
                );
            }

            return await this.buscarPorId(plantaId);
        } catch (error) {
            throw new Error(`Error asignando clientes: ${error.message}`);
        }
    }

    static async obtenerClientes(plantaId) {
        try {
            const [clientes] = await pool.execute(
                `SELECT u.id, u.nombre, u.email, u.rol 
                 FROM users u
                 INNER JOIN usuario_plantas up ON u.id = up.usuario_id
                 WHERE up.planta_id = ? AND up.tipo_usuario = 'cliente'`,
                [plantaId]
            );
            return clientes;
        } catch (error) {
            throw new Error(`Error obteniendo clientes: ${error.message}`);
        }
    }

    // ✅ Obtener planta completa con técnicos y clientes
    static async obtenerPlantasCompletas(plantaId) {
        try {
            const planta = await this.buscarPorId(plantaId);
            if (!planta) return null;

            const tecnicos = await this.obtenerTecnicos(plantaId);
            const clientes = await this.obtenerClientes(plantaId);

            return {
                ...planta,
                tecnicos,
                clientes
            };
        } catch (error) {
            throw new Error(`Error obteniendo planta completa: ${error.message}`);
        }
    }
        



    /////////////////////////// nuevos metodos



static async obtenerMetricasConsolidadas(filtros = {}) {
    try {
        console.log('📊 [PLANTA MODEL] Obteniendo métricas - Filtros:', filtros);
        
        let whereClause = 'WHERE 1=1';
        const valores = [];
        
        // ✅ AGREGAR FILTRO por plantaIds
        if (filtros.plantaIds && filtros.plantaIds.length > 0) {
            const placeholders = filtros.plantaIds.map(() => '?').join(',');
            whereClause += ` AND p.id IN (${placeholders})`;
            valores.push(...filtros.plantaIds);
        }
        
        const [metricas] = await pool.execute(`
            SELECT 
                COUNT(*) as totalPlantas,
                SUM(CASE WHEN incidencias_pendientes > 0 THEN 1 ELSE 0 END) as plantasConIncidencias,
                SUM(CASE WHEN mantenimientos_pendientes > 0 THEN 1 ELSE 0 END) as plantasConMantenimiento,
                SUM(CASE WHEN incidencias_pendientes = 0 THEN 1 ELSE 0 END) as plantasOperativas,
                (SELECT COUNT(*) FROM incidencias i WHERE i.plantId IN (SELECT id FROM plants ${whereClause}) AND i.estado = 'pendiente') as incidenciasPendientes,
                (SELECT COUNT(*) FROM incidencias i WHERE i.plantId IN (SELECT id FROM plants ${whereClause}) AND i.estado = 'en_progreso') as incidenciasEnProgreso,
                (SELECT COUNT(*) FROM incidencias i WHERE i.plantId IN (SELECT id FROM plants ${whereClause}) AND i.estado = 'resuelto') as incidenciasResueltas,
                (SELECT COUNT(*) FROM mantenimientos m WHERE m.plantId IN (SELECT id FROM plants ${whereClause}) AND m.estado = 'pendiente') as mantenimientosPendientes,
                (SELECT COUNT(*) FROM mantenimientos m WHERE m.plantId IN (SELECT id FROM plants ${whereClause}) AND m.estado = 'en_progreso') as mantenimientosEnProgreso,
                (SELECT COUNT(*) FROM mantenimientos m WHERE m.plantId IN (SELECT id FROM plants ${whereClause}) AND m.estado = 'completado') as mantenimientosCompletados
            FROM (
                SELECT 
                    p.id,
                    (SELECT COUNT(*) FROM incidencias i WHERE i.plantId = p.id AND i.estado = 'pendiente') as incidencias_pendientes,
                    (SELECT COUNT(*) FROM mantenimientos m WHERE m.plantId = p.id AND m.estado = 'pendiente') as mantenimientos_pendientes
                FROM plants p
                ${whereClause}
            ) as plantas_metrics
        `, valores);

        const resultado = metricas[0];
        
        console.log('✅ [PLANTA MODEL] Métricas obtenidas:', resultado);
        
        return {
            totalPlantas: Number(resultado.totalPlantas) || 0,
            plantasConIncidencias: Number(resultado.plantasConIncidencias) || 0,
            plantasConMantenimiento: Number(resultado.plantasConMantenimiento) || 0,
            plantasOperativas: Number(resultado.plantasOperativas) || 0,
            incidencias: {
                pendientes: Number(resultado.incidenciasPendientes) || 0,
                enProgreso: Number(resultado.incidenciasEnProgreso) || 0,
                resueltas: Number(resultado.incidenciasResueltas) || 0
            },
            mantenimientos: {
                pendientes: Number(resultado.mantenimientosPendientes) || 0,
                enProgreso: Number(resultado.mantenimientosEnProgreso) || 0,
                completados: Number(resultado.mantenimientosCompletados) || 0
            }
        };
        
    } catch (error) {
        console.error('❌ [PLANTA MODEL] Error en obtenerMetricasConsolidadas:', error);
        throw new Error(`Error obteniendo métricas: ${error.message}`);
    }
}

static async obtenerPlantasConEstados(filtros = {}) {
    try {
        console.log('🏭 [PLANTA MODEL] Obteniendo plantas con estados - Filtros:', filtros);
        
        let whereClause = 'WHERE 1=1';
        const valores = [];
        
        // ✅ AGREGAR FILTRO por plantaIds
        if (filtros.plantaIds && filtros.plantaIds.length > 0) {
            const placeholders = filtros.plantaIds.map(() => '?').join(',');
            whereClause += ` AND p.id IN (${placeholders})`;
            valores.push(...filtros.plantaIds);
        }
        
        const query = `
            SELECT 
                p.id,
                p.nombre,
                p.ubicacion,
                p.clienteId,
                p.tecnicoId,
                u.nombre as clienteNombre,
                ut.nombre as tecnicoNombre,
              
                COUNT(DISTINCT i.id) as totalIncidencias,
                COUNT(DISTINCT CASE WHEN i.estado = 'resuelto' THEN i.id END) as incidenciasResueltas,
                COUNT(DISTINCT CASE WHEN i.estado = 'pendiente' THEN i.id END) as incidenciasPendientes,
                COUNT(DISTINCT CASE WHEN i.estado = 'en_progreso' THEN i.id END) as incidenciasEnProgreso,
                COUNT(DISTINCT m.id) as mantenimientosPendientes,
                
                CASE 
                    WHEN COUNT(DISTINCT CASE WHEN i.estado = 'pendiente' THEN i.id END) > 2 THEN 'critical'
                    WHEN COUNT(DISTINCT CASE WHEN i.estado = 'pendiente' THEN i.id END) > 0 THEN 'attention' 
                    WHEN COUNT(DISTINCT CASE WHEN i.estado = 'en_progreso' THEN i.id END) > 0 THEN 'attention'
                    ELSE 'optimal'
                END as estado
            FROM plants p
            LEFT JOIN users u ON p.clienteId = u.id
            LEFT JOIN users ut ON p.tecnicoId = ut.id
            LEFT JOIN incidencias i ON p.id = i.plantId
            LEFT JOIN mantenimientos m ON p.id = m.plantId AND m.estado = 'pendiente'
            ${whereClause}
            GROUP BY p.id, p.nombre, p.ubicacion, p.clienteId, p.tecnicoId, u.nombre, ut.nombre
            ORDER BY p.nombre
        `;

        console.log('🔍 [PLANTA MODEL] Query plantas con estados:', query);
        console.log('🔍 [PLANTA MODEL] Valores:', valores);
        
        const [plantas] = await pool.execute(query, valores);
        
        console.log('✅ [PLANTA MODEL] Plantas con estados obtenidas:', plantas.length);
        
        return plantas.map(planta => {
            const totalIncidencias = Number(planta.totalIncidencias) || 0;
            const incidenciasResueltas = Number(planta.incidenciasResueltas) || 0;
            
            const tasaResolucion = totalIncidencias > 0 
                ? Math.round((incidenciasResueltas / totalIncidencias) * 100)
                : 100;

            return {
                id: planta.id,
                nombre: planta.nombre,
                ubicacion: planta.ubicacion,
                clienteId: planta.clienteId,
                tecnicoId: planta.tecnicoId,
                clienteNombre: planta.clienteNombre,
                tecnicoNombre: planta.tecnicoNombre,
                tasaResolucion: tasaResolucion,
                estados: {
                    planta: planta.estado,
                    incidenciasPendientes: Number(planta.incidenciasPendientes) || 0,
                    incidenciasEnProgreso: Number(planta.incidenciasEnProgreso) || 0,
                    incidenciasResueltas: incidenciasResueltas,
                    mantenimientosPendientes: Number(planta.mantenimientosPendientes) || 0
                }
            };
        });
        
    } catch (error) {
        console.error('❌ [PLANTA MODEL] Error en obtenerPlantasConEstados:', error);
        throw new Error(`Error obteniendo plantas con estados: ${error.message}`);
    }
}

static async obtenerResumenDashboard(filtros = {}) {
    try {
        console.log('🎯 [PLANTA MODEL] Obteniendo resumen dashboard - Filtros:', filtros);
        
        let whereClause = 'WHERE 1=1';
        const valores = [];
        
        // ✅ AGREGAR FILTRO por plantaIds
        if (filtros.plantaIds && filtros.plantaIds.length > 0) {
            const placeholders = filtros.plantaIds.map(() => '?').join(',');
            whereClause += ` AND p.id IN (${placeholders})`;
            valores.push(...filtros.plantaIds);
        }
        
        const query = `
            SELECT 
                p.id,
                p.nombre,
                p.ubicacion,
                NULL as nivelLocal,
                NULL as ultimaLectura, 
                (SELECT COUNT(*) FROM incidencias i WHERE i.plantId = p.id AND i.estado = 'pendiente') as incidenciasPendientes,
                (SELECT COUNT(*) FROM mantenimientos m WHERE m.plantId = p.id AND m.estado = 'pendiente') as mantenimientosPendientes
            FROM plants p
            ${whereClause}
            ORDER BY p.nombre
            LIMIT 10
        `;

        console.log('🔍 [PLANTA MODEL] Query resumen dashboard:', query);
        console.log('🔍 [PLANTA MODEL] Valores:', valores);
        
        const [resumen] = await pool.execute(query, valores);
        
        console.log('✅ [PLANTA MODEL] Resumen dashboard obtenido:', resumen.length);
        
        return resumen.map(item => ({
            id: item.id,
            nombre: item.nombre,
            ubicacion: item.ubicacion,
            nivelLocal: item.nivelLocal,
            ultimaLectura: item.ultimaLectura,
            incidenciasPendientes: parseInt(item.incidenciasPendientes) || 0,
            mantenimientosPendientes: parseInt(item.mantenimientosPendientes) || 0,
            estado: item.incidenciasPendientes > 0 ? 'con_incidencias' : 'operativa'
        }));
        
    } catch (error) {
        console.error('❌ [PLANTA MODEL] Error en obtenerResumenDashboard:', error);
        throw new Error(`Error obteniendo resumen dashboard: ${error.message}`);
    }
}


}