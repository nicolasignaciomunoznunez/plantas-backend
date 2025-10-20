import { pool } from "../db/connectDB.js";

export class Usuario {
    constructor(usuario) {
        this.id = usuario.id;
        this.nombre = usuario.nombre;
        this.email = usuario.email;
        this.password_hash = usuario.password_hash;
        this.rol = usuario.rol;
        this.isVerified = usuario.isVerified || false;
        this.verificationToken = usuario.verificationToken;
        this.verificationTokenExpiresAt = usuario.verificationTokenExpiresAt;
        this.resetToken = usuario.resetToken;
        this.resetTokenExpiresAt = usuario.resetTokenExpiresAt;
        this.lastLogin = usuario.lastLogin;
        this.createdAt = usuario.createdAt;
        this.updatedAt = usuario.updatedAt;
    }

    // Crear nuevo usuario
    static async crear(datosUsuario) {
        try {
            const [resultado] = await pool.execute(
                `INSERT INTO users (nombre, email, password_hash, rol, verificationToken, verificationTokenExpiresAt) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    datosUsuario.nombre,
                    datosUsuario.email,
                    datosUsuario.password_hash,
                    datosUsuario.rol,
                    datosUsuario.verificationToken,
                    datosUsuario.verificationTokenExpiresAt
                ]
            );

            return await this.buscarPorId(resultado.insertId);
        } catch (error) {
            throw new Error(`Error al crear usuario: ${error.message}`);
        }
    }

    // Buscar usuario por ID
    static async buscarPorId(id) {
        try {
            const [usuarios] = await pool.execute(
                `SELECT * FROM users WHERE id = ?`,
                [id]
            );

            if (usuarios.length === 0) {
                return null;
            }

            return new Usuario(usuarios[0]);
        } catch (error) {
            throw new Error(`Error al buscar usuario por ID: ${error.message}`);
        }
    }

    // Buscar usuario por email
    static async buscarPorEmail(email) {
        try {
            const [usuarios] = await pool.execute(
                `SELECT * FROM users WHERE email = ?`,
                [email]
            );

            if (usuarios.length === 0) {
                return null;
            }

            return new Usuario(usuarios[0]);
        } catch (error) {
            throw new Error(`Error al buscar usuario por email: ${error.message}`);
        }
    }

    // Buscar usuario por token de verificación
    static async buscarPorTokenVerificacion(token) {
        try {
            const [usuarios] = await pool.execute(
                `SELECT * FROM users WHERE verificationToken = ? AND verificationTokenExpiresAt > NOW()`,
                [token]
            );

            if (usuarios.length === 0) {
                return null;
            }

            return new Usuario(usuarios[0]);
        } catch (error) {
            throw new Error(`Error al buscar usuario por token de verificación: ${error.message}`);
        }
    }

    // Buscar usuario por token de restablecimiento
    static async buscarPorTokenRestablecimiento(token) {
        try {
            const [usuarios] = await pool.execute(
                `SELECT * FROM users WHERE resetToken = ? AND resetTokenExpiresAt > NOW()`,
                [token]
            );

            if (usuarios.length === 0) {
                return null;
            }

            return new Usuario(usuarios[0]);
        } catch (error) {
            throw new Error(`Error al buscar usuario por token de restablecimiento: ${error.message}`);
        }
    }

    // Verificar usuario (marcar email como verificado)
    static async verificarUsuario(id) {
        try {
            await pool.execute(
                `UPDATE users 
                 SET isVerified = TRUE, 
                     verificationToken = NULL, 
                     verificationTokenExpiresAt = NULL,
                     updatedAt = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [id]
            );

            return await this.buscarPorId(id);
        } catch (error) {
            throw new Error(`Error al verificar usuario: ${error.message}`);
        }
    }

    // Actualizar último inicio de sesión
    static async actualizarUltimoInicioSesion(id) {
        try {
            await pool.execute(
                `UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?`,
                [id]
            );
        } catch (error) {
            throw new Error(`Error al actualizar último inicio de sesión: ${error.message}`);
        }
    }

