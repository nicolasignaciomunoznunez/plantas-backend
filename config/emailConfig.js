import nodemailer from 'nodemailer';

// Configuración para SendGrid
export const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey', // ← EXACTAMENTE 'apikey' (texto fijo)
    pass: process.env.EMAIL_APP_PASSWORD // ← Tu API Key que empieza con SG.
  },
  // Configuración para mejor rendimiento
  connectionTimeout: 10000,
  socketTimeout: 10000,
  secure: false // ← Usar TLS (puerto 587)
});

export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ CONEXIÓN SENDGRID ESTABLECIDA');
    console.log('   Servicio: SendGrid');
    console.log('   Host: smtp.sendgrid.net');
    console.log('   Estado: Listo para enviar emails');
    return true;
  } catch (error) {
    console.error('❌ ERROR CONEXIÓN SENDGRID:');
    console.error('   Mensaje:', error.message);
    console.error('   Código:', error.code);
    console.error('   Verifica:');
    console.error('     1. API Key en Railway: SG.xxx...');
    console.error('     2. EMAIL_USER=apikey en Railway');
    console.error('     3. Sender verificado en SendGrid');
    return false;
  }
};

export default transporter;