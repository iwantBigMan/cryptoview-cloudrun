import { Router } from "express";
import { getGateIoAccountsController } from "../controllers/gateioAccountController";
import {
  deleteGateIoCredentialController,
  validateAndSaveGateIoCredentialController,
} from "../controllers/gateioCredentialController";
import { requireFirebaseAuth } from "../middlewares/firebaseAuth";

const router = Router();

router.post(
  "/validate-and-save",
  requireFirebaseAuth,
  validateAndSaveGateIoCredentialController,
);

router.get("/accounts", requireFirebaseAuth, getGateIoAccountsController);

router.delete(
  "/credential",
  requireFirebaseAuth,
  deleteGateIoCredentialController,
);

export default router;
