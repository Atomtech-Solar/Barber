#!/usr/bin/env node
/**
 * Configura DATABASE_URL para migrations
 * Gera a connection string a partir da senha informada
 * 
 * Execute: npm run db:setup
 * Ou: node scripts/db-setup.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const envPath = join(rootDir, ".env.local");

const PROJECT_REF = "nrvqmjjbhdnayadotjeg";
const DEFAULT_REGION = "us-east-1";

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans?.trim() || "");
    });
  });
}

function saveEnv(dbUrl) {
  let content = "";
  if (existsSync(envPath)) {
    content = readFileSync(envPath, "utf-8");
  } else {
    content = readFileSync(join(rootDir, ".env.example"), "utf-8");
  }
  const lines = content.split("\n");
  let found = false;
  const out = lines.map((line) => {
    if (/^\s*DATABASE_URL=/.test(line)) {
      found = true;
      return `DATABASE_URL=${dbUrl}`;
    }
    return line;
  });
  if (!found) {
    out.push("");
    out.push("# Conexão PostgreSQL para migrations (não exposta ao frontend)");
    out.push(`DATABASE_URL=${dbUrl}`);
  }
  writeFileSync(envPath, out.join("\n") + "\n");
}

async function main() {
  console.log("\n🔧 Configuração de DATABASE_URL para migrations\n");
  console.log("Project ref:", PROJECT_REF);

  const password = await ask("Senha do banco (Database password): ");
  if (!password) {
    console.log("\nSenha não informada. Abortando.");
    process.exit(1);
  }

  const region = await ask(`Região (Enter = ${DEFAULT_REGION}): `) || DEFAULT_REGION;
  const dbUrl = `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;

  saveEnv(dbUrl);

  console.log("\n✅ DATABASE_URL configurada em .env.local");
  console.log("\nExecute: npm run db:migrate\n");
}

main().catch(console.error);
