#!/usr/bin/env node
/**
 * Valida configuração de ambiente para migrations e Supabase
 * Verifica: DATABASE_URL, variáveis VITE_*, conexão PostgreSQL, migrations
 *
 * Execute: npm run db:validate
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const migrationsDir = join(rootDir, "supabase", "migrations");

function loadEnvFrom(file) {
  const p = join(rootDir, file);
  if (!existsSync(p)) return {};
  const out = {};
  const content = readFileSync(p, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const k = m[1].trim();
      const v = m[2].trim().replace(/^["']|["']$/g, "");
      out[k] = v;
    }
  }
  return out;
}

async function main() {
  const results = { ok: [], fail: [] };

  // 1. .env.local existe
  const envLocal = loadEnvFrom(".env.local");
  if (Object.keys(envLocal).length) {
    results.ok.push(".env.local existe e tem variáveis");
  } else {
    results.fail.push(".env.local ausente ou vazio");
  }

  // 2. VITE_ variáveis (frontend)
  const hasViteUrl = !!envLocal.VITE_SUPABASE_URL;
  const hasViteKey = !!envLocal.VITE_SUPABASE_ANON_KEY;
  if (hasViteUrl && hasViteKey) {
    results.ok.push("VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY configuradas");
  } else {
    results.fail.push(
      `Variáveis frontend faltando: VITE_SUPABASE_URL=${hasViteUrl}, VITE_SUPABASE_ANON_KEY=${hasViteKey}`
    );
  }

  // 3. DATABASE_URL não exposta via VITE_
  const hasViteDb = Object.keys(envLocal).some((k) => k.startsWith("VITE_") && k.includes("DATABASE"));
  if (!hasViteDb) {
    results.ok.push("DATABASE_URL não exposta ao frontend (seguro)");
  } else {
    results.fail.push("DATABASE_URL não deve usar prefixo VITE_");
  }

  // 4. DATABASE_URL configurada
  const dbUrl = process.env.DATABASE_URL || envLocal.DATABASE_URL || envLocal.SUPABASE_DB_URL;
  const isPlaceholder =
    !dbUrl || dbUrl.includes("SUA_SENHA") || dbUrl.includes("YOUR_PASSWORD") || dbUrl.includes("PASSWORD");

  if (dbUrl && !isPlaceholder) {
    results.ok.push("DATABASE_URL configurada");

    // 5. Testar conexão PostgreSQL
    try {
      const client = new pg.Client({ connectionString: dbUrl });
      await client.connect();
      const r = await client.query("SELECT 1 as ok");
      await client.end();
      if (r?.rows?.[0]?.ok === 1) {
        results.ok.push("Conexão PostgreSQL OK");
      } else {
        results.fail.push("Conexão PostgreSQL retornou dados inesperados");
      }
    } catch (e) {
      results.fail.push(`Conexão PostgreSQL falhou: ${e.message}`);
    }
  } else {
    results.fail.push(
      "DATABASE_URL ausente ou com placeholder. Execute: npm run db:setup"
    );
  }

  // 6. Migrations existem
  if (existsSync(migrationsDir)) {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
    if (files.length) {
      results.ok.push(`${files.length} migrations em supabase/migrations`);
    } else {
      results.fail.push("Nenhuma migration em supabase/migrations");
    }
  } else {
    results.fail.push("Pasta supabase/migrations não encontrada");
  }

  // 7. .gitignore
  const gitignore = existsSync(join(rootDir, ".gitignore"))
    ? readFileSync(join(rootDir, ".gitignore"), "utf-8")
    : "";
  if (
    /\.env\.local/.test(gitignore) ||
    /\.env\*/.test(gitignore) ||
    /\.env$/.test(gitignore)
  ) {
    results.ok.push(".env.local está no .gitignore");
  } else {
    results.fail.push(".env.local deve estar no .gitignore");
  }

  // Output
  console.log("\n📋 Validação de ambiente\n");
  results.ok.forEach((m) => console.log("  ✔", m));
  results.fail.forEach((m) => console.log("  ✘", m));
  console.log("");

  process.exit(results.fail.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
