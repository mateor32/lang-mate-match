import express from "express";
import { getInteresesByUsuario } from "../controllers/usuarioController.js";

const router = express.Router();

// Ruta de intereses
router.get("/:id/intereses", getInteresesByUsuario);

export default router;
