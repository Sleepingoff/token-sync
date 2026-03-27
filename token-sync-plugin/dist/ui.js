"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };

  // src/ui.ts
  function log(msg) {
    const el = document.getElementById("log");
    el.textContent += msg + "\n";
  }
  function getInputValue(id, fallback = "") {
    return document.getElementById(id).value || fallback;
  }
  function getSettings() {
    return {
      token: getInputValue("token"),
      repo: getInputValue("repo"),
      branch: getInputValue("branch"),
      base: getInputValue("base"),
      path: getInputValue("path", "tokens.json"),
      commitMessage: getInputValue("commit-message", "update tokens")
    };
  }
  function applySettings(settings) {
    const fieldMap = {
      token: "token",
      repo: "repo",
      branch: "branch",
      base: "base",
      path: "path",
      commitMessage: "commit-message"
    };
    for (const [key, elementId] of Object.entries(fieldMap)) {
      const value = settings[key];
      if (typeof value !== "string") {
        continue;
      }
      document.getElementById(elementId).value = value;
    }
  }
  function saveSettings() {
    parent.postMessage(
      {
        pluginMessage: __spreadValues({
          type: "SAVE_SETTINGS"
        }, getSettings())
      },
      "*"
    );
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
    const { token, repo, branch, base, path, commitMessage } = getSettings();
    saveSettings();
    parent.postMessage(
      {
        pluginMessage: {
          type: "PUSH",
          token,
          repo,
          branch,
          base,
          path,
          commitMessage
        }
      },
      "*"
    );
  };
  document.getElementById("pull").onclick = () => {
    const { token, repo, branch, path } = getSettings();
    saveSettings();
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
  for (const id of ["token", "repo", "branch", "base", "path", "commit-message"]) {
    document.getElementById(id).addEventListener("change", saveSettings);
    document.getElementById(id).addEventListener("blur", saveSettings);
  }
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
    if (msg.type === "SETTINGS_LOADED") {
      applySettings(msg.settings);
    }
    if (msg.type === "ERROR") {
      log("\uC5D0\uB7EC: " + msg.error);
    }
  }
  window.addEventListener("message", handlePluginMessage);
  notifyUiReady();
  requestPreview();
})();
//# sourceMappingURL=ui.js.map
