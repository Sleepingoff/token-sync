type StoredSettingsMessage = {
  type: "SETTINGS_LOADED";
  settings: {
    token?: string;
    repo?: string;
    branch?: string;
    base?: string;
    path?: string;
    commitMessage?: string;
  };
};

type SelectionColorInfoMessage = {
  type: "SELECTION_COLOR_INFO";
  nodeName: string;
  colors: Array<{
    field: string;
    collection: string;
    token: string;
    value: string;
  }>;
  text: string | null;
};

type UiModeMessage = {
  type: "UI_MODE";
  editorType: string;
  mode: string;
};

let currentEditorType = "figma";
let manualSize = { width: 420, height: 720 };

function log(msg: string) {
  // UI에서 받은 상태 메시지를 누적해서 사용자가 작업 결과를 확인할 수 있게 한다.
  const el = document.getElementById("log")!;
  el.textContent += msg + "\n";
  requestResize();
}

function getInputValue(id: string, fallback = "") {
  return (document.getElementById(id) as HTMLInputElement).value || fallback;
}

function getSettings() {
  return {
    token: getInputValue("token"),
    repo: getInputValue("repo"),
    branch: getInputValue("branch"),
    base: getInputValue("base"),
    path: getInputValue("path", "tokens.json"),
    commitMessage: getInputValue("commit-message", "update tokens"),
  };
}

function applySettings(settings: StoredSettingsMessage["settings"]) {
  const fieldMap = {
    token: "token",
    repo: "repo",
    branch: "branch",
    base: "base",
    path: "path",
    commitMessage: "commit-message",
  } as const;

  for (const [key, elementId] of Object.entries(fieldMap)) {
    const value = settings[key as keyof typeof settings];

    if (typeof value !== "string") {
      continue;
    }

    (document.getElementById(elementId) as HTMLInputElement).value = value;
  }

  requestResize();
}

function saveSettings() {
  parent.postMessage(
    {
      pluginMessage: {
        type: "SAVE_SETTINGS",
        ...getSettings(),
      },
    },
    "*"
  );
}

function requestPreview() {
  parent.postMessage(
    {
      pluginMessage: {
        type: "PREVIEW",
      },
    },
    "*"
  );
}

function notifyUiReady() {
  parent.postMessage(
    {
      pluginMessage: {
        type: "UI_READY",
      },
    },
    "*"
  );
}

function requestResize() {
  if (currentEditorType !== "dev") {
    return;
  }

  const panel = document.getElementById("panel")!;
  const nextWidth = Math.ceil(panel.getBoundingClientRect().width) + 36;
  const nextHeight = Math.ceil(panel.scrollHeight) + 36;

  parent.postMessage(
    {
      pluginMessage: {
        type: "RESIZE_UI",
        width: nextWidth,
        height: nextHeight,
      },
    },
    "*"
  );
}

function setPreview(content: string) {
  const el = document.getElementById("preview")!;
  el.textContent = content;
  requestResize();
}

function normalizeFieldLabel(field: string) {
  if (field.startsWith("fills")) return "Fill";
  if (field.startsWith("strokes")) return "Stroke";
  if (field.startsWith("textRangeFills")) return "Text Fill";
  return field;
}

function setSelectionColorInfo(message: SelectionColorInfoMessage) {
  const title = document.getElementById("selection-title")!;
  const list = document.getElementById("selection-colors")!;
  const textPanel = document.getElementById("selection-text-panel")!;
  const textContent = document.getElementById("selection-text-content")!;
  const copyButton = document.getElementById("copy-selection-text") as HTMLButtonElement;

  title.textContent = `Selected layer: ${message.nodeName}`;

  if (message.colors.length === 0) {
    list.innerHTML = '<div class="selection-empty">바인딩된 컬러 변수를 찾지 못했습니다.</div>';
  } else {
    const groups = new Map<string, SelectionColorInfoMessage["colors"]>();

    for (const color of message.colors) {
      const groupKey = normalizeFieldLabel(color.field);
      const existing = groups.get(groupKey) || [];
      existing.push(color);
      groups.set(groupKey, existing);
    }

    list.innerHTML = Array.from(groups.entries())
      .map(([group, items]) => {
        const cards = items
          .map(
            (item) => `
              <article class="selection-color-card">
                <div class="selection-color-token">${item.token}</div>
                <div class="selection-color-collection">${item.collection}</div>
                <div class="selection-color-value">${item.value}</div>
              </article>
            `
          )
          .join("");

        return `
          <section class="selection-color-group">
            <h3 class="selection-color-group-title">${group}</h3>
            <div class="selection-color-grid">${cards}</div>
          </section>
        `;
      })
      .join("");
  }

  if (typeof message.text === "string") {
    textPanel.hidden = false;
    textContent.textContent = message.text || "(빈 텍스트)";
    copyButton.disabled = message.text.length === 0;
    copyButton.dataset.text = message.text;
  } else {
    textPanel.hidden = true;
    textContent.textContent = "";
    copyButton.disabled = true;
    copyButton.dataset.text = "";
  }

  requestResize();
}

