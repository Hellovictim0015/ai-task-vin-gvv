import { Sequelize } from "sequelize";
import mysql2 from "mysql2";
import { databaseConfig } from "./config";

const globalForDatabase = globalThis as unknown as { sequelize?: Sequelize };

const sequelizeOptions = {
  dialect: "mysql" as const,
  dialectModule: mysql2,
  host: databaseConfig.host,
  port: databaseConfig.port,
  logging: process.env.DEBUG === "true" ? console.log : false,
  define: {
    freezeTableName: true
  }
};

export const sequelize =
  globalForDatabase.sequelize ??
  (databaseConfig.url
    ? new Sequelize(databaseConfig.url, sequelizeOptions)
    : new Sequelize(databaseConfig.database, databaseConfig.username, databaseConfig.password, sequelizeOptions));

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.sequelize = sequelize;
}
