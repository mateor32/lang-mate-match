// backend/routes/premium.js
import express from "express";
import { subscribePremium } from "../controllers/premiumController.js";

const router = express.Router();

// POST /api/premium/subscribe - Endpoint de suscripción
router.post("/subscribe", subscribePremium);

export default router;
