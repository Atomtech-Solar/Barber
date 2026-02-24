/**
 * Executa migrações SQL no Supabase
 * 
 * Execute: node scripts/run-migrations.mjs
 * Ou: npm run db:migrate
 * 
 * Requer: SUPABASE_DB_URL no .env ou variável de ambiente
 * Obtenha em: Supabase Dashboard > Settings > Database > Connection string (URI)
 * Formato: postgresql://postgres.[project-ref]:[SENHA]@aws-0-[regiao].pooler.supabase.com:6543/postgres
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const migrationsDir = join(rootDir, "supabase", "migrations");

// Carrega .env.local ou .env
for (const name of [".env.local", ".env"]) {
  const p = join(rootDir, name);
  if (existsSync(p)) {
    const content = readFileSync(p, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim();
        const val = m[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
    break;
  }
}

const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log("Migrações:", migrations.join(", "));

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!dbUrl || dbUrl.includes("SUA_SENHA") || dbUrl.includes("YOUR_PASSWORD")) {
  console.log("\n⚠️  DATABASE_URL não configurada ou senha não definida.");
  console.log("\n1. Supabase Dashboard > Settings > Database > Connection string (URI)");
  console.log("2. Copie a connection string (Session pooler, porta 6543)");
  console.log("3. Adicione no .env.local: DATABASE_URL=\"postgresql://...\"");
  console.log("4. Ou execute: npm run db:setup\n");
  process.exit(1);
}

try {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  for (const file of migrations) {
    const fp = join(migrationsDir, file);
    const sql = readFileSync(fp, "utf-8");
    console.log("\n▶", file, "...");
    try {
      await client.query(sql);
      console.log("  ✓ OK");
    } catch (err) {
      const msg = err.message || "";
      const ignorar = msg.includes("already exists") || msg.includes("does not exist");
      if (ignorar) {
        console.log("  (ignorado)");
      } else {
        console.error("  ✗", msg);
        await client.end();
        process.exit(1);
      }
    }
  }

  await client.end();
  console.log("\n✅ Migrações concluídas.");
} catch (e) {
  if (e.code === "ERR_MODULE_NOT_FOUND") {
    console.log("\nExecute: npm install pg");
    process.exit(1);
  }
  throw e;
}
