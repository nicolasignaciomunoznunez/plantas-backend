// config/emailConfig.js - VERSIÓN SIMPLIFICADA
import { SendGridService } from '../services/sendgridService.js';

// Solo para mantener la compatibilidad con tu código existente
export const verifyEmailConnection = async () => {
  try {
    console.log('📧 Probando conexión con SendGrid API...');
    
    // Test simple
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

// Exportar el servicio para uso directo (mantener compatibilidad)
export { SendGridService as EmailService };
export default SendGridService;