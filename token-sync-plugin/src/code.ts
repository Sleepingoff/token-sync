import { extractStyleTokens, extractVariables } from "./core/extract";
import { transformTokens } from "./core/transform";
import { pushToGitHub, pullFromGitHub } from "./core/github";
import { applyTokens } from "./core/apply";
import { PluginMessage, TokenDocument } from "./core/types";

// Figma 메인 컨텍스트에서 표시할 UI 크기만 고정한다.
figma.showUI(__html__, { width: 420, height: 720 });

function postPreviewContent(content: string) {
  figma.ui.postMessage({
    type: "PREVIEW_RESULT",
    content,
  });
}

function postPreviewError(error: unknown) {
  postPreviewContent(`{}\n\n/* Preview unavailable: ${String(error)} */`);
}

function toPreviewContent(tokens: unknown) {
  return JSON.stringify(tokens, null, 2);
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

function getPreviewTokens() {
  return getCurrentTokens();
}

function syncPreviewToUI() {
  try {
    postPreviewContent(toPreviewContent(getPreviewTokens()));
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
      syncPreviewToUI();
      return;
    }

    if (msg.type === "PREVIEW") {
      syncPreviewToUI();
      return;
    }

    if (msg.type === "PUSH") {
      // 로컬 변수 -> 토큰 JSON 구조로 변환한 뒤 GitHub에 업로드한다.
      const tokens = getCurrentTokens();

      await pushToGitHub({
        token: msg.token,
        repo: msg.repo,
        branch: msg.branch,
        path: msg.path,
        base: msg.base,
        content: tokens,
      });

      figma.ui.postMessage({ type: "SUCCESS", action: "push" });
      syncPreviewToUI();
    }

    if (msg.type === "PULL") {
      // GitHub의 tokens.json을 읽어서 현재 Figma 변수에 반영한다.
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
    // UI는 문자열 메시지만 표시하므로 여기서 에러를 단순화한다.
    figma.ui.postMessage({ type: "ERROR", error: String(e) });
  }
};
