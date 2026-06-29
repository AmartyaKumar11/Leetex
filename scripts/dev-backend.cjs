const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

const backendDir = path.join(__dirname, "..", "backend")
const venvPython =
  process.platform === "win32"
    ? path.join(backendDir, ".venv", "Scripts", "python.exe")
    : path.join(backendDir, ".venv", "bin", "python")

const python = fs.existsSync(venvPython) ? venvPython : "python"

const child = spawn(
  python,
  ["-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
  {
    cwd: backendDir,
    stdio: "inherit",
    shell: process.platform === "win32"
  }
)

child.on("exit", (code) => {
  process.exit(code ?? 0)
})

process.on("SIGINT", () => child.kill("SIGINT"))
process.on("SIGTERM", () => child.kill("SIGTERM"))
