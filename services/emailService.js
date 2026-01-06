import transporter from '../config/emailConfig.js';

// Tus plantillas originales adaptadas
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
    <h1 style="color: white; margin: 0;">Verifica tu emaill</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Bienvenido a InfraExpert,</p>
    <p>Por favor confirma tu correo electrónico. Tu código es:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50;">${verificationCode}</span>
    </div>
    <p>Inserta este código en la página de verificación para completar tu registro.</p>
    <p>El código expirará en 15 minutos por razones de seguridad.</p>
    <p>Si no creaste la cuenta con nosotros simplemente ignora este correo.</p>
    <p>Saludos cordiales,<br>Equipo InfraExpert</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Esto es un mensaje automático porfavor no responder.</p>
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
      <a href="${resetURL}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Cambiar contraseña</a>
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
      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'InfraExpert',
          address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
        },
        to,
        subject,
        text: text || this.htmlToText(html),
        html
      };

      console.log(`📤 Enviando email a: ${to}`);
      const result = await transporter.sendMail(mailOptions);
      
      console.log('✅ EMAIL ENVIADO EXITOSAMENTE:');
      console.log('   ID:', result.messageId);
      console.log('   Para:', to);
      console.log('   Asunto:', subject);
      
      return { 
        success: true, 
        messageId: result.messageId,
        response: result.response 
      };
    } catch (error) {
      console.error('❌ ERROR ENVIANDO EMAIL:');
      console.error('   Para:', to);
      console.error('   Error:', error.message);
      
      return { 
        success: false, 
        error: error.message,
        code: error.code 
      };
    }
  }

  // Email de verificación (usando tu plantilla original)
  static async sendVerificationEmail(email, verificationCode, userName = '') {
    const subject = 'Verifica tu email - InfraExpert';
    const html = EMAIL_TEMPLATES.verification(verificationCode, userName);
    const text = `Tu código de verificación es: ${verificationCode}. Insértalo en la página de verificación.`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Email de bienvenida (nueva plantilla)
  static async sendWelcomeEmail(email, userName) {
    const subject = '¡Bienvenido a InfraExpert!';
    const html = EMAIL_TEMPLATES.welcome(userName);
    const text = `¡Bienvenido ${userName}! Tu cuenta ha sido verificada exitosamente.`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Email de restablecimiento de contraseña (usando tu plantilla original)
  static async sendPasswordResetEmail(email, resetToken, userName = '') {
    const resetUrl = `${process.env.CLIENT_URL}/restablecer-contraseña/${resetToken}`;
    const subject = 'Cambia tu contraseña - InfraExpert';
    const html = EMAIL_TEMPLATES.passwordResetRequest(resetUrl, userName);
    const text = `Para restablecer tu contraseña, visita: ${resetUrl}`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Email de confirmación de contraseña restablecida (usando tu plantilla original)
  static async sendPasswordResetConfirmation(email, userName = '') {
    const subject = 'Contraseña restablecida - InfraExpert';
    const html = EMAIL_TEMPLATES.passwordResetSuccess(userName);
    const text = 'Tu contraseña ha sido restablecida exitosamente.';

    return await this.sendEmail(email, subject, html, text);
  }

  // Utilidad para convertir HTML a texto plano
  static htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export default EmailService;