    // Establecer token de restablecimiento
    static async establecerTokenRestablecimiento(id, token, expiracion) {
        try {
            await pool.execute(
                `UPDATE users 
                 SET resetToken = ?, 
                     resetTokenExpiresAt = ?,
                     updatedAt = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [token, expiracion, id]
            );
        } catch (error) {
            throw new Error(`Error al establecer token de restablecimiento: ${error.message}`);
        }
    }

    // Actualizar contraseña
    static async actualizarContraseña(id, passwordHash) {
        try {
            await pool.execute(
                `UPDATE users 
                 SET password_hash = ?, 
                     resetToken = NULL, 
                     resetTokenExpiresAt = NULL,
                     updatedAt = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [passwordHash, id]
            );
        } catch (error) {
            throw new Error(`Error al actualizar contraseña: ${error.message}`);
        }
    }

    // Actualizar perfil de usuario
    static async actualizarPerfil(id, datosActualizados) {
        try {
            const camposPermitidos = ['nombre', 'email', 'rol'];
            const camposParaActualizar = [];
            const valores = [];

            for (const campo of camposPermitidos) {
                if (datosActualizados[campo] !== undefined) {
                    camposParaActualizar.push(`${campo} = ?`);
                    valores.push(datosActualizados[campo]);
                }
            }

            if (camposParaActualizar.length === 0) {
                throw new Error('No hay campos válidos para actualizar');
            }

            camposParaActualizar.push('updatedAt = CURRENT_TIMESTAMP');
            valores.push(id);

            const consulta = `UPDATE users SET ${camposParaActualizar.join(', ')} WHERE id = ?`;

            await pool.execute(consulta, valores);

            return await this.buscarPorId(id);
        } catch (error) {
            throw new Error(`Error al actualizar perfil: ${error.message}`);
        }
    }

    // Obtener todos los usuarios (para admin) - MÉTODO CORREGIDO
    static async obtenerTodos(limite = 50, pagina = 1, rol = null) {
        try {
            console.log('🔍 [USUARIO MODEL] obtenerTodos ejecutándose');
            console.log('📊 Parámetros:', { limite, pagina, rol });

            const offset = (pagina - 1) * limite;
            let query = `SELECT id, nombre, email, rol, isVerified, lastLogin, createdAt, updatedAt FROM users WHERE 1=1`;
            const valores = [];

            if (rol) {
                query += ` AND rol = ?`;
                valores.push(rol);
            }

            query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
            valores.push(limite, offset);

            console.log('📝 Query:', query);
            console.log('🔢 Valores:', valores);

            const [usuarios] = await pool.execute(query, valores);
            
            console.log('✅ Usuarios obtenidos:', usuarios.length);
            return usuarios.map(usuario => new Usuario(usuario));
        } catch (error) {
            console.error('❌ Error en obtenerTodos:', error);
            throw new Error(`Error obteniendo usuarios: ${error.message}`);
        }
    }

    // Eliminar usuario
    static async eliminar(id) {
        try {
            const [resultado] = await pool.execute(
                `DELETE FROM users WHERE id = ?`,
                [id]
            );

            return resultado.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al eliminar usuario: ${error.message}`);
        }
    }

    // Obtener estadísticas de usuarios
    static async obtenerEstadisticas() {
        try {
            const [estadisticas] = await pool.execute(`
                SELECT 
                    COUNT(*) as totalUsuarios,
                    COUNT(CASE WHEN isVerified = TRUE THEN 1 END) as usuariosVerificados,
                    COUNT(CASE WHEN rol = 'admin' THEN 1 END) as administradores,
                    COUNT(CASE WHEN rol = 'tecnico' THEN 1 END) as tecnicos,
                    COUNT(CASE WHEN rol = 'cliente' THEN 1 END) as clientes
                FROM users
            `);

            return estadisticas[0];
        } catch (error) {
            throw new Error(`Error al obtener estadísticas: ${error.message}`);
        }
    }

    // Actualizar rol de usuario
    static async actualizarRol(usuarioId, nuevoRol) {
        try {
            const [resultado] = await pool.execute(
                `UPDATE users SET rol = ? WHERE id = ?`,
                [nuevoRol, usuarioId]
            );

            if (resultado.affectedRows === 0) {
                throw new Error('Usuario no encontrado');
            }

            return await this.buscarPorId(usuarioId);
        } catch (error) {
            throw new Error(`Error actualizando rol: ${error.message}`);
        }
    }
}