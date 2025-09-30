import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "linguamatch",
  password: "password",
  port: 5432,
});

// Ruta de prueba: obtener todos los usuarios
app.get("/api/usuarios", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM usuarios");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar usuarios" });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

// Ruta: obtener un usuario por su ID
app.get("/api/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener datos del usuario
    const userResult = await pool.query(
      "SELECT * FROM usuarios WHERE id = $1",
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    const usuario = userResult.rows[0];

    // Obtener idiomas del usuario
    const idiomasResult = await pool.query(
      `SELECT i.id, i.nombre 
       FROM usuario_idioma ui
       JOIN idiomas i ON ui.idioma_id = i.id
       WHERE ui.usuario_id = $1`,
      [id]
    );

    // Devolver usuario con idiomas
    res.json({
      ...usuario,
      idiomas: idiomasResult.rows, // [{id:1,nombre:"Español"},...]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar usuario" });
  }
});

// Ruta: obtener todos los idiomas del sistema
app.get("/api/idiomas", async (req, res) => {
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
