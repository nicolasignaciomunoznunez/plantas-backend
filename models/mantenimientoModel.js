import { pool } from "../db/connectDB.js";

export class Mantenimiento {
    constructor(mantenimiento) {
        this.id = mantenimiento.id;
        this.plantId = mantenimiento.plantId;
        this.userId = mantenimiento.userId;
        this.tipo = mantenimiento.tipo;
        this.descripcion = mantenimiento.descripcion;
        this.fechaProgramada = mantenimiento.fechaProgramada;
        this.fechaRealizada = mantenimiento.fechaRealizada;
        this.estado = mantenimiento.estado;
        this.usuario = mantenimiento.usuario; // Para joins
        this.planta = mantenimiento.planta; // Para joins
        this.checklist = mantenimiento.checklist; // Para joins
        this.fotos = mantenimiento.fotos || [];
        this.materiales = mantenimiento.materiales || [];
        this.tecnicoNombre = mantenimiento.tecnicoNombre;
        this.plantaNombre = mantenimiento.plantaNombre;
    }

    // Crear nuevo mantenimiento
    static async crear(datosMantenimiento) {
        try {
            const [resultado] = await pool.execute(
                `INSERT INTO mantenimientos (plantId, userId, tipo, descripcion, fechaProgramada, estado) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    datosMantenimiento.plantId,
                    datosMantenimiento.userId,
                    datosMantenimiento.tipo || 'preventivo',
                    datosMantenimiento.descripcion,
                    datosMantenimiento.fechaProgramada,
                    datosMantenimiento.estado || 'pendiente'
                ]
            );

            return await this.buscarPorId(resultado.insertId);
        } catch (error) {
            throw new Error(`Error al crear mantenimiento: ${error.message}`);
        }
    }

    // Buscar mantenimiento por ID
    static async buscarPorId(id) {
        try {
            const [mantenimientos] = await pool.execute(
                `SELECT m.*, u.nombre as tecnicoNombre, p.nombre as plantaNombre 
                 FROM mantenimientos m 
                 LEFT JOIN users u ON m.userId = u.id 
                 LEFT JOIN plants p ON m.plantId = p.id 
                 WHERE m.id = ?`,
                [id]
            );

            if (mantenimientos.length === 0) {
                return null;
            }

            const mantenimiento = new Mantenimiento(mantenimientos[0]);
            
            // Obtener checklist
            const checklist = await this.obtenerChecklist(id);
            mantenimiento.checklist = checklist;

            return mantenimiento;
        } catch (error) {
            throw new Error(`Error al buscar mantenimiento por ID: ${error.message}`);
        }
    }

    // Obtener checklist de mantenimiento
    static async obtenerChecklist(mantenimientoId) {
        try {
            const [items] = await pool.execute(
                `SELECT * FROM mantenimiento_checklist WHERE mantenimientoId = ? ORDER BY id`,
                [mantenimientoId]
            );

            return items;
        } catch (error) {
            throw new Error(`Error al obtener checklist: ${error.message}`);
        }
    }

    // Agregar item al checklist
    static async agregarItemChecklist(mantenimientoId, item) {
        try {
            const [resultado] = await pool.execute(
                `INSERT INTO mantenimiento_checklist (mantenimientoId, item) VALUES (?, ?)`,
                [mantenimientoId, item]
            );

            return resultado.insertId;
        } catch (error) {
            throw new Error(`Error al agregar item al checklist: ${error.message}`);
        }
    }

    // Actualizar item del checklist
    static async actualizarItemChecklist(itemId, datosActualizados) {
        try {
            const camposPermitidos = ['completado', 'observaciones'];
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

            valores.push(itemId);

            const consulta = `UPDATE mantenimiento_checklist SET ${camposParaActualizar.join(', ')} WHERE id = ?`;
            await pool.execute(consulta, valores);

            return true;
        } catch (error) {
            throw new Error(`Error al actualizar item del checklist: ${error.message}`);
        }
    }

    // Obtener mantenimientos por planta
static async obtenerPorPlanta(plantId, filtros = {}) {
    try {
        let whereClause = 'WHERE m.plantId = ?';
        const parametros = [plantId];
        
        // ✅ NUEVO: Verificar que la planta esté en los filtros del usuario
        if (filtros.plantaIds && filtros.plantaIds.length > 0) {
            if (!filtros.plantaIds.includes(parseInt(plantId))) {
                // El usuario no tiene acceso a esta planta
                return [];
            }
        }
        
        if (filtros.estado) {
            whereClause += ` AND m.estado = ?`;
            parametros.push(filtros.estado);
        }
        
        const query = `
            SELECT m.*, u.nombre as tecnicoNombre, p.nombre as plantaNombre 
            FROM mantenimientos m 
            LEFT JOIN users u ON m.userId = u.id 
            LEFT JOIN plants p ON m.plantId = p.id 
            ${whereClause}
            ORDER BY m.fechaProgramada DESC
        `;
        
        console.log('🔍 [MANTENIMIENTO MODEL] Query obtenerPorPlanta:', { query, parametros });
        
        const [mantenimientos] = await pool.execute(query, parametros);

        return mantenimientos.map(mantenimiento => new Mantenimiento(mantenimiento));
    } catch (error) {
        throw new Error(`Error al obtener mantenimientos por planta: ${error.message}`);
    }
}

    // Obtener mantenimientos por técnico
static async obtenerPorTecnico(userId, filtros = {}) {
    try {
        let whereClause = 'WHERE m.userId = ?';
        const parametros = [userId];
        
        // ✅ NUEVO: Filtrar por plantaIds del middleware
        if (filtros.plantaIds && filtros.plantaIds.length > 0) {
            const placeholders = filtros.plantaIds.map(() => '?').join(',');
            whereClause += ` AND m.plantId IN (${placeholders})`;
            parametros.push(...filtros.plantaIds);
        }
        
        const query = `
            SELECT m.*, u.nombre as tecnicoNombre, p.nombre as plantaNombre 
            FROM mantenimientos m 
            LEFT JOIN users u ON m.userId = u.id 
            LEFT JOIN plants p ON m.plantId = p.id 
            ${whereClause}
            ORDER BY m.fechaProgramada DESC
        `;
        
        console.log('🔍 [MANTENIMIENTO MODEL] Query obtenerPorTecnico:', { query, parametros });
        
        const [mantenimientos] = await pool.execute(query, parametros);

        return mantenimientos.map(mantenimiento => new Mantenimiento(mantenimiento));
    } catch (error) {
        throw new Error(`Error al obtener mantenimientos por técnico: ${error.message}`);
    }
}



static async obtenerTodos({ limite = 50, offset = 0, filtros = {} } = {}) {
    try {
        console.log('🔍 [MANTENIMIENTO MODEL] Versión CON filtros:', { filtros });
        
        const limitNum = parseInt(limite) || 50;
        const offsetNum = parseInt(offset) || 0;

        let whereClause = 'WHERE 1=1';
        const parametros = [];
        
        // ✅ NUEVO: Filtrar por plantaIds del middleware
        if (filtros.plantaIds && filtros.plantaIds.length > 0) {
            const placeholders = filtros.plantaIds.map(() => '?').join(',');
            whereClause += ` AND m.plantId IN (${placeholders})`;
            parametros.push(...filtros.plantaIds);
        }

        const query = `
            SELECT 
                m.*, 
                COALESCE(u.nombre, CONCAT('Usuario ', m.userId)) as tecnicoNombre,
                COALESCE(p.nombre, CONCAT('Planta ', m.plantId)) as plantaNombre
            FROM mantenimientos m 
            LEFT JOIN users u ON m.userId = u.id 
            LEFT JOIN plants p ON m.plantId = p.id 
            ${whereClause}
            ORDER BY m.fechaProgramada DESC 
            LIMIT ${limitNum} OFFSET ${offsetNum}
        `;

        console.log('📝 [MANTENIMIENTO MODEL] Query con filtros:', query);
        console.log('🔍 [MANTENIMIENTO MODEL] Parámetros:', parametros);
        
        const [mantenimientos] = await pool.execute(query, parametros);
        console.log('✅ Mantenimientos encontrados:', mantenimientos.length);

        // Obtener el total con filtros
        const [totalResult] = await pool.execute(
            `SELECT COUNT(*) as total FROM mantenimientos m ${whereClause}`,
            parametros
        );
        const total = totalResult[0]?.total || 0;

        return {
            rows: mantenimientos.map(mantenimiento => new Mantenimiento(mantenimiento)),
            count: total
        };
    } catch (error) {
        console.error('❌ [MANTENIMIENTO MODEL] Error en obtenerTodos con filtros:', error);
        throw new Error(`Error al obtener mantenimientos: ${error.message}`);
    }
}

    // Actualizar mantenimiento
    static async actualizar(id, datosActualizados) {
        try {
            const camposPermitidos = ['descripcion','tipo' ,'fechaProgramada', 'fechaRealizada', 'estado', 'userId'];
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

            const consulta = `UPDATE mantenimientos SET ${camposParaActualizar.join(', ')} WHERE id = ?`;
            await pool.execute(consulta, valores);

            return await this.buscarPorId(id);
        } catch (error) {
            throw new Error(`Error al actualizar mantenimiento: ${error.message}`);
        }
    }

    // Cambiar estado de mantenimiento
    static async cambiarEstado(id, estado) {
        try {
            let fechaRealizada = null;
            if (estado === 'completado') {
                fechaRealizada = new Date();
            }

            await pool.execute(
                `UPDATE mantenimientos SET estado = ?, fechaRealizada = ? WHERE id = ?`,
                [estado, fechaRealizada, id]
            );

            return await this.buscarPorId(id);
        } catch (error) {
            throw new Error(`Error al cambiar estado de mantenimiento: ${error.message}`);
        }
    }

    // Eliminar mantenimiento
    static async eliminar(id) {
        try {
            const [resultado] = await pool.execute(
                `DELETE FROM mantenimientos WHERE id = ?`,
                [id]
            );

            return resultado.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al eliminar mantenimiento: ${error.message}`);
        }
    }



