// mateor32/lang-mate-match/mateor32-lang-mate-match-13c709073e7292ab8e58547abd2a20fbcfde7497/backend/routes/message.js
import express from "express";
import { pool } from "../db.js"; // Se corrige la importación a named export

const router = express.Router();

// Crear mensaje
router.post("/", async (req, res) => {
  const { match_id, sender_id, message } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO messages (match_id, sender_id, message, created_at) 
       VALUES ($1, $2, $3, NOW()) RETURNING *`, // Se añade NOW() para timestamp
      [match_id, sender_id, message]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al enviar el mensaje" });
  }
});

// Obtener mensajes de un match
router.get("/:matchId", async (req, res) => {
  const { matchId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM messages WHERE match_id=$1 ORDER BY created_at ASC`,
      [matchId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener mensajes" });
  }
});

export default router;
