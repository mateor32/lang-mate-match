import express from "express";
import { handleLikeLimit } from "../controllers/likesController.js";
// Aquí importarías tu función actual que maneja la lógica de registrar el like/chequear match
// Asumo que tienes una función llamada registerLikeAndCheckMatch
// Como no tengo el código, la llamaré con un placeholder:
const registerLikeAndCheckMatch = (req, res) => {
  // Aquí iría tu lógica actual de DB para registrar el like en la tabla 'likes' y buscar el match
  // ...
  res.json({
    matchFound: false,
    message: "Like registrado, no hubo match (implementación placeholder).",
  });
};

const router = express.Router();

// Montamos el middleware de límite antes de la lógica principal del like
router.post("/", handleLikeLimit, registerLikeAndCheckMatch);

export default router;
