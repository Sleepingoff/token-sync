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
  var currentEditorType = "figma";
  var manualSize = { width: 420, height: 720 };
  var pendingPullRequestContext = null;
  var isPullRequestLoading = false;
  var isCreatingPullRequest = false;
  function log(msg) {
    const el = document.getElementById("log");
    el.textContent += msg + "\n";
    requestResize();
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
    requestResize();
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
  function requestResize() {
    if (currentEditorType !== "dev") {
      return;
    }
    const panel = document.getElementById("panel");
    const nextWidth = Math.ceil(panel.getBoundingClientRect().width) + 36;
    const nextHeight = Math.ceil(panel.scrollHeight) + 36;
    parent.postMessage(
      {
        pluginMessage: {
          type: "RESIZE_UI",
          width: nextWidth,
          height: nextHeight
        }
      },
      "*"
    );
  }
  function setPreview(content) {
    const el = document.getElementById("preview");
    el.textContent = content;
    requestResize();
  }
  function normalizeFieldLabel(field) {
    if (field.startsWith("fills"))
      return "Fill";
    if (field.startsWith("strokes"))
      return "Stroke";
    if (field.startsWith("textRangeFills"))
      return "Text Fill";
    return field;
  }
  function setSelectionColorInfo(message) {
    const title = document.getElementById("selection-title");
    const list = document.getElementById("selection-colors");
    const textPanel = document.getElementById("selection-text-panel");
    const textContent = document.getElementById("selection-text-content");
    const copyButton = document.getElementById("copy-selection-text");
    title.textContent = `Selected layer: ${message.nodeName}`;
    if (message.colors.length === 0) {
      list.innerHTML = '<div class="selection-empty">\uBC14\uC778\uB529\uB41C \uCEEC\uB7EC \uBCC0\uC218\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.</div>';
    } else {
      const groups = /* @__PURE__ */ new Map();
      for (const color of message.colors) {
        const groupKey = normalizeFieldLabel(color.field);
        const existing = groups.get(groupKey) || [];
        existing.push(color);
        groups.set(groupKey, existing);
      }
      list.innerHTML = Array.from(groups.entries()).map(([group, items]) => {
        const cards = items.map(
          (item) => `
              <article class="selection-color-card">
                <div class="selection-color-token">${item.token}</div>
                <div class="selection-color-collection">${item.collection}</div>
                <div class="selection-color-value">${item.value}</div>
              </article>
            `
        ).join("");
        return `
          <section class="selection-color-group">
            <h3 class="selection-color-group-title">${group}</h3>
            <div class="selection-color-grid">${cards}</div>
          </section>
        `;
      }).join("");
    }
    if (typeof message.text === "string") {
      textPanel.hidden = false;
      textContent.textContent = message.text || "(\uBE48 \uD14D\uC2A4\uD2B8)";
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
  function setUiMode(message) {
    const panel = document.getElementById("panel");
    const modeBadge = document.getElementById("mode-badge");
    const isDevMode = message.editorType === "dev";
    currentEditorType = message.editorType;
    panel.classList.toggle("is-dev-mode", isDevMode);
    panel.classList.toggle("is-design-mode", !isDevMode);
    modeBadge.textContent = isDevMode ? "Dev Mode" : "Design Mode";
    requestResize();
  }
  function requestManualResize(width, height) {
    manualSize = { width, height };
    parent.postMessage(
      {
        pluginMessage: {
          type: "RESIZE_UI",
          width,
          height,
          manual: true
        }
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
      const onPointerMove = (moveEvent) => {
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
    const panel = document.getElementById("panel");
    const toggleButton = document.getElementById("toggle-preview");
    const isPreviewMode = panel.classList.toggle("is-preview-mode");
    toggleButton.textContent = isPreviewMode ? "Close" : "JSON";
    if (isPreviewMode) {
      requestPreview();
    }
    requestResize();
  }
  function setPullRequestLoading(nextValue) {
    isPullRequestLoading = nextValue;
    const button = document.getElementById("pr-confirm-create");
    const loading = document.getElementById("pr-confirm-loading");
    button.disabled = nextValue;
    loading.hidden = !nextValue;
  }
  function setCreatePullRequestLoading(nextValue) {
    isCreatingPullRequest = nextValue;
    const createButton = document.getElementById("pr-create");
    const titleInput = document.getElementById("pr-title");
    const bodyInput = document.getElementById("pr-body");
    createButton.disabled = nextValue;
    titleInput.disabled = nextValue;
    bodyInput.disabled = nextValue;
    createButton.textContent = nextValue ? "Creating..." : "Create PR";
  }
  function closePullRequestPrompt() {
    const modal = document.getElementById("pr-prompt-modal");
    modal.hidden = true;
    setPullRequestLoading(false);
    requestResize();
  }
  function closePullRequestComposer() {
    const modal = document.getElementById("pr-compose-modal");
    modal.hidden = true;
    setCreatePullRequestLoading(false);
    requestResize();
  }
  function openPullRequestPrompt(context) {
    pendingPullRequestContext = context;
    const modal = document.getElementById("pr-prompt-modal");
    const summary = document.getElementById("pr-prompt-summary");
    summary.textContent = `${context.repo} | ${context.branch} -> ${context.base}`;
    modal.hidden = false;
    setPullRequestLoading(false);
    requestResize();
  }
  function buildDefaultPullRequestTitle(context) {
    const branchLabel = context.branch.split("/").filter(Boolean).pop() || context.branch;
    return `Sync tokens (${branchLabel})`;
  }
  function openPullRequestComposer(context, body, templatePath) {
    pendingPullRequestContext = context;
    const modal = document.getElementById("pr-compose-modal");
    const repoInfo = document.getElementById("pr-compose-repo");
    const templateInfo = document.getElementById("pr-template-path");
    const titleInput = document.getElementById("pr-title");
    const bodyInput = document.getElementById("pr-body");
    const resultBox = document.getElementById("pr-result");
    const resultText = document.getElementById("pr-result-text");
    const resultLink = document.getElementById("pr-result-link");
    repoInfo.textContent = `${context.repo} | ${context.branch} -> ${context.base}`;
    templateInfo.textContent = templatePath || "\uD15C\uD50C\uB9BF \uC5C6\uC74C";
    titleInput.value = buildDefaultPullRequestTitle(context);
    bodyInput.value = body;
    resultBox.hidden = true;
    resultText.textContent = "";
    resultLink.hidden = true;
    resultLink.href = "";
    resultLink.textContent = "";
    modal.hidden = false;
    setCreatePullRequestLoading(false);
    requestResize();
  }
  function showPullRequestCreated(message) {
    const resultBox = document.getElementById("pr-result");
    const resultText = document.getElementById("pr-result-text");
    const link = document.getElementById("pr-result-link");
    resultBox.hidden = false;
    resultText.textContent = `PR #${message.number} \uC0DD\uC131 \uC644\uB8CC`;
    link.href = message.url;
    link.textContent = message.url;
    link.hidden = false;
    log(`PR #${message.number} \uC0DD\uC131 \uC644\uB8CC`);
    requestResize();
  }
  function loadPullRequestTemplate() {
    if (!pendingPullRequestContext || isPullRequestLoading) {
      return;
    }
    setPullRequestLoading(true);
    parent.postMessage(
      {
        pluginMessage: {
          type: "LOAD_PULL_REQUEST_TEMPLATE",
          token: pendingPullRequestContext.token,
          repo: pendingPullRequestContext.repo,
          branch: pendingPullRequestContext.branch,
          base: pendingPullRequestContext.base
        }
      },
      "*"
    );
  }
  function submitPullRequest() {
    if (!pendingPullRequestContext || isCreatingPullRequest) {
      return;
    }
    const titleInput = document.getElementById("pr-title");
    const bodyInput = document.getElementById("pr-body");
    setCreatePullRequestLoading(true);
    parent.postMessage(
      {
        pluginMessage: {
          type: "CREATE_PULL_REQUEST",
          token: pendingPullRequestContext.token,
          repo: pendingPullRequestContext.repo,
          branch: pendingPullRequestContext.branch,
          base: pendingPullRequestContext.base,
          title: titleInput.value,
          body: bodyInput.value
        }
      },
      "*"
    );
  }
  function copyPullRequestUrl() {
    const link = document.getElementById("pr-result-link");
    if (!link.href) {
      return;
    }
    void navigator.clipboard.writeText(link.href);
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
  document.getElementById("copy-selection-text").onclick = async () => {
    const button = document.getElementById("copy-selection-text");
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
  document.getElementById("pr-confirm-cancel").onclick = () => {
    closePullRequestPrompt();
  };
  document.getElementById("pr-confirm-create").onclick = () => {
    loadPullRequestTemplate();
  };
  document.getElementById("pr-compose-cancel").onclick = () => {
    closePullRequestComposer();
  };
  document.getElementById("pr-create").onclick = () => {
    submitPullRequest();
  };
  document.getElementById("pr-copy-link").onclick = () => {
    copyPullRequestUrl();
  };
  for (const id of ["token", "repo", "branch", "base", "path", "commit-message"]) {
    document.getElementById(id).addEventListener("change", saveSettings);
    document.getElementById(id).addEventListener("blur", saveSettings);
  }
  function handlePluginMessage(event) {
    var _a, _b;
    const msg = getPluginMessage(event.data);
    if (!msg || !msg.type) {
      return;
    }
    if (msg.type === "SUCCESS") {
      if (msg.action === "pull") {
        log("Pull \uC644\uB8CC");
        return;
      }
      log("Push \uC644\uB8CC");
      const settings = getSettings();
      openPullRequestPrompt({
        token: settings.token,
        repo: msg.repo || settings.repo,
        branch: msg.branch || settings.branch,
        base: msg.base || settings.base
      });
      return;
    }
    if (msg.type === "PREVIEW_RESULT") {
      setPreview((_a = msg.content) != null ? _a : "{}");
      return;
    }
    if (msg.type === "SETTINGS_LOADED") {
      applySettings(msg.settings);
      return;
    }
    if (msg.type === "UI_MODE") {
      setUiMode(msg);
      return;
    }
    if (msg.type === "SELECTION_COLOR_INFO") {
      setSelectionColorInfo(msg);
      return;
    }
    if (msg.type === "PULL_REQUEST_TEMPLATE_LOADED") {
      if (!pendingPullRequestContext) {
        return;
      }
      closePullRequestPrompt();
      openPullRequestComposer(pendingPullRequestContext, msg.body || "", (_b = msg.path) != null ? _b : null);
      return;
    }
    if (msg.type === "PULL_REQUEST_CREATED") {
      setCreatePullRequestLoading(false);
      showPullRequestCreated(msg);
      return;
    }
    if (msg.type === "ERROR") {
      setPullRequestLoading(false);
      setCreatePullRequestLoading(false);
      log("\uC5D0\uB7EC: " + msg.error);
    }
  }
  window.addEventListener("message", handlePluginMessage);
  window.addEventListener("load", requestResize);
  window.addEventListener("resize", requestResize);
  bindResizeHandle();
  notifyUiReady();
  requestPreview();
})();
//# sourceMappingURL=ui.js.map
