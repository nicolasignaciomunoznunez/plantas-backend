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
        
        console.log('🎯 [PDF] Generando PDF para incidencia:', id);
        console.log('🔄 [PDF] VERSIÓN FINAL - Con nombre de materiales');

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

        // =========== FUNCIÓN PARA LIMPIAR HTML ===========
        const limpiarTexto = (texto) => {
            if (!texto || typeof texto !== 'string') return '';
            
            let limpio = texto.replace(/<[^>]*>/g, '');
            limpio = limpio.replace(/\s+/g, ' ').trim();
            return limpio;
        };

        // DEBUG: Verificar estructura de materiales
        console.log('🔍 [DEBUG] Estructura de materiales recibida:');
        if (incidencia.materiales && incidencia.materiales.length > 0) {
            incidencia.materiales.forEach((mat, idx) => {
                console.log(`  Material ${idx + 1}:`, {
                    objeto_completo: mat,
                    nombre_directo: mat.nombre,
                    materialNombre: mat.materialNombre,
                    material_nombre: mat.material_nombre,
                    keys: Object.keys(mat)
                });
            });
        }

        // Crear documento PDF
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'A4',
            bufferPages: true
        });
        
        // Configurar headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=reporte-${id}.pdf`);
        
        // Pipe el PDF a la respuesta
        doc.pipe(res);

        // =========== PÁGINA 1: INFORMACIÓN BÁSICA ===========
        
        // TÍTULO PRINCIPAL
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('REPORTE DE INCIDENCIA', 50, 50, { align: 'center' });
        
        // Línea decorativa
        doc.moveTo(70, 80)
           .lineTo(530, 80)
           .lineWidth(1)
           .stroke('#2c5aa0');
        
        // SECCIÓN: INFORMACIÓN BÁSICA
        let yPos = 110;
        
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('INFORMACIÓN BÁSICA', 50, yPos);
        
        yPos += 30;
        
        // PRIMERA FILA: ID y Estado
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#666666')
           .text('ID de Incidencia:', 50, yPos);
        
        doc.font('Helvetica-Bold')
           .fillColor('#000000')
           .text(` ${incidencia.id}`, 150, yPos);
        
        doc.font('Helvetica')
           .fillColor('#666666')
           .text('Estado:', 350, yPos);
        
        doc.font('Helvetica-Bold')
           .fillColor(incidencia.estado === 'resuelto' ? '#4CAF50' : '#FF9800')
           .text(` ${incidencia.estado.toUpperCase()}`, 400, yPos);
        
        yPos += 22;
        
        // SEGUNDA FILA: Título
        doc.font('Helvetica')
           .fillColor('#666666')
           .text('Título:', 50, yPos);
        
        const tituloLimpio = limpiarTexto(incidencia.titulo);
        doc.font('Helvetica-Bold')
           .fillColor('#000000')
           .text(` ${tituloLimpio}`, 150, yPos, { 
               width: 350,
               lineGap: 3 
           });
        
        const tituloLineas = Math.ceil(tituloLimpio.length / 45);
        yPos += (tituloLineas * 14) + 10;
        
        // TERCERA FILA: Planta y Reportado por
        doc.font('Helvetica')
           .fillColor('#666666')
           .text('Planta:', 50, yPos);
        
        doc.font('Helvetica-Bold')
           .fillColor('#000000')
           .text(` ${limpiarTexto(incidencia.plantaNombre)}`, 150, yPos);
        
        doc.font('Helvetica')
           .fillColor('#666666')
           .text('Reportado por:', 350, yPos);
        
        doc.font('Helvetica-Bold')
           .fillColor('#000000')
           .text(` ${limpiarTexto(incidencia.usuarioNombre)}`, 450, yPos);
        
        yPos += 22;
        
        // CUARTA FILA: Fechas
        doc.font('Helvetica')
           .fillColor('#666666')
           .text('Fecha de reporte:', 50, yPos);
        
        doc.font('Helvetica-Bold')
           .fillColor('#000000')
           .text(` ${new Date(incidencia.fechaReporte).toLocaleDateString('es-ES')}`, 150, yPos);
        
        if (incidencia.estado === 'resuelto' && incidencia.fechaResolucion) {
            doc.font('Helvetica')
               .fillColor('#666666')
               .text('Fecha de resolución:', 350, yPos);
            doc.font('Helvetica-Bold')
               .fillColor('#000000')
               .text(` ${new Date(incidencia.fechaResolucion).toLocaleDateString('es-ES')}`, 480, yPos);
        }
        
        yPos += 35;
        
        // DESCRIPCIÓN DEL PROBLEMA
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor('#2c5aa0')
           .text('DESCRIPCIÓN DEL PROBLEMA:', 50, yPos);
        
        yPos += 20;
        
        const descripcionLimpia = limpiarTexto(incidencia.descripcion) || 'Sin descripción';
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor('#333333')
           .text(descripcionLimpia, 50, yPos, { 
               width: 500, 
               lineGap: 6
           });
        
        const descLineas = Math.ceil(descripcionLimpia.length / 70);
        yPos += (descLineas * 13) + 30;
        
        // RESUMEN DEL TRABAJO REALIZADO
        if (incidencia.resumenTrabajo) {
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .fillColor('#2c5aa0')
               .text('RESUMEN DEL TRABAJO REALIZADO:', 50, yPos);
            
            yPos += 20;
            
            const resumenLimpio = limpiarTexto(incidencia.resumenTrabajo);
            doc.font('Helvetica')
               .fontSize(10)
               .fillColor('#333333')
               .text(resumenLimpio, 50, yPos, { 
                   width: 500, 
                   lineGap: 6
               });
            
            const resumenLineas = Math.ceil(resumenLimpio.length / 70);
            yPos += (resumenLineas * 13) + 40;
        }
        
        // =========== FOTOS ===========
        const fotosAntes = incidencia.fotos?.filter(foto => foto.tipo === 'antes') || [];
        const fotosDespues = incidencia.fotos?.filter(foto => foto.tipo === 'despues') || [];
        
        const agregarFotos = (titulo, fotos) => {
            if (fotos.length === 0) return yPos;
            
            if (yPos > 600) {
                doc.addPage();
                yPos = 50;
            } else {
                yPos += 10;
            }
            
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text(titulo, 50, yPos);
            
            yPos += 25;
            
            fotos.forEach((foto, index) => {
                if (yPos > 650) {
                    doc.addPage();
                    yPos = 50;
                    doc.fontSize(14)
                       .font('Helvetica-Bold')
                       .fillColor('#2c5aa0')
                       .text(`${titulo} (continuación)`, 50, yPos);
                    yPos += 25;
                }
                
                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .fillColor('#000000')
                   .text(`Foto ${index + 1}: ${limpiarTexto(foto.descripcion) || 'Sin descripción'}`, 50, yPos);
                
                yPos += 15;
                
                try {
                    if (foto.datos_imagen && Buffer.isBuffer(foto.datos_imagen) && foto.datos_imagen.length > 100) {
                        doc.image(foto.datos_imagen, 50, yPos, { 
                            width: 300,
                            height: 200,
                            fit: [300, 200]
                        });
                        yPos += 210;
                    } else {
                        doc.rect(50, yPos, 300, 200)
                           .fill('#f5f5f5')
                           .stroke('#cccccc');
                        
                        doc.fontSize(10)
                           .font('Helvetica')
                           .fillColor('#666666')
                           .text('Imagen no disponible', 150, yPos + 95);
                        
                        yPos += 210;
                    }
                } catch (imageError) {
                    console.log('❌ Error al procesar imagen:', imageError.message);
                    yPos += 210;
                }
                
                yPos += 25;
            });
            
            return yPos;
        };
        
        if (fotosAntes.length > 0) {
            yPos = agregarFotos('FOTOS ANTES DEL TRABAJO', fotosAntes);
        }
        
        if (fotosDespues.length > 0) {
            yPos = agregarFotos('FOTOS DESPUÉS DEL TRABAJO', fotosDespues);
        }
        
        // =========== MATERIALES UTILIZADOS ===========
        if (incidencia.materiales && incidencia.materiales.length > 0) {
            if (yPos > 550) {
                doc.addPage();
                yPos = 50;
            } else {
                yPos += 20;
            }
            
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text('MATERIALES UTILIZADOS', 50, yPos);
            
            yPos += 30;
            
            // Encabezados de tabla
            doc.rect(50, yPos, 500, 25)
               .fill('#f0f0f0')
               .stroke('#cccccc');
            
            doc.font('Helvetica-Bold')
               .fontSize(10)
               .fillColor('#000000')
               .text('Material', 55, yPos + 8)
               .text('Cantidad', 250, yPos + 8)
               .text('Costo Unitario', 350, yPos + 8)
               .text('Subtotal', 450, yPos + 8);
            
            yPos += 30;
            let totalCosto = 0;
            
            // CORRECCIÓN PRINCIPAL: Obtener nombre del material correctamente
            doc.font('Helvetica')
               .fontSize(9);
               
            incidencia.materiales.forEach((material, index) => {
                // Alternar colores de fila
                if (index % 2 === 0) {
                    doc.rect(50, yPos - 5, 500, 20)
                       .fill('#fafafa');
                }
                
                // OBTENER NOMBRE DEL MATERIAL - PROBANDO TODAS LAS POSIBILIDADES
                let nombreMaterial = '';
                
                // Intentar diferentes propiedades en orden de prioridad
                if (material.nombre && material.nombre.trim() !== '') {
                    nombreMaterial = material.nombre;
                } else if (material.materialNombre && material.materialNombre.trim() !== '') {
                    nombreMaterial = material.materialNombre;
                } else if (material.material_nombre && material.material_nombre.trim() !== '') {
                    nombreMaterial = material.material_nombre;
                } else if (material.descripcion && material.descripcion.trim() !== '') {
                    nombreMaterial = material.descripcion;
                } else if (material.Material && material.Material.nombre) {
                    nombreMaterial = material.Material.nombre;
                } else {
                    nombreMaterial = 'Material sin nombre';
                }
                
                // Limpiar el nombre
                nombreMaterial = limpiarTexto(nombreMaterial);
                
                // Obtener cantidad y costo
                const cantidad = parseFloat(material.cantidad) || 0;
                const costoUnitario = parseFloat(material.costo) || 0;
                const subtotal = cantidad * costoUnitario;
                totalCosto += subtotal;
                
                // Obtener unidad
                let unidad = 'unidad';
                if (material.unidad && material.unidad.trim() !== '') {
                    unidad = limpiarTexto(material.unidad);
                } else if (material.unidad_medida && material.unidad_medida.trim() !== '') {
                    unidad = limpiarTexto(material.unidad_medida);
                }
                
                // Mostrar en la tabla
                doc.fillColor('#000000')
                   .text(nombreMaterial, 55, yPos, { width: 180 })
                   .text(`${cantidad} ${unidad}`, 250, yPos)
                   .text(`$${costoUnitario.toLocaleString('es-CL')}`, 350, yPos)
                   .text(`$${subtotal.toLocaleString('es-CL')}`, 450, yPos);
                
                yPos += 20;
            });

            // Total
            yPos += 10;
            doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
            yPos += 15;
            
            doc.font('Helvetica-Bold')
               .fontSize(11)
               .fillColor('#2c5aa0')
               .text('TOTAL:', 350, yPos)
               .text(`$${totalCosto.toLocaleString('es-CL')}`, 450, yPos);
            
            yPos += 30;
        }
        
        // =========== RESUMEN FINAL ===========
        if (yPos > 600) {
            doc.addPage();
            yPos = 50;
        } else {
            yPos += 20;
        }
        
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('RESUMEN FINAL', 50, yPos);
        
        yPos += 30;
        
        doc.fontSize(11)
           .font('Helvetica')
           .fillColor('#000000');
        
        doc.text(`• Total de fotos (antes): ${fotosAntes.length}`, 50, yPos);
        yPos += 20;
        
        doc.text(`• Total de fotos (después): ${fotosDespues.length}`, 50, yPos);
        yPos += 20;
        
        doc.text(`• Total de materiales utilizados: ${incidencia.materiales?.length || 0}`, 50, yPos);
        yPos += 20;
        
        if (incidencia.materiales && incidencia.materiales.length > 0) {
            const costoTotal = incidencia.materiales.reduce((total, material) => {
                const cantidad = parseFloat(material.cantidad) || 0;
                const costo = parseFloat(material.costo) || 0;
                return total + (cantidad * costo);
            }, 0);
            
            doc.text(`• Costo total en materiales: $${costoTotal.toLocaleString('es-CL')}`, 50, yPos);
            yPos += 20;
        }
        
        if (incidencia.fechaReporte && incidencia.fechaResolucion) {
            const tiempoResolucion = calcularTiempoResolucion(incidencia);
            doc.text(`• Tiempo total de resolución: ${tiempoResolucion}`, 50, yPos);
            yPos += 30;
        } else {
            yPos += 10;
        }
        
        // FIRMA
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .text('FIRMA DEL TÉCNICO RESPONSABLE', 50, yPos);
        
        yPos += 30;
        doc.moveTo(50, yPos).lineTo(250, yPos).stroke();
        
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor('#666666')
           .text(`Reporte generado el ${new Date().toLocaleDateString('es-ES')}`, 
                 50, yPos + 20);

        // =========== FOOTER ===========
        const pages = doc.bufferedPageRange();
        
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            
            doc.fontSize(8)
               .font('Helvetica')
               .fillColor('#999999')
               .text(
                   `Página ${i + 1} de ${pages.count}`,
                   doc.page.width - 100,
                   doc.page.height - 40
               );
        }

        // FINALIZAR DOCUMENTO
        doc.end();
        console.log('✅ [PDF] PDF PERFECTO generado - Con nombres de materiales');

    } catch (error) {
        console.log('❌ [PDF] ERROR:', error);
        
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
    
    const minutos = Math.floor(diferencia / (1000 * 60));
    const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
    
    if (minutos === 0) {
        return `${segundos} segundos`;
    } else if (minutos === 1) {
        return `${minutos} minuto`;
    } else {
        return `${minutos} minutos`;
    }
}