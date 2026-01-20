// routes/contactRoutes.js
import express from 'express';
import { 
  ContactController,
  sendContactMessage,
  testEndpoint,
  sendTestEmail,
  healthCheck
} from '../controllers/contactController.js';

const router = express.Router();

/**
 * @route   GET /api/contact/test
 * @desc    Probar endpoint de contacto
 * @access  Public
 */
router.get('/test', testEndpoint);

/**
 * @route   GET /api/contact/health
 * @desc    Health check del servicio
 * @access  Public
 */
router.get('/health', healthCheck);

/**
 * @route   POST /api/contact/send
 * @desc    Enviar mensaje de contacto
 * @access  Public
 */
router.post('/send', sendContactMessage);

/**
 * @route   POST /api/contact/test-email
 * @desc    Enviar email de prueba (solo desarrollo)
 * @access  Public (solo en desarrollo)
 */
router.post('/test-email', sendTestEmail);

export default router;