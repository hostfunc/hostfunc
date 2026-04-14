# @hostfunc/cli

Official CLI for Hostfunc.

## Install

```bash
npm install -g @hostfunc/cli
```

## Quickstart

```bash
hostfunc login --token <api-token> --url https://your-hostfunc-url
hostfunc init --fnId <fn_id>
hostfunc list
hostfunc deploy
hostfunc run --payload ./payload.json
```

## Commands

- `hostfunc login --token <token> [--url <baseUrl>]`
- `hostfunc init [--url <baseUrl>] [--fnId <id>]`
- `hostfunc list [--query <text>]`
- `hostfunc deploy [--fnId <id>]`
- `hostfunc run [--fnId <id>] [--payload <jsonFile>]`
- `hostfunc logs [--executionId <id>]`
- `hostfunc secrets set <KEY> <VALUE> [--fnId <id>]`
- `hostfunc help`

## Node Support

- Node.js `>=22`

## Telemetry

`@hostfunc/cli` does not send telemetry.
