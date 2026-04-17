import { Router } from "express";
import type { Request, Response } from "express";
import { validateUpbitKey } from "../services/upbitService";
import type {
  UpbitValidateRequest,
  UpbitValidateResponse,
} from "../types/upbit";

const router = Router();

router.post(
  "/validate",
  async (
    req: Request<unknown, unknown, Partial<UpbitValidateRequest>>,
    res: Response<UpbitValidateResponse>,
  ): Promise<void> => {
    const accessKey = req.body.accessKey?.trim();
    const secretKey = req.body.secretKey?.trim();

    if (!accessKey || !secretKey) {
      const response: UpbitValidateResponse = {
        valid: false,
        message: "accessKey and secretKey are required.",
      };

      res.status(400).json(response);
      return;
    }

    try {
      const result = await validateUpbitKey(accessKey, secretKey);

      res.status(result.statusCode).json({
        valid: result.valid,
        message: result.message,
      } satisfies UpbitValidateResponse);
    } catch {
      const response: UpbitValidateResponse = {
        valid: false,
        message: "Internal server error.",
      };

      res.status(500).json(response);
    }
  },
);

export default router;
