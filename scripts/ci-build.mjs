import { spawnSync } from "node:child_process";

process.env.DATABASE_URL ||= "file:./prisma/dev.db";

function run(command) {
  const result = spawnSync(command, {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npx prisma generate");
run("npx prisma db push --skip-generate");
run("npx prisma db seed");
run("npx next build");
