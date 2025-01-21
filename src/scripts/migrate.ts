import "dotenv/config"
import { migrate } from "drizzle-orm/libsql/migrator"
import { db } from "../lib/db"
 
await migrate(db, { migrationsFolder: "./drizzle" });