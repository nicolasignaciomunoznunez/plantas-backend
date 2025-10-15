// db/connectDB.js - VERSIÓN FINAL RAILWAY
import mysql from 'mysql2/promise';

// Configuración para MySQL de Railway
const dbConfig = {
    host: process.env.MYSQLHOST || 'localhost',
    port: parseInt(process.env.MYSQLPORT || '3306'),
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'railway',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

console.log('🔧 CONFIGURACIÓN RAILWAY MYSQL:');
console.log('   Host:', dbConfig.host);
console.log('   Database:', dbConfig.database);
console.log('   User:', dbConfig.user);

const pool = mysql.createPool(dbConfig);

export const testConnection = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('🎉 ¡CONEXIÓN RAILWAY MYSQL EXITOSA!');
        
        // Verificar tablas
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.tables 
            WHERE TABLE_SCHEMA = 'railway'
        `);
        
        console.log('📊 Tablas migradas:', tables.length);
        tables.forEach(table => {
            console.log(`   ✅ ${table.TABLE_NAME}`);
        });
        
        return true;
    } catch (error) {
        console.error('❌ ERROR CONEXIÓN MYSQL:', error.message);
        return false;
    } finally {
        if (connection) connection.release();
    }
};

export { pool };
export default pool;