-- ==========================================
-- SCHEMA: infraexpert_db
-- Ejecutar con: mysql -u root -p < backend/db/schema.sql
-- ==========================================

CREATE DATABASE IF NOT EXISTS infraexpert_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE infraexpert_db;

-- ==========================================
-- TABLA: users
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  nombre                    VARCHAR(255) NOT NULL,
  email                     VARCHAR(255) NOT NULL UNIQUE,
  password_hash             VARCHAR(255) NOT NULL,
  rol                       ENUM('superadmin','admin','tecnico','cliente') NOT NULL DEFAULT 'cliente',
  isVerified                BOOLEAN NOT NULL DEFAULT FALSE,
  verificationToken         VARCHAR(10) NULL,
  verificationTokenExpiresAt DATETIME NULL,
  resetToken                VARCHAR(255) NULL,
  resetTokenExpiresAt       DATETIME NULL,
  lastLogin                 DATETIME NULL,
  createdAt                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLA: plants
-- ==========================================
CREATE TABLE IF NOT EXISTS plants (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(255) NOT NULL,
  ubicacion VARCHAR(500) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLA: usuario_plantas (muchos-a-muchos)
-- ==========================================
CREATE TABLE IF NOT EXISTS usuario_plantas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT NOT NULL,
  planta_id    INT NOT NULL,
  tipo_usuario ENUM('tecnico','cliente') NOT NULL,
  UNIQUE KEY uq_usuario_planta (usuario_id, planta_id),
  FOREIGN KEY (usuario_id) REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (planta_id)  REFERENCES plants(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLA: incidencias
-- ==========================================
CREATE TABLE IF NOT EXISTS incidencias (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  plantId             INT NOT NULL,
  userId              INT NOT NULL,
  titulo              VARCHAR(500) NOT NULL,
  descripcion         TEXT,
  estado              ENUM('pendiente','en_progreso','resuelto') NOT NULL DEFAULT 'pendiente',
  fechaReporte        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fechaResolucion     DATETIME NULL,
  resumenTrabajo      TEXT NULL,
  fechaCompletado     DATETIME NULL,
  tecnico_completo_id INT NULL,
  FOREIGN KEY (plantId) REFERENCES plants(id) ON DELETE CASCADE,
  FOREIGN KEY (userId)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (tecnico_completo_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLA: incidencia_fotos
-- ==========================================
CREATE TABLE IF NOT EXISTS incidencia_fotos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  incidencia_id INT NOT NULL,
  tipo          ENUM('antes','despues') NOT NULL,
  ruta_archivo  VARCHAR(1000) NULL,
  descripcion   VARCHAR(500) NULL DEFAULT '',
  datos_imagen  LONGBLOB NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLA: incidencia_materiales
-- ==========================================
CREATE TABLE IF NOT EXISTS incidencia_materiales (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  incidencia_id   INT NOT NULL,
  material_nombre VARCHAR(500) NOT NULL,
  cantidad        DECIMAL(10,2) NOT NULL,
  unidad          VARCHAR(100) NOT NULL,
  costo           DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLA: mantenimientos
-- ==========================================
CREATE TABLE IF NOT EXISTS mantenimientos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  plantId         INT NOT NULL,
  userId          INT NOT NULL,
  tipo            ENUM('preventivo','correctivo') NOT NULL DEFAULT 'preventivo',
  descripcion     TEXT,
  fechaProgramada DATETIME NOT NULL,
  fechaRealizada  DATETIME NULL,
  estado          ENUM('pendiente','en_progreso','completado') NOT NULL DEFAULT 'pendiente',
  FOREIGN KEY (plantId) REFERENCES plants(id) ON DELETE CASCADE,
  FOREIGN KEY (userId)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLA: mantenimiento_checklist
-- ==========================================
CREATE TABLE IF NOT EXISTS mantenimiento_checklist (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  mantenimientoId  INT NOT NULL,
  item             VARCHAR(500) NOT NULL,
  completado       BOOLEAN NOT NULL DEFAULT FALSE,
  observaciones    TEXT NULL,
  FOREIGN KEY (mantenimientoId) REFERENCES mantenimientos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLA: mantenimiento_fotos
-- ==========================================
CREATE TABLE IF NOT EXISTS mantenimiento_fotos (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  mantenimiento_id INT NOT NULL,
  tipo             ENUM('antes','despues') NOT NULL,
  ruta_archivo     VARCHAR(1000) NULL,
  descripcion      VARCHAR(500) NULL DEFAULT '',
  datos_imagen     LONGBLOB NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mantenimiento_id) REFERENCES mantenimientos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLA: mantenimiento_materiales
-- ==========================================
CREATE TABLE IF NOT EXISTS mantenimiento_materiales (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  mantenimiento_id INT NOT NULL,
  material_nombre  VARCHAR(500) NOT NULL,
  cantidad         DECIMAL(10,2) NOT NULL,
  unidad           VARCHAR(100) NOT NULL,
  costo            DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mantenimiento_id) REFERENCES mantenimientos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABLA: plant_data
-- ==========================================
CREATE TABLE IF NOT EXISTS plant_data (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  plantId    INT NOT NULL,
  nivelLocal DECIMAL(10,2) NULL,
  presion    DECIMAL(10,2) NULL,
  turbidez   DECIMAL(10,2) NULL,
  cloro      DECIMAL(10,2) NULL,
  energia    DECIMAL(10,2) NULL,
  timestamp  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plantId) REFERENCES plants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- SUPERADMIN: ejecuta luego el seed
-- cd backend && node db/seed.js
-- ==========================================