 static async obtenerPorPlantaYRangoFechas(plantId, fechaInicio, fechaFin) {
    try {
        const query = `
            SELECT m.*, u.nombre as tecnicoNombre, p.nombre as plantaNombre 
            FROM mantenimientos m 
            LEFT JOIN users u ON m.userId = u.id 
            LEFT JOIN plants p ON m.plantId = p.id 
            WHERE m.plantId = ? 
            AND m.fechaProgramada BETWEEN ? AND ?
            ORDER BY m.fechaProgramada DESC
        `;
        
        console.log('🔧 [MODEL] Query obtenerPorPlantaYRangoFechas (Mantenimientos):', { 
            plantId, 
            fechaInicio: fechaInicio.toISOString(), 
            fechaFin: fechaFin.toISOString() 
        });
        
        const [mantenimientos] = await pool.execute(query, [plantId, fechaInicio, fechaFin]);
        
        console.log('🔧 [MODEL] Mantenimientos encontrados:', mantenimientos.length);
        
        return mantenimientos.map(mantenimiento => new Mantenimiento(mantenimiento));
    } catch (error) {
        throw new Error(`Error al obtener mantenimientos por planta y rango de fechas: ${error.message}`);
    }
}





///////////nuevos metodos////////////
static async obtenerPendientesProximos(limite = 10, filtros = {}) {
    try {
        console.log('🔧 [MANTENIMIENTO MODEL] Obteniendo pendientes próximos - Filtros:', filtros);
        
        const limiteNum = Number(limite) || 10;
        
        let whereClause = `WHERE m.estado = 'pendiente' AND m.fechaProgramada >= CURDATE()`;
        const parametros = [];
        
        // ✅ NUEVO: Filtrar por plantaIds
        if (filtros.plantaIds && filtros.plantaIds.length > 0) {
            const placeholders = filtros.plantaIds.map(() => '?').join(',');
            whereClause += ` AND m.plantId IN (${placeholders})`;
            parametros.push(...filtros.plantaIds);
        }
        
        const query = `
            SELECT m.*, u.nombre as tecnicoNombre, p.nombre as plantaNombre 
            FROM mantenimientos m 
            LEFT JOIN users u ON m.userId = u.id 
            LEFT JOIN plants p ON m.plantId = p.id 
            ${whereClause}
            ORDER BY m.fechaProgramada ASC 
            LIMIT ${limiteNum}
        `;
        
        console.log('🔍 [MANTENIMIENTO MODEL] Query obtenerPendientesProximos:', { query, parametros });
        
        const [mantenimientos] = await pool.execute(query, parametros);

        console.log('✅ [MANTENIMIENTO MODEL] Mantenimientos próximos obtenidos:', mantenimientos.length);
        
        return mantenimientos.map(mantenimiento => new Mantenimiento(mantenimiento));
    } catch (error) {
        console.error('❌ [MANTENIMIENTO MODEL] Error en obtenerPendientesProximos:', error);
        throw new Error(`Error obteniendo mantenimientos próximos: ${error.message}`);
    }
}



static async obtenerResumenDashboard(filtros = {}) {
    try {
        console.log('📊 [MANTENIMIENTO MODEL] Obteniendo resumen para dashboard - Filtros:', filtros);
        
        let whereClause = '';
        const parametros = [];
        
        // ✅ NUEVO: Filtrar por plantaIds
        if (filtros.plantaIds && filtros.plantaIds.length > 0) {
            const placeholders = filtros.plantaIds.map(() => '?').join(',');
            whereClause = ` WHERE m.plantId IN (${placeholders})`;
            parametros.push(...filtros.plantaIds);
        }
        
        const [resumen] = await pool.execute(`
            SELECT 
                estado,
                COUNT(*) as cantidad
            FROM mantenimientos m
            ${whereClause}
            GROUP BY estado
            ORDER BY 
                CASE estado 
                    WHEN 'pendiente' THEN 1
                    WHEN 'en_progreso' THEN 2  
                    WHEN 'completado' THEN 3
                END
        `, parametros);

        const [proximos] = await pool.execute(`
            SELECT m.*, p.nombre as plantaNombre
            FROM mantenimientos m
            LEFT JOIN plants p ON m.plantId = p.id
            ${whereClause ? whereClause + ' AND ' : ' WHERE '} 
            m.estado IN ('pendiente', 'en_progreso')
            AND m.fechaProgramada >= CURDATE()
            ORDER BY m.fechaProgramada ASC
            LIMIT 5
        `, parametros);

        console.log('✅ [MANTENIMIENTO MODEL] Resumen dashboard obtenido');
        
        return {
            porEstado: resumen.reduce((acc, item) => {
                acc[item.estado] = parseInt(item.cantidad) || 0;
                return acc;
            }, {}),
            proximos: proximos.map(mantenimiento => new Mantenimiento(mantenimiento))
        };
        
    } catch (error) {
        console.error('❌ [MANTENIMIENTO MODEL] Error en obtenerResumenDashboard:', error);
        throw new Error(`Error obteniendo resumen dashboard: ${error.message}`);
    }
}

static async obtenerEstadisticasPorPlanta(filtros = {}) {
    try {
        console.log('📈 [MANTENIMIENTO MODEL] Obteniendo estadísticas por planta - Filtros:', filtros);
        
        let whereClause = '';
        const parametros = [];
        
        // ✅ NUEVO: Filtrar por plantaIds
        if (filtros.plantaIds && filtros.plantaIds.length > 0) {
            const placeholders = filtros.plantaIds.map(() => '?').join(',');
            whereClause = ` WHERE p.id IN (${placeholders})`;
            parametros.push(...filtros.plantaIds);
        }
        
        const [estadisticas] = await pool.execute(`
            SELECT 
                p.id,
                p.nombre as plantaNombre,
                COUNT(m.id) as totalMantenimientos,
                COUNT(CASE WHEN m.estado = 'pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN m.estado = 'en_progreso' THEN 1 END) as enProgreso,
                COUNT(CASE WHEN m.estado = 'completado' THEN 1 END) as completados,
                COUNT(CASE WHEN m.tipo = 'preventivo' THEN 1 END) as preventivos,
                COUNT(CASE WHEN m.tipo = 'correctivo' THEN 1 END) as correctivos
            FROM plants p
            LEFT JOIN mantenimientos m ON p.id = m.plantId
            ${whereClause}
            GROUP BY p.id, p.nombre
            ORDER BY totalMantenimientos DESC
        `, parametros);

        console.log('✅ [MANTENIMIENTO MODEL] Estadísticas por planta obtenidas');
        
        return estadisticas.map(estadistica => ({
            plantaId: estadistica.id,
            plantaNombre: estadistica.plantaNombre,
            totalMantenimientos: parseInt(estadistica.totalMantenimientos) || 0,
            pendientes: parseInt(estadistica.pendientes) || 0,
            enProgreso: parseInt(estadistica.enProgreso) || 0,
            completados: parseInt(estadistica.completados) || 0,
            preventivos: parseInt(estadistica.preventivos) || 0,
            correctivos: parseInt(estadistica.correctivos) || 0
        }));
        
    } catch (error) {
        console.error('❌ [MANTENIMIENTO MODEL] Error en obtenerEstadisticasPorPlanta:', error);
        throw new Error(`Error obteniendo estadísticas por planta: ${error.message}`);
    }
}

static async obtenerMantenimientosVencidos(filtros = {}) {
    try {
        console.log('⚠️ [MANTENIMIENTO MODEL] Obteniendo mantenimientos vencidos - Filtros:', filtros);
        
        let whereClause = `WHERE m.estado = 'pendiente' AND m.fechaProgramada < CURDATE()`;
        const parametros = [];
        
        // ✅ NUEVO: Filtrar por plantaIds
        if (filtros.plantaIds && filtros.plantaIds.length > 0) {
            const placeholders = filtros.plantaIds.map(() => '?').join(',');
            whereClause += ` AND m.plantId IN (${placeholders})`;
            parametros.push(...filtros.plantaIds);
        }
        
        const query = `
            SELECT m.*, p.nombre as plantaNombre, u.nombre as tecnicoNombre
            FROM mantenimientos m
            LEFT JOIN plants p ON m.plantId = p.id
            LEFT JOIN users u ON m.userId = u.id
            ${whereClause}
            ORDER BY m.fechaProgramada ASC
        `;
        
        console.log('🔍 [MANTENIMIENTO MODEL] Query obtenerMantenimientosVencidos:', { query, parametros });
        
        const [vencidos] = await pool.execute(query, parametros);

        console.log('✅ [MANTENIMIENTO MODEL] Mantenimientos vencidos obtenidos:', vencidos.length);
        
        return vencidos.map(mantenimiento => new Mantenimiento(mantenimiento));
        
    } catch (error) {
        console.error('❌ [MANTENIMIENTO MODEL] Error en obtenerMantenimientosVencidos:', error);
        throw new Error(`Error obteniendo mantenimientos vencidos: ${error.message}`);
    }
}



// Buscar mantenimiento completo con fotos y materiales
static async buscarCompletoPorId(id) {
    try {
        const [mantenimientos] = await pool.execute(
            `SELECT m.*, u.nombre as tecnicoNombre, p.nombre as plantaNombre 
             FROM mantenimientos m 
             LEFT JOIN users u ON m.userId = u.id 
             LEFT JOIN plants p ON m.plantId = p.id 
             WHERE m.id = ?`,
            [id]
        );

        if (mantenimientos.length === 0) {
            return null;
        }

        const mantenimiento = new Mantenimiento(mantenimientos[0]);
        
        // Obtener fotos
        const [fotos] = await pool.execute(
            `SELECT id, tipo, ruta_archivo, descripcion, datos_imagen, created_at
             FROM mantenimiento_fotos 
             WHERE mantenimiento_id = ?
             ORDER BY tipo, created_at`,
            [id]
        );
        mantenimiento.fotos = fotos;
        
        // Obtener materiales
        const [materiales] = await pool.execute(
            `SELECT * FROM mantenimiento_materiales 
             WHERE mantenimiento_id = ?
             ORDER BY created_at`,
            [id]
        );
        mantenimiento.materiales = materiales;

        // Obtener checklist
        const checklist = await this.obtenerChecklist(id);
        mantenimiento.checklist = checklist;

        return mantenimiento;
    } catch (error) {
        throw new Error(`Error al buscar mantenimiento completo: ${error.message}`);
    }
}

// Subir fotos a mantenimiento
static async subirFotos(mantenimientoId, fotosData) {
    try {
        const fotosInsertadas = [];
        
        for (const foto of fotosData) {
            console.log('📸 [MANTENIMIENTO MODEL] Insertando foto:', {
                mantenimientoId,
                tipo: foto.tipo,
                ruta_archivo: foto.ruta_archivo,
                descripcion: foto.descripcion,
                tieneDatosImagen: !!foto.datos_imagen
            });

            const [resultado] = await pool.execute(
                `INSERT INTO mantenimiento_fotos (mantenimiento_id, tipo, ruta_archivo, descripcion, datos_imagen) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    mantenimientoId, 
                    foto.tipo, 
                    foto.ruta_archivo, 
                    foto.descripcion || '',
                    foto.datos_imagen
                ]
            );
            
            fotosInsertadas.push({
                id: resultado.insertId,
                tipo: foto.tipo,
                ruta_archivo: foto.ruta_archivo,
                descripcion: foto.descripcion
            });
        }
        
        return fotosInsertadas;
    } catch (error) {
        console.error('❌ [MANTENIMIENTO MODEL] Error en subirFotos:', error);
        throw new Error(`Error al subir fotos: ${error.message}`);
    }
}

// Agregar materiales a mantenimiento
static async agregarMateriales(mantenimientoId, materiales) {
    try {
        const materialesInsertados = [];
        
        for (const material of materiales) {
            const [resultado] = await pool.execute(
                `INSERT INTO mantenimiento_materiales (mantenimiento_id, material_nombre, cantidad, unidad, costo) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    mantenimientoId,
                    material.material_nombre,
                    material.cantidad,
                    material.unidad,
                    material.costo || 0
                ]
            );
            materialesInsertados.push({
                id: resultado.insertId,
                ...material
            });
        }
        
        return materialesInsertados;
    } catch (error) {
        throw new Error(`Error al agregar materiales: ${error.message}`);
    }
}

