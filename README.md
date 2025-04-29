# Obsidian E2E Sample

[![ci](https://github.com/qawatake/obsidian-e2e-sample/actions/workflows/ci.yml/badge.svg?event=schedule)](https://github.com/qawatake/obsidian-e2e-sample/actions/workflows/ci.yml)

This repository provides a sample setup for end-to-end testing of Obsidian plugins using [Playwright](https://playwright.dev).
It is based on the approach developed by [proog](https://github.com/proog) in their [obsidian-trash-explorer](https://github.com/proog/obsidian-trash-explorer) plugin, and extends it by automating the setup process to make testing possible in CI environments.

## Features

- Works on macOS for local testing
- Verified operation in GitHub Actions
- Automates setup of Obsidian, test vault, and plugin
- Uses Electron directly with unpacked Obsidian sources

## How to Use

```sh
npm install
./scripts/setup-obsidian.sh # Unpacks and prepares Obsidian
npm run e2e:setup           # Creates a test vault and registers it to Obsidian
npm run e2e                 # Runs Playwright-based E2E tests
```

See [ci.yml](.github/workflows/ci.yml) for details.

## Acknowledgements

Based on the work in [proog/obsidian-trash-explorer](https://github.com/proog/obsidian-trash-explorer)
