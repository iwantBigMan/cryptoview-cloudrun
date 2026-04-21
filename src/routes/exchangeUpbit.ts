import { Router } from "express";
import { validateAndSaveUpbitCredentialController } from "../controllers/upbitCredentialController";
import { requireFirebaseAuth } from "../middlewares/firebaseAuth";

const router = Router();

router.post(
  "/validate-and-save",
  requireFirebaseAuth,
  validateAndSaveUpbitCredentialController,
);

router.get("/accounts", requireFirebaseAuth, (_req, res) => {
  res.status(501).json({
    message: "Upbit accounts API is not implemented yet.",
  });
});

export default router;
