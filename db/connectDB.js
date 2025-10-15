// db/connectDB.js - VERSIÓN DEBUG
import mysql from 'mysql2/promise';

console.log('🔧 CONNECTDB - VARIABLES RECIBIDAS:');
console.log('   DB_HOST:', process.env.DB_HOST);
console.log('   DB_PORT:', process.env.DB_PORT);
console.log('   DB_USER:', process.env.DB_USER);
console.log('   DB_NAME:', process.env.DB_NAME);

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'proyectoapr',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

export const testConnection = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('✅ CONEXIÓN MYSQL EXITOSA');
        console.log('   Usando host:', dbConfig.host);
        return true;
    } catch (error) {
        console.error('❌ ERROR CONEXIÓN MYSQL:');
        console.error('   Host intentado:', dbConfig.host);
        console.error('   Puerto intentado:', dbConfig.port);
        console.error('   Error:', error.message);
        return false;
    } finally {
        if (connection) connection.release();
    }
};

export { pool };
export default pool;