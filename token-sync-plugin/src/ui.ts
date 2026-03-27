function log(msg: string) {
  // UI에서 받은 상태 메시지를 누적해서 사용자가 작업 결과를 확인할 수 있게 한다.
  const el = document.getElementById("log")!;
  el.textContent += msg + "\n";
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
  const token = (document.getElementById("token") as HTMLInputElement).value;
  const repo = (document.getElementById("repo") as HTMLInputElement).value;
  const branch = (document.getElementById("branch") as HTMLInputElement).value;
  const base = (document.getElementById("base") as HTMLInputElement).value;
  const path = (document.getElementById("path") as HTMLInputElement).value || "tokens.json";

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
      },
    },
    "*"
  );
};
document.getElementById("pull")!.onclick = () => {
  // pull은 base 브랜치가 필요 없으므로 현재 브랜치 정보만 전달한다.
  const token = (document.getElementById("token") as HTMLInputElement).value;
  const repo = (document.getElementById("repo") as HTMLInputElement).value;
  const branch = (document.getElementById("branch") as HTMLInputElement).value;
  const path = (document.getElementById("path") as HTMLInputElement).value || "tokens.json";

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
  if (msg.type === "ERROR") {
    log("에러: " + msg.error);
  }
}

window.onmessage = handlePluginMessage;
window.addEventListener("message", handlePluginMessage);
self.onmessage = handlePluginMessage;

notifyUiReady();
requestPreview();
