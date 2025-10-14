import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'proyectoapr',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Verificar conexión
export const testConnection = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('✅ Conexión a MySQL establecida correctamente');
        
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.tables 
            WHERE TABLE_SCHEMA = ?
        `, [process.env.DB_NAME || 'proyectoapr']);
        
        console.log('📊 Tablas en la base de datos:');
        tables.forEach(table => {
            console.log(`   - ${table.TABLE_NAME}`);
        });
        
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        return false;
    } finally {
        if (connection) connection.release();
    }
};

export { pool };
export default pool;