// Completar mantenimiento con fotos, materiales y checklist
static async completarMantenimiento(id, datosCompletar) {
    try {
        const { 
            resumenTrabajo, 
            materiales = [], 
            fotos = [],
            checklistCompletado = []
        } = datosCompletar;
        
        console.log('🔄 [MANTENIMIENTO MODEL] Completando mantenimiento:', { 
            id, 
            materialesCount: materiales.length,
            fotosCount: fotos.length,
            checklistCount: checklistCompletado.length
        });

        // Actualizar mantenimiento
        const [result] = await pool.execute(
            `UPDATE mantenimientos 
             SET estado = 'completado', 
                 fechaRealizada = NOW(),
                 descripcion = CONCAT(COALESCE(descripcion, ''), 
                                   CASE WHEN COALESCE(descripcion, '') != '' THEN '\n\n' ELSE '' END,
                                   'RESUMEN EJECUCIÓN: ', ?)
             WHERE id = ?`,
            [resumenTrabajo, id]
        );

        console.log('✅ [MANTENIMIENTO MODEL] Mantenimiento actualizado:', result.affectedRows);

        // Agregar materiales si existen
        if (materiales && materiales.length > 0) {
            console.log('📦 [MANTENIMIENTO MODEL] Agregando materiales:', materiales.length);
            await this.agregarMateriales(id, materiales);
        }

        // Agregar fotos si existen
        if (fotos && fotos.length > 0) {
            console.log('📸 [MANTENIMIENTO MODEL] Agregando fotos:', fotos.length);
            await this.subirFotos(id, fotos);
        }

        // Actualizar checklist si existe
        if (checklistCompletado && checklistCompletado.length > 0) {
            console.log('✅ [MANTENIMIENTO MODEL] Actualizando checklist:', checklistCompletado.length);
            for (const item of checklistCompletado) {
                await this.actualizarItemChecklist(item.id, {
                    completado: item.completado,
                    observaciones: item.observaciones
                });
            }
        }

        return await this.buscarCompletoPorId(id);
    } catch (error) {
        console.error('❌ [MANTENIMIENTO MODEL] Error en completarMantenimiento:', error);
        throw new Error(`Error al completar mantenimiento: ${error.message}`);
    }
}

