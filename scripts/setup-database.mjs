#!/usr/bin/env node
// Applies any new database migrations to the live Supabase project.
//
//   npm run db:setup
//
// The only thing it asks for is a Supabase access token (it opens the page
// where you create one). The token is used for this run only and never saved.
// Safe to run more than once: already-applied migrations are skipped and the
// migrations themselves are written to be re-runnable.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
// Everything up to and including this version was already applied by Lovable.
const BASELINE_VERSION = '20260702155819';
const API = process.env.SUPABASE_API_URL || 'https://api.supabase.com';
const TOKENS_PAGE = 'https://supabase.com/dashboard/account/tokens';

const c = {
  bold: s => `\x1b[1m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  red: s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
};
const step = msg => console.log(`\n${c.bold('›')} ${msg}`);
const good = msg => console.log(`  ${c.green('✔')} ${msg}`);
const warn = msg => console.log(`  ${c.yellow('!')} ${msg}`);
const fail = (msg, hint) => {
  console.log(`\n  ${c.red('✖')} ${msg}`);
  if (hint) console.log(`\n${hint}`);
  process.exit(1);
};

// ---------- project settings (read from the repo, nothing to configure) ----------
const readEnv = () => {
  const env = {};
  const file = join(ROOT, '.env');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m) env[m[1]] = m[2];
    }
  }
  return env;
};
const env = readEnv();
const projectRef = process.env.SUPABASE_PROJECT_REF
  || env.VITE_SUPABASE_PROJECT_ID
  || readFileSync(join(ROOT, 'supabase', 'config.toml'), 'utf8').match(/project_id\s*=\s*"([^"]+)"/)?.[1];
const restUrl = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!projectRef) fail('Could not find the Supabase project id in .env or supabase/config.toml.');

// ---------- helpers ----------
const openInBrowser = url => {
  const [cmd, args] = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
      : ['xdg-open', [url]];
  try { spawn(cmd, args, { stdio: 'ignore', detached: true }).unref(); } catch { /* user can open it manually */ }
};

const askHidden = question => new Promise(resolve => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const write = rl._writeToOutput?.bind(rl);
  rl._writeToOutput = s => { if (!rl.muted) write?.(s); };
  rl.question(question, answer => { rl.close(); process.stdout.write('\n'); resolve(answer.trim()); });
  rl.muted = true;
});

let token = process.env.SUPABASE_ACCESS_TOKEN || '';

const api = async (method, path, body) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
};

const runSql = async query => {
  const { status, data } = await api('POST', `/v1/projects/${projectRef}/database/query`, { query });
  if (status >= 200 && status < 300) return data;
  const message = (data && (data.message || data.error)) || JSON.stringify(data);
  throw new Error(`${status}: ${message}`);
};

const sqlLiteral = s => `'${String(s).replace(/'/g, "''")}'`;

