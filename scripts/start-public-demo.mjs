import { spawn } from "node:child_process";
import { resolve } from "node:path";

const host = "127.0.0.1";
const port = "3000";
const next = resolve("node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [next, "start", "--hostname", host, "--port", port], {
  stdio: "inherit",
  env: {
    ...process.env,
    HEALTHTHREAD_PUBLIC_DEMO: "1",
    HEALTHTHREAD_PUBLIC_ORIGIN: `http://${host}:${port}`,
  },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
