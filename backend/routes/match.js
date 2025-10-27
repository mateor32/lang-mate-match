import express from "express";

export default function matchRouter(pool) {
  const router = express.Router();

  // GET: todos los matches de un usuario
  router.get("/:userId", async (req, res) => {
    const { userId } = req.params;

    // Validar que userId sea un número
    if (isNaN(userId)) {
      return res.status(400).json({ error: "userId inválido" });
    }

    try {
      const result = await pool.query(
        `SELECT * FROM matches 
         WHERE usuario1_id = $1 OR usuario2_id = $1`,
        [userId]
      );

      res.json(result.rows);
    } catch (err) {
      console.error("ERROR SQL GET /matches/:userId:", err);
      res.status(500).json({ error: "Error al obtener matches" });
    }
  });

  // POST: crear match
  router.post("/", async (req, res) => {
    const { usuario1_id, usuario2_id } = req.body;

    // Validar que lleguen los IDs y sean números
    if (!usuario1_id || !usuario2_id) {
      return res.status(400).json({ error: "Faltan IDs de usuarios" });
    }
    if (isNaN(usuario1_id) || isNaN(usuario2_id)) {
      return res.status(400).json({ error: "IDs deben ser números" });
    }
    if (usuario1_id === usuario2_id) {
      return res
        .status(400)
        .json({ error: "No se puede hacer match con uno mismo" });
    }

    try {
      // Verificar si ya existe un match (incluyendo invertido)
      const existing = await pool.query(
        `SELECT * FROM matches 
         WHERE (usuario1_id = $1 AND usuario2_id = $2)
            OR (usuario1_id = $2 AND usuario2_id = $1)`,
        [usuario1_id, usuario2_id]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: "El match ya existe" });
      }

      const result = await pool.query(
        `INSERT INTO matches (usuario1_id, usuario2_id) 
         VALUES ($1, $2) RETURNING *`,
        [usuario1_id, usuario2_id]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("ERROR SQL POST /matches:", err);
      res.status(500).json({ error: "Error al guardar match" });
    }
  });

  return router;
}
