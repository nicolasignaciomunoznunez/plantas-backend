// config/emailConfig.js - ACTUALIZADO
import EmailService from '../services/BrevoService.js'; // ✅ Importa el nuevo servicio

// Mantén las funciones existentes para compatibilidad
export const createTransporter = () => {
  // Esta función ya no es necesaria pero la mantenemos
  console.log('📧 [EMAIL] Usando BrevoService');
  return null; // O puedes mantener la implementación antigua
};

export const sendEmail = async (to, subject, text, html) => {
  // Usa el nuevo EmailService
  try {
    const result = await EmailService.sendEmail(to, subject, html || text, text);
    return result;
  } catch (error) {
    console.error(`❌ Error en sendEmail: ${error.message}`);
    throw error;
  }
};

export const verifyEmailConnection = async () => {
  // Usa el nuevo EmailService
  return await EmailService.testConnection();
};

// Mantener compatibilidad
export { EmailService };
export default { sendEmail, verifyEmailConnection, EmailService };