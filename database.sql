CREATE DATABASE vehiculosdb;

-- Conectarse a la base de datos vehiculosdb
\c vehiculosdb

CREATE TABLE vehiculos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio INTEGER NOT NULL,
    color VARCHAR(30) NOT NULL,
    combustible VARCHAR(30) NOT NULL,
    precio DECIMAL(12,2) NOT NULL,
    cantidad INTEGER NOT NULL,
    descripcion TEXT
);

-- ============================================================
-- MÓDULO DE AUTENTICACIÓN DE USUARIOS
-- ============================================================

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice para acelerar la búsqueda por correo en el login
CREATE INDEX idx_usuarios_correo ON usuarios (correo);