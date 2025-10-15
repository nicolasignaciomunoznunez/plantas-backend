// services/sendgridService.js - VERSIÓN MEJORADA
import sgMail from '@sendgrid/mail';

// Configuración simple y directa
if (process.env.EMAIL_APP_PASSWORD) {
  sgMail.setApiKey(process.env.EMAIL_APP_PASSWORD);
  console.log('✅ SENDGRID: API Key configurada');
} else {
  console.warn('⚠️ SENDGRID: EMAIL_APP_PASSWORD no configurado');
}

// Plantilla simplificada para pruebas
const EMAIL_TEMPLATES = {
  verification: (verificationCode, userName = '') => `
<div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
  <div style="background: #4c66af; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Verify Your Email</h1>
  </div>
  <div style="background: #f9f9f9; padding: 20px;">
    <p>Tu código de verificación es:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; color: #4c66af;">${verificationCode}</span>
    </div>
    <p>Equipo R&V SPA</p>
  </div>
</div>
  `
};

export class SendGridService {
  static async sendEmail(to, subject, html, text = '') {
    try {
      console.log('📧 [SENDGRID] Intentando enviar email...');
      
      const msg = {
        to,
        from: {
          name: process.env.EMAIL_FROM_NAME || 'RYV SPA',
          email: process.env.EMAIL_FROM_ADDRESS
        },
        subject,
        html,
        text: text || 'Por favor verifica tu email'
      };

      const result = await sgMail.send(msg);
      console.log('✅ [SENDGRID] Email enviado exitosamente');
      
      return {
        success: true,
        messageId: result[0]?.headers?.['x-message-id']
      };
      
    } catch (error) {
      console.error('❌ [SENDGRID] Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async sendVerificationEmail(email, verificationCode, userName = '') {
    const subject = 'Verifica tu email - R&V SPA';
    const html = EMAIL_TEMPLATES.verification(verificationCode, userName);
    
    return await this.sendEmail(email, subject, html);
  }
}

export default SendGridService;