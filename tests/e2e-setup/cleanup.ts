import * as fs from "node:fs/promises";
import * as path from "node:path";
import test, {
  type ElectronApplication,
  _electron as electron,
  expect,
  type Page,
} from "@playwright/test";

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

test("Unregister test vault", async () => {
  let window = await app.firstWindow();

  // Open the vault chooser. Its command name depends on the Obsidian version
  // ("Open another vault" -> "Manage vaults..."), so run it by its stable id.
  // Wait for that command to be registered: the commands registry exists
  // before the workspace is initialised, so executing too early is a no-op.
  await window.waitForFunction(
    () =>
      // @ts-expect-error app is a global in the Obsidian renderer
      window.app?.commands?.findCommand?.("app:open-vault") != null,
  );
  await window.evaluate(() => {
    // @ts-expect-error app is a global in the Obsidian renderer
    window.app.commands.executeCommandById("app:open-vault");
  });

  // Wait for the vault chooser window. waitForEvent("window") misses it when
  // the window opened before the listener was attached, so poll app.windows().
  await expect
    .poll(() => app.windows().some((w) => w.url().includes("starter")))
    .toBe(true);
  const chooser = app.windows().find((w) => w.url().includes("starter"));
  if (!chooser) throw new Error("vault chooser window not found");
  window = chooser;

  // Close the originally opened window
  {
    const originalWindow = app
      .windows()
      .find((w) => !w.url().includes("starter"));
    await originalWindow?.close();
  }
  await window
    .getByLabel(vaultPath)
    .getByLabel("More options", { exact: true })
    .click();
  await window.getByText("Remove from list").click();
});
