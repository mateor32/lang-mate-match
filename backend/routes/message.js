// mateor32/lang-mate-match/mateor32-lang-mate-match-13c709073e7292ab8e58547abd2a20fbcfde7497/backend/routes/message.js

import express from "express";
// import { pool } from "../db.js"; // Ya no se importa directamente

// Se exporta una función que recibe las dependencias
export default function messageRouter(pool, io, users) {
  const router = express.Router();

  // Crear mensaje
  router.post("/", async (req, res) => {
    // 💥 NUEVO: recipient_id es necesario para el envío en tiempo real
    const { match_id, sender_id, message, recipient_id } = req.body;

    if (!match_id || !sender_id || !message || !recipient_id) {
      return res
        .status(400)
        .json({
          error:
            "Faltan parámetros: match_id, sender_id, message, recipient_id",
        });
    }

    try {
      // 1. Guardar en la base de datos
      const result = await pool.query(
        `INSERT INTO messages (match_id, sender_id, message, created_at) 
         VALUES ($1, $2, $3, NOW()) RETURNING *`,
        [match_id, sender_id, message]
      );
      const newMessage = result.rows[0];

      // 2. Formatear timestamp para el frontend
      const timestamp = new Date(newMessage.created_at).toLocaleTimeString(
        "es-ES",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );

      // 3. Emitir mensaje al destinatario en tiempo real
      const recipientSocketId = users[recipient_id];
      if (io && recipientSocketId) {
        io.to(recipientSocketId).emit("new message", {
          ...newMessage,
          text: newMessage.message,
          timestamp,
          isMe: false,
          // Emitimos a 'new message' para que el receptor lo maneje
        });
      }

      // 4. Emitir confirmación al remitente (para actualizar el estado a "no enviando")
      const senderSocketId = users[sender_id];
      if (io && senderSocketId) {
        io.to(senderSocketId).emit("message sent confirmation", {
          ...newMessage,
          text: newMessage.message,
          timestamp,
          tempId: req.body.tempId, // Usamos tempId para identificar el mensaje optimista en el frontend
        });
      }

      res.json(newMessage);
    } catch (err) {
      console.error("Error al enviar el mensaje:", err);
      res.status(500).json({ error: "Error al enviar el mensaje" });
    }
  });

  // Obtener mensajes de un match (sin cambios)
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

  return router;
}
