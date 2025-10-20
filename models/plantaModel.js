import { pool } from "../db/connectDB.js";
export class Planta {
    constructor(planta) {
        this.id = planta.id;
        this.nombre = planta.nombre;
        this.ubicacion = planta.ubicacion;
        this.clienteId = planta.clienteId;
        this.cliente = planta.cliente; // Para joins
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
                `SELECT p.*, u.nombre as clienteNombre, u.email as clienteEmail 
                 FROM plants p 
                 LEFT JOIN users u ON p.clienteId = u.id 
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


// Obtener todas las plantas - CORREGIDO
static async obtenerTodas(limite = 10, pagina = 1, filtros = {}) {
    try {
        const limiteNum = Number(limite);
        const paginaNum = Number(pagina);
        
        if (isNaN(limiteNum) || isNaN(paginaNum) || limiteNum < 1 || paginaNum < 1) {
            throw new Error('Parámetros de paginación inválidos');
        }
        
        const offset = (paginaNum - 1) * limiteNum;
        
        // Construir WHERE clause dinámicamente basado en filtros
        let whereClause = 'WHERE 1=1';
        const valores = [];
        
        if (filtros.tecnicoId) {
            whereClause += ' AND p.tecnicoId = ?';
            valores.push(filtros.tecnicoId);
        }
        
        if (filtros.clienteId) {
            whereClause += ' AND p.clienteId = ?';
            valores.push(filtros.clienteId);
        }
        
        console.log('🔍 [PLANTA MODEL] Query con filtros:', { whereClause, valores });
        
        // ✅ CORRECCIÓN: Usar parámetros preparados para TODOS los valores
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
        
        // ✅ AGREGAR límite y offset a los valores del array
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

    // Obtener plantas por cliente
    static async obtenerPorCliente(clienteId) {
        try {
            const [plantas] = await pool.execute(
                `SELECT * FROM plants WHERE clienteId = ? ORDER BY nombre`,
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
            const camposPermitidos = ['nombre', 'ubicacion', 'clienteId'];
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
        // ✅ CON DELETE CASCADE, SOLO NECESITAS ESTO
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
}