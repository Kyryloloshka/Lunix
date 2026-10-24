// PostToolUse hook: after Claude edits a TS/TSX file under src/, run the typecheck and the
// tests related to that file. On failure, exit 2 so the errors are fed back to Claude.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const MAX_OUTPUT_CHARS = 6000;

function readStdin() {
  try {
    return JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: true });
  return { ok: result.status === 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() };
}

function tail(text) {
  return text.length > MAX_OUTPUT_CHARS ? `...\n${text.slice(-MAX_OUTPUT_CHARS)}` : text;
}

const input = readStdin();
const filePath = input.tool_input?.file_path ?? input.tool_response?.filePath;
const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
if (!filePath) process.exit(0);

const relative = path.relative(projectDir, path.resolve(projectDir, filePath)).split(path.sep).join('/');
if (!relative.startsWith('src/') || !/\.(ts|tsx)$/.test(relative)) process.exit(0);

const failures = [];

const typecheck = run('npm', ['run', '--silent', 'ts:check'], projectDir);
if (!typecheck.ok) failures.push(`TypeScript (npm run ts:check) failed:\n${tail(typecheck.output)}`);

// Only the tests that import the edited file, so the hook stays fast on every edit.
const tests = run('npx', ['jest', '--findRelatedTests', `"${relative}"`, '--passWithNoTests', '--silent'], projectDir);
if (!tests.ok) failures.push(`Jest (tests related to ${relative}) failed:\n${tail(tests.output)}`);

if (failures.length > 0) {
  process.stderr.write(`Verification failed after editing ${relative}. Fix these before continuing:\n\n${failures.join('\n\n')}\n`);
  process.exit(2);
}
process.exit(0);
