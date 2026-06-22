CREATE DATABASE vehiculosdb;

-- Conectarse a la base de datos vehiculosdb

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