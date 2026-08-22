import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../db";
import { signToken, requireAuth } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = db
    .prepare("SELECT * FROM users WHERE email = ? AND active = 1")
    .get(email) as
    | { id: number; name: string; email: string; password_hash: string; role: "admin" | "manager" | "cashier" }
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = signToken(payload);
  res.json({ token, user: payload });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
