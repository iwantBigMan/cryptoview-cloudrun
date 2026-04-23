import { Router } from "express";
import { getUpbitAccountsController } from "../controllers/upbitAccountController";
import { validateAndSaveUpbitCredentialController } from "../controllers/upbitCredentialController";
import { requireFirebaseAuth } from "../middlewares/firebaseAuth";

const router = Router();

router.post(
  "/validate-and-save",
  requireFirebaseAuth,
  validateAndSaveUpbitCredentialController,
);

router.get("/accounts", requireFirebaseAuth, getUpbitAccountsController);

export default router;
