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
// Obtener todas las plantas - CORREGIDO
static async obtenerTodas(limite = 10, pagina = 1) {
    try {
        // Convertir explícitamente a números y validar
        const limiteNum = Number(limite);
        const paginaNum = Number(pagina);
        
        if (isNaN(limiteNum) || isNaN(paginaNum) || limiteNum < 1 || paginaNum < 1) {
            throw new Error('Parámetros de paginación inválidos');
        }
        
        const offset = (paginaNum - 1) * limiteNum;
        
        console.log('📊 Ejecutando query con LIMIT:', limiteNum, 'OFFSET:', offset);
        
        // ✅ SOLUCIÓN: Usar template literals pero con números validados
        const query = `
            SELECT p.*, u.nombre as clienteNombre 
            FROM plants p 
            LEFT JOIN users u ON p.clienteId = u.id 
            ORDER BY p.nombre 
            LIMIT ${limiteNum} OFFSET ${offset}
        `;
        
        console.log('🔍 Query completa:', query);
        
        // ✅ SOLUCIÓN: Ejecutar sin parámetros (ya están en el query)
        const [plantas] = await pool.execute(query);
        
        console.log('✅ Plantas encontradas en BD:', plantas.length);
        console.log('📝 IDs encontrados:', plantas.map(p => p.id));
        
        return plantas.map(planta => new Planta(planta));
        
    } catch (error) {
        console.error('❌ Error en obtenerTodas:', error);
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