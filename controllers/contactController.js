import { EmailService } from '../services/BrevoService.js';

/**
 * Controlador para manejar el formulario de contacto
 */
export class ContactController {
  
  /**
   * Procesa y envía un mensaje de contacto
   */
  static async sendContactMessage(req, res) {
    try {
      console.log('📋 [CONTACTO] Iniciando procesamiento de mensaje...');
      
      // 1. Obtener y validar datos del cuerpo
      const { name, email, phone, comment } = req.body;
      
      console.log('📝 Datos recibidos:', { 
        name: name ? '✓' : '✗', 
        email: email ? '✓' : '✗', 
        phone: phone ? '✓' : '✗',
        comment: comment ? '✓' : '✗'
      });
      
      // 2. Validaciones básicas
      if (!name || !email || !phone || !comment) {
        console.log('❌ [CONTACTO] Campos faltantes:', {
          name: !name,
          email: !email,
          phone: !phone,
          comment: !comment
        });
        
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos: nombre, email, teléfono y mensaje.',
          errors: {
            name: !name ? 'El nombre es requerido' : null,
            email: !email ? 'El email es requerido' : null,
            phone: !phone ? 'El teléfono es requerido' : null,
            comment: !comment ? 'El mensaje es requerido' : null
          }
        });
      }
      
