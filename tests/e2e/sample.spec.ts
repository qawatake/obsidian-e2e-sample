import * as fs from "node:fs/promises";
import * as path from "node:path";
import test, {
  type ElectronApplication,
  _electron as electron,
  expect,
  type Page,
} from "@playwright/test";
import { settleVaultWindow } from "../support/obsidian";

const appPath = path.resolve("./.obsidian-unpacked/main.js");
const vaultPath = path.resolve("./tests/test-vault");

let app: ElectronApplication;

test.beforeEach(async () => {
  await fs.rm(path.join(vaultPath, ".obsidian", "workspace.json"), {
    recursive: true,
    force: true,
  });

  app = await electron.launch({
    args: [
      appPath,
      "open",
      `obsidian://open?path=${encodeURIComponent(vaultPath)}`,
    ],
  });

  // Handle JS dialogs (e.g. beforeunload on app close) explicitly.
  // Playwright's implicit auto-dismiss races with Obsidian closing its own
  // dialogs ("No dialog is showing" protocol error), which hangs teardown.
  const handleDialogs = (page: Page) => {
    page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
  };
  app.on("window", handleDialogs);
  for (const page of app.windows()) {
    handleDialogs(page);
  }
});

test.afterEach(async () => {
  // app.close() can hang if Obsidian blocks shutdown (observed with the
  // latest Obsidian in CI), so bound it and force-kill as a fallback.
  if (!app) return;
  // Grab the process handle first: after a successful close() the
  // ElectronApplication object is disposed and process() throws.
  const obsidianProcess = app.process();
  await Promise.race([
    app.close(),
    new Promise((resolve) => setTimeout(resolve, 15_000)),
  ]);
  obsidianProcess.kill();
});

test("Can open the modal by executing the command", async () => {
  const window = await app.firstWindow();

  // Close startup modals (e.g. the vault trust prompt) and wait for the plugin
  await settleVaultWindow(app, window);

  // Execute command "open-sample-modal-simple"
  {
    // Open command palette
    await window.getByLabel("Open command palette", { exact: true }).click();

    // Fill the command palette
    const commandPalette = window.locator(":focus");
    await commandPalette.fill("sample plugin modal");
    await commandPalette.press("Enter");
  }

  // Expect that the modal is open
  await expect(window.getByText("Woah!", { exact: true })).toBeVisible();
});
