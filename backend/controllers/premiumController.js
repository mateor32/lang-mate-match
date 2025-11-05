import { pool } from "../db.js";

/**
 * Simula la suscripción premium insertando un registro en la tabla 'suscripciones'.
 * Si el usuario ya tiene una suscripción activa, la renueva (actualiza fecha_fin).
 */
export const subscribePremium = async (req, res) => {
  // Nota: El frontend te pasa el ID como string, por eso usamos parseInt.
  const { userId, plan } = req.body;
  const userIdInt = parseInt(userId, 10);

  if (!userIdInt || isNaN(userIdInt)) {
    return res
      .status(400)
      .json({ error: "Falta o es inválido el ID de usuario." });
  }

  // Calcular la fecha de expiración (30 días en el futuro)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const expirationDate = futureDate.toISOString();

  try {
    // Utilizamos la cláusula ON CONFLICT DO UPDATE.
    // Esto funciona porque la tabla 'suscripciones' tiene una restricción UNIQUE en 'usuario_id'.
    const result = await pool.query(
      `INSERT INTO public.suscripciones (usuario_id, plan_nombre, fecha_fin, estado)
             VALUES ($1, $2, $3, 'activo')
             ON CONFLICT (usuario_id) DO UPDATE
             SET plan_nombre = $2,
                 fecha_fin = $3,
                 estado = 'activo',
                 fecha_inicio = NOW()
             RETURNING usuario_id, plan_nombre, fecha_fin`,
      [userIdInt, plan, expirationDate]
    );

    const newSubscription = result.rows[0];

    console.log(
      `[Premium] Usuario ${userIdInt} suscrito/renovado al plan: ${plan}`
    );

    res.json({
      success: true,
      userId: newSubscription.usuario_id,
      plan: newSubscription.plan_nombre,
      // Formatear la fecha de expiración para el frontend (ejemplo)
      message: `¡Felicidades! Tu suscripción ${plan} está activa hasta ${new Date(
        newSubscription.fecha_fin
      ).toLocaleDateString()}.`,
    });
  } catch (err) {
    console.error("Error al suscribir a Premium (DB Error):", err);
    // Devolvemos un error 500 y un mensaje genérico.
    res
      .status(500)
      .json({
        error: "Error interno del servidor al procesar la suscripción.",
      });
  }
};