      // 3. Limpiar y validar email
      const cleanedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailRegex.test(cleanedEmail)) {
        console.log('❌ [CONTACTO] Email inválido:', cleanedEmail);
        return res.status(400).json({
          success: false,
          message: 'Por favor, ingresa un email válido.',
          field: 'email'
        });
      }
      
      // 4. Limpiar y validar teléfono (formato chileno)
      const cleanedPhone = phone.trim().replace(/\s+/g, '').replace(/\D/g, '');
      
      // Aceptar formatos: 9XXXXXXXX, 569XXXXXXXX, +569XXXXXXXX
      let formattedPhone = cleanedPhone;
      
      // Si empieza con 56 y tiene 11 dígitos, asumir formato 569XXXXXXXX
      if (cleanedPhone.startsWith('56') && cleanedPhone.length === 11) {
        formattedPhone = `+${cleanedPhone}`;
      }
      // Si empieza con 9 y tiene 9 dígitos, agregar +56
      else if (cleanedPhone.startsWith('9') && cleanedPhone.length === 9) {
        formattedPhone = `+56${cleanedPhone}`;
      }
      // Si tiene 12 dígitos, agregar +
      else if (cleanedPhone.length === 12) {
        formattedPhone = `+${cleanedPhone}`;
      }
      
      const phoneRegex = /^9[0-9]{8}$/;
      const cleanForValidation = formattedPhone.replace(/^\+56/, '').replace(/^56/, '');
      
      if (!phoneRegex.test(cleanForValidation)) {
        console.log('❌ [CONTACTO] Teléfono inválido:', phone, '->', formattedPhone, '->', cleanForValidation);
        return res.status(400).json({
          success: false,
          message: 'Por favor, ingresa un número de teléfono chileno válido. Ej: +56 9 1234 5678 o 9 1234 5678',
          field: 'phone',
          example: '+56912345678',
          debug: {
            original: phone,
            cleaned: cleanedPhone,
            formatted: formattedPhone,
            forValidation: cleanForValidation
          }
        });
      }
      
      // 5. Validar longitud del mensaje
      const cleanedComment = comment.trim();
      if (cleanedComment.length < 10) {
        console.log('❌ [CONTACTO] Mensaje muy corto:', cleanedComment.length, 'caracteres');
        return res.status(400).json({
          success: false,
          message: 'El mensaje debe tener al menos 10 caracteres.',
          field: 'comment',
          minLength: 10,
          currentLength: cleanedComment.length
        });
      }
      
      if (cleanedComment.length > 2000) {
        console.log('❌ [CONTACTO] Mensaje muy largo:', cleanedComment.length, 'caracteres');
        return res.status(400).json({
          success: false,
          message: 'El mensaje no debe exceder los 2000 caracteres.',
          field: 'comment',
          maxLength: 2000,
          currentLength: cleanedComment.length
        });
      }
      
      // 6. Preparar datos para el email
      const contactData = {
        name: name.trim(),
        email: cleanedEmail,
        phone: formattedPhone,
        comment: cleanedComment,
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      };
      
      console.log('✅ [CONTACTO] Datos validados y formateados:', {
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        commentLength: contactData.comment.length,
        timestamp: contactData.timestamp.toISOString()
      });
      
      // 7. Enviar email a la empresa usando BrevoService
      console.log('📤 [CONTACTO] Enviando email a la empresa...');
      const emailResult = await EmailService.sendContactFormEmail(contactData);
      
      if (!emailResult.success) {
        console.error('❌ [CONTACTO] Error al enviar email a la empresa:', emailResult.error);
        
        // Intentar respaldo simple
        try {
          console.log('⚠️ [CONTACTO] Intentando envío de respaldo...');
          const backupResult = await EmailService.sendEmail(
            process.env.CONTACT_EMAIL || 'contactoinfraexpert@gmail.com',
            `CONTACTO FALLBACK: ${contactData.name}`,
            `Nombre: ${contactData.name}\nEmail: ${contactData.email}\nTeléfono: ${contactData.phone}\nMensaje: ${contactData.comment}\n\n⚠️ Este es un mensaje de respaldo porque el formato HTML falló.`
          );
          
          if (backupResult.success) {
            console.log('✅ [CONTACTO] Email de respaldo enviado');
          }
        } catch (backupError) {
          console.error('❌ [CONTACTO] Error incluso en respaldo:', backupError.message);
        }
        
        return res.status(500).json({
          success: false,
          message: 'Hubo un problema técnico al enviar tu mensaje. Por favor, intenta nuevamente en unos minutos o contáctanos directamente por teléfono.',
          error: process.env.NODE_ENV === 'development' ? emailResult.error : undefined
        });
      }
      
      console.log('✅ [CONTACTO] Email enviado exitosamente a la empresa');
      console.log('   📧 Message ID:', emailResult.messageId);
      
      // 8. Enviar email de confirmación al usuario (opcional pero recomendado)
      let confirmationSent = false;
      try {
        console.log('📧 [CONTACTO] Enviando confirmación al usuario...');
        const confirmationResult = await EmailService.sendContactConfirmationEmail(contactData);
        
        if (confirmationResult.success) {
          confirmationSent = true;
          console.log('✅ [CONTACTO] Confirmación enviada al usuario');
        } else {
          console.log('⚠️ [CONTACTO] No se pudo enviar confirmación:', confirmationResult.error);
        }
      } catch (confirmationError) {
        console.log('⚠️ [CONTACTO] Error enviando confirmación:', confirmationError.message);
      }
      
      // 9. Registrar en consola (podrías guardar en DB aquí si quieres)
      console.log('📊 [CONTACTO] Mensaje procesado exitosamente:', {
        id: emailResult.messageId,
        name: contactData.name,
        email: contactData.email,
        confirmationSent: confirmationSent,
        time: new Date().toISOString()
      });
      
      // 10. Responder éxito al cliente
      res.status(200).json({
        success: true,
        message: '¡Mensaje enviado con éxito! Te contactaremos pronto.',
        data: {
          name: contactData.name,
          email: contactData.email,
          timestamp: contactData.timestamp,
          confirmationSent: confirmationSent
        },
        meta: {
          messageId: emailResult.messageId,
          serverTime: new Date().toISOString()
        }
      });
      
      console.log('🎉 [CONTACTO] Proceso completado exitosamente');
      
    } catch (error) {
      console.error('❌ [CONTACTO] Error inesperado en el controlador:', error);
      console.error('   Stack:', error.stack);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor. Por favor, intenta más tarde o contacta a soporte.',
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }
  
  /**
   * Endpoint de prueba para verificar que el servicio funciona
   */
  static async testEndpoint(req, res) {
    try {
      console.log('🧪 [CONTACTO] Test endpoint llamado');
      
      // Probar conexión SMTP
      const smtpTest = await EmailService.testConnection();
      
      // Crear datos de prueba
      const testData = {
        name: 'Usuario de Prueba',
        email: 'test@infraexpert.cl',
        phone: '+56912345678',
        comment: 'Este es un mensaje de prueba para verificar que el sistema de contacto está funcionando correctamente.',
        timestamp: new Date()
      };
      
      res.status(200).json({
        success: true,
        message: 'Endpoint de contacto funcionando',
        service: 'InfraExpert Contact API',
        status: 'online',
        smtp: smtpTest ? 'connected' : 'disconnected',
        timestamp: new Date(),
        testData: testData,
        endpoints: {
          send: 'POST /api/contact/send',
          test: 'GET /api/contact/test'
        },
        environment: process.env.NODE_ENV || 'development'
      });
      
    } catch (error) {
      console.error('❌ [CONTACTO] Error en test endpoint:', error);
      res.status(500).json({
        success: false,
        message: 'Error en test endpoint',
        error: error.message
      });
    }
  }
  
  /**
   * Endpoint para probar envío real (solo desarrollo)
   */
  static async sendTestEmail(req, res) {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Esta función solo está disponible en modo desarrollo.'
      });
    }
    
    try {
      console.log('🧪 [CONTACTO] Enviando email de prueba...');
      
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+56987654321',
        comment: 'Este es un mensaje de prueba automático para verificar que el sistema de email está funcionando correctamente.',
        timestamp: new Date()
      };
      
      const result = await EmailService.sendContactFormEmail(testData);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Email de prueba enviado exitosamente',
          data: {
            to: process.env.CONTACT_EMAIL || 'contactoinfraexpert@gmail.com',
            messageId: result.messageId,
            testData: testData
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error enviando email de prueba',
          error: result.error
        });
      }
      
    } catch (error) {
      console.error('❌ [CONTACTO] Error en test email:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno en test email',
        error: error.message
      });
    }
  }
  
  /**
   * Health check del servicio
   */
  static async healthCheck(req, res) {
    const health = {
      status: 'healthy',
      service: 'contact-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    // Probar conexión SMTP
    try {
      const smtpHealthy = await EmailService.testConnection();
      health.smtp = smtpHealthy ? 'connected' : 'disconnected';
    } catch (error) {
      health.smtp = 'error';
      health.smtpError = error.message;
    }
    
    res.status(200).json(health);
  }
}

// Exportar funciones individuales para compatibilidad
export const sendContactMessage = ContactController.sendContactMessage;
export const testEndpoint = ContactController.testEndpoint;
export const sendTestEmail = ContactController.sendTestEmail;
export const healthCheck = ContactController.healthCheck;

export default ContactController;