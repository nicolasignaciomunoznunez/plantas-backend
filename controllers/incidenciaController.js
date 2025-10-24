import { Incidencia } from "../models/incidenciaModel.js";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Configuración para subida de archivos
const UPLOADS_DIR = path.join(__dirname, '../../uploads/incidencias');
const REPORTS_DIR = path.join(__dirname, '../../uploads/reports');

// Asegurar que los directorios existen
[UPLOADS_DIR, REPORTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

export const crearIncidencia = async (req, res) => {
    try {
        const { plantId, titulo, descripcion, estado } = req.body;
        const userId = req.usuarioId;

        if (!plantId || !titulo || !descripcion) {
            return res.status(400).json({
                success: false,
                message: "plantId, título y descripción son requeridos"
            });
        }

        const nuevaIncidencia = await Incidencia.crear({
            plantId,
            userId,
            titulo,
            descripcion,
            estado
        });

        res.status(201).json({
            success: true,
            message: "Incidencia reportada correctamente",
            incidencia: nuevaIncidencia
        });
    } catch (error) {
        console.log("Error al crear incidencia:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerIncidencia = async (req, res) => {
    try {
        const { id } = req.params;
        const incidencia = await Incidencia.buscarPorId(id);

        if (!incidencia) {
            return res.status(404).json({
                success: false,
                message: "Incidencia no encontrada"
            });
        }

        // ✅ VERIFICAR PERMISOS: Si es cliente, solo puede ver SUS incidencias
        if (req.usuario?.rol === 'cliente' && incidencia.userId !== req.usuarioId) {
            return res.status(403).json({
                success: false,
                message: "No tienes permisos para ver esta incidencia"
            });
        }

        res.status(200).json({
            success: true,
            incidencia
        });
    } catch (error) {
        console.log("Error al obtener incidencia:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerIncidencias = async (req, res) => {
    try {
        const { limite = 10, pagina = 1 } = req.query;
        
        console.log('🔐 [CONTROLLER] Usuario solicitando incidencias:', {
            usuarioId: req.usuarioId,
            usuario: req.usuario,
            rol: req.usuario?.rol
        });

        // ✅ CONFIGURAR FILTROS SEGÚN ROL
        let filtros = {};
        
        // ✅ SI ES CLIENTE, SOLO VER SUS PROPIAS INCIDENCIAS
        if (req.usuario?.rol === 'cliente') {
            filtros.userId = req.usuarioId;
            console.log('👤 [CONTROLLER] Filtrando para cliente - userId:', req.usuarioId);
        }
        // ✅ Técnicos y Admin ven TODAS las incidencias (sin filtro)
        
        const incidencias = await Incidencia.obtenerTodas(
            parseInt(limite), 
            parseInt(pagina),
            filtros // ✅ Pasar los filtros al modelo
        );

        console.log('✅ [CONTROLLER] Incidencias devueltas:', incidencias.length, 'para rol:', req.usuario?.rol);

        res.status(200).json({
            success: true,
            incidencias,
            paginacion: {
                limite: parseInt(limite),
                pagina: parseInt(pagina),
                total: incidencias.length
            },
            filtro: req.usuario?.rol === 'cliente' ? 'mis_incidencias' : 'todas'
        });
    } catch (error) {
        console.log("Error al obtener incidencias:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerIncidenciasPlanta = async (req, res) => {
    try {
        const { plantId } = req.params;
        
        console.log('🔐 [CONTROLLER] Usuario solicitando incidencias de planta:', {
            usuarioId: req.usuarioId,
            rol: req.usuario?.rol,
            plantId
        });

        let filtros = { plantId };
        
        // ✅ SI ES CLIENTE, SOLO VER SUS INCIDENCIAS EN ESA PLANTA
        if (req.usuario?.rol === 'cliente') {
            filtros.userId = req.usuarioId;
            console.log('👤 [CONTROLLER] Filtrando para cliente en planta:', filtros);
        }
        
        const incidencias = await Incidencia.obtenerPorPlanta(plantId, filtros);

        res.status(200).json({
            success: true,
            incidencias,
            total: incidencias.length,
            filtro: req.usuario?.rol === 'cliente' ? 'mis_incidencias' : 'todas'
        });
    } catch (error) {
        console.log("Error al obtener incidencias de planta:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerIncidenciasEstado = async (req, res) => {
    try {
        const { estado } = req.params;
        
        console.log('🔐 [CONTROLLER] Usuario solicitando incidencias por estado:', {
            usuarioId: req.usuarioId,
            rol: req.usuario?.rol,
            estado
        });

        let filtros = { estado };
        
        // ✅ SI ES CLIENTE, SOLO VER SUS INCIDENCIAS EN ESE ESTADO
        if (req.usuario?.rol === 'cliente') {
            filtros.userId = req.usuarioId;
            console.log('👤 [CONTROLLER] Filtrando para cliente por estado:', filtros);
        }
        
        const incidencias = await Incidencia.obtenerPorEstado(estado, filtros);

        res.status(200).json({
            success: true,
            incidencias,
            total: incidencias.length,
            filtro: req.usuario?.rol === 'cliente' ? 'mis_incidencias' : 'todas'
        });
    } catch (error) {
        console.log("Error al obtener incidencias por estado:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const actualizarIncidencia = async (req, res) => {
    try {
        const { id } = req.params;
        const datosActualizados = req.body;

        // ✅ VERIFICAR PERMISOS: Si es cliente, solo puede actualizar SUS incidencias
        if (req.usuario?.rol === 'cliente') {
            const incidencia = await Incidencia.buscarPorId(id);
            if (!incidencia) {
                return res.status(404).json({
                    success: false,
                    message: "Incidencia no encontrada"
                });
            }
            
            if (incidencia.userId !== req.usuarioId) {
                return res.status(403).json({
                    success: false,
                    message: "No tienes permisos para actualizar esta incidencia"
                });
            }
            
            // ✅ Clientes NO pueden cambiar el estado (solo técnicos/admin)
            if (datosActualizados.estado) {
                return res.status(403).json({
                    success: false,
                    message: "No puedes cambiar el estado de la incidencia"
                });
            }
        }

        const incidenciaActualizada = await Incidencia.actualizar(id, datosActualizados);

        res.status(200).json({
            success: true,
            message: "Incidencia actualizada correctamente",
            incidencia: incidenciaActualizada
        });
    } catch (error) {
        console.log("Error al actualizar incidencia:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const cambiarEstadoIncidencia = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                success: false,
                message: "Estado es requerido"
            });
        }

        // ✅ SOLO TÉCNICOS Y ADMIN PUEDEN CAMBIAR ESTADO
        if (req.usuario?.rol === 'cliente') {
            return res.status(403).json({
                success: false,
                message: "No tienes permisos para cambiar el estado de incidencias"
            });
        }

        const incidenciaActualizada = await Incidencia.cambiarEstado(id, estado);

        res.status(200).json({
            success: true,
            message: `Incidencia marcada como ${estado}`,
            incidencia: incidenciaActualizada
        });
    } catch (error) {
        console.log("Error al cambiar estado de incidencia:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const eliminarIncidencia = async (req, res) => {
    try {
        const { id } = req.params;
        
        // ✅ CLIENTES NO PUEDEN ELIMINAR INCIDENCIAS
        if (req.usuario?.rol === 'cliente') {
            return res.status(403).json({
                success: false,
                message: "No tienes permisos para eliminar incidencias"
            });
        }

        const eliminado = await Incidencia.eliminar(id);

        if (!eliminado) {
            return res.status(404).json({
                success: false,
                message: "Incidencia no encontrada"
            });
        }

        res.status(200).json({
            success: true,
            message: "Incidencia eliminada correctamente"
        });
    } catch (error) {
        console.log("Error al eliminar incidencia:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const obtenerIncidenciasResumen = async (req, res) => {
  try {
    const resumen = await Incidencia.obtenerResumenDashboard();
    res.json({ success: true, ...resumen });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




// ✅ NUEVO: Subir fotos a incidencia
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

        const fotosSubidas = [];
        
        for (const file of req.files) {
            // ✅ LEER EL ARCHIVO COMO BUFFER
            const imageBuffer = fs.readFileSync(file.path);
            
            // ✅ GUARDAR EN BASE DE DATOS CON BLOB
            const fotoData = {
                tipo,
                ruta_archivo: `/uploads/incidencias/${file.originalname}`,
                descripcion: file.originalname,
                datos_imagen: imageBuffer // ✅ GUARDAR IMAGEN COMO BLOB
            };
            
            const fotoGuardada = await Incidencia.subirFotos(id, [fotoData]);
            fotosSubidas.push(fotoGuardada[0]);
            
            // ✅ LIMPIAR ARCHIVO TEMPORAL (importante en Railway)
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

// ✅ NUEVO: Agregar materiales a incidencia
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

        // Verificar que la incidencia existe
        const incidencia = await Incidencia.buscarPorId(id);
        if (!incidencia) {
            return res.status(404).json({
                success: false,
                message: "Incidencia no encontrada"
            });
        }

        const materialesAgregados = await Incidencia.agregarMateriales(id, materiales);

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

// ✅ NUEVO: Completar incidencia con resumen
export const completarIncidencia = async (req, res) => {
    try {
        const { id } = req.params;
        const { resumenTrabajo, materiales = [] } = req.body;

        if (!resumenTrabajo) {
            return res.status(400).json({
                success: false,
                message: "Resumen del trabajo es requerido"
            });
        }

        // Verificar que la incidencia existe
        const incidencia = await Incidencia.buscarPorId(id);
        if (!incidencia) {
            return res.status(404).json({
                success: false,
                message: "Incidencia no encontrada"
            });
        }

        // Solo técnicos y admin pueden completar incidencias
        if (req.usuario?.rol === 'cliente') {
            return res.status(403).json({
                success: false,
                message: "No tienes permisos para completar incidencias"
            });
        }

        const datosCompletar = {
            resumenTrabajo,
            materiales
        };

        console.log('🔄 [CONTROLLER] Completando incidencia:', { id, datosCompletar });

        // ✅ COMPLETAR LA INCIDENCIA
        const incidenciaCompletada = await Incidencia.completarIncidencia(id, datosCompletar);

        console.log('✅ [CONTROLLER] Incidencia completada exitosamente');

        // ✅ RESPUESTA CON OPCIÓN DE PDF
        res.status(200).json({
            success: true,
            message: "Incidencia completada correctamente",
            incidencia: incidenciaCompletada,
            pdfAvailable: true,
            pdfUrl: `/api/incidencias/${id}/reporte-pdf`,
            suggestions: [
                "Puedes descargar el reporte PDF ahora usando el enlace proporcionado",
                "El PDF incluirá todas las fotos y materiales registrados",
                "También puedes descargarlo más tarde desde la lista de incidencias"
            ]
        });

    } catch (error) {
        console.log("❌ Error al completar incidencia:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ NUEVO: Obtener incidencia completa con fotos y materiales
export const obtenerIncidenciaCompleta = async (req, res) => {
    try {
        const { id } = req.params;
        const incidencia = await Incidencia.buscarCompletaPorId(id);

        if (!incidencia) {
            return res.status(404).json({
                success: false,
                message: "Incidencia no encontrada"
            });
        }

        // ✅ VERIFICAR PERMISOS
        if (req.usuario?.rol === 'cliente' && incidencia.userId !== req.usuarioId) {
            return res.status(403).json({
                success: false,
                message: "No tienes permisos para ver esta incidencia"
            });
        }

        res.status(200).json({
            success: true,
            incidencia
        });
    } catch (error) {
        console.log("Error al obtener incidencia completa:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ NUEVO: Eliminar foto
export const eliminarFoto = async (req, res) => {
    try {
        const { id, fotoId } = req.params;

        const eliminado = await Incidencia.eliminarFoto(fotoId);
        
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

// ✅ NUEVO: Eliminar material
export const eliminarMaterial = async (req, res) => {
    try {
        const { id, materialId } = req.params;

        const eliminado = await Incidencia.eliminarMaterial(materialId);
        
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


// Generar reporte PDF con IMAGENES usando PDFKit




export const generarReportePDF = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🎯 [PDF DEBUG] Iniciando generación de PDF para incidencia:', id);

        // Obtener datos completos
        const incidencia = await Incidencia.buscarCompletaPorId(id);
        
        if (!incidencia) {
            return res.status(404).json({ success: false, message: "Incidencia no encontrada" });
        }

        // Crear documento PDF
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'A4'
        });
        
        // Configurar headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=reporte-incidencia-${id}.pdf`);
        
        // Manejar errores del stream
        doc.on('error', (error) => {
            console.log('❌ [PDF ERROR] Error en PDF stream:', error);
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
           .text('REPORTE DE INCIDENCIA', 50, 50, { align: 'center' });

        // ✅ INFORMACIÓN BÁSICA
        let yPosition = 120;
        
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('INFORMACIÓN BÁSICA', 50, yPosition);
        
        yPosition += 25;
        
        doc.font('Helvetica')
           .text(`ID de Incidencia: ${incidencia.id}`, 50, yPosition)
           .text(`Título: ${incidencia.titulo}`, 250, yPosition);
        
        yPosition += 15;
        doc.text(`Planta: ${incidencia.plantaNombre}`, 50, yPosition)
           .text(`Estado: ${incidencia.estado.toUpperCase()}`, 250, yPosition);
        
        yPosition += 15;
        doc.text(`Reportado por: ${incidencia.usuarioNombre}`, 50, yPosition)
           .text(`Fecha de reporte: ${new Date(incidencia.fechaReporte).toLocaleDateString('es-ES')}`, 250, yPosition);
        
        if (incidencia.estado === 'resuelto' && incidencia.fechaResolucion) {
            yPosition += 15;
            doc.text(`Fecha de resolución: ${new Date(incidencia.fechaResolucion).toLocaleDateString('es-ES')}`, 50, yPosition);
        }

        yPosition += 30;

        // ✅ DESCRIPCIÓN Y RESUMEN
        doc.font('Helvetica-Bold')
           .text('DESCRIPCIÓN DEL PROBLEMA:', 50, yPosition);
        
        yPosition += 20;
        
        doc.font('Helvetica')
           .fontSize(10)
           .text(incidencia.descripcion, 50, yPosition, { 
               width: 500, 
               align: 'justify',
               lineGap: 2
           });
        
        // Calcular altura de descripción
        const descripcionHeight = Math.ceil(incidencia.descripcion.length / 70) * 12;
        yPosition += descripcionHeight + 20;

        if (incidencia.resumenTrabajo) {
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('RESUMEN DEL TRABAJO REALIZADO:', 50, yPosition);
            
            yPosition += 20;
            
            doc.font('Helvetica')
               .fontSize(10)
               .text(incidencia.resumenTrabajo, 50, yPosition, { 
                   width: 500, 
                   align: 'justify',
                   lineGap: 2
               });
            
            // Calcular altura de resumen
            const resumenHeight = Math.ceil(incidencia.resumenTrabajo.length / 70) * 12;
            yPosition += resumenHeight + 30;
        }

        // ✅ FOTOS ANTES DEL TRABAJO (si existen)
        const fotosAntes = incidencia.fotos?.filter(foto => foto.tipo === 'antes') || [];
        if (fotosAntes.length > 0) {
            // Nueva página para fotos
            doc.addPage();
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text('FOTOS ANTES DEL TRABAJO', 50, 50, { align: 'center' });
            
            let fotoY = 80;
            
            fotosAntes.forEach((foto, index) => {
                // Solo procesar si hay espacio
                if (fotoY > 650) {
                    doc.addPage();
                    fotoY = 50;
                }
                
                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .fillColor('#000000')
                   .text(`Foto ${index + 1}: ${foto.descripcion || 'Sin descripción'}`, 50, fotoY);
                
                fotoY += 15;
                
                // ✅ CORREGIDO: Ruta de imagen funcionando
            try {
    console.log('🖼️ [PDF DEBUG] Procesando foto:', foto.descripcion);
    
    // ✅ USAR BLOB DESDE BASE DE DATOS
    if (foto.datos_imagen) {
        doc.image(foto.datos_imagen, 50, fotoY, { 
            width: 400,
            height: 300,
            fit: [400, 300]
        });
        fotoY += 320;
        console.log('✅ Imagen cargada desde BLOB');
    } else {
        console.log('❌ No hay datos de imagen en BLOB');
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

        // ✅ FOTOS DESPUÉS DEL TRABAJO (si existen)
        const fotosDespues = incidencia.fotos?.filter(foto => foto.tipo === 'despues') || [];
        if (fotosDespues.length > 0) {
            doc.addPage();
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text('FOTOS DESPUÉS DEL TRABAJO', 50, 50, { align: 'center' });
            
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
                
                // ✅ CORREGIDO: Ruta de imagen funcionando
                try {
            console.log('🖼️ [PDF DEBUG] Procesando foto:', foto.descripcion);
            
            // ✅ USAR BLOB DESDE BASE DE DATOS
            if (foto.datos_imagen) {
                doc.image(foto.datos_imagen, 50, fotoY, { 
                    width: 400,
                    height: 300,
                    fit: [400, 300]
                });
                fotoY += 320;
                console.log('✅ Imagen cargada desde BLOB');
            } else {
                console.log('❌ No hay datos de imagen en BLOB');
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
        if (incidencia.materiales && incidencia.materiales.length > 0) {
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
               
            incidencia.materiales.forEach(material => {
                const materialNombre = material.materialNombre || material.material_nombre;
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
           .text(`• Total de materiales utilizados: ${incidencia.materiales?.length || 0}`, 50, statsY + 40);
        
        if (incidencia.materiales && incidencia.materiales.length > 0) {
            const costoTotal = incidencia.materiales.reduce((total, material) => 
                total + (material.cantidad * material.costo), 0
            );
            doc.text(`• Costo total en materiales: $${costoTotal.toLocaleString('es-CL')}`, 50, statsY + 60);
        }
        
        if (incidencia.fechaReporte && incidencia.fechaResolucion) {
            doc.text(`• Tiempo total de resolución: ${calcularTiempoResolucion(incidencia)}`, 50, statsY + 80);
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
        console.log('✅ [PDF DEBUG] PDF generado exitosamente con todas las secciones');

    } catch (error) {
        console.log('❌ [PDF DEBUG] ERROR CAPTURADO:', error);
        console.log('❌ [PDF DEBUG] Stack:', error.stack);
        
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

// ✅ FUNCIÓN AUXILIAR: Calcular tiempo de resolución
function calcularTiempoResolucion(incidencia) {
    if (!incidencia.fechaResolucion || !incidencia.fechaReporte) return 'N/A';
    
    const inicio = new Date(incidencia.fechaReporte);
    const fin = new Date(incidencia.fechaResolucion);
    const diffMs = fin - inicio;
    
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (dias > 0) {
        return `${dias} día${dias > 1 ? 's' : ''} ${horas} hora${horas > 1 ? 's' : ''}`;
    } else {
        return `${horas} hora${horas > 1 ? 's' : ''}`;
    }
}