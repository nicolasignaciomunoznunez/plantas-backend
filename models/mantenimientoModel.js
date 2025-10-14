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
    static async obtenerPorPlanta(plantId) {
        try {
            const [mantenimientos] = await pool.execute(
                `SELECT m.*, u.nombre as tecnicoNombre, p.nombre as plantaNombre 
                 FROM mantenimientos m 
                 LEFT JOIN users u ON m.userId = u.id 
                 LEFT JOIN plants p ON m.plantId = p.id 
                 WHERE m.plantId = ? 
                 ORDER BY m.fechaProgramada DESC`,
                [plantId]
            );

            return mantenimientos.map(mantenimiento => new Mantenimiento(mantenimiento));
        } catch (error) {
            throw new Error(`Error al obtener mantenimientos por planta: ${error.message}`);
        }
    }

    // Obtener mantenimientos por técnico
    static async obtenerPorTecnico(userId) {
        try {
            const [mantenimientos] = await pool.execute(
                `SELECT m.*, u.nombre as tecnicoNombre, p.nombre as plantaNombre 
                 FROM mantenimientos m 
                 LEFT JOIN users u ON m.userId = u.id 
                 LEFT JOIN plants p ON m.plantId = p.id 
                 WHERE m.userId = ? 
                 ORDER BY m.fechaProgramada DESC`,
                [userId]
            );

            return mantenimientos.map(mantenimiento => new Mantenimiento(mantenimiento));
        } catch (error) {
            throw new Error(`Error al obtener mantenimientos por técnico: ${error.message}`);
        }
    }


// En models/mantenimientoModel.js - SIN PARÁMETROS
static async obtenerTodos({ limite = 50, offset = 0 } = {}) {
    try {
        console.log('🔍 [MODEL] Versión SIN parámetros');
        
        // Usar valores directos sin parámetros preparados
        const limitNum = parseInt(limite) || 50;
        const offsetNum = parseInt(offset) || 0;

        console.log('🔢 Parámetros directos:', { limitNum, offsetNum });

        // ✅ CONSULTA SIN PARÁMETROS PREPARADOS
        const query = `
            SELECT 
                m.*, 
                COALESCE(u.nombre, CONCAT('Usuario ', m.userId)) as tecnicoNombre,
                COALESCE(p.nombre, CONCAT('Planta ', m.plantId)) as plantaNombre
            FROM mantenimientos m 
            LEFT JOIN users u ON m.userId = u.id 
            LEFT JOIN plants p ON m.plantId = p.id 
            ORDER BY m.fechaProgramada DESC 
            LIMIT ${limitNum} OFFSET ${offsetNum}
        `;

        console.log('📝 Ejecutando query directa...');
        const [mantenimientos] = await pool.execute(query);
        console.log('✅ Mantenimientos encontrados:', mantenimientos.length);

        // Obtener el total
        const [totalResult] = await pool.execute(`SELECT COUNT(*) as total FROM mantenimientos`);
        const total = totalResult[0]?.total || 0;

        return {
            rows: mantenimientos.map(mantenimiento => new Mantenimiento(mantenimiento)),
            count: total
        };
    } catch (error) {
        console.error('❌ [MODEL] Error en versión sin parámetros:', error);
        
        // ✅ VERSIÓN MÍNIMA ABSOLUTA
        try {
            console.log('🔄 Intentando consulta mínima...');
            const [mantenimientos] = await pool.execute(
                `SELECT * FROM mantenimientos ORDER BY fechaProgramada DESC LIMIT 10`
            );
            
            console.log('✅ Mantenimientos mínimos:', mantenimientos.length);
            
            const mantenimientosConNombres = mantenimientos.map(m => ({
                ...m,
                tecnicoNombre: `Usuario ${m.userId}`,
                plantaNombre: `Planta ${m.plantId}`
            }));

            return {
                rows: mantenimientosConNombres.map(m => new Mantenimiento(m)),
                count: mantenimientos.length
            };
        } catch (minError) {
            console.error('❌ Error en consulta mínima:', minError);
            
            // ✅ ÚLTIMO RESORTE: Array vacío
            return {
                rows: [],
                count: 0
            };
        }
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
}