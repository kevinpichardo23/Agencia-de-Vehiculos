/**
 * Configuración general del backend.
 * En un proyecto real, JWT_SECRET debería venir de variables de entorno (.env)
 * y nunca debe subirse a un repositorio público.
 */
module.exports = {
    JWT_SECRET: "automax_secreto_academico_2026",
    JWT_EXPIRES_IN: "2h"
};
