import express from "express";
import pool from "../db";

const router = express.Router();

// Crear mensaje
router.post("/", async (req, res) => {
  const { match_id, sender_id, message } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO messages (match_id, sender_id, message) 
       VALUES ($1, $2, $3) RETURNING *`,
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
