const express = require("express");
const cors = require("cors");
const pool = require("./db");
const { router: authRouter, verificarToken } = require("./auth");

const app = express();

app.use(cors());
// Límite aumentado: las fotos se envían como base64 (data URL) y pueden
// pesar varios MB una vez codificadas.
app.use(express.json({ limit: "10mb" }));

/* ============================================================
   RUTAS DE AUTENTICACIÓN
   POST /api/auth/registro
   POST /api/auth/login
   ============================================================ */
app.use("/api/auth", authRouter);

/* Crear
   Protegido: solo usuarios autenticados (no invitados) pueden registrar. */

app.post("/vehiculos", verificarToken, async (req, res) => {

    const {
        codigo,
        marca,
        modelo,
        anio,
        color,
        combustible,
        precio,
        cantidad,
        descripcion,
        foto
    } = req.body;

    const nuevo = await pool.query(
        `INSERT INTO vehiculos
        (codigo,marca,modelo,anio,color,
        combustible,precio,cantidad,descripcion,foto)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *`,
        [
            codigo,
            marca,
            modelo,
            anio,
            color,
            combustible,
            precio,
            cantidad,
            descripcion,
            foto || null
        ]
    );

    res.json(nuevo.rows[0]);
});
/* Actualizar
   Protegido: solo usuarios autenticados (no invitados) pueden editar. */
app.put("/vehiculos/:id", verificarToken, async (req, res) => {

    try {

        const { id } = req.params;

        const {
            codigo,
            marca,
            modelo,
            anio,
            color,
            combustible,
            precio,
            cantidad,
            descripcion,
            foto
        } = req.body;

        // Si el cliente no envía la clave "foto" en el body, se conserva la
        // imagen ya guardada (COALESCE con la foto actual en la BD).
        // Si envía "foto": null explícito, se borra la imagen.
        // Si envía un string (data URL), se reemplaza.
        const fotoParam = foto === undefined ? null : foto;
        const mantenerFotoActual = foto === undefined;

        const resultado = await pool.query(
            `UPDATE vehiculos
             SET codigo=$1,
                 marca=$2,
                 modelo=$3,
                 anio=$4,
                 color=$5,
                 combustible=$6,
                 precio=$7,
                 cantidad=$8,
                 descripcion=$9,
                 foto=CASE WHEN $11 THEN foto ELSE $10 END
             WHERE id=$12
             RETURNING *`,
            [
                codigo,
                marca,
                modelo,
                anio,
                color,
                combustible,
                precio,
                cantidad,
                descripcion,
                fotoParam,
                mantenerFotoActual,
                id
            ]
        );

        res.json(resultado.rows[0]);

    } catch(error) {

        console.error(error);
        res.status(500).json(error);

    }
});

/* Listar */

app.get("/vehiculos", async (req, res) => {

    const resultado =
        await pool.query(
            "SELECT * FROM vehiculos ORDER BY id"
        );

    res.json(resultado.rows);
});

/* Eliminar
   Protegido: solo usuarios autenticados (no invitados) pueden eliminar. */

app.delete("/vehiculos/:id", verificarToken, async (req, res) => {

    const { id } = req.params;

    await pool.query(
        "DELETE FROM vehiculos WHERE id=$1",
        [id]
    );

    res.json("Vehículo eliminado");
});

app.listen(3000, () => {
    console.log("Servidor iniciado en puerto 3000");
});