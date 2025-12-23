import express from "express";
import { getPublicMenuBySlug } from "../../controllers/customer/menuPublic.controller.js";

const router = express.Router();

router.get("/public/:restaurantSlug", getPublicMenuBySlug);

export default router;
