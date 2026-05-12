import { Router } from "express";
import { getGateIoSpotAveragePriceController } from "../controllers/gateioAveragePriceController";
import { requireFirebaseAuth } from "../middlewares/firebaseAuth";

const router = Router();

router.post(
  "/spot-average-price",
  requireFirebaseAuth,
  getGateIoSpotAveragePriceController,
);

export default router;

