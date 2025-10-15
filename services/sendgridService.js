// services/sendgridService.js - VERSIÓN CON DIAGNÓSTICO
import sgMail from '@sendgrid/mail';

// Debug completo de variables
console.log('🔧 [SENDGRID DEBUG] Variables de entorno:');
console.log('   EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? `✅ (${process.env.EMAIL_APP_PASSWORD.length} chars)` : '❌ UNDEFINED');
console.log('   EMAIL_FROM_ADDRESS:', process.env.EMAIL_FROM_ADDRESS || '❌ UNDEFINED');
console.log('   EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME || '❌ UNDEFINED');

// Configurar solo si existe
if (process.env.EMAIL_APP_PASSWORD) {
  sgMail.setApiKey(process.env.EMAIL_APP_PASSWORD);
  console.log('✅ SENDGRID: API Key configurada');
} else {
  console.error('❌ SENDGRID: EMAIL_APP_PASSWORD NO CONFIGURADO EN RUNTIME');
  console.error('   Verifica en Railway Dashboard → Variables');
}

export class SendGridService {
  static async sendEmail(to, subject, html, text = '') {
    try {
      console.log('📧 [SENDGRID] Iniciando envío...');
      console.log('   To:', to);
      console.log('   From config:', process.env.EMAIL_FROM_ADDRESS);
      
      // Validación explícita
      if (!process.env.EMAIL_FROM_ADDRESS) {
        throw new Error('EMAIL_FROM_ADDRESS no está definido en el entorno');
      }

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

      console.log('📧 [SENDGRID] Mensaje configurado, enviando...');
      
      // Solo intentar enviar si la API Key está configurada
      if (!process.env.EMAIL_APP_PASSWORD) {
        throw new Error('SendGrid no configurado - falta EMAIL_APP_PASSWORD');
      }

      const result = await sgMail.send(msg);
      console.log('✅ [SENDGRID] Email enviado exitosamente');
      
      return {
        success: true,
        messageId: result[0]?.headers?.['x-message-id']
      };
      
    } catch (error) {
      console.error('❌ [SENDGRID] Error detallado:');
      console.error('   Mensaje:', error.message);
      console.error('   Stack:', error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async sendVerificationEmail(email, verificationCode, userName = '') {
    const subject = 'Verifica tu email - R&V SPA';
    const html = `
      <div>
        <h2>Verifica tu email</h2>
        <p>Tu código es: <strong>${verificationCode}</strong></p>
      </div>
    `;
    
    return await this.sendEmail(email, subject, html);
  }
}

export default SendGridService;