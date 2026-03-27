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

function log(msg: string) {
  // UI에서 받은 상태 메시지를 누적해서 사용자가 작업 결과를 확인할 수 있게 한다.
  const el = document.getElementById("log")!;
  el.textContent += msg + "\n";
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

function setPreview(content: string) {
  const el = document.getElementById("preview")!;
  el.textContent = content;
}

function togglePreviewMode() {
  const panel = document.getElementById("panel")!;
  const toggleButton = document.getElementById("toggle-preview")!;
  const isPreviewMode = panel.classList.toggle("is-preview-mode");

  toggleButton.textContent = isPreviewMode ? "Close" : "JSON";

  if (isPreviewMode) {
    requestPreview();
  }
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
  if (msg.type === "ERROR") {
    log("에러: " + msg.error);
  }
}

window.addEventListener("message", handlePluginMessage);

notifyUiReady();
requestPreview();
