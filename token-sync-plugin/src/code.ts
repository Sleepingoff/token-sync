import { extractStyleTokens, extractVariables } from "./core/extract";
import { transformTokens, transformTokensWithDiagnostics } from "./core/transform";
import { pushToGitHub, pullFromGitHub } from "./core/github";
import { applyTokens } from "./core/apply";
import { PersistedSettings, PluginMessage, TokenDocument } from "./core/types";

// Figma 메인 컨텍스트에서 표시할 UI 크기만 고정한다.
figma.showUI(__html__, { width: 420, height: 720 });

const SETTINGS_KEY = "token-sync-settings";

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`;
  }

  return String(error);
}

function postPreviewContent(content: string) {
  figma.ui.postMessage({
    type: "PREVIEW_RESULT",
    content,
  });
}

function postPreviewError(error: unknown) {
  postPreviewContent(`{}\n\n/* Preview unavailable: ${formatError(error)} */`);
}

function toPreviewContent(tokens: unknown) {
  return JSON.stringify(tokens, null, 2);
}

function defaultSettings(): PersistedSettings {
  return {
    token: "",
    repo: "",
    branch: "",
    base: "main",
    path: "tokens.json",
    commitMessage: "update tokens",
  };
}

async function loadSettings() {
  const stored = await figma.clientStorage.getAsync(SETTINGS_KEY);

  return {
    ...defaultSettings(),
    ...(stored as Partial<PersistedSettings> | null),
  };
}

async function saveSettings(settings: PersistedSettings) {
  await figma.clientStorage.setAsync(SETTINGS_KEY, settings);
}

function emptyTokenDocument(): TokenDocument {
  return {
    global: {},
    $themes: [],
    $metadata: {
      tokenSetOrder: ["global"],
    },
  };
}

function getCurrentTokens(): TokenDocument {
  const raw = extractVariables();
  const styles = extractStyleTokens();

  if (
    raw.length === 0 &&
    styles.paint.length === 0 &&
    styles.text.length === 0 &&
    styles.effect.length === 0 &&
    styles.grid.length === 0
  ) {
    return emptyTokenDocument();
  }

  return transformTokens(raw, styles);
}

function getPreviewContent() {
  const raw = extractVariables();
  const styles = extractStyleTokens();

  if (
    raw.length === 0 &&
    styles.paint.length === 0 &&
    styles.text.length === 0 &&
    styles.effect.length === 0 &&
    styles.grid.length === 0
  ) {
    return toPreviewContent(emptyTokenDocument());
  }

  const result = transformTokensWithDiagnostics(raw, styles, { strict: false });
  const content = toPreviewContent(result.document);

  if (result.warnings.length === 0) {
    return content;
  }

  const warnings = result.warnings.map((warning) => `- ${warning.message}`).join("\n");
  return `${content}\n\n/* Skipped conflicting tokens:\n${warnings}\n*/`;
}

function syncPreviewToUI() {
  try {
    postPreviewContent(getPreviewContent());
  } catch (error) {
    postPreviewError(error);
  }
}

syncPreviewToUI();
figma.on("documentchange", () => {
  syncPreviewToUI();
});
figma.on("stylechange", () => {
  syncPreviewToUI();
});

figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    if (msg.type === "UI_READY") {
      figma.ui.postMessage({
        type: "SETTINGS_LOADED",
        settings: await loadSettings(),
      });
      syncPreviewToUI();
      return;
    }

    if (msg.type === "PREVIEW") {
      syncPreviewToUI();
      return;
    }

    if (msg.type === "SAVE_SETTINGS") {
      await saveSettings({
        token: msg.token,
        repo: msg.repo,
        branch: msg.branch,
        base: msg.base,
        path: msg.path,
        commitMessage: msg.commitMessage,
      });
      return;
    }

    if (msg.type === "PUSH") {
      // 로컬 변수 -> 토큰 JSON 구조로 변환한 뒤 GitHub에 업로드한다.
      const tokens = getCurrentTokens();

      await saveSettings({
        token: msg.token,
        repo: msg.repo,
        branch: msg.branch,
        base: msg.base,
        path: msg.path,
        commitMessage: msg.commitMessage,
      });

      await pushToGitHub({
        token: msg.token,
        repo: msg.repo,
        branch: msg.branch,
        path: msg.path,
        base: msg.base,
        content: tokens,
        commitMessage: msg.commitMessage,
      });

      figma.ui.postMessage({ type: "SUCCESS", action: "push" });
      syncPreviewToUI();
    }

    if (msg.type === "PULL") {
      // GitHub의 tokens.json을 읽어서 현재 Figma 변수에 반영한다.
      const settings = await loadSettings();

      await saveSettings({
        token: msg.token,
        repo: msg.repo,
        branch: msg.branch,
        base: settings.base,
        path: msg.path,
        commitMessage: settings.commitMessage,
      });

      const tokens = await pullFromGitHub({
        token: msg.token,
        repo: msg.repo,
        branch: msg.branch,
        path: msg.path,
      });

      await applyTokens(tokens);

      figma.ui.postMessage({ type: "SUCCESS", action: "pull" });
      syncPreviewToUI();
    }
  } catch (e) {
    figma.ui.postMessage({ type: "ERROR", error: formatError(e) });
  }
};
