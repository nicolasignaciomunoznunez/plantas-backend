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
        const { plantId, tipo, descripcion, fechaProgramada, estado } = req.body;
        const userId = req.usuarioId;

        console.log('📥 Datos recibidos para crear mantenimiento:', {
            plantId, tipo, descripcion, fechaProgramada, estado, userId
        });

        if (!plantId || !descripcion || !fechaProgramada) {
            return res.status(400).json({
                success: false,
                message: "plantId, descripción y fechaProgramada son requeridos"
            });
        }

        const nuevoMantenimiento = await Mantenimiento.crear({
            plantId,
            userId,
            tipo,
            descripcion,
            fechaProgramada,
            estado
        });

        // ✅ NO procesar fotos aquí - se suben por separado
        console.log('✅ Mantenimiento creado - ID:', nuevoMantenimiento.id);

        res.status(201).json({
            success: true,
            message: "Mantenimiento programado correctamente",
            mantenimiento: nuevoMantenimiento
        });
    } catch (error) {
        console.log("Error al crear mantenimiento:", error);
        res.status(500).json({
            success: false,
            message: error.message
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
        const { limite = 50, pagina = 1 } = req.query;
        
        const offset = (pagina - 1) * limite;
        
        // Obtener todos los mantenimientos con paginación
        const mantenimientos = await Mantenimiento.obtenerTodos({
            limite: parseInt(limite),
            offset: parseInt(offset)
        });

        res.status(200).json({
            success: true,
            mantenimientos: mantenimientos.rows || mantenimientos,
            total: mantenimientos.count || mantenimientos.length,
            pagina: parseInt(pagina),
            totalPaginas: Math.ceil((mantenimientos.count || mantenimientos.length) / limite)
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
    const resumen = await Mantenimiento.obtenerResumenDashboard();
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
export const generarReportePDF = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🎯 [MANTENIMIENTO PDF] Iniciando generación de PDF para mantenimiento:', id);

        // Obtener datos completos
        const mantenimiento = await Mantenimiento.buscarCompletoPorId(id);
        
        if (!mantenimiento) {
            return res.status(404).json({ success: false, message: "Mantenimiento no encontrado" });
        }

        // Obtener estadísticas para el reporte
        const estadisticas = await Mantenimiento.obtenerEstadisticasReporte(id);

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

        // ✅ TÍTULO DEL REPORTE
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('REPORTE DE MANTENIMIENTO', 50, 50, { align: 'center' });

        // ✅ INFORMACIÓN BÁSICA
        let yPosition = 120;
        
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('INFORMACIÓN BÁSICA', 50, yPosition);
        
        yPosition += 25;
        
        doc.font('Helvetica')
           .text(`ID de Mantenimiento: ${mantenimiento.id}`, 50, yPosition)
           .text(`Tipo: ${mantenimiento.tipo.toUpperCase()}`, 250, yPosition);
        
        yPosition += 15;
        doc.text(`Planta: ${mantenimiento.plantaNombre}`, 50, yPosition)
           .text(`Estado: ${mantenimiento.estado.toUpperCase()}`, 250, yPosition);
        
        yPosition += 15;
        doc.text(`Técnico: ${mantenimiento.tecnicoNombre}`, 50, yPosition)
           .text(`Fecha programada: ${new Date(mantenimiento.fechaProgramada).toLocaleDateString('es-ES')}`, 250, yPosition);
        
        if (mantenimiento.estado === 'completado' && mantenimiento.fechaRealizada) {
            yPosition += 15;
            doc.text(`Fecha de realización: ${new Date(mantenimiento.fechaRealizada).toLocaleDateString('es-ES')}`, 50, yPosition);
        }

        yPosition += 30;

        // ✅ DESCRIPCIÓN Y RESUMEN
        doc.font('Helvetica-Bold')
           .text('DESCRIPCIÓN DEL MANTENIMIENTO:', 50, yPosition);
        
        yPosition += 20;
        
        doc.font('Helvetica')
           .fontSize(10)
           .text(mantenimiento.descripcion, 50, yPosition, { 
               width: 500, 
               align: 'justify',
               lineGap: 2
           });
        
        // Calcular altura de descripción
        const descripcionHeight = Math.ceil(mantenimiento.descripcion.length / 70) * 12;
        yPosition += descripcionHeight + 20;

        // ✅ CHECKLIST (si existe)
        if (mantenimiento.checklist && mantenimiento.checklist.length > 0) {
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('CHECKLIST DE MANTENIMIENTO:', 50, yPosition);
            
            yPosition += 20;
            
            doc.font('Helvetica')
               .fontSize(9);
               
            mantenimiento.checklist.forEach((item, index) => {
                const estado = item.completado ? '✅ COMPLETADO' : '❌ PENDIENTE';
                doc.text(`${index + 1}. ${item.item} - ${estado}`, 60, yPosition);
                
                if (item.observaciones) {
                    yPosition += 12;
                    doc.text(`   Observaciones: ${item.observaciones}`, 70, yPosition, {
                        width: 450,
                        lineGap: 1
                    });
                    yPosition += 8;
                }
                
                yPosition += 15;
            });
            
            yPosition += 20;
        }

        // ✅ FOTOS ANTES DEL MANTENIMIENTO (si existen)
        const fotosAntes = mantenimiento.fotos?.filter(foto => foto.tipo === 'antes') || [];
        if (fotosAntes.length > 0) {
            doc.addPage();
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text('FOTOS ANTES DEL MANTENIMIENTO', 50, 50, { align: 'center' });
            
            let fotoY = 80;
            
            fotosAntes.forEach((foto, index) => {
                if (fotoY > 650) {
                    doc.addPage();
                    fotoY = 50;
                }
                
                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .fillColor('#000000')
                   .text(`Foto ${index + 1}: ${foto.descripcion || 'Sin descripción'}`, 50, fotoY);
                
                fotoY += 15;
                
                try {
                    if (foto.datos_imagen) {
                        doc.image(foto.datos_imagen, 50, fotoY, { 
                            width: 400,
                            height: 300,
                            fit: [400, 300]
                        });
                        fotoY += 320;
                    } else {
                        doc.fontSize(10)
                           .font('Helvetica')
                           .fillColor('#ff0000')
                           .text(`Imagen no disponible: ${foto.descripcion}`, 50, fotoY);
                        fotoY += 20;
                    }
                } catch (imageError) {
                    console.log('❌ Error al cargar imagen desde BLOB:', imageError);
                }
            });
        }

        // ✅ FOTOS DESPUÉS DEL MANTENIMIENTO (si existen)
        const fotosDespues = mantenimiento.fotos?.filter(foto => foto.tipo === 'despues') || [];
        if (fotosDespues.length > 0) {
            doc.addPage();
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text('FOTOS DESPUÉS DEL MANTENIMIENTO', 50, 50, { align: 'center' });
            
            let fotoY = 80;
            
            fotosDespues.forEach((foto, index) => {
                if (fotoY > 650) {
                    doc.addPage();
                    fotoY = 50;
                }
                
                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .fillColor('#000000')
                   .text(`Foto ${index + 1}: ${foto.descripcion || 'Sin descripción'}`, 50, fotoY);
                
                fotoY += 15;
                
                try {
                    if (foto.datos_imagen) {
                        doc.image(foto.datos_imagen, 50, fotoY, { 
                            width: 400,
                            height: 300,
                            fit: [400, 300]
                        });
                        fotoY += 320;
                    } else {
                        doc.fontSize(10)
                           .font('Helvetica')
                           .fillColor('#ff0000')
                           .text(`Imagen no disponible: ${foto.descripcion}`, 50, fotoY);
                        fotoY += 20;
                    }
                } catch (imageError) {
                    console.log('❌ Error al cargar imagen desde BLOB:', imageError);
                }
            });
        }

        // ✅ MATERIALES UTILIZADOS (si existen)
        if (mantenimiento.materiales && mantenimiento.materiales.length > 0) {
            doc.addPage();
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text('MATERIALES UTILIZADOS', 50, 50, { align: 'center' });
            
            let materialY = 80;
            let totalCosto = 0;
            
            // Encabezados de tabla
            doc.font('Helvetica-Bold')
               .fontSize(10)
               .text('Material', 50, materialY)
               .text('Cantidad', 250, materialY)
               .text('Costo Unitario', 350, materialY)
               .text('Subtotal', 450, materialY);
            
            materialY += 20;
            doc.moveTo(50, materialY).lineTo(550, materialY).stroke();
            materialY += 10;

            // Filas de materiales
            doc.font('Helvetica')
               .fontSize(9);
               
            mantenimiento.materiales.forEach(material => {
                const materialNombre = material.material_nombre;
                const subtotal = material.cantidad * material.costo;
                totalCosto += subtotal;
                
                doc.text(materialNombre, 50, materialY, { width: 180 })
                   .text(`${material.cantidad} ${material.unidad}`, 250, materialY)
                   .text(`$${material.costo.toLocaleString('es-CL')}`, 350, materialY)
                   .text(`$${subtotal.toLocaleString('es-CL')}`, 450, materialY);
                
                materialY += 15;
            });

            // Total
            materialY += 10;
            doc.moveTo(50, materialY).lineTo(550, materialY).stroke();
            materialY += 20;
            
            doc.font('Helvetica-Bold')
               .fontSize(10)
               .text('TOTAL:', 350, materialY)
               .text(`$${totalCosto.toLocaleString('es-CL')}`, 450, materialY);
        }

        // ✅ RESUMEN ESTADÍSTICO
        doc.addPage();
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('RESUMEN ESTADÍSTICO', 50, 50, { align: 'center' });
        
        let statsY = 100;
        doc.fontSize(11)
           .font('Helvetica')
           .fillColor('#000000')
           .text(`• Total de fotos (antes): ${fotosAntes.length}`, 50, statsY)
           .text(`• Total de fotos (después): ${fotosDespues.length}`, 50, statsY + 20)
           .text(`• Total de materiales utilizados: ${mantenimiento.materiales?.length || 0}`, 50, statsY + 40)
           .text(`• Items de checklist: ${estadisticas?.total_checklist || 0}`, 50, statsY + 60)
           .text(`• Checklist completados: ${estadisticas?.checklist_completados || 0}`, 50, statsY + 80);
        
        if (mantenimiento.materiales && mantenimiento.materiales.length > 0) {
            const costoTotal = mantenimiento.materiales.reduce((total, material) => 
                total + (material.cantidad * material.costo), 0
            );
            doc.text(`• Costo total en materiales: $${costoTotal.toLocaleString('es-CL')}`, 50, statsY + 100);
        }

        // ✅ FIRMA Y FECHA
        const firmaY = 200;
        doc.font('Helvetica-Bold')
           .text('FIRMA DEL TÉCNICO RESPONSABLE', 50, firmaY);
        
        doc.moveTo(50, firmaY + 20).lineTo(250, firmaY + 20).stroke();
        
        doc.font('Helvetica')
           .text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, 350, firmaY + 20);

        // ✅ FINALIZAR DOCUMENTO
        doc.end();
        console.log('✅ [MANTENIMIENTO PDF] PDF generado exitosamente');

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

