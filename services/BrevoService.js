// services/BrevoService.js - VERSIÓN COMPLETA CON CONTACTO
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Configurar transporte con BREVO
const createTransporter = () => {
  console.log('📧 [BREVO] Configurando transporte SMTP');
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || '950289002@smtp-brevo.com',
      pass: process.env.EMAIL_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// PLANTILLAS DE EMAIL
const EMAIL_TEMPLATES = {
  verification: (verificationCode, userName = '') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4c66afff, #4c66afff); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Verifica tu email</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Bienvenido a InfraExpert,</p>
    <p>Por favor confirma tu correo electrónico. Tu código es:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4c66afff;">${verificationCode}</span>
    </div>
    <p>Inserta este código en la página de verificación para completar tu registro.</p>
    <p>El código expirará en 15 minutos por razones de seguridad.</p>
    <p>Si no creaste la cuenta con nosotros simplemente ignora este correo.</p>
    <p>Saludos cordiales,<br>Equipo InfraExpert</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
  `,

  passwordResetRequest: (resetURL, userName = '') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cambia tu contraseña</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4c66afff, #4c66afff); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Cambiar contraseña</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hola ${userName || ''},</p>
    <p>Recibimos una petición para cambiar tu contraseña. Si no lo hiciste ignora este correo.</p>
    <p>Para cambiar tu contraseña clickea el siguiente botón:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetURL}" style="background-color: #4c66afff; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Cambiar contraseña</a>
    </div>
    <p>El link va a expirar en 1 hora por razones de seguridad.</p>
    <p>Saludos cordiales,<br>Equipo InfraExpert</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Este es un mensaje automático por favor no respondas este email</p>
  </div>
</body>
</html>
  `,

  passwordResetSuccess: (userName = '') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contraseña Restablecida</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4c66afff, #4c66afff); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Contraseña Restablecida</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hola ${userName || ''},</p>
    <p>Te escribimos para confirmar que tu contraseña ha sido restablecida exitosamente.</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #4c66afff; color: white; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; display: inline-block; font-size: 30px;">
        ✓
      </div>
    </div>
    <p>Si no iniciaste este restablecimiento de contraseña, por favor contacta a nuestro equipo de soporte inmediatamente.</p>
    <p>Por razones de seguridad, te recomendamos que:</p>
    <ul>
      <li>Uses una contraseña fuerte y única</li>
      <li>Actives la autenticación de dos factores si está disponible</li>
      <li>Evites usar la misma contraseña en múltiples sitios</li>
    </ul>
    <p>Gracias por ayudarnos a mantener tu cuenta segura.</p>
    <p>Saludos cordiales,<br>Equipo InfraExpert</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Este es un mensaje automático por favor no respondas este email</p>
  </div>
</body>
</html>
  `,

  welcome: (userName = '') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Bienvenido!</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4c66afff, #4c66afff); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">¡Bienvenido a InfraExpert!</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hola ${userName},</p>
    <p>¡Nos alegra darte la bienvenida a nuestra plataforma!</p>
    <p>Tu cuenta ha sido verificada exitosamente y ahora tienes acceso completo a todas nuestras funcionalidades.</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #4c66afff; color: white; width: 60px; height: 60px; line-height: 60px; border-radius: 50%; display: inline-block; font-size: 30px;">
        🎉
      </div>
    </div>
    <p><strong>¿Qué puedes hacer ahora?</strong></p>
    <ul>
      <li>Acceder a tu dashboard personal</li>
      <li>Gestionar tu perfil y preferencias</li>
      <li>Explorar todas las funcionalidades disponibles</li>
    </ul>
    <p>Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.</p>
    <p>Saludos cordiales,<br>Equipo InfraExpert</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Este es un mensaje automático por favor no respondas este email</p>
  </div>
</body>
</html>
  `,

  // NUEVA PLANTILLA PARA FORMULARIO DE CONTACTO
  contactForm: (contactData) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo Mensaje de Contacto - InfraExpert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4c66afff, #4c66afff); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">📩 Nuevo Mensaje de Contacto</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    
    <div style="background-color: white; padding: 20px; border-radius: 5px; border-left: 4px solid #4c66afff; margin-bottom: 25px;">
      <h3 style="color: #4c66afff; margin-top: 0;">👤 Información del Contacto</h3>
      <p><strong>Nombre:</strong> ${contactData.name}</p>
      <p><strong>Email:</strong> <a href="mailto:${contactData.email}" style="color: #4c66afff;">${contactData.email}</a></p>
      <p><strong>Teléfono:</strong> <a href="tel:${contactData.phone}" style="color: #4c66afff;">${contactData.phone}</a></p>
      <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL', {
        timeZone: 'America/Santiago',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
    </div>
    
    <div style="background-color: white; padding: 20px; border-radius: 5px; border-left: 4px solid #2ecc71; margin-bottom: 25px;">
      <h3 style="color: #27ae60; margin-top: 0;">💬 Mensaje</h3>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 3px; border: 1px solid #e9ecef;">
        <p style="white-space: pre-wrap; margin: 0; line-height: 1.5;">${contactData.comment}</p>
      </div>
    </div>
    
    <div style="background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center;">
      <p style="margin: 0; color: #4c66afff; font-weight: bold;">
        📞 Contactar: ${contactData.phone} | ✉️ Email: ${contactData.email}
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="margin-bottom: 5px; color: #555;">Este mensaje fue enviado desde el formulario de contacto</p>
      <p style="font-weight: bold; color: #4c66afff; margin-top: 5px; font-size: 1.1em;">🏗️ InfraExpert - Soluciones en Infraestructura</p>
    </div>
  </div>
</body>
</html>
  `,

  // PLANTILLA PARA CONFIRMACIÓN AL USUARIO
  contactConfirmation: (contactData) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Mensaje Recibido</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4c66afff, #4c66afff); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">✅ Mensaje Recibido</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #4c66afff; color: white; width: 80px; height: 80px; line-height: 80px; border-radius: 50%; display: inline-block; font-size: 40px;">
        ✓
      </div>
    </div>
    
    <h2 style="color: #4c66afff; text-align: center;">¡Hola ${contactData.name}!</h2>
    
    <p>Gracias por contactarte con <strong>InfraExpert</strong>. Hemos recibido tu mensaje correctamente y te contactaremos pronto.</p>
    
    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 25px 0; border: 1px solid #e9ecef;">
      <h3 style="color: #4c66afff; margin-top: 0;">📋 Resumen de tu mensaje:</h3>
      <table style="width: 100%;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Nombre:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${contactData.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${contactData.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Teléfono:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${contactData.phone}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Fecha:</strong></td>
          <td style="padding: 8px 0; text-align: right;">${new Date().toLocaleString('es-CL')}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #e8f4fd; padding: 20px; border-radius: 5px; margin: 25px 0; border-left: 4px solid #4c66afff;">
      <h3 style="color: #4c66afff; margin-top: 0;">📞 Contacto de Emergencia</h3>
      <p>Si necesitas contactarnos urgentemente:</p>
      <p style="text-align: center; margin: 15px 0;">
        <a href="tel:+56937492604" style="background-color: #4c66afff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          📞 +56 9 3749 2604
        </a>
      </p>
    </div>
    
    <p style="text-align: center; color: #555; font-style: italic;">
      Este es un mensaje automático de confirmación.<br>
      No es necesario responder este email.
    </p>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="margin-bottom: 5px;">Saludos cordiales,</p>
      <p style="font-weight: bold; color: #4c66afff; margin-top: 5px; font-size: 1.1em;">El equipo de InfraExpert</p>
    </div>
  </div>
</body>
</html>
  `
};

export class BrevoService {
  static async sendEmail(to, subject, html, text = '') {
    try {
      console.log('📧 [BREVO] Enviando email a:', to);
      
      const transporter = createTransporter();
      
      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Infraexpert',
          address: process.env.EMAIL_FROM_ADDRESS
        },
        to: to,
        subject: subject,
        text: text || this.htmlToText(html),
        html: html
      };

      const info = await transporter.sendMail(mailOptions);
      
      console.log('✅ [BREVO] Email enviado exitosamente');
      console.log('   ID:', info.messageId);
      
      return { 
        success: true, 
        messageId: info.messageId,
        response: info.response 
      };
    } catch (error) {
      console.error('❌ [BREVO] ERROR ENVIANDO EMAIL:');
      console.error('   Para:', to);
      console.error('   Error:', error.message);
      
      return { 
        success: false, 
        error: error.message,
        code: error.code 
      };
    }
  }

  // Email de verificación
  static async sendVerificationEmail(email, verificationCode, userName = '') {
    const subject = 'Verifica tu email - Infraexpert';
    const html = EMAIL_TEMPLATES.verification(verificationCode, userName);
    const text = `Tu código de verificación es: ${verificationCode}. Insértalo en la página de verificación.`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Email de bienvenida
  static async sendWelcomeEmail(email, userName) {
    const subject = '¡Bienvenido a Infraexpert!';
    const html = EMAIL_TEMPLATES.welcome(userName);
    const text = `¡Bienvenido ${userName}! Tu cuenta ha sido verificada exitosamente.`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Email de restablecimiento de contraseña
  static async sendPasswordResetEmail(email, resetToken, userName = '') {
    const resetUrl = `${process.env.CLIENT_URL}/restablecer-contraseña/${resetToken}`;
    const subject = 'Cambia tu contraseña - Infraexpert';
    const html = EMAIL_TEMPLATES.passwordResetRequest(resetUrl, userName);
    const text = `Para restablecer tu contraseña, visita: ${resetUrl}`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Email de confirmación de contraseña restablecida
  static async sendPasswordResetConfirmation(email, userName = '') {
    const subject = 'Contraseña restablecida - Infraexpert';
    const html = EMAIL_TEMPLATES.passwordResetSuccess(userName);
    const text = 'Tu contraseña ha sido restablecida exitosamente.';

    return await this.sendEmail(email, subject, html, text);
  }

  // NUEVO: Email para formulario de contacto
  static async sendContactFormEmail(contactData) {
    try {
      const subject = `📩 Nuevo contacto: ${contactData.name}`;
      const html = EMAIL_TEMPLATES.contactForm(contactData);
      
      const text = `
NUEVO MENSAJE DE CONTACTO - INFRAEXPERT
=========================================

👤 INFORMACIÓN DEL CONTACTO:
Nombre: ${contactData.name}
Email: ${contactData.email}
Teléfono: ${contactData.phone}
Fecha: ${new Date().toLocaleString('es-CL')}

💬 MENSAJE:
${contactData.comment}

=========================================
Este mensaje fue enviado desde el formulario de contacto
del sitio web de InfraExpert.
      `;

      // Enviar al email de la empresa
      const toEmail = process.env.CONTACT_EMAIL || 'contactoinfraexpert@gmail.com';
      
      console.log('📧 [CONTACTO] Enviando mensaje de:', contactData.name);
      console.log('   📩 Para:', toEmail);
      console.log('   📞 Teléfono:', contactData.phone);
      
      const result = await this.sendEmail(toEmail, subject, html, text);
      
      return result;
      
    } catch (error) {
      console.error('❌ [CONTACTO] Error en sendContactFormEmail:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // NUEVO: Email de confirmación al usuario que envía el formulario
  static async sendContactConfirmationEmail(contactData) {
    try {
      const subject = '✅ Confirmación: Hemos recibido tu mensaje - InfraExpert';
      const html = EMAIL_TEMPLATES.contactConfirmation(contactData);
      
      const text = `
CONFIRMACIÓN DE MENSAJE RECIBIDO - INFRAEXPERT
=========================================

¡Hola ${contactData.name}!

Gracias por contactarte con InfraExpert. Hemos recibido tu mensaje correctamente y te contactaremos pronto.

📋 RESUMEN DE TU MENSAJE:
- Nombre: ${contactData.name}
- Email: ${contactData.email}
- Teléfono: ${contactData.phone}
- Fecha: ${new Date().toLocaleString('es-CL')}

📞 CONTACTO DE EMERGENCIA:
Si necesitas contactarnos urgentemente: +56 9 3749 2604

=========================================
Este es un mensaje automático de confirmación.
No es necesario responder este email.

Saludos cordiales,
El equipo de InfraExpert
      `;
      
      console.log('📧 [CONTACTO] Enviando confirmación a:', contactData.email);
      
      const result = await this.sendEmail(contactData.email, subject, html, text);
      
      return result;
      
    } catch (error) {
      console.error('❌ [CONTACTO] Error enviando confirmación:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Utilidad para convertir HTML a texto plano
  static htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Función para probar conexión
  static async testConnection() {
    try {
      const transporter = createTransporter();
      await transporter.verify();
      console.log('✅ [BREVO] Conexión SMTP verificada');
      return true;
    } catch (error) {
      console.error('❌ [BREVO] Error verificando conexión:', error.message);
      return false;
    }
  }

  // NUEVO: Función para probar envío de contacto
  static async testContactEmail() {
    try {
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+56912345678',
        comment: 'Este es un mensaje de prueba del sistema de contacto.'
      };
      
      console.log('🧪 [TEST] Probando envío de email de contacto...');
      
      const result = await this.sendContactFormEmail(testData);
      
      if (result.success) {
        console.log('✅ [TEST] Email de contacto enviado correctamente');
      } else {
        console.error('❌ [TEST] Error en email de contacto:', result.error);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ [TEST] Error en prueba de contacto:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default BrevoService;