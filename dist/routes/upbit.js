"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upbitService_1 = require("../services/upbitService");
const router = (0, express_1.Router)();
router.post("/validate", async (req, res) => {
    const accessKey = req.body.accessKey?.trim();
    const secretKey = req.body.secretKey?.trim();
    if (!accessKey || !secretKey) {
        const response = {
            valid: false,
            message: "accessKey and secretKey are required.",
        };
        res.status(400).json(response);
        return;
    }
    try {
        const result = await (0, upbitService_1.validateUpbitKey)(accessKey, secretKey);
        res.status(result.statusCode).json({
            valid: result.valid,
            message: result.message,
        });
    }
    catch {
        const response = {
            valid: false,
            message: "Internal server error.",
        };
        res.status(500).json(response);
    }
});
exports.default = router;
