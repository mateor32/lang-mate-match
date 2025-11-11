import { pool } from "../db.js";

// -----------------------------------------------------------
// Rutas de Lectura (GET)
// -----------------------------------------------------------

// GET /api/usuarios/idiomas
export const getIdiomas = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre FROM idiomas ORDER BY nombre"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener idiomas disponibles:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// GET /api/usuarios/paises
export const getPaises = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre FROM paises ORDER BY nombre"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener países disponibles:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// GET /api/usuarios/intereses
export const getIntereses = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre FROM intereses ORDER BY nombre"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener intereses disponibles:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// GET /api/usuarios/:id/intereses (existente)
export const getInteresesByUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const idInt = parseInt(id, 10);
    const result = await pool.query(
      `SELECT i.id, i.nombre
         FROM usuario_interes ui
         JOIN intereses i ON ui.interes_id = i.id
         WHERE ui.usuario_id = $1`,
      [idInt]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener intereses:", err);
    res.status(500).json({ message: "Error al obtener intereses" });
  }
};

// -----------------------------------------------------------
// Rutas de Escritura (PUT/PATCH)
// -----------------------------------------------------------

// PUT /api/usuarios/:id (Perfil Básico) - ACTUALIZADO
export const updateUsuario = async (req, res) => {
  const { id } = req.params;
  // Añadir los nuevos campos a la desestructuración
  const { nombre, bio, foto, pais_id, sexo, pref_pais_id, pref_sexo } =
    req.body;

  // Aseguramos que el ID de la URL sea un entero
  const idInt = parseInt(id, 10);

  // Parsear y establecer valores por defecto para los nuevos campos
  const parsedPaisId = pais_id ? parseInt(pais_id, 10) : null;
  // FIX: Si pref_pais_id es 0 (Todos), guardamos NULL en la DB, ya que 0 no existe como FK.
  const parsedPrefPaisId =
    pref_pais_id && parseInt(pref_pais_id, 10) !== 0
      ? parseInt(pref_pais_id, 10)
      : null;
  const parsedSexo = sexo || null;
  const parsedPrefSexo = pref_sexo || "Todos";

  // 🔴 REFUERZO: Validar que el nombre no esté vacío, ya que es un campo crítico.
  if (!nombre || typeof nombre !== "string" || nombre.trim() === "") {
    return res
      .status(400)
      .json({ error: "El nombre es obligatorio y no puede estar vacío." });
  }

  try {
    const query = `
            UPDATE usuarios
            SET nombre = $1, bio = $2, foto = $3, pais_id = $4, sexo = $5, pref_pais_id = $6, pref_sexo = $7
            WHERE id = $8
            RETURNING *
        `;
    const result = await pool.query(query, [
      nombre.trim(), // 👈 Valor del nombre, limpio de espacios
      bio,
      foto,
      parsedPaisId,
      parsedSexo,
      parsedPrefPaisId,
      parsedPrefSexo,
      idInt,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ message: "Perfil básico actualizado", user: result.rows[0] });
  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    // Mostrar error 500
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// PUT /api/usuarios/:id/idiomas
export const updateIdiomas = async (req, res) => {
  const { id } = req.params;
  const { idiomas } = req.body;

  const idInt = parseInt(id, 10);
  const idiomasArray = Array.isArray(idiomas) ? idiomas : [];

  try {
    await pool.query("BEGIN");

    // 1. Eliminar idiomas existentes del usuario
    await pool.query("DELETE FROM usuario_idioma WHERE usuario_id = $1", [
      idInt,
    ]);

    // 2. Insertar nuevos idiomas con su nivel
    for (const { langId, tipo, nivelId } of idiomasArray) {
      const langIdInt = parseInt(langId, 10);
      // Convertir a INT y usar NULL si no es un número válido o no se proporciona
      const nivelIdInt = nivelId ? parseInt(nivelId, 10) : null;

      if (Number.isInteger(langIdInt) && langIdInt > 0) {
        await pool.query(
          "INSERT INTO usuario_idioma (usuario_id, idioma_id, tipo, nivel_id) VALUES ($1, $2, $3, $4)",
          [idInt, langIdInt, tipo, nivelIdInt]
        );
      }
    }

    await pool.query("COMMIT");
    res.json({ message: "Idiomas y niveles actualizados con éxito" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error al actualizar idiomas y niveles:", err);
    res.status(500).json({
      error: "Error interno del servidor al actualizar idiomas y niveles",
    });
  }
};

// PUT /api/usuarios/:id/intereses
export const updateIntereses = async (req, res) => {
  const { id } = req.params;
  const { intereses } = req.body;

  const idInt = parseInt(id, 10);

  // **CORRECCIÓN CLAVE:** Asegurar que es un array y convertir a números válidos
  const interesesArray = Array.isArray(intereses) ? intereses : [];

  // Convertir a número y filtrar valores no válidos (0 o no enteros)
  const interesesInt = interesesArray
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

  try {
    await pool.query("BEGIN");

    // 1. Eliminar intereses existentes del usuario
    await pool.query("DELETE FROM usuario_interes WHERE usuario_id = $1", [
      idInt,
    ]);

    // 2. Insertar nuevos intereses
    for (const interesId of interesesInt) {
      await pool.query(
        "INSERT INTO usuario_interes (usuario_id, interes_id) VALUES ($1, $2)",
        [idInt, interesId]
      );
    }

    await pool.query("COMMIT");
    res.json({ message: "Intereses actualizados con éxito" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error al actualizar intereses:", err);
    res
      .status(500)
      .json({ error: "Error interno del servidor al actualizar intereses" });
  }
};

export const checkPremiumStatus = async (req, res) => {
  const { id } = req.params;
  const userIdInt = parseInt(id, 10);

  if (!userIdInt || isNaN(userIdInt)) {
    return res.status(400).json({ error: "ID de usuario inválido" });
  }

  try {
    const result = await pool.query(
      `SELECT
        s.plan_nombre,
        s.fecha_fin
      FROM
        public.suscripciones s
      WHERE
        s.usuario_id = $1 AND s.fecha_fin > NOW() AND s.estado = 'activo'`,
      [userIdInt]
    );

    if (result.rows.length > 0) {
      const subscription = result.rows[0];
      return res.json({
        isPremium: true,
        plan: subscription.plan_nombre,
        expires: subscription.fecha_fin,
      });
    }

    res.json({ isPremium: false, plan: "Gratis" });
  } catch (err) {
    console.error("Error al verificar estado Premium:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const getNiveles = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre FROM niveles ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener niveles disponibles:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
