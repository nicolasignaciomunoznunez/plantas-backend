// services/emailService.js - VERSIÓN PARA BREVO (Mantiene tus plantillas)
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Configurar transporte con BREVO
const createTransporter = () => {
  console.log('📧 [EMAIL] Configurando transporte para:', process.env.EMAIL_SERVICE || 'brevo');
  
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

// TUS PLANTILLAS ORIGINALES (MISMO CÓDIGO - NO CAMBIES)
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
  `
};

export class EmailService {
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

  // Email de verificación (MANTIENE MISMA FUNCIÓN)
  static async sendVerificationEmail(email, verificationCode, userName = '') {
    const subject = 'Verifica tu email - Infraexpert';
    const html = EMAIL_TEMPLATES.verification(verificationCode, userName);
    const text = `Tu código de verificación es: ${verificationCode}. Insértalo en la página de verificación.`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Email de bienvenida (MANTIENE MISMA FUNCIÓN)
  static async sendWelcomeEmail(email, userName) {
    const subject = '¡Bienvenido a Infraexpert!';
    const html = EMAIL_TEMPLATES.welcome(userName);
    const text = `¡Bienvenido ${userName}! Tu cuenta ha sido verificada exitosamente.`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Email de restablecimiento de contraseña (MANTIENE MISMA FUNCIÓN)
  static async sendPasswordResetEmail(email, resetToken, userName = '') {
    const resetUrl = `${process.env.CLIENT_URL}/restablecer-contraseña/${resetToken}`;
    const subject = 'Cambia tu contraseña - Infraexpert';
    const html = EMAIL_TEMPLATES.passwordResetRequest(resetUrl, userName);
    const text = `Para restablecer tu contraseña, visita: ${resetUrl}`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Email de confirmación de contraseña restablecida (MANTIENE MISMA FUNCIÓN)
  static async sendPasswordResetConfirmation(email, userName = '') {
    const subject = 'Contraseña restablecida - Infraexpert';
    const html = EMAIL_TEMPLATES.passwordResetSuccess(userName);
    const text = 'Tu contraseña ha sido restablecida exitosamente.';

    return await this.sendEmail(email, subject, html, text);
  }

  // Utilidad para convertir HTML a texto plano (MISMA FUNCIÓN)
  static htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Nueva función para probar conexión
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
}

export default EmailService;