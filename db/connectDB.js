// db/connectDB.js - VERSIÓN SIN .env
import mysql from 'mysql2/promise';

// NO usar dotenv en producción - Railway ya inyecta las variables
console.log('🔧 CARGANDO CONFIGURACIÓN RAILWAY:');
console.log('   DB_HOST:', process.env.DB_HOST || 'NO ENCONTRADO');
console.log('   DB_PORT:', process.env.DB_PORT || 'NO ENCONTRADO');
console.log('   DB_USER:', process.env.DB_USER || 'NO ENCONTRADO');
console.log('   DB_NAME:', process.env.DB_NAME || 'NO ENCONTRADO');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'NO ENCONTRADO');

// Configuración específica para Railway
const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Configuraciones optimizadas para Railway
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Verificar conexión
export const testConnection = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('🎉 ¡CONEXIÓN RAILWAY MYSQL EXITOSA!');
        console.log('   Host:', dbConfig.host);
        console.log('   Base de datos:', dbConfig.database);
        
        // Verificar tablas
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.tables 
            WHERE TABLE_SCHEMA = ?
        `, [process.env.DB_NAME]);
        
        console.log('📊 Tablas encontradas:', tables.length);
        tables.forEach(table => {
            console.log(`   - ${table.TABLE_NAME}`);
        });
        
        return true;
    } catch (error) {
        console.error('❌ ERROR CONEXIÓN RAILWAY MYSQL:');
        console.error('   Mensaje:', error.message);
        console.error('   Código:', error.code);
        
        if (error.code === 'ENOTFOUND') {
            console.error('   🔧 El host no existe - Verifica DB_HOST en Railway');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('   🔌 Conexión rechazada - Verifica DB_PORT');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   🔐 Credenciales incorrectas - Verifica DB_USER/DB_PASSWORD');
        }
        
        return false;
    } finally {
        if (connection) connection.release();
    }
};

export { pool };
export default pool;