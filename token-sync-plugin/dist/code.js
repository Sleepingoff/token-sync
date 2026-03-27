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

  // src/core/extract.ts
  function rgbChannelToHex(value) {
    return Math.round(value * 255).toString(16).padStart(2, "0");
  }
  function rgbaToHex(color, opacity) {
    const alpha = opacity !== void 0 ? opacity : "a" in color ? color.a : 1;
    const hex = `#${rgbChannelToHex(color.r)}${rgbChannelToHex(color.g)}${rgbChannelToHex(color.b)}`;
    if (alpha >= 1) {
      return hex;
    }
    return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
  }
  function serializeOptionalColor(color) {
    return color ? rgbaToHex(color) : null;
  }
  function compactToken(name, token) {
    return {
      name,
      token
    };
  }
  function toDescription(description) {
    return description.trim() ? description : void 0;
  }
  function toFontWeight(style) {
    const normalized = style.toLowerCase();
    if (normalized.includes("thin"))
      return "100";
    if (normalized.includes("extralight") || normalized.includes("ultralight"))
      return "200";
    if (normalized.includes("light"))
      return "300";
    if (normalized.includes("regular") || normalized.includes("normal"))
      return "400";
    if (normalized.includes("medium"))
      return "500";
    if (normalized.includes("semibold") || normalized.includes("demibold"))
      return "600";
    if (normalized.includes("bold"))
      return "700";
    if (normalized.includes("extrabold") || normalized.includes("ultrabold"))
      return "800";
    if (normalized.includes("black") || normalized.includes("heavy"))
      return "900";
    return style;
  }
  function formatLetterSpacing(letterSpacing) {
    if (letterSpacing.unit === "PERCENT") {
      return `${letterSpacing.value}%`;
    }
    return `${letterSpacing.value}`;
  }
  function formatLineHeight(lineHeight) {
    if (lineHeight.unit === "AUTO") {
      return "auto";
    }
    if (lineHeight.unit === "PERCENT") {
      return `${lineHeight.value}%`;
    }
    return `${lineHeight.value}`;
  }
  function serializePaint(paint) {
    if (paint.type === "SOLID") {
      return {
        type: paint.type,
        color: rgbaToHex(paint.color, paint.opacity),
        visible: paint.visible !== false,
        blendMode: paint.blendMode || "NORMAL"
      };
    }
    if (paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_RADIAL" || paint.type === "GRADIENT_ANGULAR" || paint.type === "GRADIENT_DIAMOND") {
      return {
        type: paint.type,
        visible: paint.visible !== false,
        opacity: paint.opacity !== void 0 ? paint.opacity : 1,
        blendMode: paint.blendMode || "NORMAL",
        stops: paint.gradientStops.map((stop) => ({
          position: stop.position,
          color: rgbaToHex(stop.color)
        }))
      };
    }
    if (paint.type === "IMAGE") {
      return {
        type: paint.type,
        imageHash: paint.imageHash,
        scaleMode: paint.scaleMode,
        opacity: paint.opacity !== void 0 ? paint.opacity : 1,
        blendMode: paint.blendMode || "NORMAL"
      };
    }
    if (paint.type === "VIDEO") {
      return {
        type: paint.type,
        videoHash: paint.videoHash,
        scaleMode: paint.scaleMode,
        opacity: paint.opacity !== void 0 ? paint.opacity : 1,
        blendMode: paint.blendMode || "NORMAL"
      };
    }
    if (paint.type === "PATTERN") {
      return {
        type: paint.type,
        sourceNodeId: paint.sourceNodeId,
        tileType: paint.tileType,
        scalingFactor: paint.scalingFactor,
        spacing: paint.spacing,
        horizontalAlignment: paint.horizontalAlignment,
        opacity: paint.opacity !== void 0 ? paint.opacity : 1,
        blendMode: paint.blendMode || "NORMAL"
      };
    }
    return {
      type: paint.type,
      visible: paint.visible !== false,
      opacity: paint.opacity !== void 0 ? paint.opacity : 1,
      blendMode: paint.blendMode || "NORMAL",
      stops: paint.gradientStops.map((stop) => ({
        position: stop.position,
        color: rgbaToHex(stop.color)
      }))
    };
  }
  function serializeEffect(effect) {
    if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
      return {
        type: effect.type,
        color: rgbaToHex(effect.color),
        offset: effect.offset,
        radius: effect.radius,
        spread: effect.spread !== void 0 ? effect.spread : 0,
        visible: effect.visible,
        blendMode: effect.blendMode
      };
    }
    if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
      return __spreadValues({
        type: effect.type,
        radius: effect.radius,
        visible: effect.visible,
        blurType: effect.blurType
      }, effect.blurType === "PROGRESSIVE" ? {
        startRadius: effect.startRadius,
        startOffset: effect.startOffset,
        endOffset: effect.endOffset
      } : {});
    }
    if (effect.type === "NOISE") {
      return __spreadValues(__spreadValues({
        type: effect.type,
        noiseType: effect.noiseType,
        color: rgbaToHex(effect.color),
        visible: effect.visible,
        blendMode: effect.blendMode,
        noiseSize: effect.noiseSize,
        density: effect.density
      }, effect.noiseType === "DUOTONE" ? { secondaryColor: rgbaToHex(effect.secondaryColor) } : {}), effect.noiseType === "MULTITONE" ? { opacity: effect.opacity } : {});
    }
    if (effect.type === "TEXTURE") {
      return {
        type: effect.type,
        visible: effect.visible,
        noiseSize: effect.noiseSize,
        radius: effect.radius,
        clipToShape: effect.clipToShape
      };
    }
    if (effect.type === "GLASS") {
      return {
        type: effect.type,
        visible: effect.visible,
        lightIntensity: effect.lightIntensity,
        lightAngle: effect.lightAngle,
        refraction: effect.refraction,
        depth: effect.depth,
        dispersion: effect.dispersion,
        radius: effect.radius
      };
    }
    return {
      type: effect.type,
      radius: effect.radius,
      visible: effect.visible,
      blurType: effect.blurType
    };
  }
  function serializeGrid(grid) {
    if (grid.pattern === "GRID") {
      return {
        pattern: grid.pattern,
        sectionSize: grid.sectionSize,
        visible: grid.visible,
        color: serializeOptionalColor(grid.color)
      };
    }
    return {
      pattern: grid.pattern,
      sectionSize: grid.sectionSize,
      visible: grid.visible,
      color: serializeOptionalColor(grid.color),
      alignment: grid.alignment,
      gutterSize: grid.gutterSize,
      offset: grid.offset,
      count: grid.count
    };
  }
  function extractVariables() {
    const collections = figma.variables.getLocalVariableCollections();
    const variables = figma.variables.getLocalVariables();
    const collectionMap = new Map(collections.map((c) => [c.id, c]));
    return variables.map((v) => {
      const collection = collectionMap.get(v.variableCollectionId);
      const modes = {};
      const collectionModes = collection ? collection.modes : [];
      for (const mode of collectionModes) {
        const value = v.valuesByMode[mode.modeId];
        if (value !== void 0) {
          modes[mode.name] = value;
        }
      }
      return {
        name: v.name,
        type: v.resolvedType,
        description: v.description,
        // transform 단계가 이 구조를 그대로 사용한다.
        modes
      };
    });
  }
  function extractStyleTokens() {
    return {
      paint: figma.getLocalPaintStyles().map((style) => {
        const solidPaint = style.paints.length === 1 && style.paints[0].type === "SOLID" ? style.paints[0] : null;
        if (solidPaint) {
          return compactToken(style.name, {
            type: "color",
            value: rgbaToHex(solidPaint.color, solidPaint.opacity),
            description: toDescription(style.description)
          });
        }
        return compactToken(style.name, {
          type: "paintStyle",
          value: {
            paints: style.paints.map((paint) => serializePaint(paint))
          },
          description: toDescription(style.description)
        });
      }),
      text: figma.getLocalTextStyles().map(
        (style) => compactToken(style.name, {
          type: "typography",
          value: {
            fontFamily: style.fontName.family,
            fontWeight: toFontWeight(style.fontName.style),
            fontSize: `${style.fontSize}`,
            lineHeight: formatLineHeight(style.lineHeight),
            letterSpacing: formatLetterSpacing(style.letterSpacing)
          },
          description: toDescription(style.description)
        })
      ),
      effect: figma.getLocalEffectStyles().map((style) => {
        const shadowEffect = style.effects.length === 1 && (style.effects[0].type === "DROP_SHADOW" || style.effects[0].type === "INNER_SHADOW") ? style.effects[0] : null;
        if (shadowEffect) {
          return compactToken(style.name, {
            type: "boxShadow",
            value: {
              color: rgbaToHex(shadowEffect.color),
              type: shadowEffect.type === "DROP_SHADOW" ? "dropShadow" : "innerShadow",
              x: `${shadowEffect.offset.x}`,
              y: `${shadowEffect.offset.y}`,
              blur: `${shadowEffect.radius}`,
              spread: `${shadowEffect.spread !== void 0 ? shadowEffect.spread : 0}`
            },
            description: toDescription(style.description)
          });
        }
        return compactToken(style.name, {
          type: "effectStyle",
          value: {
            effects: style.effects.map((effect) => serializeEffect(effect))
          },
          description: toDescription(style.description)
        });
      }),
      grid: figma.getLocalGridStyles().map(
        (style) => compactToken(style.name, {
          type: "grid",
          value: {
            layoutGrids: style.layoutGrids.map((grid) => serializeGrid(grid))
          },
          description: toDescription(style.description)
        })
      )
    };
  }

  // src/core/transform.ts
  function rgbaToHex2(color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }
  function normalizeModeValue(token, rawValue) {
    if (token.type === "COLOR") {
      return rgbaToHex2(rawValue);
    }
    if (typeof rawValue === "string" || typeof rawValue === "number" || typeof rawValue === "boolean") {
      return rawValue;
    }
    throw new Error(`\uBCC0\uC218 "${token.name}"\uC758 \uD0C0\uC785 ${token.type}\uC740 \uC544\uC9C1 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.`);
  }
  function getModeValues(token) {
    const entries = Object.entries(token.modes);
    if (entries.length === 0) {
      throw new Error(`\uBCC0\uC218 "${token.name}"\uC5D0 \uC0AC\uC6A9\uD560 mode \uAC12\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.`);
    }
    const modeValues = {};
    for (const [modeName, value] of entries) {
      modeValues[modeName] = normalizeModeValue(token, value);
    }
    return modeValues;
  }
  function mapVariableType(type) {
    if (type === "COLOR")
      return "color";
    if (type === "FLOAT")
      return "number";
    if (type === "STRING")
      return "string";
    return "boolean";
  }
  function isTokenLeaf(value) {
    return Boolean(
      value && typeof value === "object" && "type" in value && "value" in value
    );
  }
  function insertToken(tree, tokenName, leaf) {
    const path = tokenName.split("/").filter(Boolean);
    let current = tree;
    path.forEach((key, i) => {
      const isLast = i === path.length - 1;
      const existing = current[key];
      if (isLast) {
        current[key] = leaf;
        return;
      }
      if (isTokenLeaf(existing)) {
        throw new Error(`\uD1A0\uD070 \uACBD\uB85C \uCDA9\uB3CC: "${tokenName}"\uC774 \uAE30\uC874 \uB9AC\uD504 \uB178\uB4DC\uC640 \uACB9\uCE69\uB2C8\uB2E4.`);
      }
      if (!existing) {
        current[key] = {};
      }
      current = current[key];
    });
  }
  function insertStyleTokens(tree, styles) {
    for (const style of styles) {
      insertToken(tree, style.name, style.token);
    }
  }
  function transformTokens(raw, styles) {
    const globalTree = {};
    for (const token of raw) {
      const modeValues = getModeValues(token);
      const primaryMode = Object.keys(modeValues)[0];
      insertToken(globalTree, token.name, {
        type: mapVariableType(token.type),
        value: modeValues[primaryMode],
        description: token.description.trim() ? token.description : void 0
      });
    }
    if (styles) {
      insertStyleTokens(globalTree, styles.paint);
      insertStyleTokens(globalTree, styles.text);
      insertStyleTokens(globalTree, styles.effect);
      insertStyleTokens(globalTree, styles.grid);
    }
    return {
      global: globalTree,
      $themes: [],
      $metadata: {
        tokenSetOrder: ["global"]
      }
    };
  }

  // src/core/github.ts
  async function parseGitHubResponse(res) {
    if (res.ok) {
      return res.json();
    }
    let message = `${res.status} ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData.message) {
        message = errorData.message;
      }
    } catch (_error) {
    }
    throw new Error(`GitHub \uC694\uCCAD \uC2E4\uD328: ${message}`);
  }
  async function pushToGitHub({
    token,
    repo,
    branch,
    path,
    base,
    content
  }) {
    const [owner, repoName] = repo.split("/");
    if (!owner || !repoName) {
      throw new Error('\uC800\uC7A5\uC18C \uD615\uC2DD\uC774 \uC798\uBABB\uB418\uC5C8\uC2B5\uB2C8\uB2E4. "owner/repo" \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.');
    }
    const exists = await checkBranch(owner, repoName, branch, token);
    if (!exists) {
      const baseSha = await getBranchSha(owner, repoName, base, token);
      await createBranch(owner, repoName, branch, baseSha, token);
    }
    const sha = await getFileSha(owner, repoName, path, branch, token);
    await uploadFile({
      owner,
      repo: repoName,
      path,
      content: JSON.stringify(content, null, 2),
      branch,
      token,
      sha
    });
  }
  async function pullFromGitHub({
    token,
    repo,
    branch,
    path
  }) {
    const [owner, repoName] = repo.split("/");
    if (!owner || !repoName) {
      throw new Error('\uC800\uC7A5\uC18C \uD615\uC2DD\uC774 \uC798\uBABB\uB418\uC5C8\uC2B5\uB2C8\uB2E4. "owner/repo" \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.');
    }
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/contents/${path}?ref=${branch}`,
      {
        headers: { Authorization: `token ${token}` }
      }
    );
    const data = await parseGitHubResponse(res);
    const decoded = decodeURIComponent(escape(atob(data.content)));
    return JSON.parse(decoded);
  }
  async function checkBranch(owner, repo, branch, token) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
      {
        headers: { Authorization: `token ${token}` }
      }
    );
    return res.status === 200;
  }
  async function getBranchSha(owner, repo, branch, token) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      {
        headers: { Authorization: `token ${token}` }
      }
    );
    const data = await parseGitHubResponse(res);
    return data.object.sha;
  }
  async function createBranch(owner, repo, newBranch, baseSha, token) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha: baseSha
      })
    });
    await parseGitHubResponse(res);
  }
  async function getFileSha(owner, repo, path, branch, token) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: { Authorization: `token ${token}` }
      }
    );
    if (res.status !== 200)
      return null;
    const data = await parseGitHubResponse(res);
    return data.sha;
  }
  function encode(content) {
    return btoa(unescape(encodeURIComponent(content)));
  }
  async function uploadFile({
    owner,
    repo,
    path,
    content,
    branch,
    token,
    sha
  }) {
    const requestBody = {
      message: "update tokens",
      content: encode(content),
      branch
    };
    if (sha) {
      requestBody.sha = sha;
    }
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      }
    );
    await parseGitHubResponse(res);
  }

  // src/core/apply.ts
  function isTokenLeaf2(node) {
    return "type" in node && "value" in node;
  }
  function isVariableTokenLeaf(node) {
    return node.type === "color" && typeof node.value === "string" || node.type === "number" && typeof node.value === "number" || node.type === "string" && typeof node.value === "string" || node.type === "boolean" && typeof node.value === "boolean";
  }
  function getTokenTree(tokens) {
    const tokenDocument = tokens;
    if (tokenDocument.global && tokenDocument.$metadata) {
      return tokenDocument.global;
    }
    return tokens;
  }
  function hexToRgb(value) {
    const normalized = value.replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      throw new Error(`\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uC0C9\uC0C1 \uD615\uC2DD\uC785\uB2C8\uB2E4: ${value}`);
    }
    return {
      r: parseInt(normalized.slice(0, 2), 16) / 255,
      g: parseInt(normalized.slice(2, 4), 16) / 255,
      b: parseInt(normalized.slice(4, 6), 16) / 255
    };
  }
  function toFigmaValue(token) {
    if (token.type === "color") {
      if (typeof token.value !== "string") {
        throw new Error("COLOR \uD1A0\uD070 \uAC12\uC740 \uBB38\uC790\uC5F4 hex\uC5EC\uC57C \uD569\uB2C8\uB2E4.");
      }
      return hexToRgb(token.value);
    }
    if (typeof token.value === "string" || typeof token.value === "number" || typeof token.value === "boolean") {
      return token.value;
    }
    throw new Error(`\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uD1A0\uD070 \uAC12 \uD615\uC2DD\uC785\uB2C8\uB2E4: ${token.type}`);
  }
  function applyLeafToVariable(variable, token) {
    variable.setValueForMode(
      Object.keys(variable.valuesByMode)[0],
      toFigmaValue(token)
    );
  }
  function toVariableResolvedType(type) {
    if (type === "color")
      return "COLOR";
    if (type === "number")
      return "FLOAT";
    if (type === "string")
      return "STRING";
    if (type === "boolean")
      return "BOOLEAN";
    return null;
  }
  function applyTokenNode(tokens, localVariables, parentPath = "") {
    for (const [key, node] of Object.entries(tokens)) {
      const name = parentPath ? `${parentPath}/${key}` : key;
      if (isTokenLeaf2(node)) {
        if (!isVariableTokenLeaf(node)) {
          continue;
        }
        let variable = localVariables.find((v) => v.name === name);
        const variableType = toVariableResolvedType(node.type);
        if (!variableType) {
          continue;
        }
        if (!variable) {
          const collection = figma.variables.getLocalVariableCollections()[0];
          if (!collection) {
            throw new Error("\uC801\uC6A9\uD560 \uB85C\uCEEC \uBCC0\uC218 \uCEEC\uB809\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
          }
          variable = figma.variables.createVariable(name, collection.id, variableType);
          localVariables.push(variable);
        }
        applyLeafToVariable(variable, node);
        continue;
      }
      applyTokenNode(node, localVariables, name);
    }
  }
  async function applyTokens(tokens) {
    const collection = figma.variables.getLocalVariableCollections()[0];
    if (!collection) {
      throw new Error("\uC801\uC6A9\uD560 \uB85C\uCEEC \uBCC0\uC218 \uCEEC\uB809\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
    }
    const localVariables = figma.variables.getLocalVariables();
    applyTokenNode(getTokenTree(tokens), localVariables);
  }

  // src/code.ts
  figma.showUI(__html__, { width: 420, height: 720 });
  function postPreviewContent(content) {
    figma.ui.postMessage({
      type: "PREVIEW_RESULT",
      content
    });
  }
  function postPreviewError(error) {
    postPreviewContent(`{}

/* Preview unavailable: ${String(error)} */`);
  }
  function toPreviewContent(tokens) {
    return JSON.stringify(tokens, null, 2);
  }
  function emptyTokenDocument() {
    return {
      global: {},
      $themes: [],
      $metadata: {
        tokenSetOrder: ["global"]
      }
    };
  }
  function getCurrentTokens() {
    const raw = extractVariables();
    const styles = extractStyleTokens();
    if (raw.length === 0 && styles.paint.length === 0 && styles.text.length === 0 && styles.effect.length === 0 && styles.grid.length === 0) {
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
  figma.ui.onmessage = async (msg) => {
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
        const tokens = getCurrentTokens();
        await pushToGitHub({
          token: msg.token,
          repo: msg.repo,
          branch: msg.branch,
          path: msg.path,
          base: msg.base,
          content: tokens
        });
        figma.ui.postMessage({ type: "SUCCESS", action: "push" });
        syncPreviewToUI();
      }
      if (msg.type === "PULL") {
        const tokens = await pullFromGitHub({
          token: msg.token,
          repo: msg.repo,
          branch: msg.branch,
          path: msg.path
        });
        await applyTokens(tokens);
        figma.ui.postMessage({ type: "SUCCESS", action: "pull" });
        syncPreviewToUI();
      }
    } catch (e) {
      figma.ui.postMessage({ type: "ERROR", error: String(e) });
    }
  };
})();
//# sourceMappingURL=code.js.map
