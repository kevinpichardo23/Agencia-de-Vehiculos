const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("./config");

const router = express.Router();

const SALT_ROUNDS = 10;

/* ============================================================
   VALIDACIONES BÁSICAS
   ============================================================ */
function correoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

/* ============================================================
   POST /api/auth/registro
   Registra un nuevo usuario, validando correo duplicado
   y cifrando la contraseña antes de guardarla.
   ============================================================ */
router.post("/registro", async (req, res) => {
    try {
        const { nombre, correo, password } = req.body;

        if (!nombre || !correo || !password) {
            return res.status(400).json({ error: "Todos los campos son obligatorios." });
        }

        if (!correoValido(correo)) {
            return res.status(400).json({ error: "El correo electrónico no es válido." });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
        }

        // Verificar correo duplicado
        const existente = await pool.query(
            "SELECT id FROM usuarios WHERE correo = $1",
            [correo.toLowerCase().trim()]
        );

        if (existente.rows.length > 0) {
            return res.status(409).json({ error: "Ya existe una cuenta registrada con ese correo." });
        }

        // Cifrar contraseña
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const resultado = await pool.query(
            `INSERT INTO usuarios (nombre, correo, password)
             VALUES ($1, $2, $3)
             RETURNING id, nombre, correo, fecha_registro`,
            [nombre.trim(), correo.toLowerCase().trim(), passwordHash]
        );

        const usuario = resultado.rows[0];

        // Generar token para iniciar sesión automáticamente tras el registro
        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(201).json({
            mensaje: "Usuario registrado correctamente.",
            token,
            usuario
        });

    } catch (error) {
        console.error("Error en /registro:", error);
        return res.status(500).json({ error: "Error interno al registrar el usuario." });
    }
});

/* ============================================================
   POST /api/auth/login
   Verifica las credenciales contra PostgreSQL y devuelve un
   token JWT si son correctas.
   ============================================================ */
router.post("/login", async (req, res) => {
    try {
        const { correo, password } = req.body;

        if (!correo || !password) {
            return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
        }

        const resultado = await pool.query(
            "SELECT * FROM usuarios WHERE correo = $1",
            [correo.toLowerCase().trim()]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({ error: "Correo o contraseña incorrectos." });
        }

        const usuario = resultado.rows[0];
        const passwordOk = await bcrypt.compare(password, usuario.password);

        if (!passwordOk) {
            return res.status(401).json({ error: "Correo o contraseña incorrectos." });
        }

        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.json({
            mensaje: "Acceso correcto. Bienvenido, " + usuario.nombre + ".",
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                fecha_registro: usuario.fecha_registro
            }
        });

    } catch (error) {
        console.error("Error en /login:", error);
        return res.status(500).json({ error: "Error interno al iniciar sesión." });
    }
});

/* ============================================================
   Middleware: verificarToken
   Protege rutas que requieren un usuario autenticado.
   Se exporta para poder usarse en server.js
   ============================================================ */
function verificarToken(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token no proporcionado." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.usuario = payload;
        next();
    } catch (error) {
        return res.status(403).json({ error: "Token inválido o expirado." });
    }
}

module.exports = { router, verificarToken };
