// mateor32/lang-mate-match/mateor32-lang-mate-match-13c709073e7292ab8e58547abd2a20fbcfde7497/backend/server.js
import express from "express";
import cors from "cors";
import pkg from "pg";
import usuariosRouter from "./routes/usuarios.js";
import matchRouter from "./routes/match.js";
import messageRouter from "./routes/message.js"; // <-- NUEVO: Importa el router de mensajes
import { googleAuth } from "./controllers/authController.js";
import premiumRouter from "./routes/premium.js";
import { Server } from "socket.io"; // // <-- CORRECCIÓN: ajustada la capitalización para coincidir con el nombre real del fichero

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

app.use("/api/usuarios", usuariosRouter);
app.use("/api/matches", matchRouter(pool));
app.use("/api/messages", messageRouter); // <-- NUEVO: Monta el router de mensajes
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

      // 1. Consulta SQL para obtener los IDs de los usuarios recomendados
      const recommendationsQuery = `
        SELECT
            u.id
        FROM
            usuarios u
        WHERE
            u.id != $1
            -- Excluir a los que el usuario logueado ya deslizó (se asume que los likes van a 'likes')
            AND u.id NOT IN (SELECT usuario2_id FROM likes WHERE usuario1_id = $1)
            
            -- CRITERIO 1: Compatibilidad Mutua de Idiomas (Aprende/Nativo)
            -- A Aprende (tipo 'aprender') el que B es Nativo (tipo 'nativo')
            AND EXISTS (
                SELECT 1 FROM usuario_idioma ui_a
                JOIN usuario_idioma ui_b ON ui_a.idioma_id = ui_b.idioma_id
                WHERE ui_a.usuario_id = $1
                  AND ui_a.tipo = 'aprender'
                  AND ui_b.usuario_id = u.id
                  AND ui_b.tipo = 'nativo'
            )
            -- B Aprende (tipo 'aprender') el que A es Nativo (tipo 'nativo')
            AND EXISTS (
                SELECT 1 FROM usuario_idioma ui_b
                JOIN usuario_idioma ui_a ON ui_b.idioma_id = ui_a.idioma_id
                WHERE ui_b.usuario_id = u.id
                  AND ui_b.tipo = 'aprender'
                  AND ui_a.usuario_id = $1
                  AND ui_a.tipo = 'nativo'
            )

            -- CRITERIO 2: Intereses Comunes (Al menos uno)
            AND EXISTS (
                SELECT 1 FROM usuario_interes ui_a
                JOIN usuario_interes ui_b ON ui_a.interes_id = ui_b.interes_id
                WHERE ui_a.usuario_id = $1
                  AND ui_b.usuario_id = u.id
            )
        ORDER BY
            u.id
      `;

      const recommendedIdsResult = await pool.query(recommendationsQuery, [
        loggedUserId,
      ]);
      const recommendedIds = recommendedIdsResult.rows.map((row) => row.id);

      if (recommendedIds.length === 0) {
        return res.json([]);
      }

      // 2. Consulta los datos completos de los usuarios recomendados
      // Usamos = ANY($1) para pasar un array de IDs a la consulta PostgreSQL
      const placeholders = recommendedIds.map((_, i) => `$${i + 1}`).join(",");
      const finalQuery = `SELECT * FROM usuarios WHERE id IN (${placeholders}) ORDER BY id`;

      usuariosResult = await pool.query(finalQuery, recommendedIds);
    } else {
      // Comportamiento original: devolver todos los usuarios (e.g., para admin)
      usuariosResult = await pool.query("SELECT * FROM usuarios");
    }

    // El resto de la lógica para obtener idiomas e intereses por usuario sigue siendo útil
    const usuariosConIdiomas = await Promise.all(
      usuariosResult.rows.map(async (usuario) => {
        const idiomasResult = await pool.query(
          `SELECT i.nombre, ui.tipo
       FROM usuario_idioma ui
       JOIN idiomas i ON ui.idioma_id = i.id
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

// Ruta: obtener un usuario por su ID
app.get("/api/usuarios/:id", async (req, res) => {
  // ... (código existente del endpoint /api/usuarios/:id)
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      "SELECT * FROM usuarios WHERE id = $1",
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    const usuario = userResult.rows[0];

    const idiomasResult = await pool.query(
      `SELECT i.id, i.nombre, ui.tipo 
       FROM usuario_idioma ui
       JOIN idiomas i ON ui.idioma_id = i.id
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

// --- AÑADIR: Configuración y Eventos de Socket.io para la Señalización WebRTC ---

// 🔹 Escuchar puerto después de todas las rutas
const PORT = process.env.PORT || 5000;
const httpServer = app.listen(PORT, () =>
  console.log(`Servidor corriendo en puerto ${PORT}`)
);

const io = new Server(httpServer, {
  path: "/api/socket.io/", // <--- CORRECCIÓN CLAVE: Path explícito
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Almacenamiento de IDs de sockets por ID de usuario
const users = {};

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

  // 4. Intercambio de candidatos de red (ICE candidates)
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

//app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
