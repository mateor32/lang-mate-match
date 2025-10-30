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

app.post("/api/likes", async (req, res) => {
  const { swiper_id, swiped_id } = req.body;

  if (swiper_id === swiped_id) {
    return res.status(400).json({ error: "No se puede dar like a uno mismo" });
  }

  try {
    // 1. Intentar registrar el like unilateral
    // Usamos INSERT ... ON CONFLICT DO NOTHING para evitar duplicados y errores
    await pool.query(
      `INSERT INTO likes (usuario1_id, usuario2_id) 
       VALUES ($1, $2)
       ON CONFLICT (usuario1_id, usuario2_id) DO NOTHING`,
      [swiper_id, swiped_id]
    );

    // 2. Verificar si existe un like recíproco (Match Mutuo)
    const reciprocalLike = await pool.query(
      `SELECT * FROM likes 
       WHERE usuario1_id = $1 AND usuario2_id = $2`,
      [swiped_id, swiper_id]
    );

    const matchFound = reciprocalLike.rows.length > 0;

    if (matchFound) {
      // 3. Opcional: Limpiar likes unilaterales después del match para mantener la tabla limpia.
      // Se eliminan ambos likes unilaterales (el original y el recíproco).
      await pool.query(
        `DELETE FROM likes 
         WHERE (usuario1_id = $1 AND usuario2_id = $2)
            OR (usuario1_id = $2 AND usuario2_id = $1)`,
        [swiper_id, swiped_id]
      );

      console.log(
        `[MATCH MUTUO] between ${swiper_id} and ${swiped_id}. Likes eliminados.`
      );

      return res.json({ matchFound: true, swiper_id, swiped_id });
    }

    // 4. Si no hay match
    res.json({ matchFound: false });
  } catch (err) {
    console.error("Error en la gestión de likes:", err);
    res
      .status(500)
      .json({ error: "Error interno del servidor al procesar like" });
  }
});

app.use("/api/usuarios", usuariosRouter);
app.use("/api/matches", matchRouter(pool));
app.use("/api/messages", messageRouter); // <-- NUEVO: Monta el router de mensajes

app.post("/api/auth/google", googleAuth);

app.get("/api/usuarios", async (req, res) => {
  // MODIFICACIÓN CLAVE: Lee el parámetro de consulta 'recommendationsFor'
  const { recommendationsFor } = req.query;

  try {
    let usuariosResult;

    // Si se pide una lista de recomendaciones, aplicamos la lógica de matching
    if (recommendationsFor) {
      const loggedUserId = parseInt(recommendationsFor, 10);

      // 1. Consulta SQL para obtener los IDs de los usuarios recomendados
      const recommendationsQuery = `
        SELECT
            u.id
        FROM
            usuarios u
        WHERE
            u.id != $1
            -- Excluir a los que el usuario logueado ya deslizó (se asume que los likes van a 'likes')
            AND u.id NOT IN (SELECT usuario2_id FROM likes WHERE usuario1_id = $1)
            
            -- CRITERIO 1: Compatibilidad Mutua de Idiomas (Aprende/Nativo)
            -- A Aprende (tipo 'aprender') el que B es Nativo (tipo 'nativo')
            AND EXISTS (
                SELECT 1 FROM usuario_idioma ui_a
                JOIN usuario_idioma ui_b ON ui_a.idioma_id = ui_b.idioma_id
                WHERE ui_a.usuario_id = $1
                  AND ui_a.tipo = 'aprender'
                  AND ui_b.usuario_id = u.id
                  AND ui_b.tipo = 'nativo'
            )
            -- B Aprende (tipo 'aprender') el que A es Nativo (tipo 'nativo')
            AND EXISTS (
                SELECT 1 FROM usuario_idioma ui_b
                JOIN usuario_idioma ui_a ON ui_b.idioma_id = ui_a.idioma_id
                WHERE ui_b.usuario_id = u.id
                  AND ui_b.tipo = 'aprender'
                  AND ui_a.usuario_id = $1
                  AND ui_a.tipo = 'nativo'
            )

            -- CRITERIO 2: Intereses Comunes (Al menos uno)
            AND EXISTS (
                SELECT 1 FROM usuario_interes ui_a
                JOIN usuario_interes ui_b ON ui_a.interes_id = ui_b.interes_id
                WHERE ui_a.usuario_id = $1
                  AND ui_b.usuario_id = u.id
            )
        ORDER BY
            u.id
      `;

      const recommendedIdsResult = await pool.query(recommendationsQuery, [
        loggedUserId,
      ]);
      const recommendedIds = recommendedIdsResult.rows.map((row) => row.id);

      if (recommendedIds.length === 0) {
        return res.json([]);
      }

      // 2. Consulta los datos completos de los usuarios recomendados
      // Usamos = ANY($1) para pasar un array de IDs a la consulta PostgreSQL
      const placeholders = recommendedIds.map((_, i) => `$${i + 1}`).join(",");
      const finalQuery = `SELECT * FROM usuarios WHERE id IN (${placeholders}) ORDER BY id`;

      usuariosResult = await pool.query(finalQuery, recommendedIds);
    } else {
      // Comportamiento original: devolver todos los usuarios (e.g., para admin)
      usuariosResult = await pool.query("SELECT * FROM usuarios");
    }

    // El resto de la lógica para obtener idiomas e intereses por usuario sigue siendo útil
    const usuariosConIdiomas = await Promise.all(
      usuariosResult.rows.map(async (usuario) => {
        const idiomasResult = await pool.query(
          `SELECT i.nombre, ui.tipo
       FROM usuario_idioma ui
       JOIN idiomas i ON ui.idioma_id = i.id
       WHERE ui.usuario_id = $1`,
          [usuario.id]
        );

        // MODIFICACIÓN CLAVE: Seleccionar i.id y devolver toda la fila (rows)
        const interesesResult = await pool.query(
          `SELECT i.id, i.nombre
       FROM usuario_interes ui
       JOIN intereses i ON ui.interes_id = i.id
       WHERE ui.usuario_id = $1`,
          [usuario.id]
        );

        return {
          ...usuario,
          usuario_idioma: idiomasResult.rows, // ahora trae tipo también
          intereses: interesesResult.rows, // <--- CORREGIDO: Devuelve array de {id, nombre}
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
      `SELECT i.id, i.nombre, ui.tipo 
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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
