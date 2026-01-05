// config/emailConfig.js - VERSIÓN PARA BREVO
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const createTransporter = () => {
  console.log('📧 [EMAIL] Configurando para:', process.env.EMAIL_SERVICE || 'brevo');
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

export const sendEmail = async (to, subject, text, html) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Infraexpert'}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: to,
      subject: subject,
      text: text,
      html: html || text
    };
    
    console.log(`📧 [BREVO] Enviando a: ${to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [BREVO] Email enviado: ${info.messageId}`);
    return info;
    
  } catch (error) {
    console.error(`❌ [BREVO] Error: ${error.message}`);
    throw error;
  }
};

export const verifyEmailConnection = async () => {
  try {
    console.log('📧 [BREVO] Verificando conexión...');
    
    if (!process.env.EMAIL_APP_PASSWORD) {
      console.log('❌ [BREVO] Faltan credenciales');
      return false;
    }
    
    const transporter = createTransporter();
    await transporter.verify();
    
    console.log('✅ [BREVO] Conectado correctamente');
    console.log('   Servidor:', process.env.EMAIL_HOST);
    console.log('   Usuario:', process.env.EMAIL_USER);
    
    return true;
  } catch (error) {
    console.error('❌ [BREVO] Error de conexión:', error.message);
    return false;
  }
};

// Mantener compatibilidad
export const EmailService = { sendEmail, verifyEmailConnection };
export default { sendEmail, verifyEmailConnection };