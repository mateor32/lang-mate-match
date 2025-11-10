// backend/controllers/likesController.js

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
  try {
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
      // Devuelve el nombre del plan activo
      return result.rows[0].plan_nombre;
    }

    // Si no hay suscripción activa o no existe, es 'Gratis'
    return "Gratis";
  } catch (err) {
    console.error("Error al obtener el plan del usuario:", err);
    return "Gratis";
  }
};

/**
 * Middleware para manejar el registro de un nuevo like, aplicando los límites del plan.
 * Se han añadido correcciones para manejar valores NULL de la base de datos.
 */
export const handleLikeLimit = async (req, res, next) => {
  const swiperId = req.body.swiper_id;
  const swiperIdInt = parseInt(swiperId, 10);

  if (!swiperIdInt || isNaN(swiperIdInt)) {
    return res
      .status(400)
      .json({ error: "ID de usuario inválido para el like." });
  }

  // 1. Obtener el plan del usuario
  const plan = await getUserPlan(swiperIdInt);
  // Aseguramos que el plan exista en LIKE_LIMITS para evitar un error.
  const limit =
    LIKE_LIMITS[plan] !== undefined ? LIKE_LIMITS[plan] : LIKE_LIMITS.Gratis;

  if (limit === Infinity) {
    console.log(
      `[Likes Check] Usuario ${swiperIdInt} (${plan}): Ilimitado, pasando.`
    );
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

    // **CORRECCIÓN CLAVE:** Manejar valores NULL de la DB para ser más robustos
    let { daily_likes_count, last_like_reset } = checkResult.rows[0];
    daily_likes_count = daily_likes_count || 0; // Si es NULL, usar 0

    const now = new Date();
    // Si last_like_reset es NULL, usamos una fecha antigua para forzar el reinicio
    const lastReset = last_like_reset ? new Date(last_like_reset) : new Date(0);

    const isNewDay = now.toDateString() !== lastReset.toDateString();

    let newCount = daily_likes_count;
    let newResetTime = last_like_reset;

    if (isNewDay) {
      // Reiniciar el contador al inicio del nuevo día (o primera vez)
      newCount = 1;
      newResetTime = now.toISOString();
      console.log(`[Likes Update] Reiniciando contador. Nuevo conteo: 1.`);
    } else {
      // Si no es un nuevo día, verificar el límite
      if (daily_likes_count >= limit) {
        console.warn(
          `[Likes Limit] Usuario ${swiperIdInt} (${plan}): Límite alcanzado. Conteo: ${daily_likes_count}, Límite: ${limit}`
        );

        return res.status(403).json({
          error: "Límite de likes diario alcanzado.",
          message: `Tu plan (${plan}) tiene un límite de ${limit} likes diarios. Compra Premium para más likes.`,
          count: daily_likes_count,
          limit: limit,
        });
      }
      newCount++;
      console.log(
        `[Likes Update] Conteo incrementado. Nuevo conteo: ${newCount}.`
      );
    }

    // 3. Actualizar el contador y la fecha en la base de datos
    await pool.query(
      `UPDATE public.usuarios
             SET daily_likes_count = $1, last_like_reset = $2
             WHERE id = $3`,
      [newCount, newResetTime, swiperIdInt]
    );

    // 4. Pasa a la lógica de registro del like/matching
    next();
  } catch (err) {
    console.error("Error en la verificación de límite de likes:", err);
    res
      .status(500)
      .json({ error: "Error interno al verificar el límite de likes." });
  }
};

/**
 * Lógica para registrar el like y chequear el match (extraída de server.js para centralizar)
 */
export const registerLikeAndCheckMatch = async (req, res) => {
  const { swiper_id, swiped_id } = req.body;
  const swiperId = parseInt(swiper_id, 10);
  const swipedId = parseInt(swiped_id, 10);

  if (swiperId === swipedId) {
    return res.status(400).json({ error: "No se puede dar like a uno mismo" });
  }

  try {
    // 1. Intentar registrar el like unilateral
    await pool.query(
      `INSERT INTO likes (usuario1_id, usuario2_id) 
       VALUES ($1, $2)
       ON CONFLICT (usuario1_id, usuario2_id) DO NOTHING`,
      [swiperId, swipedId]
    );

    // 2. Verificar si existe un like recíproco (Match Mutuo)
    const reciprocalLike = await pool.query(
      `SELECT * FROM likes 
       WHERE usuario1_id = $1 AND usuario2_id = $2`,
      [swipedId, swiperId]
    );

    const matchFound = reciprocalLike.rows.length > 0;

    if (matchFound) {
      // 3. Limpiar likes unilaterales después del match
      await pool.query(
        `DELETE FROM likes 
         WHERE (usuario1_id = $1 AND usuario2_id = $2)
            OR (usuario1_id = $2 AND usuario2_id = $1)`,
        [swiperId, swipedId]
      );

      console.log(
        `[MATCH MUTUO] between ${swiperId} and ${swipedId}. Likes eliminados.`
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
};
