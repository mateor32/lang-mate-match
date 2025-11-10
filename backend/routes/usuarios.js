import express from "express";
import {
  getInteresesByUsuario,
  getIdiomas,
  getIntereses,
  updateUsuario,
  updateIdiomas,
  updateIntereses,
  checkPremiumStatus,
  getNiveles,
} from "../controllers/usuarioController.js"; // Importación directa de las funciones

const router = express.Router();

router.get("/:id/intereses", getInteresesByUsuario);
router.get("/idiomas", getIdiomas);
router.get("/intereses", getIntereses);
router.get("/:id/premium", checkPremiumStatus);
router.get("/niveles", getNiveles);

// Ruta para actualizar información básica del usuario
router.put("/:id", updateUsuario);

// Rutas para actualizar relaciones
router.put("/:id/idiomas", updateIdiomas);
router.put("/:id/intereses", updateIntereses);

// Ruta de interesesssssssss

export default router;
