"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const exchangeGateio_1 = __importDefault(require("./routes/exchangeGateio"));
const exchangeUpbit_1 = __importDefault(require("./routes/exchangeUpbit"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/exchange/gateio", exchangeGateio_1.default);
app.use("/api/exchange/upbit", exchangeUpbit_1.default);
app.get("/", (_req, res) => {
    res.send("Cloud Run TS Server OK");
});
app.get("/test", (_req, res) => {
    res.json({
        message: "success from cloud run",
    });
});
async function getOutboundIp() {
    const response = await fetch("https://api.ipify.org?format=json");
    return (await response.json());
}
app.get("/ip", async (_req, res) => {
    try {
        res.json(await getOutboundIp());
    }
    catch {
        res.status(500).json({ message: "failed to get outbound ip" });
    }
});
app.get("/my-ip", async (_req, res) => {
    try {
        res.json(await getOutboundIp());
    }
    catch {
        res.status(500).json({ message: "failed to get outbound ip" });
    }
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
