import { Mantenimiento } from "../models/mantenimientoModel.js";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ✅ Configuración para subida de archivos (igual que incidencias)
const UPLOADS_DIR = path.join(__dirname, '../../uploads/mantenimientos');
const REPORTS_DIR = path.join(__dirname, '../../uploads/reports');

// Asegurar que los directorios existen
[UPLOADS_DIR, REPORTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

export const crearMantenimiento = async (req, res) => {
    try {
        const { plantId, tipo, descripcion, fechaProgramada, estado, checklistItems } = req.body;
        const userId = req.usuarioId;

        console.log('📥 Datos recibidos para crear mantenimiento:', {
            plantId, tipo, descripcion, fechaProgramada, estado, userId, checklistItems
        });

        // ✅ VALIDACIONES MEJORADAS BASADAS EN TU ESQUEMA
        if (!plantId || isNaN(plantId)) {
            return res.status(400).json({
                success: false,
                message: "ID de planta válido es requerido"
            });
        }

        if (!descripcion || descripcion.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "La descripción del mantenimiento es requerida"
            });
        }

        if (descripcion.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: "La descripción debe tener al menos 10 caracteres"
            });
        }

        if (!fechaProgramada) {
            return res.status(400).json({
                success: false,
                message: "La fecha programada es requerida"
            });
        }

        // Validar formato de fecha (YYYY-MM-DD)
        const fechaProgramadaObj = new Date(fechaProgramada);
        if (isNaN(fechaProgramadaObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Formato de fecha inválido. Use YYYY-MM-DD"
            });
        }

        // Validar que la fecha no sea en el pasado (solo fecha, sin hora)
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        fechaProgramadaObj.setHours(0, 0, 0, 0);
        
        if (fechaProgramadaObj < hoy) {
            return res.status(400).json({
                success: false,
                message: "La fecha programada no puede ser en el pasado"
            });
        }

        // Validar tipo de mantenimiento (según tu ENUM)
        if (tipo && !['preventivo', 'correctivo'].includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: "Tipo de mantenimiento debe ser 'preventivo' o 'correctivo'"
            });
        }

        // Validar estado (según tu ENUM)
        if (estado && !['pendiente', 'en_progreso', 'completado'].includes(estado)) {
            return res.status(400).json({
                success: false,
                message: "Estado debe ser 'pendiente', 'en_progreso' o 'completado'"
            });
        }

        // Validar checklistItems si se proporciona
        if (checklistItems && !Array.isArray(checklistItems)) {
            return res.status(400).json({
                success: false,
                message: "checklistItems debe ser un array"
            });
        }

        console.log('✅ Validaciones pasadas - Creando mantenimiento...');

        // ✅ CREAR MANTENIMIENTO CON VALORES POR DEFECTO DEL ESQUEMA
        const datosMantenimiento = {
            plantId: parseInt(plantId),
            userId: parseInt(userId),
            tipo: tipo || 'preventivo', // Valor por defecto según tu schema
            descripcion: descripcion.trim(),
            fechaProgramada: fechaProgramada, // Ya validado como Date
            estado: estado || 'pendiente' // Valor por defecto según tu schema
        };

        console.log('🔧 Datos para crear mantenimiento:', datosMantenimiento);

        const nuevoMantenimiento = await Mantenimiento.crear(datosMantenimiento);

        // ✅ AGREGAR ITEMS DEL CHECKLIST SI SE PROPORCIONAN
        let itemsChecklistAgregados = 0;
        if (checklistItems && checklistItems.length > 0) {
            console.log(`📋 Agregando ${checklistItems.length} items al checklist...`);
            
            for (const item of checklistItems) {
                if (item && item.trim() && item.trim().length > 0) {
                    await Mantenimiento.agregarItemChecklist(nuevoMantenimiento.id, item.trim());
                    itemsChecklistAgregados++;
                }
            }
            
            console.log(`✅ ${itemsChecklistAgregados} items agregados al checklist`);
            
            // Recargar el mantenimiento con el checklist actualizado
            const mantenimientoActualizado = await Mantenimiento.buscarPorId(nuevoMantenimiento.id);
            nuevoMantenimiento.checklist = mantenimientoActualizado.checklist;
        }

        console.log('✅ Mantenimiento creado exitosamente:', {
            id: nuevoMantenimiento.id,
            plantId: nuevoMantenimiento.plantId,
            tipo: nuevoMantenimiento.tipo,
            estado: nuevoMantenimiento.estado,
            itemsChecklist: itemsChecklistAgregados
        });

        // ✅ CONSTRUIR MENSAJE SEGÚN LO CREADO
        let mensaje = "Mantenimiento programado correctamente";
        if (itemsChecklistAgregados > 0) {
            mensaje += ` con ${itemsChecklistAgregados} items en el checklist`;
        }

        res.status(201).json({
            success: true,
            message: mensaje,
            mantenimiento: nuevoMantenimiento,
            detalles: {
                checklistCreado: itemsChecklistAgregados > 0,
                totalItemsChecklist: itemsChecklistAgregados,
                proximosPasos: [
                    "Usa el endpoint de iniciar mantenimiento cuando comiences el trabajo",
                    "Puedes agregar fotos 'antes' al iniciar el mantenimiento", 
                    "Registra materiales utilizados durante la ejecución",
                    "Completa el checklist marcando items como realizados"
                ]
            }
        });

    } catch (error) {
        console.log("❌ Error al crear mantenimiento:", error);
        
        // ✅ MANEJAR ERRORES ESPECÍFICOS DE BASE DE DATOS
        if (error.message.includes('foreign key constraint')) {
            if (error.message.includes('plantId')) {
                return res.status(400).json({
                    success: false,
                    message: "Error: La planta especificada no existe"
                });
            }
            if (error.message.includes('userId')) {
                return res.status(400).json({
                    success: false,
                    message: "Error: El usuario técnico especificado no existe"
                });
            }
        }

        if (error.message.includes('Data too long')) {
            return res.status(400).json({
                success: false,
                message: "Error: La descripción es demasiado larga"
            });
        }

        // ✅ ERROR GENÉRICO
        res.status(500).json({
            success: false,
            message: `Error al crear mantenimiento: ${error.message}`
        });
    }
};

