// mateor32/lang-mate-match/lang-mate-match-116754bcb60125a06dae58b4eba07e14418a1409/backend/server.js
import express from "express";
import cors from "cors";
import pkg from "pg";
import usuariosRouter from "./routes/usuarios.js";
import matchRouter from "./routes/match.js";
import messageRouterFactory from "./routes/message.js"; // <-- CORREGIDO: Importa el factory
import { googleAuth } from "./controllers/authController.js";
import premiumRouter from "./routes/premium.js";
import likesRouter from "./routes/likes.js";
import { Server } from "socket.io";

import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/*const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "linguamatch",
  password: "password",
  port: 5432,
});*/

// 🔹 Escuchar puerto después de todas las rutas
const PORT = process.env.PORT || 5000;
const httpServer = app.listen(PORT, () =>
  console.log(`Servidor corriendo en puerto ${PORT}`)
);

const io = new Server(httpServer, {
  path: "/api/socket.io/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Almacenamiento de IDs de sockets por ID de usuario (GLOBAL)
const users = {};

// MONTAJE DE RUTAS
app.use("/api/usuarios", usuariosRouter);
app.use("/api/matches", matchRouter(pool));
// <-- CLAVE: Monta el router de mensajes usando el factory y pasando dependencias
app.use("/api/messages", messageRouterFactory(pool, io, users));
app.use("/api/premium", premiumRouter);
app.use("/api/likes", likesRouter);
app.post("/api/auth/google", googleAuth);

app.get("/api/usuarios", async (req, res) => {
  // MODIFICACIÓN CLAVE: Lee el parámetro de consulta 'recommendationsFor'
  const { recommendationsFor } = req.query;

  try {
    let usuariosResult;

    // Si se pide una lista de recomendaciones, aplicamos la lógica de matching
    if (recommendationsFor) {
      const loggedUserId = parseInt(recommendationsFor, 10);

      // 1. Obtener preferencias y género del usuario logueado
      const loggedUserPrefsResult = await pool.query(
        "SELECT pref_sexo, pref_pais_id, sexo FROM usuarios WHERE id = $1",
        [loggedUserId]
      );
      if (loggedUserPrefsResult.rows.length === 0)
        return res
          .status(404)
          .json({ error: "Usuario logueado no encontrado." });
      // Mantener pref_pais_id aquí, aunque ya no se usará en el WHERE, para mantener la consistencia de parámetros ($2, $3, $4)
      const {
        pref_sexo,
        pref_pais_id,
        sexo: loggedUserGender,
      } = loggedUserPrefsResult.rows[0];

      // 1. Consulta SQL para obtener los IDs de los usuarios recomendados - ACTUALIZADA CON PAÍS Y GÉNERO
      const recommendationsQuery = `
        SELECT
            u.id
        FROM
            usuarios u
        WHERE
            u.id != $1
            -- EXCLUIR LIKES: Si el logueado ya dio like, o si el otro ya dio like al logueado (aunque esto se limpia en matches)
            AND u.id NOT IN (SELECT usuario2_id FROM likes WHERE usuario1_id = $1)
            AND $1 NOT IN (SELECT usuario2_id FROM likes WHERE usuario1_id = u.id)
            
            -- FILTRO 1: GÉNERO PREFERIDO
            -- $2 es pref_sexo (ej: 'Hombre', 'Mujer', 'Todos'). Si es 'Todos', se ignora el filtro.
            AND (u.sexo = $2 OR $2 = 'Todos')
            
            -- FILTRO 2: PAÍS PREFERIDO
            -- $3 es pref_pais_id (un número o NULL/0). Si es NULL o 0, se ignora el filtro.
            AND (u.pais_id = $3 OR $3 IS NULL OR $3 = 0)
            
            -- CRITERIO 2: Compatibilidad Mutua de Idiomas (Aprende/Nativo)
            -- A (logueado) Aprende el que B (candidato) es Nativo
            AND EXISTS (
                SELECT 1 FROM usuario_idioma ui_a
                JOIN usuario_idioma ui_b ON ui_a.idioma_id = ui_b.idioma_id
                WHERE ui_a.usuario_id = $1
                  AND ui_a.tipo = 'aprender'
                  AND ui_b.usuario_id = u.id
                  AND ui_b.tipo = 'nativo'
            )
            -- B (candidato) Aprende el que A (logueado) es Nativo
            AND EXISTS (
                SELECT 1 FROM usuario_idioma ui_b
                JOIN usuario_idioma ui_a ON ui_b.idioma_id = ui_a.idioma_id
                WHERE ui_b.usuario_id = u.id
                  AND ui_b.tipo = 'aprender'
                  AND ui_a.usuario_id = $1
                  AND ui_a.tipo = 'nativo'
            )

            -- CRITERIO 3: Intereses Comunes (Al menos uno)
            AND EXISTS (
                SELECT 1 FROM usuario_interes ui_a
                JOIN usuario_interes ui_b ON ui_a.interes_id = ui_b.interes_id
                WHERE ui_a.usuario_id = $1
                  AND ui_b.usuario_id = u.id
            )
            

        ORDER BY
            u.id
      `;

      let recommendedIdsResult;
      let recommendedIds;

      // La consulta actualizada usa $1: loggedUserId, $2: pref_sexo, $3: pref_pais_id
      const queryParams = [loggedUserId, pref_sexo, pref_pais_id]; // <-- ARRAY DE PARÁMETROS CORREGIDO

      try {
        // --- CRITICAL QUERY EXECUTION ---
        recommendedIdsResult = await pool.query(
          recommendationsQuery,
          queryParams // <-- Se pasan 3 parámetros
        );
        recommendedIds = recommendedIdsResult.rows.map((row) => row.id);
      } catch (sqlRecError) {
        // Explicit logging for the complex recommendation query failure
        console.error(
          "Error SQL en la consulta de recomendaciones:",
          sqlRecError.message
        );
        console.error("Parámetros de consulta:", queryParams);
        // Return specific error to client
        return res.status(500).json({
          error: "Error en la lógica de recomendación SQL",
          details: sqlRecError.message,
        });
      }

      if (recommendedIds.length === 0) {
        return res.json([]);
      }

      // 2. Consulta los datos completos de los usuarios recomendados
      // Añadir JOIN para incluir el nombre del país
      const placeholders = recommendedIds.map((_, i) => `$${i + 1}`).join(",");
      const finalQuery = `SELECT u.*, p.nombre as pais_nombre 
                          FROM usuarios u
                          LEFT JOIN paises p ON u.pais_id = p.id
                          WHERE u.id IN (${placeholders}) ORDER BY id`;

      usuariosResult = await pool.query(finalQuery, recommendedIds);
    } else {
      // Comportamiento original: devolver todos los usuarios (e.g., para admin)
      // Añadir JOIN para incluir el nombre del país
      usuariosResult = await pool.query(
        "SELECT u.*, p.nombre as pais_nombre FROM usuarios u LEFT JOIN paises p ON u.pais_id = p.id"
      );
    }

    // El resto de la lógica para obtener idiomas e intereses por usuario sigue siendo útil
    const usuariosConIdiomas = await Promise.all(
      usuariosResult.rows.map(async (usuario) => {
        const idiomasResult = await pool.query(
          `SELECT i.nombre, ui.tipo, ui.nivel_id, n.nombre as nivel_nombre
           FROM usuario_idioma ui
           JOIN idiomas i ON ui.idioma_id = i.id
           LEFT JOIN niveles n ON ui.nivel_id = n.id -- LEFT JOIN por si nivel_id es null
           WHERE ui.usuario_id = $1`,
          [usuario.id]
        );

        // MODIFICACIÓN CLAVE: Seleccionar i.id y devolver toda la fila (rows)
        const interesesResult = await pool.query(
          `SELECT i.id, i.nombre
       FROM usuario_interes ui
       JOIN intereses i ON ui.interes_id = i.id
       WHERE ui.usuario_id = $1`,
          [usuario.id]
        );

        return {
          ...usuario,
          usuario_idioma: idiomasResult.rows, // ahora trae tipo también
          intereses: interesesResult.rows, // <--- CORREGIDO: Devuelve array de {id, nombre}
        };
      })
    );
    res.json(usuariosConIdiomas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar usuarios" });
  }
});

// Ruta: obtener un usuario por su ID - ACTUALIZADA
app.get("/api/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      `SELECT u.*, p.nombre as pais_nombre
       FROM usuarios u
       LEFT JOIN paises p ON u.pais_id = p.id
       WHERE u.id = $1`,
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    const usuario = userResult.rows[0];

    const idiomasResult = await pool.query(
      `SELECT i.id, i.nombre, ui.tipo, ui.nivel_id, n.nombre as nivel_nombre 
       FROM usuario_idioma ui
       JOIN idiomas i ON ui.idioma_id = i.id
       LEFT JOIN niveles n ON ui.nivel_id = n.id -- LEFT JOIN por si nivel_id es null
       WHERE ui.usuario_id = $1`,
      [id]
    );

    res.json({
      ...usuario,
      idiomas: idiomasResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar usuario" });
  }
});

// Ruta: obtener todos los idiomas del sistema
app.get("/api/idiomas", async (req, res) => {
  // ... (código existente del endpoint /api/idiomas)
  try {
    const result = await pool.query(
      "SELECT * FROM idiomas ORDER BY nombre ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar idiomas" });
  }
});

// Ruta: traer todas las relaciones usuario-idioma
app.get("/api/usuario_idioma", async (req, res) => {
  // ... (código existente del endpoint /api/usuario_idioma)
  try {
    const result = await pool.query(
      "SELECT * FROM usuario_idioma ORDER BY usuario_id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar usuario_idioma" });
  }
});

app.use("/api/usuarios", usuariosRouter);

// --- Configuración y Eventos de Socket.io para la Señalización WebRTC ---

io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado:", socket.id);

  // 1. Registro del usuario al conectarse
  socket.on("user-connected", (userId) => {
    users[userId] = socket.id;
    console.log(`Usuario ${userId} conectado con socket ${socket.id}`);
  });

  // 2. Evento para iniciar una llamada (el remitente envía la oferta al receptor)
  socket.on("call-user", ({ userToCallId, signal, from, name }) => {
    const recipientSocketId = users[userToCallId];
    if (recipientSocketId) {
      // Reenviar la oferta de llamada al socket del destinatario
      io.to(recipientSocketId).emit("receive-call", {
        signal, // La oferta de WebRTC (SDP)
        from, // ID del usuario que llama
        name, // Nombre del usuario que llama
      });
    }
  });

  // 3. Evento para aceptar la llamada (el receptor envía la respuesta al remitente)
  socket.on("accept-call", ({ signal, toId }) => {
    const callerSocketId = users[toId];
    if (callerSocketId) {
      // Reenviar la respuesta de WebRTC (SDP) al socket del remitente
      io.to(callerSocketId).emit("call-accepted", signal);
    }
  });

  // 4. Intercambio de candidatos de red (ICddE candidates)
  socket.on("ice-candidate", ({ toId, candidate }) => {
    const recipientSocketId = users[toId];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("ice-candidate", candidate);
    }
  });

  // 5. Finalizar llamada o desconexión
  socket.on("call-ended", ({ toId }) => {
    const recipientSocketId = users[toId];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("call-ended");
    }
  });

  socket.on("disconnect", () => {
    // Lógica para limpiar el mapa de usuarios
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        break;
      }
    }
  });
});
