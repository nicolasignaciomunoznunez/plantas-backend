import bcryptjs from 'bcryptjs';
import { pool } from './connectDB.js';

const SUPERADMIN = {
  nombre: 'Superadmin',
  email: 'admin@infraexpert.cl',
  password: 'Admin1234!',
  rol: 'superadmin'
};

async function seed() {
  try {
    console.log('🌱 Ejecutando seed...');

    const hash = await bcryptjs.hash(SUPERADMIN.password, 10);

    const [resultado] = await pool.execute(
      `INSERT INTO users (nombre, email, password_hash, rol, isVerified)
       VALUES (?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE id = id`,
      [SUPERADMIN.nombre, SUPERADMIN.email, hash, SUPERADMIN.rol]
    );

    if (resultado.affectedRows > 0) {
      console.log('✅ Superadmin creado:');
      console.log(`   Email: ${SUPERADMIN.email}`);
      console.log(`   Password: ${SUPERADMIN.password}`);
    } else {
      console.log('ℹ️  Superadmin ya existe, sin cambios.');
    }
  } catch (error) {
    console.error('❌ Error en seed:', error.message);
  } finally {
    process.exit(0);
  }
}

seed();
