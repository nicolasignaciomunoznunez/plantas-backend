import jwt from "jsonwebtoken";

export const generarTokenYEstablecerCookie = (res, usuarioId) => {
    // Generar token JWT
    const token = jwt.sign(
        { usuarioId },  // Cambiado de userId a usuarioId
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN || "15d" }
    );

    // Establecer cookie HTTP-only
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 24 * 60 * 60 * 1000, // 15 días
    });

    return token; // ✅ Devolver el token para que el frontend lo use
};

// Versión alternativa con más opciones de configuración
export const generarToken = (usuarioId) => {
    return jwt.sign(
        { usuarioId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "15d" }
    );
};

export const establecerCookie = (res, token, opciones = {}) => {
    const opcionesPorDefecto = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 24 * 60 * 60 * 1000, // 15 días
    };

    res.cookie("token", token, { ...opcionesPorDefecto, ...opciones });
};

// Función para generar token y establecer cookie por separado
export const generarTokenYEstablecerCookieModular = (res, usuarioId) => {
    const token = generarToken(usuarioId);
    establecerCookie(res, token);
    return token;
};

// Función para limpiar cookie (logout)
export const limpiarCookieToken = (res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });
};