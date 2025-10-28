import { OAuth2Client } from "google-auth-library";
// 1. Importar el pool de conexión. Asumo que su db.js exporta 'pool'
import { pool } from "../db.js";

// Reemplace con su ID de cliente real de Google.
const GOOGLE_CLIENT_ID =
  "193035898327-1lbc2ik6jrduikdeuivdcknmfaducadk.apps.googleusercontent.com";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Busca un usuario por email o lo crea si no existe.
 * @param {string} email - Correo electrónico de Google.
 * @param {string} name - Nombre completo del usuario.
 * @param {string} picture - URL de la foto de perfil de Google.
 * @returns {number} El ID del usuario (existente o recién creado).
 */
const findOrCreateUser = async (email, name, picture) => {
  console.log(`[DB Acceso] Procesando usuario: ${email}`);

  // 1. Buscar al usuario por email
  const userResult = await pool.query(
    "SELECT id FROM usuarios WHERE email = $1",
    [email]
  );

  if (userResult.rows.length > 0) {
    // INICIO DE SESIÓN
    const userId = userResult.rows[0].id;
    console.log(`[Auth Éxito] Usuario ${userId} encontrado.`);

    // 2. Usar el nombre de columna 'foto' (confirmado por su CSV)
    await pool.query(
      "UPDATE usuarios SET nombre = $1, foto = $2 WHERE id = $3",
      [name, picture, userId]
    );

    return userId;
  } else {
    // REGISTRO
    try {
      // 3. Usar el nombre de columna 'foto' y 'creado_en' (confirmado por su CSV)
      const newUserResult = await pool.query(
        "INSERT INTO usuarios (email, nombre, foto, creado_en) VALUES ($1, $2, $3, NOW()) RETURNING id",
        [email, name, picture]
      );
      const newUserId = newUserResult.rows[0].id;
      console.log(`[Auth Registro] Nuevo usuario ${newUserId} creado.`);
      return newUserId;
    } catch (error) {
      console.error("Error al insertar nuevo usuario:", error);
      throw new Error("No se pudo registrar al usuario en la base de datos.");
    }
  }
};

export const googleAuth = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Falta el token de Google" });
  }

  try {
    // 1. Verificar el ID Token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // 2. Buscar o crear el usuario en su base de datos
    const userId = await findOrCreateUser(email, name, picture);

    // 3. Devolver la información al frontend
    res.json({
      success: true,
      userId,
      message: "Autenticación y registro/login exitoso.",
      name,
      picture,
    });
  } catch (error) {
    console.error("Error en la autenticación con Google:", error);
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};
