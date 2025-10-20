// config/emailConfig.js - VERSIÓN MEJORADA
import { SendGridService } from '../services/sendgridService.js';

export const EmailService = SendGridService;
export default SendGridService;

export const verifyEmailConnection = async () => {
  try {
    console.log('📧 [EMAIL CONFIG] Verificando configuración (SOLO CREDENCIALES)...');
    
    if (!process.env.SENDGRID_API_KEY && !process.env.EMAIL_APP_PASSWORD) {
      console.log('❌ [EMAIL CONFIG] Faltan credenciales de SendGrid');
      return false;
    }
    
    if (!process.env.EMAIL_FROM_ADDRESS) {
      console.log('❌ [EMAIL CONFIG] Falta EMAIL_FROM_ADDRESS');
      return false;
    }
    
    console.log('✅ [EMAIL CONFIG] Credenciales presentes - Listo para enviar emails');
    console.log('   From:', process.env.EMAIL_FROM_ADDRESS);
    console.log('   API Key:', process.env.SENDGRID_API_KEY ? '✅ Presente' : 
                process.env.EMAIL_APP_PASSWORD ? '✅ Presente (EMAIL_APP_PASSWORD)' : '❌ Faltante');
    
    return true;
    
  } catch (error) {
    console.error('❌ [EMAIL CONFIG] Error verificando configuración:', error.message);
    return false;
  }
};




