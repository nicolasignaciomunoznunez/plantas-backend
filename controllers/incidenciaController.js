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
        console.log('🔄 [PDF] Usando controlador PDFKit corregido');

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
            
            // Remover todas las etiquetas HTML
            let limpio = texto.replace(/<[^>]*>/g, '');
            
            // Reemplazar entidades HTML comunes
            const entidades = {
                '&nbsp;': ' ',
                '&amp;': '&',
                '&lt;': '<',
                '&gt;': '>',
                '&quot;': '"',
                '&#39;': "'",
                '&#x27;': "'",
                '&#x2F;': '/',
                '&#xA0;': ' ',
                '&euro;': '€',
                '&copy;': '©',
                '&reg;': '®',
                '&trade;': '™',
                '&pound;': '£',
                '&yen;': '¥',
                '&cent;': '¢'
            };
            
            Object.keys(entidades).forEach(entidad => {
                limpio = limpio.replace(new RegExp(entidad, 'gi'), entidades[entidad]);
            });
            
            // Remover espacios múltiples
            limpio = limpio.replace(/\s+/g, ' ').trim();
            
            return limpio;
        };

        // DEBUG: Verificar datos antes de limpiar
        console.log('🔍 [PDF DEBUG] Verificando datos para limpieza:');
        console.log('🔍 Título (antes):', incidencia.titulo);
        console.log('🔍 Título (después):', limpiarTexto(incidencia.titulo));
        
        if (incidencia.materiales?.length > 0) {
            console.log('🔍 Materiales para limpiar:');
            incidencia.materiales.forEach((mat, idx) => {
                console.log(`  Material ${idx}:`, {
                    antes: mat.nombre || mat.materialNombre,
                    despues: limpiarTexto(mat.nombre || mat.materialNombre),
                    tieneHTML: (mat.nombre || mat.materialNombre)?.includes('<') ? 'SÍ' : 'NO'
                });
            });
        }

        // Crear documento PDF
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'A4',
            bufferPages: true
        });
        
        // Configurar headers para evitar caché
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=reporte-${id}-${Date.now()}.pdf`);
        res.setHeader('X-PDF-Generator', 'PDFKit-Corregido');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
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

        // =========== FUNCIONES AUXILIARES ===========
        const verificarEspacio = (alturaNecesaria) => {
            if (doc.y + alturaNecesaria > doc.page.height - 50) {
                doc.addPage();
                return 50;
            }
            return doc.y;
        };

        // =========== PÁGINA 1: INFORMACIÓN BÁSICA ===========
        
        // TÍTULO PRINCIPAL
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('REPORTE DE INCIDENCIA', {
               align: 'center',
               y: 60
           });
        
        // Línea decorativa
        doc.moveTo(80, 85)
           .lineTo(520, 85)
           .lineWidth(2)
           .stroke('#2c5aa0');
        
        // INFORMACIÓN BÁSICA
        let yPos = 110;
        
        doc.fontSize(16)
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
        
        yPos += 22;
        doc.font('Helvetica')
           .text(`Título:`, 50, yPos);
        doc.font('Helvetica-Bold')
           .text(` ${limpiarTexto(incidencia.titulo)}`, 150, yPos, { 
               width: 220,
               lineGap: 3 
           });
        
        // Calcular altura del título para ajustar posición
        const tituloAltura = Math.ceil(limpiarTexto(incidencia.titulo).length / 40) * 14;
        yPos += Math.max(tituloAltura, 22);
        
        doc.font('Helvetica')
           .text(`Planta:`, 50, yPos);
        doc.font('Helvetica-Bold')
           .text(` ${limpiarTexto(incidencia.plantaNombre)}`, 150, yPos);
        
        yPos += 22;
        doc.font('Helvetica')
           .text(`Reportado por:`, 50, yPos);
        doc.font('Helvetica-Bold')
           .text(` ${limpiarTexto(incidencia.usuarioNombre)}`, 150, yPos);
        
        // Segunda columna
        let yPosCol2 = 110 + 30;
        
        doc.font('Helvetica')
           .text(`Estado:`, 350, yPosCol2);
        doc.font('Helvetica-Bold')
           .fillColor(incidencia.estado === 'resuelto' ? '#4CAF50' : '#FF9800')
           .text(` ${incidencia.estado.toUpperCase()}`, 410, yPosCol2);
        
        yPosCol2 += 22;
        doc.fillColor('#000000')
           .font('Helvetica')
           .text(`Fecha de reporte:`, 350, yPosCol2);
        doc.font('Helvetica-Bold')
           .text(` ${new Date(incidencia.fechaReporte).toLocaleDateString('es-ES')}`, 460, yPosCol2);
        
        if (incidencia.estado === 'resuelto' && incidencia.fechaResolucion) {
            yPosCol2 += 22;
            doc.font('Helvetica')
               .text(`Fecha de resolución:`, 350, yPosCol2);
            doc.font('Helvetica-Bold')
               .text(` ${new Date(incidencia.fechaResolucion).toLocaleDateString('es-ES')}`, 480, yPosCol2);
        }
        
        yPos = Math.max(yPos, yPosCol2) + 35;
        
        // DESCRIPCIÓN DEL PROBLEMA - CON MÁS ESPACIO
        yPos = verificarEspacio(80);
        
        doc.font('Helvetica-Bold')
           .fontSize(14)
           .fillColor('#2c5aa0')
           .text('DESCRIPCIÓN DEL PROBLEMA:', 50, yPos);
        
        yPos += 25;
        
        doc.font('Helvetica')
           .fontSize(11)
           .fillColor('#333333')
           .text(limpiarTexto(incidencia.descripcion) || 'Sin descripción', 50, yPos, { 
               width: 500, 
               align: 'left',
               lineGap: 6,
               paragraphGap: 10
           });
        
        // Calcular altura dinámica para descripción
        const descripcionTexto = limpiarTexto(incidencia.descripcion) || '';
        const lineasDescripcion = Math.ceil(descripcionTexto.length / 70);
        yPos += (lineasDescripcion * 16) + 40;

        // RESUMEN DEL TRABAJO REALIZADO
        if (incidencia.resumenTrabajo) {
            yPos = verificarEspacio(80);
            
            doc.font('Helvetica-Bold')
               .fontSize(14)
               .fillColor('#2c5aa0')
               .text('RESUMEN DEL TRABAJO REALIZADO:', 50, yPos);
            
            yPos += 25;
            
            doc.font('Helvetica')
               .fontSize(11)
               .fillColor('#333333')
               .text(limpiarTexto(incidencia.resumenTrabajo), 50, yPos, { 
                   width: 500, 
                   align: 'left',
                   lineGap: 6,
                   paragraphGap: 10
               });
            
            const resumenTexto = limpiarTexto(incidencia.resumenTrabajo);
            const lineasResumen = Math.ceil(resumenTexto.length / 70);
            yPos += (lineasResumen * 16) + 30;
        }

        // =========== FOTOS ANTES DEL TRABAJO ===========
        const fotosAntes = incidencia.fotos?.filter(foto => foto.tipo === 'antes') || [];
        const fotosDespues = incidencia.fotos?.filter(foto => foto.tipo === 'despues') || [];
        
        // Solo agregar página para fotos si hay fotos
        if (fotosAntes.length > 0 || fotosDespues.length > 0) {
            doc.addPage();
            
            let currentPageY = 50;
            
            // FOTOS ANTES
            if (fotosAntes.length > 0) {
                doc.fontSize(16)
                   .font('Helvetica-Bold')
                   .fillColor('#2c5aa0')
                   .text('FOTOS ANTES DEL TRABAJO', 50, currentPageY, { align: 'center' });
                
                currentPageY += 30;
                
                fotosAntes.forEach((foto, index) => {
                    // Verificar si necesitamos nueva página
                    if (currentPageY > 700) {
                        doc.addPage();
                        currentPageY = 50;
                        doc.fontSize(16)
                           .font('Helvetica-Bold')
                           .fillColor('#2c5aa0')
                           .text('FOTOS ANTES DEL TRABAJO (continuación)', 50, currentPageY, { align: 'center' });
                        currentPageY += 30;
                    }
                    
                    // Título de la foto
                    doc.fontSize(11)
                       .font('Helvetica-Bold')
                       .fillColor('#000000')
                       .text(`Foto ${index + 1}: ${limpiarTexto(foto.descripcion) || 'Sin descripción'}`, 50, currentPageY);
                    
                    currentPageY += 18;
                    
                    // Procesar imagen
                    try {
                        if (foto.datos_imagen && Buffer.isBuffer(foto.datos_imagen) && foto.datos_imagen.length > 100) {
                            doc.image(foto.datos_imagen, 50, currentPageY, { 
                                width: 400,
                                height: 250,
                                fit: [400, 250],
                                align: 'center'
                            });
                            currentPageY += 260;
                        } else {
                            // Placeholder si no hay imagen
                            doc.rect(50, currentPageY, 400, 250)
                               .fill('#f5f5f5')
                               .stroke('#cccccc');
                            
                            doc.fontSize(10)
                               .font('Helvetica')
                               .fillColor('#666666')
                               .text('Imagen no disponible', 180, currentPageY + 120);
                            
                            currentPageY += 260;
                        }
                    } catch (imageError) {
                        console.log('❌ Error al procesar imagen:', imageError.message);
                        currentPageY += 260;
                    }
                    
                    currentPageY += 25;
                });
                
                // Espacio entre secciones de fotos
                currentPageY += 20;
            }
            
            // FOTOS DESPUÉS
            if (fotosDespues.length > 0) {
                // Verificar si necesitamos nueva página para fotos después
                if (currentPageY > 500) {
                    doc.addPage();
                    currentPageY = 50;
                }
                
                doc.fontSize(16)
                   .font('Helvetica-Bold')
                   .fillColor('#2c5aa0')
                   .text('FOTOS DESPUÉS DEL TRABAJO', 50, currentPageY, { align: 'center' });
                
                currentPageY += 30;
                
                fotosDespues.forEach((foto, index) => {
                    if (currentPageY > 700) {
                        doc.addPage();
                        currentPageY = 50;
                        doc.fontSize(16)
                           .font('Helvetica-Bold')
                           .fillColor('#2c5aa0')
                           .text('FOTOS DESPUÉS DEL TRABAJO (continuación)', 50, currentPageY, { align: 'center' });
                        currentPageY += 30;
                    }
                    
                    doc.fontSize(11)
                       .font('Helvetica-Bold')
                       .fillColor('#000000')
                       .text(`Foto ${index + 1}: ${limpiarTexto(foto.descripcion) || 'Sin descripción'}`, 50, currentPageY);
                    
                    currentPageY += 18;
                    
                    try {
                        if (foto.datos_imagen && Buffer.isBuffer(foto.datos_imagen) && foto.datos_imagen.length > 100) {
                            doc.image(foto.datos_imagen, 50, currentPageY, { 
                                width: 400,
                                height: 250,
                                fit: [400, 250]
                            });
                            currentPageY += 260;
                        } else {
                            doc.rect(50, currentPageY, 400, 250)
                               .fill('#f5f5f5')
                               .stroke('#cccccc');
                            
                            doc.fontSize(10)
                               .font('Helvetica')
                               .fillColor('#666666')
                               .text('Imagen no disponible', 180, currentPageY + 120);
                            
                            currentPageY += 260;
                        }
                    } catch (imageError) {
                        console.log('❌ Error al cargar imagen "después":', imageError);
                        currentPageY += 260;
                    }
                    
                    currentPageY += 25;
                });
            }
        }

        // =========== MATERIALES UTILIZADOS ===========
        if (incidencia.materiales && incidencia.materiales.length > 0) {
            // Solo agregar página nueva si ya estamos cerca del final
            if (doc.y > 600) {
                doc.addPage();
            }
            
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .fillColor('#2c5aa0')
               .text('MATERIALES UTILIZADOS', 50, doc.y + 20, { align: 'center' });
            
            let materialY = doc.y + 50;
            
            // Encabezados de tabla
            doc.rect(50, materialY, 500, 25)
               .fill('#f0f0f0')
               .stroke('#cccccc');
            
            doc.font('Helvetica-Bold')
               .fontSize(11)
               .fillColor('#000000')
               .text('Material', 55, materialY + 8)
               .text('Cantidad', 250, materialY + 8)
               .text('Costo Unitario', 350, materialY + 8)
               .text('Subtotal', 450, materialY + 8);
            
            materialY += 30;
            let totalCosto = 0;
            
            // Filas de materiales
            doc.font('Helvetica')
               .fontSize(10);
               
            incidencia.materiales.forEach((material, index) => {
                // Alternar colores de fila
                if (index % 2 === 0) {
                    doc.rect(50, materialY - 5, 500, 20)
                       .fill('#fafafa');
                }
                
                // Limpiar todos los campos
                const materialNombre = limpiarTexto(
                    material.materialNombre || 
                    material.material_nombre || 
                    material.nombre || 
                    'Sin nombre'
                );
                
                const cantidad = parseFloat(material.cantidad) || 0;
                const costoUnitario = parseFloat(material.costo) || 0;
                const subtotal = cantidad * costoUnitario;
                totalCosto += subtotal;
                
                // Mostrar campos limpios
                doc.fillColor('#000000')
                   .text(materialNombre.substring(0, 30), 55, materialY, { width: 180 })
                   .text(`${cantidad} ${limpiarTexto(material.unidad) || 'unidad'}`, 250, materialY)
                   .text(`$${costoUnitario.toLocaleString('es-CL')}`, 350, materialY)
                   .text(`$${subtotal.toLocaleString('es-CL')}`, 450, materialY);
                
                materialY += 20;
            });

            // Total
            materialY += 15;
            doc.moveTo(50, materialY).lineTo(550, materialY).stroke();
            materialY += 20;
            
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .fillColor('#2c5aa0')
               .text('TOTAL:', 350, materialY)
               .text(`$${totalCosto.toLocaleString('es-CL')}`, 450, materialY);
        }

        // =========== PÁGINA FINAL CON RESUMEN Y FIRMA ===========
        // Solo agregar página final si ya estamos cerca del final
        if (doc.y > 500) {
            doc.addPage();
        }
        
        // RESUMEN ESTADÍSTICO
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#2c5aa0')
           .text('RESUMEN ESTADÍSTICO', 50, doc.y + 20, { align: 'center' });
        
        let statsY = doc.y + 60;
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#000000');
        
        doc.text(`• Total de fotos (antes): ${fotosAntes.length}`, 50, statsY);
        
        statsY += 25;
        doc.text(`• Total de fotos (después): ${fotosDespues.length}`, 50, statsY);
        
        statsY += 25;
        doc.text(`• Total de materiales utilizados: ${incidencia.materiales?.length || 0}`, 50, statsY);
        
        if (incidencia.materiales && incidencia.materiales.length > 0) {
            const costoTotal = incidencia.materiales.reduce((total, material) => 
                total + ((parseFloat(material.cantidad) || 0) * (parseFloat(material.costo) || 0)), 0
            );
            statsY += 25;
            doc.text(`• Costo total en materiales: $${costoTotal.toLocaleString('es-CL')}`, 50, statsY);
        }
        
        if (incidencia.fechaReporte && incidencia.fechaResolucion) {
            statsY += 25;
            doc.text(`• Tiempo total de resolución: ${calcularTiempoResolucion(incidencia)}`, 50, statsY);
        }

        // FIRMA Y FECHA
        const firmaY = statsY + 60;
        
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .text('FIRMA DEL TÉCNICO RESPONSABLE', 50, firmaY);
        
        doc.moveTo(50, firmaY + 30).lineTo(250, firmaY + 30).stroke();
        
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor('#666666')
           .text(`Documento generado el: ${new Date().toLocaleDateString('es-ES')}`, 
                 50, firmaY + 50);

        // FOOTER CON NÚMERO DE PÁGINA
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            
            doc.fontSize(8)
               .font('Helvetica')
               .fillColor('#999999')
               .text(
                   `Reporte Incidencia #${incidencia.id} - Página ${i + 1} de ${pages.count}`,
                   50, doc.page.height - 30,
                   { align: 'center' }
               );
        }

        // FINALIZAR DOCUMENTO
        doc.end();
        console.log('✅ [PDF] PDF generado exitosamente');

    } catch (error) {
        console.log('❌ [PDF] ERROR:', error);
        console.log('❌ [PDF] Stack:', error.stack);
        
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