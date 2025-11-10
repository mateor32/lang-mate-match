// backend/routes/premium.js
import express from "express";
import {
  subscribePremium,
  cancelSubscription,
} from "../controllers/premiumController.js"; // ⬅️ Importar cancelSubscription

const router = express.Router();

// POST /api/premium/subscribe - Endpoint de suscripción
router.post("/subscribe", subscribePremium);

// POST /api/premium/cancel - Endpoint de cancelación ⬅️ NUEVA RUTA
router.post("/cancel", cancelSubscription);

export default router;
