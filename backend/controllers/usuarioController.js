import { pool } from "../db.js";

export const getInteresesByUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT i.id, i.nombre
       FROM usuario_interes ui
       JOIN intereses i ON ui.interes_id = i.id
       WHERE ui.usuario_id = $1`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener intereses:", err);
    res.status(500).json({ message: "Error al obtener intereses" });
  }
};
