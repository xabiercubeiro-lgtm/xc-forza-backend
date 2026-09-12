import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: "https://xc-forza.xabiercubeiro.workers.dev",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "xc-forza-backend",
  });
});

app.get("/api/home", async (c) => {
  const userId = Number(c.req.query("userId") ?? "1");

  const user = await c.env.DB
    .prepare(
      `SELECT id, name, email, role
       FROM users
       WHERE id = ?`
    )
    .bind(userId)
    .first();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const nextSession = await c.env.DB
    .prepare(
      `SELECT
         s.id,
         s.starts_at,
         s.capacity,
         s.status,
         g.name AS group_name,
         COUNT(r.id) AS booked
       FROM sessions s
       JOIN groups g ON g.id = s.group_id
       LEFT JOIN reservations r
         ON r.session_id = s.id
        AND r.status = 'confirmed'
       WHERE s.status = 'active'
         AND datetime(s.starts_at) >= datetime('now')
       GROUP BY s.id
       ORDER BY datetime(s.starts_at)
       LIMIT 1`
    )
    .first();

  return c.json({
    user,
    nextSession,
  });
});

export default app;
