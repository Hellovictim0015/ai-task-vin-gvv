export const databaseConfig = {
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? "rooddt",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "vffdb"
};
