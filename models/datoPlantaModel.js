import { pool } from "../db/connectDB.js";

export class DatoPlanta {
    constructor(dato) {
        this.id = dato.id;
        this.plantId = dato.plantId;
        this.nivelLocal = dato.nivelLocal;
        this.presion = dato.presion;
        this.turbidez = dato.turbidez;
        this.cloro = dato.cloro;
        this.energia = dato.energia;
        this.timestamp = dato.timestamp;
        this.createdAt = dato.createdAt;
        this.updatedAt = dato.updatedAt;
        this.planta = dato.planta; // Para joins
    }

    // Crear nuevo dato
    static async crear(datosDato) {
        try {
            const [resultado] = await pool.execute(
                `INSERT INTO plant_data (plantId, nivelLocal, presion, turbidez, cloro, energia, timestamp) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    datosDato.plantId,
                    datosDato.nivelLocal,
                    datosDato.presion,
                    datosDato.turbidez,
                    datosDato.cloro,
                    datosDato.energia,
                    datosDato.timestamp || new Date()
                ]
            );

            return await this.buscarPorId(resultado.insertId);
        } catch (error) {
            throw new Error(`Error al crear dato de planta: ${error.message}`);
        }
    }

    // Buscar dato por ID
    static async buscarPorId(id) {
        try {
            const [datos] = await pool.execute(
                `SELECT pd.*, p.nombre as plantaNombre 
                 FROM plant_data pd 
                 LEFT JOIN plants p ON pd.plantId = p.id 
                 WHERE pd.id = ?`,
                [id]
            );

            if (datos.length === 0) {
                return null;
            }

            return new DatoPlanta(datos[0]);
        } catch (error) {
            throw new Error(`Error al buscar dato por ID: ${error.message}`);
        }
    }

    // Obtener datos por planta
static async obtenerPorPlanta(plantId, limite = 100, pagina = 1) {
    try {
        // Asegurar que todos sean números
        const plantIdNum = Number(plantId);
        const limiteNum = Number(limite);
        const paginaNum = Number(pagina);
        
        // Validar que sean números válidos
        if (isNaN(plantIdNum) || isNaN(limiteNum) || isNaN(paginaNum)) {
            throw new Error('Parámetros inválidos: deben ser números');
        }
        
        const offset = (paginaNum - 1) * limiteNum;
        
        console.log('🔍 Parámetros finales para MySQL:', { 
            plantIdNum, 
            limiteNum, 
            offset 
        });
        
        // ✅ SOLUCIÓN: Usar template literals con números validados
        const query = `
            SELECT pd.*, p.nombre as plantaNombre 
            FROM plant_data pd 
            LEFT JOIN plants p ON pd.plantId = p.id 
            WHERE pd.plantId = ? 
            ORDER BY pd.timestamp DESC 
            LIMIT ${limiteNum} OFFSET ${offset}
        `;
        
        console.log('🔍 Query completa:', query);
        
        // ✅ SOLUCIÓN: Solo pasar plantId como parámetro
        const [datos] = await pool.execute(query, [plantIdNum]);
        
        console.log('✅ Datos encontrados:', datos.length);

        return datos.map(dato => new DatoPlanta(dato));
    } catch (error) {
        console.error('❌ Error en obtenerPorPlanta:', error);
        throw new Error(`Error al obtener datos de planta: ${error.message}`);
    }
}

    // Obtener datos por rango de fechas
    static async obtenerPorRangoFechas(plantId, fechaInicio, fechaFin) {
        try {
            const [datos] = await pool.execute(
                `SELECT pd.*, p.nombre as plantaNombre 
                 FROM plant_data pd 
                 LEFT JOIN plants p ON pd.plantId = p.id 
                 WHERE pd.plantId = ? AND pd.timestamp BETWEEN ? AND ? 
                 ORDER BY pd.timestamp ASC`,
                [plantId, fechaInicio, fechaFin]
            );

            return datos.map(dato => new DatoPlanta(dato));
        } catch (error) {
            throw new Error(`Error al obtener datos por rango de fechas: ${error.message}`);
        }
    }

    // Obtener último dato de cada planta
    static async obtenerUltimosDatos() {
        try {
            const [datos] = await pool.execute(`
                SELECT pd1.*, p.nombre as plantaNombre 
                FROM plant_data pd1 
                LEFT JOIN plants p ON pd1.plantId = p.id 
                WHERE pd1.timestamp = (
                    SELECT MAX(pd2.timestamp) 
                    FROM plant_data pd2 
                    WHERE pd2.plantId = pd1.plantId
                )
                ORDER BY p.nombre
            `);

            return datos.map(dato => new DatoPlanta(dato));
        } catch (error) {
            throw new Error(`Error al obtener últimos datos: ${error.message}`);
        }
    }

    // Eliminar dato
    static async eliminar(id) {
        try {
            const [resultado] = await pool.execute(
                `DELETE FROM plant_data WHERE id = ?`,
                [id]
            );

            return resultado.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al eliminar dato: ${error.message}`);
        }
    }
}