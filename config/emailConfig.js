// config/emailConfig.js
import { SendGridService } from '../services/sendgridService.js';

// Exportar para compatibilidad con tu código existente
export const EmailService = SendGridService;
export default SendGridService;

export const verifyEmailConnection = async () => {
  try {
    console.log('📧 Probando conexión con SendGrid API...');
    
    const testResult = await SendGridService.sendVerificationEmail(
      process.env.EMAIL_FROM_ADDRESS,
      '000000',
      'Test Connection'
    );
    
    if (testResult.success) {
      console.log('✅ SENDGRID API CONEXIÓN EXITOSA');
      return true;
    } else {
      console.log('❌ SENDGRID API ERROR:', testResult.error);
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR TESTEANDO SENDGRID:', error.message);
    return false;
  }
};