// Obtener estadísticas para reporte PDF
static async obtenerEstadisticasReporte(mantenimientoId) {
    try {
        const [estadisticas] = await pool.execute(`
            SELECT 
                m.*,
                p.nombre as planta_nombre,
                p.ubicacion as planta_ubicacion,
                u.nombre as tecnico_nombre,
                (SELECT COUNT(*) FROM mantenimiento_fotos WHERE mantenimiento_id = ? AND tipo = 'antes') as fotos_antes,
                (SELECT COUNT(*) FROM mantenimiento_fotos WHERE mantenimiento_id = ? AND tipo = 'despues') as fotos_despues,
                (SELECT COUNT(*) FROM mantenimiento_materiales WHERE mantenimiento_id = ?) as total_materiales,
                (SELECT SUM(cantidad * costo) FROM mantenimiento_materiales WHERE mantenimiento_id = ?) as costo_total_materiales,
                (SELECT COUNT(*) FROM mantenimiento_checklist WHERE mantenimientoId = ?) as total_checklist,
                (SELECT COUNT(*) FROM mantenimiento_checklist WHERE mantenimientoId = ? AND completado = 1) as checklist_completados
            FROM mantenimientos m
            LEFT JOIN plants p ON m.plantId = p.id
            LEFT JOIN users u ON m.userId = u.id
            WHERE m.id = ?
        `, [mantenimientoId, mantenimientoId, mantenimientoId, mantenimientoId, mantenimientoId, mantenimientoId, mantenimientoId]);

        if (estadisticas.length === 0) {
            return null;
        }

        return estadisticas[0];
    } catch (error) {
        throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
}

// Eliminar foto de mantenimiento
static async eliminarFoto(fotoId) {
    try {
        const [resultado] = await pool.execute(
            `DELETE FROM mantenimiento_fotos WHERE id = ?`,
            [fotoId]
        );
        return resultado.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error al eliminar foto: ${error.message}`);
    }
}

// Eliminar material de mantenimiento
static async eliminarMaterial(materialId) {
    try {
        const [resultado] = await pool.execute(
            `DELETE FROM mantenimiento_materiales WHERE id = ?`,
            [materialId]
        );
        return resultado.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error al eliminar material: ${error.message}`);
    }
}

// Iniciar mantenimiento (subir fotos "antes")
static async iniciarMantenimiento(id, fotosAntes = []) {
    try {
        console.log('🔄 [MANTENIMIENTO MODEL] Iniciando mantenimiento:', { 
            id, 
            fotosAntesCount: fotosAntes.length 
        });

        // Actualizar estado
        const [result] = await pool.execute(
            `UPDATE mantenimientos 
             SET estado = 'en_progreso'
             WHERE id = ?`,
            [id]
        );

        // Subir fotos "antes" si existen
        if (fotosAntes && fotosAntes.length > 0) {
            console.log('📸 [MANTENIMIENTO MODEL] Subiendo fotos "antes":', fotosAntes.length);
            await this.subirFotos(id, fotosAntes.map(foto => ({
                ...foto,
                tipo: 'antes'
            })));
        }

        return await this.buscarCompletoPorId(id);
    } catch (error) {
        console.error('❌ [MANTENIMIENTO MODEL] Error en iniciarMantenimiento:', error);
        throw new Error(`Error al iniciar mantenimiento: ${error.message}`);
    }
}





}