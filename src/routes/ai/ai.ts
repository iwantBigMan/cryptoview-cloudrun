import { Router } from "express";
import { generatePortfolioInsightController } from "../../controllers/ai/portfolioInsightController";
import { requireFirebaseAuth } from "../../middlewares/firebaseAuth";

const router = Router();

router.post(
  "/portfolio-insight",
  requireFirebaseAuth,
  generatePortfolioInsightController,
);

export default router;
