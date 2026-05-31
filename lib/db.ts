import sql from "mssql";

const config = {
    user: "sa",
    password: "MyStrongPass123!",
    server: "127.0.0.1",
    port: 1433,
    database: "wb_analytics",
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };


let pool: sql.ConnectionPool | null = null;

export async function getDB() {
  if (pool) return pool;

  pool = await sql.connect(config);
  return pool;
}