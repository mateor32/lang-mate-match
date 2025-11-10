// backend/routes/translation.js
import express from "express";
import { performTranslation } from "../utils/translation.js";

const router = express.Router();

// POST /api/translate - Endpoint que llama a la API real (LibreTranslate)
router.post("/", async (req, res) => {
  const { message, fromLang, toLang } = req.body;

  if (!message || !fromLang || !toLang) {
    return res
      .status(400)
      .json({ error: "Faltan parámetros: message, fromLang, toLang" });
  }

  // Llama a la función que realiza la traducción real.
  const translatedText = await performTranslation(message, fromLang, toLang);

  res.json({
    original: message,
    translated: translatedText,
    sourceLang: fromLang,
    targetLang: toLang,
  });
});

export default router;
