import { pool } from "../db/connectDB.js";

export class Reporte {
    constructor(reporte) {
            this.id = reporte.id;
        this.plantId = reporte.plantId;
        this.generadoPor = reporte.generadoPor;
        this.fecha = reporte.fecha;
        this.rutaArchivo = reporte.rutaArchivo;
        this.tipo = reporte.tipo;           // ✅ Asegurar que esté
        this.periodo = reporte.periodo;     // ✅ Asegurar que esté
        this.descripcion = reporte.descripcion;
        this.titulo = reporte.titulo;
        this.usuario = reporte.usuario; 
        this.planta = reporte.planta;
        this.usuarioNombre = reporte.usuarioNombre;  // ✅ Del JOIN
        this.plantaNombre = reporte.plantaNombre;    // ✅ Del JOIN
    }

    // Crear nuevo reporte
static async crear(datosReporte) {
    try {
        console.log('📝 Creando reporte con datos:', {
            tipo: datosReporte.tipo,
            periodo: datosReporte.periodo
        });

        const [resultado] = await pool.execute(
            `INSERT INTO reportes (plantId, generadoPor, fecha, tipo, descripcion, periodo, titulo) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                datosReporte.plantId,
                datosReporte.generadoPor,
                datosReporte.fecha || new Date(),
                datosReporte.tipo || 'general',
                datosReporte.descripcion || '',
                datosReporte.periodo || 'mensual',
                datosReporte.titulo || `Reporte ${datosReporte.tipo || 'general'}`
            ]
        );

        const reporteCreado = await this.buscarPorId(resultado.insertId);
        console.log('✅ Reporte creado en BD:', {
            id: reporteCreado.id,
            tipo: reporteCreado.tipo,
            periodo: reporteCreado.periodo
        });

        return reporteCreado;
    } catch (error) {
        throw new Error(`Error al crear reporte: ${error.message}`);
    }
}


    // Buscar reporte por ID
static async buscarPorId(id) {
    try {
        const [reportes] = await pool.execute(
            `SELECT r.*, 
                    u.nombre as usuarioNombre, 
                    p.nombre as plantaNombre,
                    p.ubicacion as plantaUbicacion
             FROM reportes r 
             LEFT JOIN users u ON r.generadoPor = u.id 
             LEFT JOIN plants p ON r.plantId = p.id 
             WHERE r.id = ?`,
            [id]
        );

        if (reportes.length === 0) {
            return null;
        }

        // ✅ DEBUG: Ver todos los campos que vienen de la BD
        console.log('🔍 Reporte COMPLETO desde BD:', reportes[0]);
        console.log('🔍 Campos específicos:', {
            id: reportes[0].id,
            tipo: reportes[0].tipo,
            periodo: reportes[0].periodo,
            usuarioNombre: reportes[0].usuarioNombre,
            plantaNombre: reportes[0].plantaNombre
        });

        return new Reporte(reportes[0]);
    } catch (error) {
        throw new Error(`Error al buscar reporte por ID: ${error.message}`);
    }
}

  // En reporteModel.js - MÉTODO CORREGIDO
static async obtenerTodos(limite = 10, pagina = 1) {
    try {
        console.log('🔍 [REPORTE MODEL] Parámetros recibidos:', { limite, pagina });
        
        // ✅ CORRECCIÓN: Asegurar que sean números
        const limitNum = Number(limite) || 10;
        const paginaNum = Number(pagina) || 1;
        const offsetNum = (paginaNum - 1) * limitNum;

        console.log('🔢 [REPORTE MODEL] Parámetros procesados:', { limitNum, offsetNum });

        // ✅ CORRECCIÓN: Usar template literal para evitar problemas de parámetros
        const query = `
            SELECT r.*, u.nombre as usuarioNombre, p.nombre as plantaNombre 
            FROM reportes r 
            LEFT JOIN users u ON r.generadoPor = u.id 
            LEFT JOIN plants p ON r.plantId = p.id 
            ORDER BY r.fecha DESC 
            LIMIT ${limitNum} OFFSET ${offsetNum}
        `;

        console.log('📝 [REPORTE MODEL] Query ejecutada:', query);

        const [reportes] = await pool.execute(query);

        console.log('✅ [REPORTE MODEL] Reportes encontrados:', reportes.length);

        return reportes.map(reporte => new Reporte(reporte));
    } catch (error) {
        console.error('❌ [REPORTE MODEL] Error:', error);
        throw new Error(`Error al obtener reportes: ${error.message}`);
    }
}

    // Obtener reportes por planta
    static async obtenerPorPlanta(plantId) {
        try {
            const [reportes] = await pool.execute(
                `SELECT r.*, u.nombre as usuarioNombre, p.nombre as plantaNombre 
                 FROM reportes r 
                 LEFT JOIN users u ON r.generadoPor = u.id 
                 LEFT JOIN plants p ON r.plantId = p.id 
                 WHERE r.plantId = ? 
                 ORDER BY r.fecha DESC`,
                [plantId]
            );

            return reportes.map(reporte => new Reporte(reporte));
        } catch (error) {
            throw new Error(`Error al obtener reportes por planta: ${error.message}`);
        }
    }

    // Obtener reportes por usuario
    static async obtenerPorUsuario(usuarioId) {
        try {
            const [reportes] = await pool.execute(
                `SELECT r.*, u.nombre as usuarioNombre, p.nombre as plantaNombre 
                 FROM reportes r 
                 LEFT JOIN users u ON r.generadoPor = u.id 
                 LEFT JOIN plants p ON r.plantId = p.id 
                 WHERE r.generadoPor = ? 
                 ORDER BY r.fecha DESC`,
                [usuarioId]
            );

            return reportes.map(reporte => new Reporte(reporte));
        } catch (error) {
            throw new Error(`Error al obtener reportes por usuario: ${error.message}`);
        }
    }

    // Eliminar reporte
    static async eliminar(id) {
        try {
            const [resultado] = await pool.execute(
                `DELETE FROM reportes WHERE id = ?`,
                [id]
            );

            return resultado.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al eliminar reporte: ${error.message}`);
        }
    }


static async obtenerDatosCompletosReporte(plantId, periodo = 'mensual') {
    try {
        // Calcular fechas según el período
        const fechaFin = new Date();
        const fechaInicio = new Date();
        
        switch(periodo) {
            case 'diario':
                fechaInicio.setDate(fechaInicio.getDate() - 1);
                break;
            case 'semanal':
                fechaInicio.setDate(fechaInicio.getDate() - 7);
                break;
            case 'mensual':
                fechaInicio.setMonth(fechaInicio.getMonth() - 1);
                break;
            default:
                fechaInicio.setMonth(fechaInicio.getMonth() - 1);
        }

        // Obtener datos de la planta
        const [plantas] = await pool.execute(
            'SELECT * FROM plants WHERE id = ?', 
            [plantId]
        );

        // Obtener datos técnicos del período
        const [datosTecnicos] = await pool.execute(
            `SELECT 
                AVG(nivelLocal) as avgNivelLocal,
                AVG(presion) as avgPresion, 
                AVG(turbidez) as avgTurbidez,
                AVG(cloro) as avgCloro,
                AVG(energia) as avgEnergia,
                MAX(nivelLocal) as maxNivelLocal,
                MIN(nivelLocal) as minNivelLocal
             FROM plant_data 
             WHERE plantId = ? AND timestamp BETWEEN ? AND ?`,
            [plantId, fechaInicio, fechaFin]
        );

        // Obtener incidencias del período
        const [incidencias] = await pool.execute(
            `SELECT * FROM incidencias 
             WHERE plantId = ? AND fechaReporte BETWEEN ? AND ?
             ORDER BY fechaReporte DESC`,
            [plantId, fechaInicio, fechaFin]
        );

        // Obtener mantenimientos del período
        const [mantenimientos] = await pool.execute(
            `SELECT m.*, u.nombre as tecnicoNombre 
             FROM mantenimientos m 
             LEFT JOIN users u ON m.userId = u.id 
             WHERE m.plantId = ? AND m.fechaProgramada BETWEEN ? AND ?
             ORDER BY m.fechaProgramada DESC`,
            [plantId, fechaInicio, fechaFin]
        );

        return {
            planta: plantas[0],
            metricas: datosTecnicos[0],
            incidencias,
            mantenimientos,
            periodo: {
                inicio: fechaInicio,
                fin: fechaFin,
                tipo: periodo
            }
        };
    } catch (error) {
        throw new Error(`Error al obtener datos del reporte: ${error.message}`);
    }
}

}