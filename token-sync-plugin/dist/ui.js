"use strict";
(() => {
  // src/ui.ts
  function log(msg) {
    const el = document.getElementById("log");
    el.textContent += msg + "\n";
  }
  function requestPreview() {
    parent.postMessage(
      {
        pluginMessage: {
          type: "PREVIEW"
        }
      },
      "*"
    );
  }
  function notifyUiReady() {
    parent.postMessage(
      {
        pluginMessage: {
          type: "UI_READY"
        }
      },
      "*"
    );
  }
  function setPreview(content) {
    const el = document.getElementById("preview");
    el.textContent = content;
  }
  function togglePreviewMode() {
    const panel = document.getElementById("panel");
    const toggleButton = document.getElementById("toggle-preview");
    const isPreviewMode = panel.classList.toggle("is-preview-mode");
    toggleButton.textContent = isPreviewMode ? "Close" : "JSON";
    if (isPreviewMode) {
      requestPreview();
    }
  }
  function getPluginMessage(data) {
    if (!data || typeof data !== "object") {
      return null;
    }
    const messageData = data;
    if (messageData.pluginMessage && typeof messageData.pluginMessage === "object") {
      return messageData.pluginMessage;
    }
    if (typeof messageData.type === "string") {
      return messageData;
    }
    return null;
  }
  document.getElementById("push").onclick = () => {
    const token = document.getElementById("token").value;
    const repo = document.getElementById("repo").value;
    const branch = document.getElementById("branch").value;
    const base = document.getElementById("base").value;
    const path = document.getElementById("path").value || "tokens.json";
    parent.postMessage(
      {
        pluginMessage: {
          type: "PUSH",
          token,
          repo,
          branch,
          base,
          path
        }
      },
      "*"
    );
  };
  document.getElementById("pull").onclick = () => {
    const token = document.getElementById("token").value;
    const repo = document.getElementById("repo").value;
    const branch = document.getElementById("branch").value;
    const path = document.getElementById("path").value || "tokens.json";
    parent.postMessage(
      {
        pluginMessage: {
          type: "PULL",
          token,
          repo,
          branch,
          path
        }
      },
      "*"
    );
  };
  document.getElementById("refresh-preview").onclick = () => {
    requestPreview();
  };
  document.getElementById("toggle-preview").onclick = () => {
    togglePreviewMode();
  };
  function handlePluginMessage(event) {
    var _a;
    const msg = getPluginMessage(event.data);
    if (!msg || !msg.type) {
      return;
    }
    if (msg.type === "SUCCESS") {
      log(msg.action === "pull" ? "Pull \uC644\uB8CC" : "Push \uC644\uB8CC");
    }
    if (msg.type === "PREVIEW_RESULT") {
      setPreview((_a = msg.content) != null ? _a : "{}");
    }
    if (msg.type === "ERROR") {
      log("\uC5D0\uB7EC: " + msg.error);
    }
  }
  window.onmessage = handlePluginMessage;
  window.addEventListener("message", handlePluginMessage);
  self.onmessage = handlePluginMessage;
  notifyUiReady();
  requestPreview();
})();
//# sourceMappingURL=ui.js.map
