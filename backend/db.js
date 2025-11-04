// backend/db.js
/*import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "linguamatch",
  password: "password",
  port: 5432,
});*/

// backend/db.js
import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://linguamatch_db_user:VtnoTmkIQd4yKOGd9R1i3LeLqCGO7ugz@dpg-d41rqj6uk2gs738p06h0-a.oregon-postgres.render.com/linguamatch_db",
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false } // Render requiere SSL
    : false, // Local no usa SSL
});