export const obtenerMantenimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const mantenimiento = await Mantenimiento.buscarPorId(id);

        if (!mantenimiento) {
            return res.status(404).json({
                success: false,
                message: "Mantenimiento no encontrado"
            });
        }

        res.status(200).json({
            success: true,
            mantenimiento
        });
    } catch (error) {
        console.log("Error al obtener mantenimiento:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerMantenimientosPlanta = async (req, res) => {
    try {
        const { plantId } = req.params;
        const mantenimientos = await Mantenimiento.obtenerPorPlanta(plantId);

        res.status(200).json({
            success: true,
            mantenimientos
        });
    } catch (error) {
        console.log("Error al obtener mantenimientos de planta:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerMantenimientosTecnico = async (req, res) => {
    try {
        const { userId } = req.params;
        const mantenimientos = await Mantenimiento.obtenerPorTecnico(userId);

        res.status(200).json({
            success: true,
            mantenimientos
        });
    } catch (error) {
        console.log("Error al obtener mantenimientos del técnico:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const actualizarMantenimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const datosActualizados = req.body;

        const mantenimientoActualizado = await Mantenimiento.actualizar(id, datosActualizados);

        res.status(200).json({
            success: true,
            message: "Mantenimiento actualizado correctamente",
            mantenimiento: mantenimientoActualizado
        });
    } catch (error) {
        console.log("Error al actualizar mantenimiento:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const cambiarEstadoMantenimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                success: false,
                message: "Estado es requerido"
            });
        }

        const mantenimientoActualizado = await Mantenimiento.cambiarEstado(id, estado);

        res.status(200).json({
            success: true,
            message: `Mantenimiento marcado como ${estado}`,
            mantenimiento: mantenimientoActualizado
        });
    } catch (error) {
        console.log("Error al cambiar estado de mantenimiento:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const agregarItemChecklist = async (req, res) => {
    try {
        const { id } = req.params;
        const { item } = req.body;

        if (!item) {
            return res.status(400).json({
                success: false,
                message: "El item es requerido"
            });
        }

        const itemId = await Mantenimiento.agregarItemChecklist(id, item);

        res.status(201).json({
            success: true,
            message: "Item agregado al checklist",
            itemId
        });
    } catch (error) {
        console.log("Error al agregar item al checklist:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const actualizarItemChecklist = async (req, res) => {
    try {
        const { itemId } = req.params;
        const datosActualizados = req.body;

        await Mantenimiento.actualizarItemChecklist(itemId, datosActualizados);

        res.status(200).json({
            success: true,
            message: "Item actualizado correctamente"
        });
    } catch (error) {
        console.log("Error al actualizar item del checklist:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const eliminarMantenimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const eliminado = await Mantenimiento.eliminar(id);

        if (!eliminado) {
            return res.status(404).json({
                success: false,
                message: "Mantenimiento no encontrado"
            });
        }

        res.status(200).json({
            success: true,
            message: "Mantenimiento eliminado correctamente"
        });
    } catch (error) {
        console.log("Error al eliminar mantenimiento:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerMantenimientos = async (req, res) => {
    try {
        const { limite = 50, pagina = 1, estado, tipo, plantaId } = req.query;
        const { filtrosMantenimiento = {} } = req; // Del middleware
        
        const offset = (pagina - 1) * limite;
        
        // ✅ COMBINAR FILTROS: query params + middleware
        const filtrosCombinados = {
            ...filtrosMantenimiento,
            ...(estado && { estado }),
            ...(tipo && { tipo }),
            ...(plantaId && { plantaIds: [plantaId] })
        };

        const resultado = await Mantenimiento.obtenerTodos({
            limite: parseInt(limite),
            offset: parseInt(offset),
            filtros: filtrosCombinados
        });

        res.status(200).json({
            success: true,
            mantenimientos: resultado.rows,
            total: resultado.count,
            pagina: parseInt(pagina),
            totalPaginas: Math.ceil(resultado.count / limite),
            filtrosAplicados: filtrosCombinados // Para debug
        });
    } catch (error) {
        console.log("Error al obtener mantenimientos:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// Agregar método optimizado para dashboard
export const obtenerMantenimientosResumen = async (req, res) => {
  try {
    const { filtrosMantenimiento = {} } = req; // ✅ Agregar esto
    const resumen = await Mantenimiento.obtenerResumenDashboard(filtrosMantenimiento);
    res.json({ success: true, ...resumen });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// === MÉTODOS PARA FOTOS Y PDF (Mismo patrón que incidencias) ===

// ✅ Subir fotos a mantenimiento
export const subirFotos = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo } = req.body;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No se han subido archivos"
            });
        }

        console.log('📸 Subiendo fotos para mantenimiento:', {
            id, tipo, archivosCount: req.files.length
        });

        const fotosSubidas = [];
        
        for (const file of req.files) {
            const imageBuffer = fs.readFileSync(file.path);
            
            const fotoData = {
                tipo,
                ruta_archivo: `/uploads/mantenimientos/${file.originalname}`,
                descripcion: file.originalname,
                datos_imagen: imageBuffer
            };
            
            console.log('📸 Insertando foto:', {
                tieneBuffer: !!fotoData.datos_imagen,
                bufferSize: fotoData.datos_imagen?.length,
                tipo: fotoData.tipo
            });

            const fotoGuardada = await Mantenimiento.subirFotos(id, [fotoData]);
            fotosSubidas.push(fotoGuardada[0]);
            
            // Limpiar archivo temporal
            fs.unlinkSync(file.path);
        }

        res.status(200).json({
            success: true,
            message: `${req.files.length} fotos subidas correctamente`,
            fotos: fotosSubidas
        });

    } catch (error) {
        console.log("Error al subir fotos:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ Agregar materiales a mantenimiento
export const agregarMateriales = async (req, res) => {
    try {
        const { id } = req.params;
        const { materiales } = req.body;

        if (!materiales || !Array.isArray(materiales)) {
            return res.status(400).json({
                success: false,
                message: "Array de materiales es requerido"
            });
        }

        const mantenimiento = await Mantenimiento.buscarPorId(id);
        if (!mantenimiento) {
            return res.status(404).json({
                success: false,
                message: "Mantenimiento no encontrado"
            });
        }

        const materialesAgregados = await Mantenimiento.agregarMateriales(id, materiales);

        res.status(200).json({
            success: true,
            message: `${materiales.length} materiales agregados correctamente`,
            materiales: materialesAgregados
        });

    } catch (error) {
        console.log("Error al agregar materiales:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ Obtener mantenimiento completo con fotos y materiales
export const obtenerMantenimientoCompleto = async (req, res) => {
    try {
        const { id } = req.params;
        const mantenimiento = await Mantenimiento.buscarCompletoPorId(id);

        if (!mantenimiento) {
            return res.status(404).json({
                success: false,
                message: "Mantenimiento no encontrado"
            });
        }

        res.status(200).json({
            success: true,
            mantenimiento
        });
    } catch (error) {
        console.log("Error al obtener mantenimiento completo:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ Iniciar mantenimiento (subir fotos "antes")
export const iniciarMantenimiento = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🔄 Iniciando mantenimiento:', id);

        // ✅ Solo cambiar estado - las fotos se suben por separado
        const mantenimientoIniciado = await Mantenimiento.cambiarEstado(id, 'en_progreso');

        res.status(200).json({
            success: true,
            message: "Mantenimiento iniciado correctamente",
            mantenimiento: mantenimientoIniciado,
            suggestions: [
                "Puedes subir fotos 'antes' del trabajo usando la ruta de subida de fotos",
                "Registra los materiales que planeas usar",
                "Completa el checklist durante la ejecución"
            ]
        });

    } catch (error) {
        console.log("Error al iniciar mantenimiento:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ Completar mantenimiento con fotos, materiales y checklist
export const completarMantenimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const { resumenTrabajo, materiales = [] } = req.body; // ✅ Solo JSON

        if (!resumenTrabajo) {
            return res.status(400).json({
                success: false,
                message: "Resumen del trabajo es requerido"
            });
        }

        const mantenimiento = await Mantenimiento.buscarPorId(id);
        if (!mantenimiento) {
            return res.status(404).json({
                success: false,
                message: "Mantenimiento no encontrado"
            });
        }

        console.log('🔄 Completando mantenimiento:', { 
            id, 
            materialesCount: materiales.length
        });

        // ✅ Solo completar con resumen y materiales - fotos se suben por separado
        const datosCompletar = {
            resumenTrabajo,
            materiales
        };

        const mantenimientoCompletado = await Mantenimiento.completarMantenimiento(id, datosCompletar);

        res.status(200).json({
            success: true,
            message: "Mantenimiento completado correctamente",
            mantenimiento: mantenimientoCompletado,
            pdfAvailable: true,
            pdfUrl: `/api/mantenimientos/${id}/reporte-pdf`,
            suggestions: [
                "Puedes subir fotos 'después' usando la ruta de subida de fotos",
                "Puedes descargar el reporte PDF usando el enlace proporcionado"
            ]
        });

    } catch (error) {
        console.log("Error al completar mantenimiento:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ✅ Eliminar foto de mantenimiento
export const eliminarFoto = async (req, res) => {
    try {
        const { id, fotoId } = req.params;

        const eliminado = await Mantenimiento.eliminarFoto(fotoId);
        
        if (!eliminado) {
            return res.status(404).json({
                success: false,
                message: "Foto no encontrada"
            });
        }

        res.status(200).json({
            success: true,
            message: "Foto eliminada correctamente"
        });

    } catch (error) {
        console.log("Error al eliminar foto:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ Eliminar material de mantenimiento
export const eliminarMaterial = async (req, res) => {
    try {
        const { id, materialId } = req.params;

        const eliminado = await Mantenimiento.eliminarMaterial(materialId);
        
        if (!eliminado) {
            return res.status(404).json({
                success: false,
                message: "Material no encontrado"
            });
        }

        res.status(200).json({
            success: true,
            message: "Material eliminado correctamente"
        });

    } catch (error) {
        console.log("Error al eliminar material:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ Generar reporte PDF de mantenimiento
// ✅ Generar reporte PDF de mantenimiento - VERSIÓN MEJORADA Y SIMPLIFICADA
export const generarReportePDF = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🎯 [MANTENIMIENTO PDF] Iniciando generación de PDF para mantenimiento:', id);

        // Obtener datos completos
        const mantenimiento = await Mantenimiento.buscarCompletoPorId(id);
        
        if (!mantenimiento) {
            return res.status(404).json({ success: false, message: "Mantenimiento no encontrado" });
        }

        // Crear documento PDF
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'A4'
        });
        
        // Configurar headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=reporte-mantenimiento-${id}.pdf`);
        
        // Manejar errores del stream
        doc.on('error', (error) => {
            console.log('❌ [MANTENIMIENTO PDF] Error en PDF stream:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Error generando PDF: ' + error.message
                });
            }
        });

        // Pipe el PDF a la respuesta
        doc.pipe(res);

        // ========== ENCABEZADO Y TÍTULO ==========
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('REPORTE DE MANTENIMIENTO', 50, 50, { align: 'center' });

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#666666')
           .text(`ID: #${mantenimiento.id}`, 50, 80, { align: 'center' });

        // Línea decorativa
        doc.moveTo(50, 95).lineTo(545, 95).strokeColor('#2c5aa0').lineWidth(1).stroke();

        // ========== INFORMACIÓN GENERAL ==========
        let yPosition = 120;
        
        // Título de sección
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('INFORMACIÓN GENERAL', 50, yPosition);
        
        yPosition += 25;

        // Tabla de información
        const infoLeft = 50;
        const infoRight = 300;
        
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#333333')
           .text('Tipo de Mantenimiento:', infoLeft, yPosition)
           .text('Estado:', infoRight, yPosition);
        
        doc.font('Helvetica')
           .fillColor('#000000')
           .text(mantenimiento.tipo.toUpperCase(), infoLeft + 120, yPosition)
           .text(mantenimiento.estado.toUpperCase(), infoRight + 40, yPosition);
        
        yPosition += 20;
        
        doc.font('Helvetica-Bold')
           .text('Planta:', infoLeft, yPosition)
           .text('Técnico:', infoRight, yPosition);
        
        doc.font('Helvetica')
           .text(mantenimiento.plantaNombre, infoLeft + 40, yPosition)
           .text(mantenimiento.tecnicoNombre, infoRight + 50, yPosition);
        
        yPosition += 20;
        
        doc.font('Helvetica-Bold')
           .text('Fecha Programada:', infoLeft, yPosition);
        
        doc.font('Helvetica')
           .text(new Date(mantenimiento.fechaProgramada).toLocaleDateString('es-ES'), infoLeft + 100, yPosition);
        
        if (mantenimiento.estado === 'completado' && mantenimiento.fechaRealizada) {
            yPosition += 20;
            doc.font('Helvetica-Bold')
               .text('Fecha de Realización:', infoLeft, yPosition);
            
            doc.font('Helvetica')
               .text(new Date(mantenimiento.fechaRealizada).toLocaleDateString('es-ES'), infoLeft + 110, yPosition);
        }

        yPosition += 40;

        // ========== DESCRIPCIÓN DEL TRABAJO ==========
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('DESCRIPCIÓN DEL MANTENIMIENTO', 50, yPosition);
        
        yPosition += 25;
        
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#333333')
           .text('Tareas Programadas:', 50, yPosition);
        
        yPosition += 15;
        
        doc.font('Helvetica')
           .fillColor('#000000')
           .text(mantenimiento.descripcion, 50, yPosition, { 
               width: 500, 
               align: 'justify',
               lineGap: 3
           });
        
        // Calcular altura de descripción
        const descripcionHeight = Math.ceil(mantenimiento.descripcion.length / 80) * 12;
        yPosition += descripcionHeight + 20;

        // ========== RESUMEN DE EJECUCIÓN ==========
        if (mantenimiento.resumenTrabajo) {
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text('RESUMEN DE EJECUCIÓN', 50, yPosition);
            
            yPosition += 25;
            
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .fillColor('#333333')
               .text('Trabajo Realizado:', 50, yPosition);
            
            yPosition += 15;
            
            doc.font('Helvetica')
               .fillColor('#000000')
               .text(mantenimiento.resumenTrabajo, 50, yPosition, { 
                   width: 500, 
                   align: 'justify',
                   lineGap: 3
               });
            
            const resumenHeight = Math.ceil(mantenimiento.resumenTrabajo.length / 80) * 12;
            yPosition += resumenHeight + 30;
        }

        // ========== FOTOS ANTES DEL MANTENIMIENTO ==========
        const fotosAntes = mantenimiento.fotos?.filter(foto => foto.tipo === 'antes') || [];
        if (fotosAntes.length > 0) {
            // Verificar si necesitamos nueva página
            if (yPosition > 600) {
                doc.addPage();
                yPosition = 50;
            }
            
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text('FOTOS ANTES DEL MANTENIMIENTO', 50, yPosition, { align: 'center' });
            
            yPosition += 30;
            
            fotosAntes.forEach((foto, index) => {
                if (yPosition > 650) {
                    doc.addPage();
                    yPosition = 50;
                }
                
                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .fillColor('#333333')
                   .text(`Foto ${index + 1}: ${foto.descripcion || 'Sin descripción'}`, 50, yPosition);
                
                yPosition += 15;
                
                try {
                    if (foto.datos_imagen) {
                        doc.image(foto.datos_imagen, 50, yPosition, { 
                            width: 200,
                            height: 150,
                            fit: [200, 150],
                            align: 'center'
                        });
                        yPosition += 160;
                    } else {
                        doc.fontSize(9)
                           .font('Helvetica')
                           .fillColor('#ff0000')
                           .text(`❌ Imagen no disponible`, 50, yPosition);
                        yPosition += 20;
                    }
                } catch (imageError) {
                    console.log('❌ Error al cargar imagen desde BLOB:', imageError);
                    doc.fontSize(9)
                       .font('Helvetica')
                       .fillColor('#ff0000')
                       .text(`❌ Error al cargar imagen`, 50, yPosition);
                    yPosition += 20;
                }
                
                yPosition += 10; // Espacio entre fotos
            });
            
            yPosition += 20;
        }

        // ========== FOTOS DESPUÉS DEL MANTENIMIENTO ==========
        const fotosDespues = mantenimiento.fotos?.filter(foto => foto.tipo === 'despues') || [];
        if (fotosDespues.length > 0) {
            // Verificar si necesitamos nueva página
            if (yPosition > 600) {
                doc.addPage();
                yPosition = 50;
            }
            
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text('FOTOS DESPUÉS DEL MANTENIMIENTO', 50, yPosition, { align: 'center' });
            
            yPosition += 30;
            
            fotosDespues.forEach((foto, index) => {
                if (yPosition > 650) {
                    doc.addPage();
                    yPosition = 50;
                }
                
                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .fillColor('#333333')
                   .text(`Foto ${index + 1}: ${foto.descripcion || 'Sin descripción'}`, 50, yPosition);
                
                yPosition += 15;
                
                try {
                    if (foto.datos_imagen) {
                        doc.image(foto.datos_imagen, 50, yPosition, { 
                            width: 200,
                            height: 150,
                            fit: [200, 150],
                            align: 'center'
                        });
                        yPosition += 160;
                    } else {
                        doc.fontSize(9)
                           .font('Helvetica')
                           .fillColor('#ff0000')
                           .text(`❌ Imagen no disponible`, 50, yPosition);
                        yPosition += 20;
                    }
                } catch (imageError) {
                    console.log('❌ Error al cargar imagen desde BLOB:', imageError);
                    doc.fontSize(9)
                       .font('Helvetica')
                       .fillColor('#ff0000')
                       .text(`❌ Error al cargar imagen`, 50, yPosition);
                    yPosition += 20;
                }
                
                yPosition += 10; // Espacio entre fotos
            });
            
            yPosition += 20;
        }

        // ========== MATERIALES UTILIZADOS ==========
        if (mantenimiento.materiales && mantenimiento.materiales.length > 0) {
            // Verificar si necesitamos nueva página
            if (yPosition > 500) {
                doc.addPage();
                yPosition = 50;
            }
            
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text('MATERIALES UTILIZADOS', 50, yPosition, { align: 'center' });
            
            yPosition += 30;

            // Encabezados de tabla
            doc.font('Helvetica-Bold')
               .fontSize(9)
               .fillColor('#333333')
               .text('MATERIAL', 50, yPosition)
               .text('CANTIDAD', 200, yPosition)
               .text('UNIDAD', 270, yPosition)
               .text('COSTO UNITARIO', 330, yPosition)
               .text('SUBTOTAL', 430, yPosition);
            
            yPosition += 15;
            
            // Línea de separación
            doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor('#cccccc').lineWidth(0.5).stroke();
            yPosition += 10;

            // Filas de materiales
            doc.font('Helvetica')
               .fontSize(9)
               .fillColor('#000000');
               
            let totalCosto = 0;
            
            mantenimiento.materiales.forEach(material => {
                if (yPosition > 700) {
                    doc.addPage();
                    yPosition = 50;
                    // Volver a poner encabezados en nueva página
                    doc.font('Helvetica-Bold')
                       .fontSize(9)
                       .text('MATERIAL', 50, yPosition)
                       .text('CANTIDAD', 200, yPosition)
                       .text('UNIDAD', 270, yPosition)
                       .text('COSTO UNITARIO', 330, yPosition)
                       .text('SUBTOTAL', 430, yPosition);
                    yPosition += 25;
                }
                
                const subtotal = material.cantidad * material.costo;
                totalCosto += subtotal;
                
                doc.text(material.material_nombre || 'Sin nombre', 50, yPosition, { width: 140 })
                   .text(material.cantidad.toString(), 200, yPosition)
                   .text(material.unidad, 270, yPosition)
                   .text(`$${material.costo.toLocaleString('es-CL')}`, 330, yPosition)
                   .text(`$${subtotal.toLocaleString('es-CL')}`, 430, yPosition);
                
                yPosition += 15;
            });

            // Línea de total
            yPosition += 5;
            doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor('#cccccc').lineWidth(0.5).stroke();
            yPosition += 15;
            
            // Total
            doc.font('Helvetica-Bold')
               .fontSize(10)
               .text('TOTAL GENERAL:', 300, yPosition)
               .text(`$${totalCosto.toLocaleString('es-CL')}`, 430, yPosition);
            
            yPosition += 30;
        }

        // ========== RESUMEN ESTADÍSTICO ==========
        // Verificar si necesitamos nueva página
        if (yPosition > 600) {
            doc.addPage();
            yPosition = 50;
        }
        
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('RESUMEN ESTADÍSTICO', 50, yPosition, { align: 'center' });
        
        yPosition += 30;
        
        const statsLeft = 80;
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#000000');
        
        doc.text('• Fotos antes del mantenimiento:', statsLeft, yPosition)
           .text(fotosAntes.length.toString(), 300, yPosition);
        
        yPosition += 20;
        doc.text('• Fotos después del mantenimiento:', statsLeft, yPosition)
           .text(fotosDespues.length.toString(), 300, yPosition);
        
        yPosition += 20;
        doc.text('• Materiales utilizados:', statsLeft, yPosition)
           .text((mantenimiento.materiales?.length || 0).toString(), 300, yPosition);
        
        if (mantenimiento.materiales && mantenimiento.materiales.length > 0) {
            const costoTotal = mantenimiento.materiales.reduce((total, material) => 
                total + (material.cantidad * material.costo), 0
            );
            yPosition += 20;
            doc.text('• Inversión total en materiales:', statsLeft, yPosition)
               .text(`$${costoTotal.toLocaleString('es-CL')}`, 300, yPosition);
        }

        // ========== FIRMA Y FECHA ==========
        const firmaY = Math.max(yPosition + 50, 650);
        
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('FIRMA DEL TÉCNICO RESPONSABLE', 50, firmaY);
        
        doc.moveTo(50, firmaY + 15).lineTo(250, firmaY + 15).strokeColor('#000000').lineWidth(1).stroke();
        
        doc.font('Helvetica')
           .text(mantenimiento.tecnicoNombre, 50, firmaY + 25);
        
        doc.font('Helvetica-Bold')
           .text('Fecha de generación:', 350, firmaY)
           .font('Helvetica')
           .text(new Date().toLocaleDateString('es-ES'), 350, firmaY + 15);

        // ========== PIE DE PÁGINA ==========
        const pageHeight = doc.page.height;
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#666666')
           .text(`Sistema de Gestión de Mantenimientos - Página ${doc.bufferedPageRange().count}`, 50, pageHeight - 30, { align: 'center' });

        // ✅ FINALIZAR DOCUMENTO
        doc.end();
        console.log('✅ [MANTENIMIENTO PDF] PDF generado exitosamente con estructura mejorada');

    } catch (error) {
        console.log('❌ [MANTENIMIENTO PDF] ERROR:', error);
        
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};
