import { spawn } from "node:child_process";

const child = spawn("pnpm", ["--filter", "@hostfunc/db", "db:migrate"], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
