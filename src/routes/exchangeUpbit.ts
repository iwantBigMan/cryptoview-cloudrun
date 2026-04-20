import { Router } from "express";
import { validateAndSaveUpbitCredentialController } from "../controllers/upbitCredentialController";

const router = Router();

router.post(
  "/validate-and-save",
  validateAndSaveUpbitCredentialController,
);

export default router;
