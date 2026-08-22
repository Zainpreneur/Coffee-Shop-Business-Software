import "dotenv/config";
import express from "express";
import cors from "cors";
import { initSchema } from "./db";

import authRoutes from "./routes/auth";
import menuRoutes from "./routes/menu";
import inventoryRoutes from "./routes/inventory";
import orderRoutes from "./routes/orders";
import customerRoutes from "./routes/customers";
import employeeRoutes from "./routes/employees";
import reportRoutes from "./routes/reports";

initSchema();

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/reports", reportRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`☕ Coffee shop API listening on http://localhost:${PORT}`);
});
