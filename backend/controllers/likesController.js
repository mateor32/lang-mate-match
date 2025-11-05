import { pool } from "../db.js";

// LÍMITES DE DEPURACIÓN BAJOS para pruebas inmediatas de restricción
const LIKE_LIMITS = {
  Gratis: 1, // Restringe después del 1er like
  Premium: 2, // Restringe después del 2do like
  "Super Premium": Infinity, // Ilimitado
};

/**
 * Obtiene el plan actual del usuario (consulta la tabla suscripciones)
 */
const getUserPlan = async (userId) => {
  const result = await pool.query(
    `SELECT
            s.plan_nombre
        FROM
            public.suscripciones s
        WHERE
            s.usuario_id = $1 AND s.fecha_fin > NOW() AND s.estado = 'activo'`,
    [userId]
  );

  if (result.rows.length > 0) {
    return result.rows[0].plan_nombre;
  }
  return "Gratis";
};

/**
 * Middleware para manejar el registro de un nuevo like, aplicando los límites del plan.
 */
export const handleLikeLimit = async (req, res, next) => {
  const swiperId = req.body.swiper_id; // El usuario que da like
  const swiperIdInt = parseInt(swiperId, 10);

  if (!swiperIdInt || isNaN(swiperIdInt)) {
    return res
      .status(400)
      .json({ error: "ID de usuario inválido para el like." });
  }

  // 1. Obtener el plan del usuario
  const plan = await getUserPlan(swiperIdInt);
  const limit = LIKE_LIMITS[plan];

  // Si el límite es infinito (Super Premium), pasamos directamente a la lógica de matching
  if (limit === Infinity) {
    return next();
  }

  try {
    // 2. Verificar y actualizar el contador de likes
    const checkResult = await pool.query(
      `SELECT daily_likes_count, last_like_reset 
             FROM public.usuarios 
             WHERE id = $1`,
      [swiperIdInt]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuario swiper no encontrado." });
    }

    const { daily_likes_count, last_like_reset } = checkResult.rows[0];

    const now = new Date();
    const lastReset = new Date(last_like_reset);

    // Determinar si el contador debe reiniciarse (si la última vez fue ayer o antes)
    // Compara solo la parte de la fecha (toDateString)
    const isNewDay = now.toDateString() !== lastReset.toDateString();

    let newCount = daily_likes_count;
    let newResetTime = last_like_reset;

    if (isNewDay) {
      // Reiniciar el contador al inicio del nuevo día
      newCount = 1;
      newResetTime = now.toISOString();
    } else {
      // Si no es un nuevo día, verificar el límite
      if (daily_likes_count >= limit) {
        // Enviar 403 Forbidden si el límite se ha alcanzado
        return res.status(403).json({
          error: "Límite de likes diario alcanzado.",
          message: `Tu plan (${plan}) tiene un límite de ${limit} likes diarios. Compra Premium para más likes.`,
          count: daily_likes_count,
          limit: limit,
        });
      }
      newCount++;
    }

    // 3. Actualizar el contador y la fecha en la base de datos
    await pool.query(
      `UPDATE public.usuarios
             SET daily_likes_count = $1, last_like_reset = $2
             WHERE id = $3`,
      [newCount, newResetTime, swiperIdInt]
    );

    // 4. Si todo es válido y actualizado, pasa a la lógica de registro del like/matching
    next();
  } catch (err) {
    console.error("Error en la verificación de límite de likes:", err);
    res
      .status(500)
      .json({ error: "Error interno al verificar el límite de likes." });
  }
};
