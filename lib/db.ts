
import { Pool, PoolClient } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  tiaPool?: Pool;
};

export function getPool(): Pool {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  if (!globalForDb.tiaPool) {
    globalForDb.tiaPool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl:
        process.env.DB_SSL === "true"
          ? { rejectUnauthorized: true }
          : undefined,
    });
  }

  return globalForDb.tiaPool;
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
