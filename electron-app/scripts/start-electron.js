const { spawn } = require("child_process");
const path = require("path");
const electron = require("electron");

const proc = spawn(String(electron), ["."], {
  stdio: "inherit",
  cwd: path.join(__dirname, ".."),
  env: process.env
});

proc.on("close", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

proc.on("error", (err) => {
  console.error("Electron başlatılamadı:", err.message);
  process.exit(1);
});
