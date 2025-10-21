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
            
            if (filtros.tecnicoId) {
                whereClause += ` AND p.tecnicoId = ${filtros.tecnicoId}`;
            }
            
            if (filtros.clienteId) {
                whereClause += ` AND p.clienteId = ${filtros.clienteId}`;
            }
            
            console.log('🔍 [PLANTA MODEL] Query con filtros:', { whereClause });
            
            const query = `
                SELECT p.*, 
                       u.nombre as clienteNombre,
                       ut.nombre as tecnicoNombre
                FROM plants p 
                LEFT JOIN users u ON p.clienteId = u.id 
                LEFT JOIN users ut ON p.tecnicoId = ut.id
                ${whereClause}
                ORDER BY p.nombre 
                LIMIT ${limiteNum} OFFSET ${offset}
            `;
            
            console.log('🔍 [PLANTA MODEL] Query final:', query);
            
            const [plantas] = await pool.execute(query);
            
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
                 LEFT JOIN users u ON p.clienteId = u.id 
                 WHERE p.tecnicoId = ? 
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


}