import express from "express";
import cors from "cors";
import exchangeGateIoRouter from "./routes/gateio/exchangeGateio";
import exchangeUpbitRouter from "./routes/upbit/exchangeUpbit";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/exchange/gateio", exchangeGateIoRouter);
app.use("/api/exchange/upbit", exchangeUpbitRouter);

app.get("/", (_req, res) => {
  res.send("Cloud Run TS Server OK");
});

app.get("/test", (_req, res) => {
  res.json({
    message: "success from cloud run",
  });
});

async function getOutboundIp(): Promise<{ ip?: string }> {
  const response = await fetch("https://api.ipify.org?format=json");
  return (await response.json()) as { ip?: string };
}

app.get("/ip", async (_req, res) => {
  try {
    res.json(await getOutboundIp());
  } catch {
    res.status(500).json({ message: "failed to get outbound ip" });
  }
});

app.get("/my-ip", async (_req, res) => {
  try {
    res.json(await getOutboundIp());
  } catch {
    res.status(500).json({ message: "failed to get outbound ip" });
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