const publicMenuWorks = async () => {
  if (!restUrl || !anonKey) return null;
  try {
    const res = await fetch(`${restUrl}/rest/v1/services?select=id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    return res.ok;
  } catch {
    return null;
  }
};

// ---------- main ----------
console.log(c.bold('\nBeYou Stylin · database setup'));
console.log(c.dim(`Project ${projectRef}`));

step('Signing in to Supabase');
if (!token) {
  console.log(`  A browser page will open. Click ${c.bold('"Generate new token"')}, give it any name`);
  console.log(`  (e.g. "salon setup"), copy it, and paste it below. ${c.dim(`(${TOKENS_PAGE})`)}`);
  openInBrowser(TOKENS_PAGE);
  token = await askHidden('  Paste token (hidden) and press Enter: ');
}
if (!token) fail('No token entered. Run the command again when you have it.');

const project = await api('GET', `/v1/projects/${projectRef}`).catch(e => fail(`Could not reach Supabase: ${e.message}`));
if (project.status === 401) {
  fail('Supabase rejected that token.', '  Copy the whole token (it starts with "sbp_") and run the command again.');
}
if (project.status === 403 || project.status === 404) {
  fail(
    `Your Supabase account does not have access to project ${projectRef}.`,
    [
      '  This usually means the database is managed by Lovable (Lovable Cloud).',
      '  In that case, open the project in Lovable and send this message in the chat:',
      '',
      c.bold('    Please run these SQL files from supabase/migrations as database migrations, in order:'),
      ...readdirSync(MIGRATIONS_DIR).filter(f => /^\d+_.*\.sql$/.test(f) && f.split('_')[0] > BASELINE_VERSION).sort()
        .map(f => c.bold(`      ${f}`)),
      '',
      '  Otherwise, ask the owner of the Supabase project to invite your account.',
    ].join('\n'),
  );
}
if (project.status >= 300) fail(`Unexpected response from Supabase (${project.status}).`, `  ${JSON.stringify(project.data)}`);
good(`Connected to ${c.bold(project.data?.name ?? projectRef)}`);

step('Checking which migrations are needed');
const files = readdirSync(MIGRATIONS_DIR).filter(f => /^\d+_.*\.sql$/.test(f)).sort();
let applied = new Set();
try {
  const rows = await runSql(`
    SELECT version FROM supabase_migrations.schema_migrations
    WHERE to_regclass('supabase_migrations.schema_migrations') IS NOT NULL`);
  applied = new Set((rows || []).map(r => String(r.version)));
} catch {
  // No migration history table: fall back to the baseline below.
}
const pending = files.filter(f => {
  const version = f.split('_')[0];
  return version > BASELINE_VERSION && !applied.has(version);
});
if (pending.length === 0) {
  good('Database is already up to date.');
} else {
  pending.forEach(f => console.log(`  • ${f}`));
}

const before = await publicMenuWorks();
if (before === false) warn('Right now signed-out visitors cannot see the services menu — this setup fixes it.');

for (const file of pending) {
  step(`Applying ${file}`);
  const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
  if (!sql.trim()) { good('Empty file, skipped'); continue; }
  try {
    await runSql(sql);
  } catch (e) {
    fail(
      `Failed: ${e.message}`,
      '  Nothing after this file was applied. Send this message to the developer — the database is safe to retry.',
    );
  }
  const version = file.split('_')[0];
  const name = file.replace(/^\d+_/, '').replace(/\.sql$/, '');
  // Record it like `supabase db push` would, so no tool applies it twice.
  await runSql(`
    DO $$ BEGIN
      IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
        INSERT INTO supabase_migrations.schema_migrations (version, name)
        VALUES (${sqlLiteral(version)}, ${sqlLiteral(name)})
        ON CONFLICT (version) DO NOTHING;
      END IF;
    END $$;`).catch(() => warn('Applied, but could not record it in the migration history (harmless).'));
  good('Done');
}

step('Verifying');
const checks = await runSql(`
  SELECT
    to_regprocedure('public.bookings_prevent_overlap()') IS NOT NULL AS overlap_rule,
    to_regprocedure('public.ensure_customer_record()') IS NOT NULL AS customer_portal,
    to_regprocedure('public.set_member_role(text, public.app_role)') IS NOT NULL AS team_roles,
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bookings_sync_invoice') AS auto_invoices,
    to_regprocedure('public.create_sale(jsonb, uuid, text, uuid, text, text, text, text)') IS NOT NULL AS point_of_sale,
    to_regprocedure('public.apply_invoice_discount(uuid, text)') IS NOT NULL AS vouchers_and_codes`)
  .then(rows => rows?.[0] ?? {})
  .catch(e => fail(`Could not verify: ${e.message}`));
const labels = {
  overlap_rule: 'Double-booking protection',
  customer_portal: 'Customer portal functions',
  team_roles: 'Team & access functions',
  auto_invoices: 'Automatic invoices',
  point_of_sale: 'Point of sale & products',
  vouchers_and_codes: 'Gift vouchers & discount codes',
};
let allGood = true;
for (const [key, label] of Object.entries(labels)) {
  if (checks[key]) good(label);
  else { allGood = false; console.log(`  ${c.red('✖')} ${label} missing`); }
}
const after = await publicMenuWorks();
if (after === true) good('Public services menu loads for signed-out visitors');
else if (after === false) { allGood = false; console.log(`  ${c.red('✖')} Public services menu still fails for signed-out visitors`); }

if (!allGood) fail('Some checks failed — send this output to the developer.');
console.log(`\n${c.green(c.bold('All set.'))} The database is ready for the new version of the app.`);
console.log(c.dim('You can delete the token you created at ' + TOKENS_PAGE + '\n'));
