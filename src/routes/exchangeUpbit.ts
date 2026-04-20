import { Router } from "express";
import { validateAndSaveUpbitCredentialController } from "../controllers/upbitCredentialController";
import { requireFirebaseAuth } from "../middlewares/firebaseAuth";

const router = Router();

router.post(
  "/validate-and-save",
  requireFirebaseAuth,
  validateAndSaveUpbitCredentialController,
);

export default router;
