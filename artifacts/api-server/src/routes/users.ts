import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middleware/auth";
import { hashPassword } from "../lib/auth";

const router: IRouter = Router();

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.tenantId, req.user!.tenantId));

  res.json(users.map(formatUser));
});

router.post("/users", requireAuth, requireRole("owner", "admin"), async (req, res): Promise<void> => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "name, email, password, and role are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    tenantId: req.user!.tenantId,
    name,
    email,
    passwordHash,
    role,
  }).returning();

  res.status(201).json(formatUser(user));
});

router.patch("/users/:id", requireAuth, requireRole("owner", "admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { role, name } = req.body;

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates.role = role;
  if (name !== undefined) updates.name = name;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(and(eq(usersTable.id, id), eq(usersTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

router.delete("/users/:id", requireAuth, requireRole("owner", "admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (id === req.user!.userId) {
    res.status(400).json({ error: "Cannot remove yourself" });
    return;
  }

  const [user] = await db
    .delete(usersTable)
    .where(and(eq(usersTable.id, id), eq(usersTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.sendStatus(204);
});

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    tenantId: u.tenantId,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  };
}

export default router;
