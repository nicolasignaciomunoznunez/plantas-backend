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
        const { filtrosPlanta = {} } = req; // ✅ AGREGAR esto
        
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

        // ✅ VERIFICAR ACCESO A LA PLANTA DE LA INCIDENCIA
        if (filtrosPlanta.plantaIds && filtrosPlanta.plantaIds.length > 0) {
            if (!filtrosPlanta.plantaIds.includes(incidencia.plantId)) {
                return res.status(403).json({
                    success: false,
                    message: "No tienes acceso a la planta de esta incidencia"
                });
            }
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
        const { filtrosPlanta = {} } = req; // ✅ AGREGAR esto
        
        console.log('🔐 [CONTROLLER] Usuario solicitando incidencias:', {
            usuarioId: req.usuarioId,
            usuario: req.usuario,
            rol: req.usuario?.rol,
            filtrosPlanta // ✅ Mostrar filtros
        });

        // ✅ CONFIGURAR FILTROS SEGÚN ROL
        let filtros = { ...filtrosPlanta }; // ✅ COPIAR filtros de plantas
        
        // ✅ SI ES CLIENTE, SOLO VER SUS PROPIAS INCIDENCIAS
        if (req.usuario?.rol === 'cliente') {
            filtros.userId = req.usuarioId;
            console.log('👤 [CONTROLLER] Filtrando para cliente - userId:', req.usuarioId);
        }
        // ✅ Técnicos y Admin ven TODAS las incidencias de SUS plantas (filtrosPlanta ya aplicado)
        
        const incidencias = await Incidencia.obtenerTodas(
            parseInt(limite), 
            parseInt(pagina),
            filtros // ✅ Pasar los filtros combinados al modelo
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
            filtro: req.usuario?.rol === 'cliente' ? 'mis_incidencias' : 'plantas_asignadas'
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
        const { filtrosPlanta = {} } = req; // ✅ AGREGAR esto
        
        console.log('🔐 [CONTROLLER] Usuario solicitando incidencias de planta:', {
            usuarioId: req.usuarioId,
            rol: req.usuario?.rol,
            plantId,
            filtrosPlanta // ✅ Mostrar filtros
        });

        // ✅ VERIFICAR ACCESO A LA PLANTA
        if (filtrosPlanta.plantaIds && filtrosPlanta.plantaIds.length > 0) {
            if (!filtrosPlanta.plantaIds.includes(parseInt(plantId))) {
                return res.status(403).json({
                    success: false,
                    message: "No tienes acceso a esta planta"
                });
            }
        }

        let filtros = { plantId, ...filtrosPlanta }; // ✅ COMBINAR filtros
        
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
            filtro: req.usuario?.rol === 'cliente' ? 'mis_incidencias' : 'plantas_asignadas'
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
        const { filtrosPlanta = {} } = req; // ✅ AGREGAR esto
        
        console.log('🔐 [CONTROLLER] Usuario solicitando incidencias por estado:', {
            usuarioId: req.usuarioId,
            rol: req.usuario?.rol,
            estado,
            filtrosPlanta // ✅ Mostrar filtros
        });

        let filtros = { estado, ...filtrosPlanta }; // ✅ COMBINAR filtros
        
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
            filtro: req.usuario?.rol === 'cliente' ? 'mis_incidencias' : 'plantas_asignadas'
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
    const { filtrosPlanta = {} } = req; // ✅ AGREGAR esto
    
    console.log('📊 [INCIDENCIA CONTROLLER] Obteniendo resumen con filtros:', filtrosPlanta);
    
    // ✅ CORREGIDO: Pasar filtros al modelo
    const resumen = await Incidencia.obtenerResumenDashboard(filtrosPlanta);
    
    res.json({ 
        success: true, 
        ...resumen,
        filtrosAplicados: filtrosPlanta // Para debug
    });
  } catch (error) {
    console.error('❌ [INCIDENCIA CONTROLLER] Error obteniendo resumen:', error);
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
            
            // ✅ CORREGIDO: Usar nombres consistentes
            const fotoData = {
                tipo,
                ruta_archivo: `/uploads/incidencias/${file.originalname}`,
                descripcion: file.originalname,
                datos_imagen: imageBuffer // ✅ Mismo nombre que en el modelo
            };
            
            console.log('📸 [DEBUG] Subiendo foto:', {
                tieneBuffer: !!fotoData.datos_imagen,
                bufferSize: fotoData.datos_imagen?.length,
                tipo: fotoData.tipo,
                descripcion: fotoData.descripcion
            });

            const fotoGuardada = await Incidencia.subirFotos(id, [fotoData]);
            fotosSubidas.push(fotoGuardada[0]);
            
            // ✅ LIMPIAR ARCHIVO TEMPORAL
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
        const { filtrosPlanta = {} } = req; // ✅ AGREGAR esto
        
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

        // ✅ VERIFICAR ACCESO A LA PLANTA DE LA INCIDENCIA
        if (filtrosPlanta.plantaIds && filtrosPlanta.plantaIds.length > 0) {
            if (!filtrosPlanta.plantaIds.includes(incidencia.plantId)) {
                return res.status(403).json({
                    success: false,
                    message: "No tienes acceso a la planta de esta incidencia"
                });
            }
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
        const { filtrosPlanta = {} } = req;
        console.log('🎯 [PDF DEBUG] Iniciando generación de PDF para incidencia:', id);

        // Obtener datos completos
        const incidencia = await Incidencia.buscarCompletaPorId(id);
        
        if (!incidencia) {
            return res.status(404).json({ success: false, message: "Incidencia no encontrada" });
        }
        
        if (filtrosPlanta.plantaIds && filtrosPlanta.plantaIds.length > 0) {
            if (!filtrosPlanta.plantaIds.includes(incidencia.plantId)) {
                return res.status(403).json({
                    success: false,
                    message: "No tienes acceso al reporte de esta incidencia"
                });
            }
        }

        // Crear documento PDF
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'A4',
            bufferPages: true
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

        // =========== FUNCIÓN AUXILIAR PARA VERIFICAR ESPACIO ===========
        const verificarEspacio = (alturaNecesaria) => {
            if (doc.y + alturaNecesaria > 750) { // 750 es cerca del final de página A4
                doc.addPage();
                return 50; // Retorna nueva posición Y
            }
            return doc.y;
        };

        // =========== PORTADA / PÁGINA 1 ===========
        
        // ✅ ENCABEZADO CON TÍTULO
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('REPORTE DE INCIDENCIA', {
               align: 'center',
               y: 80
           });
        
        // Línea decorativa
        doc.moveTo(100, 120)
           .lineTo(500, 120)
           .lineWidth(2)
           .stroke('#2c5aa0');
        
        // ✅ INFORMACIÓN BÁSICA - MEJOR FORMATEADA
        let yPos = 150;
        
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('INFORMACIÓN BÁSICA', 50, yPos);
        
        yPos += 30;
        
        // Primera columna
        doc.fontSize(11)
           .font('Helvetica');
        
        doc.text(`ID de Incidencia:`, 50, yPos);
        doc.font('Helvetica-Bold')
           .text(` ${incidencia.id}`, 150, yPos);
        
        yPos += 18;
        doc.font('Helvetica')
           .text(`Título:`, 50, yPos);
        doc.font('Helvetica-Bold')
           .text(` ${incidencia.titulo}`, 150, yPos, { width: 180 });
        
        yPos += 18;
        doc.font('Helvetica')
           .text(`Planta:`, 50, yPos);
        doc.font('Helvetica-Bold')
           .text(` ${incidencia.plantaNombre}`, 150, yPos);
        
        yPos += 18;
        doc.font('Helvetica')
           .text(`Reportado por:`, 50, yPos);
        doc.font('Helvetica-Bold')
           .text(` ${incidencia.usuarioNombre}`, 150, yPos);
        
        // Segunda columna
        let yPosCol2 = 150 + 30;
        
        doc.font('Helvetica')
           .text(`Estado:`, 300, yPosCol2);
        doc.font('Helvetica-Bold')
           .fillColor(incidencia.estado === 'resuelto' ? '#4CAF50' : '#FF9800')
           .text(` ${incidencia.estado.toUpperCase()}`, 350, yPosCol2);
        
        yPosCol2 += 18;
        doc.fillColor('#000000')
           .font('Helvetica')
           .text(`Fecha de reporte:`, 300, yPosCol2);
        doc.font('Helvetica-Bold')
           .text(` ${new Date(incidencia.fechaReporte).toLocaleDateString('es-ES')}`, 400, yPosCol2);
        
        if (incidencia.estado === 'resuelto' && incidencia.fechaResolucion) {
            yPosCol2 += 18;
            doc.font('Helvetica')
               .text(`Fecha de resolución:`, 300, yPosCol2);
            doc.font('Helvetica-Bold')
               .text(` ${new Date(incidencia.fechaResolucion).toLocaleDateString('es-ES')}`, 430, yPosCol2);
        }
        
        yPos = Math.max(yPos, yPosCol2) + 30;
        doc.fillColor('#000000');

        // ✅ DESCRIPCIÓN DEL PROBLEMA
        yPos = verificarEspacio(60);
        
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .text('DESCRIPCIÓN DEL PROBLEMA:', 50, yPos);
        
        yPos += 25;
        
        doc.font('Helvetica')
           .fontSize(10)
           .text(incidencia.descripcion, 50, yPos, { 
               width: 500, 
               align: 'justify',
               lineGap: 4
           });
        
        // Calcular altura dinámica
        const lineasDescripcion = Math.ceil(incidencia.descripcion.length / 85);
        yPos += (lineasDescripcion * 12) + 20;

        // ✅ RESUMEN DEL TRABAJO REALIZADO
        if (incidencia.resumenTrabajo) {
            yPos = verificarEspacio(60);
            
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('RESUMEN DEL TRABAJO REALIZADO:', 50, yPos);
            
            yPos += 25;
            
            doc.font('Helvetica')
               .fontSize(10)
               .text(incidencia.resumenTrabajo, 50, yPos, { 
                   width: 500, 
                   align: 'justify',
                   lineGap: 4
               });
        }

        // =========== FOTOS ANTES DEL TRABAJO ===========
        const fotosAntes = incidencia.fotos?.filter(foto => foto.tipo === 'antes') || [];
        if (fotosAntes.length > 0) {
            doc.addPage();
            
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text('FOTOS ANTES DEL TRABAJO', 50, 50, { align: 'center' });
            
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
                            height: 250,
                            fit: [400, 250]
                        });
                        fotoY += 260;
                    } else {
                        doc.fontSize(9)
                           .font('Helvetica')
                           .fillColor('#666666')
                           .text(`[Imagen no disponible]`, 50, fotoY);
                        fotoY += 20;
                    }
                } catch (imageError) {
                    console.log('❌ Error al cargar imagen:', imageError);
                    fotoY += 20;
                }
                
                fotoY += 10; // Espacio entre fotos
            });
        }

        // =========== FOTOS DESPUÉS DEL TRABAJO ===========
        const fotosDespues = incidencia.fotos?.filter(foto => foto.tipo === 'despues') || [];
        if (fotosDespues.length > 0) {
            doc.addPage();
            
            doc.fontSize(16)
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
                
                try {
                    if (foto.datos_imagen) {
                        doc.image(foto.datos_imagen, 50, fotoY, { 
                            width: 400,
                            height: 250,
                            fit: [400, 250]
                        });
                        fotoY += 260;
                    } else {
                        doc.fontSize(9)
                           .font('Helvetica')
                           .fillColor('#666666')
                           .text(`[Imagen no disponible]`, 50, fotoY);
                        fotoY += 20;
                    }
                } catch (imageError) {
                    console.log('❌ Error al cargar imagen:', imageError);
                    fotoY += 20;
                }
                
                fotoY += 10;
            });
        }

        // =========== MATERIALES UTILIZADOS ===========
        if (incidencia.materiales && incidencia.materiales.length > 0) {
            doc.addPage();
            
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text('MATERIALES UTILIZADOS', 50, 50, { align: 'center' });
            
            let materialY = 80;
            
            // Encabezados de tabla con fondo
            doc.rect(50, materialY, 500, 20)
               .fill('#f0f0f0')
               .stroke('#cccccc');
            
            doc.font('Helvetica-Bold')
               .fontSize(10)
               .fillColor('#000000')
               .text('Material', 55, materialY + 5)
               .text('Cantidad', 250, materialY + 5)
               .text('Costo Unitario', 350, materialY + 5)
               .text('Subtotal', 450, materialY + 5);
            
            materialY += 25;
            let totalCosto = 0;
            
            // Filas de materiales
            doc.font('Helvetica')
               .fontSize(9);
               
            incidencia.materiales.forEach((material, index) => {
                // Alternar colores de fila
                if (index % 2 === 0) {
                    doc.rect(50, materialY - 2, 500, 20)
                       .fill('#fafafa');
                }
                
                const materialNombre = material.materialNombre || material.material_nombre;
                const subtotal = material.cantidad * material.costo;
                totalCosto += subtotal;
                
                doc.fillColor('#000000')
                   .text(materialNombre, 55, materialY, { width: 180 })
                   .text(`${material.cantidad} ${material.unidad}`, 250, materialY)
                   .text(`$${material.costo.toLocaleString('es-CL')}`, 350, materialY)
                   .text(`$${subtotal.toLocaleString('es-CL')}`, 450, materialY);
                
                materialY += 20;
            });

            // Total
            materialY += 10;
            doc.moveTo(50, materialY).lineTo(550, materialY).stroke();
            materialY += 15;
            
            doc.font('Helvetica-Bold')
               .fontSize(11)
               .fillColor('#2c5aa0')
               .text('TOTAL:', 350, materialY)
               .text(`$${totalCosto.toLocaleString('es-CL')}`, 450, materialY);
        }

        // =========== PÁGINA FINAL CON RESUMEN Y FIRMA ===========
        doc.addPage();
        
        // ✅ RESUMEN ESTADÍSTICO
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('RESUMEN ESTADÍSTICO', 50, 50, { align: 'center' });
        
        let statsY = 100;
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#000000');
        
        // Lista con viñetas
        const bullet = '• ';
        const bulletWidth = 10;
        
        doc.text(bullet, 50, statsY);
        doc.text(`Total de fotos (antes): ${fotosAntes.length}`, 50 + bulletWidth, statsY);
        
        statsY += 25;
        doc.text(bullet, 50, statsY);
        doc.text(`Total de fotos (después): ${fotosDespues.length}`, 50 + bulletWidth, statsY);
        
        statsY += 25;
        doc.text(bullet, 50, statsY);
        doc.text(`Total de materiales utilizados: ${incidencia.materiales?.length || 0}`, 50 + bulletWidth, statsY);
        
        if (incidencia.materiales && incidencia.materiales.length > 0) {
            const costoTotal = incidencia.materiales.reduce((total, material) => 
                total + (material.cantidad * material.costo), 0
            );
            statsY += 25;
            doc.text(bullet, 50, statsY);
            doc.text(`Costo total en materiales: $${costoTotal.toLocaleString('es-CL')}`, 50 + bulletWidth, statsY);
        }
        
        if (incidencia.fechaReporte && incidencia.fechaResolucion) {
            statsY += 25;
            doc.text(bullet, 50, statsY);
            doc.text(`Tiempo total de resolución: ${calcularTiempoResolucion(incidencia)}`, 50 + bulletWidth, statsY);
        }

        // ✅ FIRMA Y FECHA
        const firmaY = statsY + 60;
        
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .text('FIRMA DEL TÉCNICO RESPONSABLE', 50, firmaY);
        
        // Línea para firma
        doc.moveTo(50, firmaY + 30).lineTo(250, firmaY + 30).stroke();
        
        // Fecha de generación
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor('#666666')
           .text(`Documento generado el: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 
                 50, firmaY + 50);

        // ✅ FOOTER CON NÚMERO DE PÁGINA
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            
            // Footer
            doc.fontSize(8)
               .font('Helvetica')
               .fillColor('#999999')
               .text(
                   `Reporte Incidencia #${incidencia.id} - Página ${i + 1} de ${pages.count}`,
                   50, 800, // Posición en la parte inferior
                   { align: 'center' }
               );
        }

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

// Función auxiliar para calcular tiempo de resolución
function calcularTiempoResolucion(incidencia) {
    if (!incidencia.fechaReporte || !incidencia.fechaResolucion) return 'N/A';
    
    const inicio = new Date(incidencia.fechaReporte);
    const fin = new Date(incidencia.fechaResolucion);
    const diferencia = fin - inicio;
    
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
    
    if (horas === 0) {
        return `${minutos} minutos`;
    } else if (horas === 1) {
        return `${horas} hora y ${minutos} minutos`;
    } else {
        return `${horas} horas y ${minutos} minutos`;
    }
}


