// backend/routes/likes.js

import express from "express";
import {
  handleLikeLimit,
  registerLikeAndCheckMatch,
} from "../controllers/likesController.js";

const router = express.Router();

// Montamos el middleware de límite antes de la lógica principal del like
router.post("/", handleLikeLimit, registerLikeAndCheckMatch);

export default router;
