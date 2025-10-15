// db/connectDB.js - PARA MYSQL DE RAILWAY
import mysql from 'mysql2/promise';

// Configuración para MySQL INTERNO de Railway
const dbConfig = {
    host: process.env.MYSQLHOST || 'localhost',
    port: parseInt(process.env.MYSQLPORT || '3306'),
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '', // ¡VACÍO!
    database: process.env.MYSQLDATABASE || 'railway',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

console.log('🔧 MYSQL RAILWAY INTERNO:');
console.log('   Host:', dbConfig.host);
console.log('   Puerto:', dbConfig.port);
console.log('   Database:', dbConfig.database);
console.log('   User:', dbConfig.user);
console.log('   Password:', dbConfig.password === '' ? 'VACÍA (correcto)' : 'CONFIGURADA');

const pool = mysql.createPool(dbConfig);

export const testConnection = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('🎉 ¡CONEXIÓN MYSQL RAILWAY EXITOSA!');
        
        // Verificar si tenemos tablas
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.tables 
            WHERE TABLE_SCHEMA = 'railway'
        `);
        
        console.log('📊 Tablas encontradas:', tables.length);
        if (tables.length === 0) {
            console.log('   ℹ️  La base de datos está vacía - necesitas crear las tablas');
        } else {
            tables.forEach(table => {
                console.log(`   - ${table.TABLE_NAME}`);
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ ERROR CONEXIÓN MYSQL:');
        console.error('   Error:', error.message);
        return false;
    } finally {
        if (connection) connection.release();
    }
};

export { pool };
export default pool;