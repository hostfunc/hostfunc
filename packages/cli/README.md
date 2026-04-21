<div align="center">
  <h1>🚀 @hostfunc/cli</h1>
  <p><b>The official, lightning-fast Command Line Interface for Hostfunc.</b></p>
  <p>Manage, deploy, and execute your tiny, composable TypeScript functions from the terminal.</p>

  [![Version](https://img.shields.io/npm/v/@hostfunc/cli?color=blue&style=flat-square)](https://www.npmjs.com/package/@hostfunc/cli)
  [![License](https://img.shields.io/npm/l/@hostfunc/cli?color=green&style=flat-square)](../../LICENSE)
  [![Node Support](https://img.shields.io/node/v/@hostfunc/cli?color=orange&style=flat-square)](https://nodejs.org)
</div>

<hr />

## 📦 Installation

Get started instantly by installing the CLI globally via npm:

```bash
npm install -g @hostfunc/cli
```

> **Note:** Requires **Node.js ≥ 22**.

## ⚡️ Quickstart

Connect to your workspace and push your first function in seconds:

```bash
# 1. Authenticate your CLI with your token and URL
hostfunc login --token <api-token> --url https://your-hostfunc-url

# 2. Initialize a function context
hostfunc init --fnId <fn_id>

# 3. View your available functions
hostfunc list

# 4. Deploy your function seamlessly
hostfunc deploy

# 5. Run your function with a JSON payload
hostfunc run --payload ./payload.json
```

## 🛠️ Complete Command Reference

| Command | Description | Options |
| :--- | :--- | :--- |
| `login` | Authenticate the CLI with Hostfunc. | `--token <token>`, `--url <baseUrl>` |
| `init` | Initialize a local workspace for a function. | `--url <baseUrl>`, `--fnId <id>` |
| `list` | List available functions in your workspace. | `--query <text>` |
| `deploy` | Deploy the current function bundle to the edge. | `--fnId <id>` |
| `run` | Execute a function immediately with data. | `--fnId <id>`, `--payload <jsonFile>` |
| `logs` | View and stream execution logs. | `--executionId <id>` |
| `secrets set` | Securely set secret environment variables. | `<KEY> <VALUE>`, `--fnId <id>` |
| `help` | Display the help menu and command usage. | |

## 🛡️ Privacy First

**Zero Telemetry.** `@hostfunc/cli` does not collect, store, or transmit any telemetry data. Your code and execution patterns stay yours.
