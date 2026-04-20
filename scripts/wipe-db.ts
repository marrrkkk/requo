import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config();
const sql = postgres(process.env.DATABASE_URL as string);
async function main() {
  await sql`DROP SCHEMA IF EXISTS public CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
  await sql`CREATE SCHEMA drizzle`;
  process.exit(0);
}
main();
