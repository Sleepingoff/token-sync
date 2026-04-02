import { extractStyleTokens, extractVariables } from "./core/extract";
import { transformTokens, transformTokensWithDiagnostics } from "./core/transform";
import { pushToGitHub, pullFromGitHub } from "./core/github";
import { applyTokens } from "./core/apply";
import { PersistedSettings, PluginMessage, TokenDocument } from "./core/types";

// 디자인 모드는 기본 크기로 시작하고, Dev Mode는 inspector 패널을 더 크게 연다.
figma.showUI(__html__, {
  width: figma.editorType === "dev" ? 460 : 420,
  height: figma.editorType === "dev" ? 1600 : 720,
});

const SETTINGS_KEY = "token-sync-settings";

type SelectionColorEntry = {
  field: string;
  collection: string;
  token: string;
  value: string;
};

type SelectionInfoPayload = {
  nodeName: string;
  colors: SelectionColorEntry[];
  text: string | null;
};

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

function postSelectionColorInfo(payload: SelectionInfoPayload) {
  figma.ui.postMessage({
    type: "SELECTION_COLOR_INFO",
    ...payload,
  });
}

function postUiMode() {
  figma.ui.postMessage({
    type: "UI_MODE",
    editorType: figma.editorType,
    mode: figma.mode,
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

async function getCurrentTokens(): Promise<TokenDocument> {
  const raw = await extractVariables();
  const styles = await extractStyleTokens();

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

async function getPreviewContent() {
  const raw = await extractVariables();
  const styles = await extractStyleTokens();

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

async function syncPreviewToUI() {
  try {
    postPreviewContent(await getPreviewContent());
  } catch (error) {
    postPreviewError(error);
  }
}

function rgbChannelToHex(value: number) {
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, "0");
}

function rgbaToHex(color: RGB | RGBA) {
  const alpha = "a" in color ? color.a : 1;
  const hex = `#${rgbChannelToHex(color.r)}${rgbChannelToHex(color.g)}${rgbChannelToHex(color.b)}`;

  if (alpha >= 1) {
    return hex;
  }

  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

function isVariableAlias(value: VariableValue | undefined): value is VariableAlias {
  return Boolean(value && typeof value === "object" && "type" in value && value.type === "VARIABLE_ALIAS");
}

async function resolveVariableValue(
  variable: Variable,
  resolvedModes: Record<string, string>,
  visited = new Set<string>()
): Promise<VariableValue> {
  const fallbackModeId = Object.keys(variable.valuesByMode)[0];
  const currentModeId = resolvedModes[variable.variableCollectionId] || fallbackModeId;
  const rawValue = variable.valuesByMode[currentModeId];

  if (rawValue === undefined) {
    throw new Error(`변수 "${variable.name}"의 값을 찾을 수 없습니다.`);
  }

  if (!isVariableAlias(rawValue)) {
    return rawValue;
  }

  if (visited.has(variable.id)) {
    throw new Error(`변수 alias 순환 참조가 감지되었습니다: "${variable.name}"`);
  }

  const referenced = await figma.variables.getVariableByIdAsync(rawValue.id);

  if (!referenced) {
    throw new Error(`변수 "${variable.name}"이 참조하는 alias 대상을 찾을 수 없습니다.`);
  }

  const nextVisited = new Set(visited);
  nextVisited.add(variable.id);
  return resolveVariableValue(referenced, resolvedModes, nextVisited);
}

async function formatVariableValue(variable: Variable, resolvedModes: Record<string, string>) {
  const resolved = await resolveVariableValue(variable, resolvedModes);

  if (variable.resolvedType === "COLOR") {
    return rgbaToHex(resolved as RGB | RGBA);
  }

  return String(resolved);
}

async function getCollectionName(collectionId: string) {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collection = collections.find(
    (item) => item.id === collectionId
  );

  return collection?.name || "Unknown collection";
}

async function getBoundColorEntries(node: SceneNode): Promise<SelectionColorEntry[]> {
  if (!("boundVariables" in node) || !node.boundVariables) {
    return [];
  }

  const resolvedModes = "resolvedVariableModes" in node ? node.resolvedVariableModes : {};
  const entries: SelectionColorEntry[] = [];

  const pushAliasEntry = async (field: string, alias: VariableAlias | undefined, index?: number) => {
    if (!alias) {
      return;
    }

    const variable = await figma.variables.getVariableByIdAsync(alias.id);

    if (!variable || variable.resolvedType !== "COLOR") {
      return;
    }

    const modeId = resolvedModes[variable.variableCollectionId];
    entries.push({
      field: index === undefined ? field : `${field}[${index}]`,
      collection: await getCollectionName(variable.variableCollectionId),
      token: variable.name,
      value: await formatVariableValue(variable, resolvedModes),
    });
  };

  for (const [field, alias] of Object.entries(node.boundVariables)) {
    if (field === "fills" || field === "strokes" || field === "effects" || field === "layoutGrids") {
      continue;
    }

    if (Array.isArray(alias)) {
      for (const [index, item] of alias.entries()) {
        await pushAliasEntry(field, item, index);
      }
      continue;
    }

    await pushAliasEntry(field, alias);
  }

  if (node.boundVariables.fills) {
    for (const [index, alias] of node.boundVariables.fills.entries()) {
      await pushAliasEntry("fills", alias, index);
    }
  }

  if (node.boundVariables.strokes) {
    for (const [index, alias] of node.boundVariables.strokes.entries()) {
      await pushAliasEntry("strokes", alias, index);
    }
  }

  if (node.boundVariables.textRangeFills) {
    for (const [index, alias] of node.boundVariables.textRangeFills.entries()) {
      await pushAliasEntry("textRangeFills", alias, index);
    }
  }

  return entries;
}

async function syncSelectionColorsToUI() {
  const selection = figma.currentPage.selection;

  if (selection.length !== 1) {
    postSelectionColorInfo({
      nodeName: selection.length === 0 ? "선택 없음" : `${selection.length}개 레이어 선택됨`,
      colors: [],
      text: null,
    });
    return;
  }

  const node = selection[0];
  postSelectionColorInfo({
    nodeName: node.name,
    colors: await getBoundColorEntries(node),
    text: node.type === "TEXT" ? node.characters : null,
  });
}

async function initializePlugin() {
  await syncPreviewToUI();
  await syncSelectionColorsToUI();

  if (figma.editorType === "figma") {
    await figma.loadAllPagesAsync();

    figma.on("documentchange", () => {
      void syncPreviewToUI();
    });
    figma.on("stylechange", () => {
      void syncPreviewToUI();
    });
  }

  figma.on("selectionchange", () => {
    void syncSelectionColorsToUI();
  });
}

void initializePlugin();

figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    if (msg.type === "UI_READY") {
      postUiMode();
      figma.ui.postMessage({
        type: "SETTINGS_LOADED",
        settings: await loadSettings(),
      });
      if (figma.editorType === "figma") {
        await syncPreviewToUI();
      }
      await syncSelectionColorsToUI();
      return;
    }

    if (msg.type === "PREVIEW" && figma.editorType === "figma") {
      await syncPreviewToUI();
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

    if (msg.type === "RESIZE_UI") {
      if (figma.editorType !== "dev" && !msg.manual) {
        return;
      }

      figma.ui.resize(
        Math.max(360, Math.min(720, Math.round(msg.width))),
        Math.max(320, Math.min(1800, Math.round(msg.height)))
      );
      return;
    }

    if (msg.type === "PUSH") {
      // 로컬 변수 -> 토큰 JSON 구조로 변환한 뒤 GitHub에 업로드한다.
      const tokens = await getCurrentTokens();

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
      await syncPreviewToUI();
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
      await syncPreviewToUI();
      await syncSelectionColorsToUI();
    }
  } catch (e) {
    figma.ui.postMessage({ type: "ERROR", error: formatError(e) });
  }
};
