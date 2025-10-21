import { Reporte } from "../models/reporteModel.js";
import {Planta} from "../models/plantaModel.js";
import { DatoPlanta } from "./../models/datoPlantaModel.js";
import { Incidencia } from "../models/incidenciaModel.js"; 
import { Mantenimiento } from "../models/mantenimientoModel.js";
import { Usuario } from "../models/usuarioModel.js"; 

import PDFDocument from 'pdfkit'; 

export const crearReporte = async (req, res) => {
    try {
        const { plantId, tipo, descripcion, periodo, titulo } = req.body;
        const generadoPor = req.usuarioId;

        // ✅ DEBUG: Ver qué llega del frontend
        console.log('📥 Datos recibidos en backend:', {
            plantId, 
            tipo,           // ← ¿Qué valor tiene?
            periodo,        // ← ¿Qué valor tiene?
            descripcion,
            titulo,
            generadoPor
        });

        if (!plantId) {
            return res.status(400).json({
                success: false,
                message: "plantId es requerido"
            });
        }

        // ✅ CREAR reporte
        const nuevoReporte = await Reporte.crear({
            plantId,
            generadoPor,
            tipo,           // ← Se está enviando
            descripcion,
            periodo,        // ← Se está enviando
            titulo,
            fecha: new Date()
        });

        console.log('✅ Reporte creado:', {
            id: nuevoReporte.id,
            tipo: nuevoReporte.tipo,
            periodo: nuevoReporte.periodo
        });

        res.status(201).json({
            success: true,
            message: "Reporte generado correctamente",
            reporte: nuevoReporte
        });
    } catch (error) {
        console.log("Error al crear reporte:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerReporte = async (req, res) => {
    try {
        const { id } = req.params;
        const reporte = await Reporte.buscarPorId(id);

        if (!reporte) {
            return res.status(404).json({
                success: false,
                message: "Reporte no encontrado"
            });
        }

        res.status(200).json({
            success: true,
            reporte
        });
    } catch (error) {
        console.log("Error al obtener reporte:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerReportes = async (req, res) => {
    try {
        const { limite = 10, pagina = 1 } = req.query;
        
        console.log('🔍 [REPORTE CONTROLLER] Parámetros query:', { 
            limite, 
            pagina,
            tipoLimite: typeof limite,
            tipoPagina: typeof pagina
        });

        // Convertir a números
        const limitNum = parseInt(limite) || 10;
        const paginaNum = parseInt(pagina) || 1;

        console.log('🔢 [REPORTE CONTROLLER] Parámetros numéricos:', { limitNum, paginaNum });

        const reportes = await Reporte.obtenerTodos(limitNum, paginaNum);

        res.status(200).json({
            success: true,
            reportes,
            paginacion: {
                limite: limitNum,
                pagina: paginaNum
            }
        });
    } catch (error) {
        console.log("Error al obtener reportes:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerReportesPlanta = async (req, res) => {
    try {
        const { plantId } = req.params;
        const reportes = await Reporte.obtenerPorPlanta(plantId);

        res.status(200).json({
            success: true,
            reportes
        });
    } catch (error) {
        console.log("Error al obtener reportes de planta:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerReportesUsuario = async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const reportes = await Reporte.obtenerPorUsuario(usuarioId);

        res.status(200).json({
            success: true,
            reportes
        });
    } catch (error) {
        console.log("Error al obtener reportes del usuario:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const eliminarReporte = async (req, res) => {
    try {
        const { id } = req.params;
        const eliminado = await Reporte.eliminar(id);

        if (!eliminado) {
            return res.status(404).json({
                success: false,
                message: "Reporte no encontrado"
            });
        }

        res.status(200).json({
            success: true,
            message: "Reporte eliminado correctamente"
        });
    } catch (error) {
        console.log("Error al eliminar reporte:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const descargarReporte = async (req, res) => {
    try {
        const { id } = req.params;
        
        const reporte = await Reporte.buscarPorId(id);
        
        if (!reporte) {
            return res.status(404).json({
                success: false,
                message: "Reporte no encontrado"
            });
        }

        // ✅ Obtener datos adicionales
        const planta = await Planta.buscarPorId(reporte.plantId);
        
        // ✅ OBTENER USUARIO
        let usuarioNombre = reporte.usuarioNombre;
        if (!usuarioNombre && reporte.generadoPor) {
            try {
                const usuario = await Usuario.buscarPorId(reporte.generadoPor);
                usuarioNombre = usuario?.nombre || `Usuario ${reporte.generadoPor}`;
            } catch (error) {
                usuarioNombre = `Usuario ${reporte.generadoPor}`;
            }
        }

        // ✅ CALCULAR FECHAS SEGÚN PERÍODO
const fechaFin = new Date(reporte.fecha);
const fechaInicio = new Date(fechaFin);

// ⚠️ PROBLEMA: fechaFin termina a las 00:00 del día del reporte
// SOLUCIÓN: fechaFin debe terminar al FINAL del día del reporte
fechaFin.setHours(23, 59, 59, 999); // ← FIN del día

switch(reporte.periodo) {
    case 'diario':
        fechaInicio.setDate(fechaInicio.getDate() - 1);
        fechaInicio.setHours(0, 0, 0, 0); // ← INICIO del día anterior
        break;
    case 'semanal':
        fechaInicio.setDate(fechaInicio.getDate() - 7);
        fechaInicio.setHours(0, 0, 0, 0);
        break;
    case 'mensual':
        fechaInicio.setMonth(fechaInicio.getMonth() - 1);
        fechaInicio.setHours(0, 0, 0, 0);
        break;
    case 'trimestral':
        fechaInicio.setMonth(fechaInicio.getMonth() - 3);
        fechaInicio.setHours(0, 0, 0, 0);
        break;
    case 'anual':
        fechaInicio.setFullYear(fechaInicio.getFullYear() - 1);
        fechaInicio.setHours(0, 0, 0, 0);
        break;
    default:
        fechaInicio.setMonth(fechaInicio.getMonth() - 1);
        fechaInicio.setHours(0, 0, 0, 0);
}


        // ✅ OBTENER DATOS FILTRADOS - VERSIÓN CORREGIDA
        console.log('🔍 BUSCANDO DATOS PARA REPORTE:', {
            plantId: reporte.plantId,
            tipo: reporte.tipo,
            periodo: reporte.periodo,
            fechaInicio: fechaInicio.toISOString(),
            fechaFin: fechaFin.toISOString()
        });

        const datosFiltrados = {
            incidencias: [],
            mantenimientos: [],
            metricas: null
        };

     try {
    // ✅ OBTENER INCIDENCIAS USANDO EL NUEVO MÉTODO
    datosFiltrados.incidencias = await Incidencia.obtenerPorPlantaYRangoFechas(
        reporte.plantId, 
        fechaInicio, 
        fechaFin
    );
    
    // ✅ OBTENER MANTENIMIENTOS USANDO EL NUEVO MÉTODO
    datosFiltrados.mantenimientos = await Mantenimiento.obtenerPorPlantaYRangoFechas(
        reporte.plantId, 
        fechaInicio, 
        fechaFin
    );

    // ✅ OBTENER MÉTRICAS TÉCNICAS
    if (reporte.tipo === 'rendimiento' || reporte.tipo === 'calidad' || reporte.tipo === 'general') {
        datosFiltrados.metricas = await obtenerMetricasTecnicas(reporte.plantId, fechaInicio, fechaFin);
    }

    console.log('📊 DATOS OBTENIDOS PARA PDF:', {
        totalIncidencias: datosFiltrados.incidencias.length,
        totalMantenimientos: datosFiltrados.mantenimientos.length,
        tieneMetricas: !!datosFiltrados.metricas,
        // Mostrar algunas incidencias para debug
        incidenciasSample: datosFiltrados.incidencias.slice(0, 3).map(i => ({
            id: i.id,
            titulo: i.titulo,
            fechaReporte: i.fechaReporte,
            estado: i.estado
        })),
        // Mostrar algunos mantenimientos para debug
        mantenimientosSample: datosFiltrados.mantenimientos.slice(0, 3).map(m => ({
            id: m.id,
            tipo: m.tipo,
            fechaProgramada: m.fechaProgramada,
            estado: m.estado
        }))
    });

} catch (error) {
    console.error('❌ Error al obtener datos filtrados:', error);
}

        // Configurar respuesta PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 
            `attachment; filename="reporte_${planta?.nombre || 'planta'}_${reporte.fecha}.pdf"`);

        const doc = new PDFDocument();
        doc.pipe(res);

        // ===== CABECERA =====
        doc.fontSize(20)
           .text('REPORTE DE PLANTA DE TRATAMIENTO', { align: 'center' })
           .moveDown(1);

        doc.fontSize(12)
           .text(`Planta: ${planta?.nombre || 'N/A'}`)
           .text(`Ubicación: ${planta?.ubicacion || 'N/A'}`)
           .text(`Período: ${reporte.periodo || 'N/A'} (${fechaInicio.toLocaleDateString('es-ES')} - ${fechaFin.toLocaleDateString('es-ES')})`)
           .text(`Generado por: ${usuarioNombre || 'N/A'}`)
           .text(`Tipo: ${reporte.tipo || 'N/A'}`)
           .text(`Fecha del reporte: ${new Date(reporte.fecha).toLocaleDateString('es-ES')}`)
           .moveDown(2);

        // ===== CONTENIDO DINÁMICO SEGÚN TIPO =====
        await generarContenidoPDF(doc, reporte.tipo, datosFiltrados);

        // Pie de página
        doc.fontSize(8)
           .text(`Generado el: ${new Date().toLocaleDateString('es-ES')} - Sistema de Gestión de Plantas`, 
                 { align: 'center' });

        // Finalizar
        doc.end();

    } catch (error) {
        console.log("Error al generar PDF:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ FUNCIÓN PARA OBTENER MÉTRICAS TÉCNICAS
async function obtenerMetricasTecnicas(plantId, fechaInicio, fechaFin) {
    try {
        const datosTecnicos = await DatoPlanta.obtenerPorRangoFechas(plantId, fechaInicio, fechaFin);
        
        if (!datosTecnicos || datosTecnicos.length === 0) {
            return null;
        }

        // Calcular promedios
        const sumas = datosTecnicos.reduce((acc, dato) => ({
            nivelLocal: acc.nivelLocal + (dato.nivelLocal || 0),
            presion: acc.presion + (dato.presion || 0),
            turbidez: acc.turbidez + (dato.turbidez || 0),
            cloro: acc.cloro + (dato.cloro || 0),
            energia: acc.energia + (dato.energia || 0)
        }), { nivelLocal: 0, presion: 0, turbidez: 0, cloro: 0, energia: 0 });

        const count = datosTecnicos.length;

        return {
            avgNivelLocal: sumas.nivelLocal / count,
            avgPresion: sumas.presion / count,
            avgTurbidez: sumas.turbidez / count,
            avgCloro: sumas.cloro / count,
            avgEnergia: sumas.energia / count,
            totalRegistros: count
        };
    } catch (error) {
        console.error('Error al obtener métricas técnicas:', error);
        return null;
    }
}

// ✅ FUNCIÓN PARA GENERAR CONTENIDO DINÁMICO DEL PDF
async function generarContenidoPDF(doc, tipo, datos) {
    let currentY = doc.y;

    switch(tipo) {
        case 'incidencias':
            generarSeccionIncidencias(doc, datos.incidencias);
            break;
        
        case 'mantenimiento':
            generarSeccionMantenimientos(doc, datos.mantenimientos);
            break;
        
        case 'rendimiento':
            generarSeccionRendimiento(doc, datos.metricas);
            break;
        
        case 'calidad':
            generarSeccionCalidad(doc, datos.metricas);
            break;
        
        case 'general':
        default:
            generarSeccionIncidencias(doc, datos.incidencias);
            if (datos.mantenimientos.length > 0) {
                doc.addPage();
                generarSeccionMantenimientos(doc, datos.mantenimientos);
            }
            if (datos.metricas) {
                doc.addPage();
                generarSeccionMetricas(doc, datos.metricas);
            }
            break;
    }
}

// ✅ FUNCIONES ESPECÍFICAS PARA CADA SECCIÓN
function generarSeccionIncidencias(doc, incidencias) {
    doc.fontSize(16)
       .text('INCIDENCIAS REPORTADAS:')
       .moveDown(0.5);

    if (incidencias.length > 0) {
        incidencias.forEach((incidencia, index) => {
            if (doc.y > 700) {
                doc.addPage();
                doc.fontSize(16).text('INCIDENCIAS REPORTADAS (continuación):').moveDown(0.5);
            }
            
            doc.fontSize(10)
               .text(`${index + 1}. ${incidencia.titulo}`)
               .text(`   Estado: ${incidencia.estado}`)
               .text(`   Fecha: ${new Date(incidencia.fechaReporte).toLocaleDateString('es-ES')}`)
               .text(`   Descripción: ${incidencia.descripcion || 'Sin descripción'}`)
               .moveDown(0.5);
        });
    } else {
        doc.fontSize(10)
           .text('No hay incidencias reportadas en este período.')
           .moveDown(0.5);
    }
}

function generarSeccionMantenimientos(doc, mantenimientos) {
    doc.fontSize(16)
       .text('MANTENIMIENTOS PROGRAMADOS:')
       .moveDown(0.5);

    if (mantenimientos.length > 0) {
        mantenimientos.forEach((mant, index) => {
            if (doc.y > 700) {
                doc.addPage();
                doc.fontSize(16).text('MANTENIMIENTOS PROGRAMADOS (continuación):').moveDown(0.5);
            }
            
            doc.fontSize(10)
               .text(`${index + 1}. ${mant.tipo.toUpperCase()} - ${mant.descripcion}`)
               .text(`   Estado: ${mant.estado}`)
               .text(`   Fecha programada: ${new Date(mant.fechaProgramada).toLocaleDateString('es-ES')}`)
               .text(`   Técnico: ${mant.tecnicoNombre || 'No asignado'}`)
               .moveDown(0.5);
        });
    } else {
        doc.fontSize(10)
           .text('No hay mantenimientos programados en este período.')
           .moveDown(0.5);
    }
}

function generarSeccionRendimiento(doc, metricas) {
    doc.fontSize(16)
       .text('MÉTRICAS DE RENDIMIENTO:')
       .moveDown(0.5);

    if (metricas) {
        doc.fontSize(10)
           .text(`Consumo Energético Promedio: ${metricas.avgEnergia?.toFixed(2) || 'N/A'} kWh`)
           .text(`Nivel Local Promedio: ${metricas.avgNivelLocal?.toFixed(2) || 'N/A'} %`)
           .text(`Presión Promedio: ${metricas.avgPresion?.toFixed(2) || 'N/A'} PSI`)
           .text(`Total de registros analizados: ${metricas.totalRegistros || 0}`)
           .moveDown(0.5);
    } else {
        doc.fontSize(10)
           .text('No hay datos de rendimiento disponibles para este período.')
           .moveDown(0.5);
    }
}

function generarSeccionCalidad(doc, metricas) {
    doc.fontSize(16)
       .text('MÉTRICAS DE CALIDAD DEL AGUA:')
       .moveDown(0.5);

    if (metricas) {
        doc.fontSize(10)
           .text(`Turbidez Promedio: ${metricas.avgTurbidez?.toFixed(2) || 'N/A'} NTU`)
           .text(`Nivel de Cloro Promedio: ${metricas.avgCloro?.toFixed(2) || 'N/A'} ppm`)
           .text(`Nivel Local Promedio: ${metricas.avgNivelLocal?.toFixed(2) || 'N/A'} %`)
           .text(`Total de registros analizados: ${metricas.totalRegistros || 0}`)
           .moveDown(0.5);
    } else {
        doc.fontSize(10)
           .text('No hay datos de calidad disponibles para este período.')
           .moveDown(0.5);
    }
}

function generarSeccionMetricas(doc, metricas) {
    doc.fontSize(16)
       .text('MÉTRICAS TÉCNICAS COMPLETAS:')
       .moveDown(0.5);

    if (metricas) {
        doc.fontSize(10)
           .text(`Nivel Local: ${metricas.avgNivelLocal?.toFixed(2) || 'N/A'} %`)
           .text(`Presión: ${metricas.avgPresion?.toFixed(2) || 'N/A'} PSI`)
           .text(`Turbidez: ${metricas.avgTurbidez?.toFixed(2) || 'N/A'} NTU`)
           .text(`Cloro: ${metricas.avgCloro?.toFixed(2) || 'N/A'} ppm`)
           .text(`Energía: ${metricas.avgEnergia?.toFixed(2) || 'N/A'} kWh`)
           .text(`Registros analizados: ${metricas.totalRegistros || 0}`)
           .moveDown(0.5);
    } else {
        doc.fontSize(10)
           .text('No hay métricas técnicas disponibles para este período.')
           .moveDown(0.5);
    }
}