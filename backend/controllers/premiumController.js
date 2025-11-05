// backend/controllers/premiumController.js
import { pool } from "../db.js";

/**
 * Simula la suscripción premium y actualiza el estado del usuario.
 */
export const subscribePremium = async (req, res) => {
  const { userId, plan } = req.body; // 'plan' puede ser 'Premium' o 'Super Premium'

  if (!userId) {
    return res.status(400).json({ error: "Falta el ID de usuario." });
  }

  // NOTA: En una aplicación real, aquí integrarías Stripe/PayPal.
  // Aquí solo simulamos el éxito.

  try {
    // Actualizar la columna is_premium a TRUE en la tabla usuarios
    const result = await pool.query(
      `UPDATE usuarios
             SET is_premium = TRUE
             WHERE id = $1
             RETURNING id, is_premium, nombre`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    console.log(`[Premium] Usuario ${userId} suscrito al plan: ${plan}`);

    res.json({
      success: true,
      userId: result.rows[0].id,
      isPremium: result.rows[0].is_premium,
      message: `¡Felicidades! Te has suscrito al plan ${plan}.`,
    });
  } catch (err) {
    console.error("Error al suscribir a Premium:", err);
    res
      .status(500)
      .json({
        error: "Error interno del servidor al procesar la suscripción.",
      });
  }
};
