// mateor32/lang-mate-match/mateor32-lang-mate-match-13c709073e7292ab8e58547abd2a20fbcfde7497/backend/server.js
import express from "express";
import cors from "cors";
import pkg from "pg";
import usuariosRouter from "./routes/usuarios.js";
import matchRouter from "./routes/match.js";
import messageRouter from "./routes/message.js"; // <-- NUEVO: Importa el router de mensajes
import { googleAuth } from "./controllers/authController.js";

const { Pool } = pkg;

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "linguamatch",
  password: "password",
  port: 5432,
});

app.use("/api/usuarios", usuariosRouter);
app.use("/api/matches", matchRouter(pool));
app.use("/api/messages", messageRouter); // <-- NUEVO: Monta el router de mensajes

app.post("/api/auth/google", googleAuth);

app.get("/api/usuarios", async (req, res) => {
  // ... (código existente del endpoint /api/usuarios)
  try {
    const usuariosResult = await pool.query("SELECT * FROM usuarios");

    // Obtener los idiomas de cada usuario
    // Obtener los idiomas de cada usuario con tipo
    const usuariosConIdiomas = await Promise.all(
      usuariosResult.rows.map(async (usuario) => {
        const idiomasResult = await pool.query(
          `SELECT i.nombre, ui.tipo
       FROM usuario_idioma ui
       JOIN idiomas i ON ui.idioma_id = i.id
       WHERE ui.usuario_id = $1`,
          [usuario.id]
        );

        const interesesResult = await pool.query(
          `SELECT i.nombre
       FROM usuario_interes ui
       JOIN intereses i ON ui.interes_id = i.id
       WHERE ui.usuario_id = $1`,
          [usuario.id]
        );

        return {
          ...usuario,
          usuario_idioma: idiomasResult.rows, // ahora trae tipo también
          intereses: interesesResult.rows.map((r) => r.nombre),
        };
      })
    );

    res.json(usuariosConIdiomas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar usuarios" });
  }
});

// Ruta: obtener un usuario por su ID
app.get("/api/usuarios/:id", async (req, res) => {
  // ... (código existente del endpoint /api/usuarios/:id)
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      "SELECT * FROM usuarios WHERE id = $1",
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    const usuario = userResult.rows[0];

    const idiomasResult = await pool.query(
      `SELECT i.id, i.nombre 
       FROM usuario_idioma ui
       JOIN idiomas i ON ui.idioma_id = i.id
       WHERE ui.usuario_id = $1`,
      [id]
    );

    res.json({
      ...usuario,
      idiomas: idiomasResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar usuario" });
  }
});

// Ruta: obtener todos los idiomas del sistema
app.get("/api/idiomas", async (req, res) => {
  // ... (código existente del endpoint /api/idiomas)
  try {
    const result = await pool.query(
      "SELECT * FROM idiomas ORDER BY nombre ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar idiomas" });
  }
});

// Ruta: traer todas las relaciones usuario-idioma
app.get("/api/usuario_idioma", async (req, res) => {
  // ... (código existente del endpoint /api/usuario_idioma)
  try {
    const result = await pool.query(
      "SELECT * FROM usuario_idioma ORDER BY usuario_id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar usuario_idioma" });
  }
});

app.use("/api/usuarios", usuariosRouter);

// 🔹 Escuchar puerto después de todas las rutas
const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
