import mysql, { type Pool } from "mysql2/promise";

type ActivityStatus = "success" | "error" | "info";

export type BotSettings = {
  enabled: boolean;
  schedule: string;
  room: string;
  message: string;
  lastNonce: number;
  updatedAt: string;
};

export type Activity = {
  id: number;
  eventType: string;
  status: ActivityStatus;
  summary: string;
  nonce: number | null;
  createdAt: string;
};

type MemoryStore = {
  settings: BotSettings;
  activities: Activity[];
  nextId: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __flopPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __flopSchemaReady: Promise<boolean> | undefined;
  // eslint-disable-next-line no-var
  var __flopMemory: MemoryStore | undefined;
}

const defaultSettings: BotSettings = {
  enabled: false,
  schedule: "*/30 * * * *",
  room: "lobby",
  message: "FLOP agent check-in",
  lastNonce: 0,
  updatedAt: new Date().toISOString(),
};

function memory(): MemoryStore {
  globalThis.__flopMemory ??= {
    settings: { ...defaultSettings },
    activities: [],
    nextId: 1,
  };
  return globalThis.__flopMemory;
}

function pool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  globalThis.__flopPool ??= mysql.createPool({
    uri: url,
    connectionLimit: 4,
    waitForConnections: true,
    enableKeepAlive: true,
  });
  return globalThis.__flopPool;
}

export async function ensureSchema(): Promise<boolean> {
  const db = pool();
  if (!db) return false;
  globalThis.__flopSchemaReady ??= (async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        id TINYINT PRIMARY KEY,
        schedule_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        schedule_expression VARCHAR(64) NOT NULL DEFAULT '*/30 * * * *',
        room VARCHAR(48) NOT NULL DEFAULT 'lobby',
        checkin_message VARCHAR(4096) NOT NULL DEFAULT 'FLOP agent check-in',
        last_nonce BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS bot_activity (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(64) NOT NULL,
        status VARCHAR(16) NOT NULL,
        summary VARCHAR(1000) NOT NULL,
        nonce BIGINT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX activity_created_at_idx (created_at)
      )
    `);
    await db.query(`
      INSERT IGNORE INTO bot_settings (id, schedule_enabled, schedule_expression, room, checkin_message)
      VALUES (1, FALSE, '*/30 * * * *', 'lobby', 'FLOP agent check-in')
    `);
    return true;
  })().catch((error) => {
    console.error("[db] schema unavailable", error instanceof Error ? error.message : "unknown error");
    globalThis.__flopSchemaReady = undefined;
    return false;
  });
  return globalThis.__flopSchemaReady;
}

function rowToSettings(row: Record<string, unknown>): BotSettings {
  return {
    enabled: Boolean(row.schedule_enabled),
    schedule: String(row.schedule_expression ?? defaultSettings.schedule),
    room: String(row.room ?? defaultSettings.room),
    message: String(row.checkin_message ?? defaultSettings.message),
    lastNonce: Number(row.last_nonce ?? 0),
    updatedAt: new Date(String(row.updated_at ?? new Date().toISOString())).toISOString(),
  };
}

export async function getSettings(): Promise<BotSettings> {
  const available = await ensureSchema();
  const db = pool();
  if (!available || !db) return { ...memory().settings };
  const [rows] = await db.query("SELECT * FROM bot_settings WHERE id = 1 LIMIT 1");
  const row = (rows as Record<string, unknown>[])[0];
  return row ? rowToSettings(row) : { ...defaultSettings };
}

export async function updateSettings(input: Partial<Pick<BotSettings, "enabled" | "schedule" | "room" | "message">>): Promise<BotSettings> {
  const current = await getSettings();
  const next = {
    enabled: input.enabled ?? current.enabled,
    schedule: input.schedule ?? current.schedule,
    room: input.room ?? current.room,
    message: input.message ?? current.message,
  };
  const available = await ensureSchema();
  const db = pool();
  if (!available || !db) {
    memory().settings = { ...current, ...next, updatedAt: new Date().toISOString() };
    return { ...memory().settings };
  }
  await db.execute(
    "UPDATE bot_settings SET schedule_enabled = ?, schedule_expression = ?, room = ?, checkin_message = ? WHERE id = 1",
    [next.enabled, next.schedule, next.room, next.message],
  );
  return getSettings();
}

export async function reserveNonce(): Promise<number> {
  const current = await getSettings();
  const candidate = Math.max(Date.now(), current.lastNonce + 1);
  const available = await ensureSchema();
  const db = pool();
  if (!available || !db) {
    const next = Math.max(candidate, memory().settings.lastNonce + 1);
    memory().settings.lastNonce = next;
    memory().settings.updatedAt = new Date().toISOString();
    return next;
  }
  await db.execute("UPDATE bot_settings SET last_nonce = GREATEST(last_nonce + 1, ?) WHERE id = 1", [candidate]);
  const [rows] = await db.query("SELECT last_nonce FROM bot_settings WHERE id = 1 LIMIT 1");
  return Number((rows as Record<string, unknown>[])[0]?.last_nonce ?? candidate);
}

export async function addActivity(input: Omit<Activity, "id" | "createdAt">): Promise<Activity> {
  const available = await ensureSchema();
  const db = pool();
  if (!available || !db) {
    const item: Activity = { ...input, id: memory().nextId++, createdAt: new Date().toISOString() };
    memory().activities.unshift(item);
    memory().activities = memory().activities.slice(0, 100);
    return item;
  }
  const [result] = await db.execute(
    "INSERT INTO bot_activity (event_type, status, summary, nonce) VALUES (?, ?, ?, ?)",
    [input.eventType, input.status, input.summary.slice(0, 1000), input.nonce],
  );
  const insertId = Number((result as { insertId?: number }).insertId ?? 0);
  return { ...input, id: insertId, createdAt: new Date().toISOString() };
}

export async function getActivities(limit = 20): Promise<Activity[]> {
  const available = await ensureSchema();
  const db = pool();
  if (!available || !db) return memory().activities.slice(0, limit);
  const [rows] = await db.query(
    "SELECT id, event_type, status, summary, nonce, created_at FROM bot_activity ORDER BY created_at DESC LIMIT ?",
    [Math.min(Math.max(limit, 1), 100)],
  );
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: Number(row.id),
    eventType: String(row.event_type),
    status: String(row.status) as ActivityStatus,
    summary: String(row.summary),
    nonce: row.nonce === null ? null : Number(row.nonce),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));
}
