"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUpbitJwt = createUpbitJwt;
const crypto_1 = require("crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function createUpbitJwt(accessKey, secretKey) {
    const payload = {
        access_key: accessKey,
        nonce: (0, crypto_1.randomUUID)(),
    };
    return jsonwebtoken_1.default.sign(payload, secretKey, {
        algorithm: "HS256",
    });
}