function setUiMode(message: UiModeMessage) {
  const panel = document.getElementById("panel")!;
  const modeBadge = document.getElementById("mode-badge")!;
  const isDevMode = message.editorType === "dev";

  currentEditorType = message.editorType;
  panel.classList.toggle("is-dev-mode", isDevMode);
  panel.classList.toggle("is-design-mode", !isDevMode);
  modeBadge.textContent = isDevMode ? "Dev Mode" : "Design Mode";
  requestResize();
}

function requestManualResize(width: number, height: number) {
  manualSize = { width, height };
  parent.postMessage(
    {
      pluginMessage: {
        type: "RESIZE_UI",
        width,
        height,
        manual: true,
      },
    },
    "*"
  );
}

function bindResizeHandle() {
  const handle = document.getElementById("resize-handle");

  if (!handle) {
    return;
  }

  handle.addEventListener("pointerdown", (event) => {
    if (currentEditorType !== "figma") {
      return;
    }

    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = manualSize.width;
    const startHeight = manualSize.height;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = startWidth + (moveEvent.clientX - startX);
      const nextHeight = startHeight + (moveEvent.clientY - startY);
      requestManualResize(nextWidth, nextHeight);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });
}

function togglePreviewMode() {
  const panel = document.getElementById("panel")!;
  const toggleButton = document.getElementById("toggle-preview")!;
  const isPreviewMode = panel.classList.toggle("is-preview-mode");

  toggleButton.textContent = isPreviewMode ? "Close" : "JSON";

  if (isPreviewMode) {
    requestPreview();
  }

  requestResize();
}

function getPluginMessage(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const messageData = data as { pluginMessage?: unknown; type?: unknown };

  if (
    messageData.pluginMessage &&
    typeof messageData.pluginMessage === "object"
  ) {
    return messageData.pluginMessage as {
      type?: string;
      content?: string;
      error?: string;
      action?: string;
    };
  }

  if (typeof messageData.type === "string") {
    return messageData as {
      type?: string;
      content?: string;
      error?: string;
      action?: string;
    };
  }

  return null;
}

document.getElementById("push")!.onclick = () => {
  // 입력값은 클릭 시점마다 다시 읽어 최신 설정으로 전송한다.
  const { token, repo, branch, base, path, commitMessage } = getSettings();
  saveSettings();

  // UI iframe에서 Figma 메인 컨텍스트로 push 요청을 전달한다.
  parent.postMessage(
    {
      pluginMessage: {
        type: "PUSH",
        token,
        repo,
        branch,
        base,
        path,
        commitMessage,
      },
    },
    "*"
  );
};
document.getElementById("pull")!.onclick = () => {
  // pull은 base 브랜치가 필요 없으므로 현재 브랜치 정보만 전달한다.
  const { token, repo, branch, path } = getSettings();
  saveSettings();

  // 저장소의 tokens.json을 받아오도록 메인 컨텍스트에 요청한다.
  parent.postMessage(
    {
      pluginMessage: {
        type: "PULL",
        token,
        repo,
        branch,
        path,
      },
    },
    "*"
  );
};
document.getElementById("refresh-preview")!.onclick = () => {
  requestPreview();
};
document.getElementById("toggle-preview")!.onclick = () => {
  togglePreviewMode();
};
document.getElementById("copy-selection-text")!.onclick = async () => {
  const button = document.getElementById("copy-selection-text") as HTMLButtonElement;
  const text = button.dataset.text || "";

  if (!text) {
    return;
  }

  await navigator.clipboard.writeText(text);
  button.textContent = "Copied";
  window.setTimeout(() => {
    button.textContent = "Copy Text";
    requestResize();
  }, 1200);
  requestResize();
};

for (const id of ["token", "repo", "branch", "base", "path", "commit-message"]) {
  document.getElementById(id)!.addEventListener("change", saveSettings);
  document.getElementById(id)!.addEventListener("blur", saveSettings);
}

function handlePluginMessage(event: MessageEvent) {
  // 플러그인 메인 코드가 보내는 완료/실패 메시지를 UI 로그에 반영한다.
  const msg = getPluginMessage(event.data);

  if (!msg || !msg.type) {
    return;
  }
  if (msg.type === "SUCCESS") {
    log(msg.action === "pull" ? "Pull 완료" : "Push 완료");
  }
  if (msg.type === "PREVIEW_RESULT") {
    setPreview(msg.content ?? "{}");
  }
  if (msg.type === "SETTINGS_LOADED") {
    applySettings((msg as StoredSettingsMessage).settings);
  }
  if (msg.type === "UI_MODE") {
    setUiMode(msg as UiModeMessage);
  }
  if (msg.type === "SELECTION_COLOR_INFO") {
    setSelectionColorInfo(msg as SelectionColorInfoMessage);
  }
  if (msg.type === "ERROR") {
    log("에러: " + msg.error);
  }
}

window.addEventListener("message", handlePluginMessage);
window.addEventListener("load", requestResize);
window.addEventListener("resize", requestResize);
bindResizeHandle();

notifyUiReady();
requestPreview();
