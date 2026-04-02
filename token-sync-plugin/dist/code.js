"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

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
  function isVariableAlias(value) {
    return typeof value === "object" && value !== null && "type" in value && value.type === "VARIABLE_ALIAS";
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
  function formatNumericValue(value, maxFractionDigits = 4) {
    if (!Number.isFinite(value)) {
      return `${value}`;
    }
    const rounded = Number(value.toFixed(maxFractionDigits));
    return `${rounded}`;
  }
  function formatLetterSpacing(letterSpacing) {
    if (letterSpacing.unit === "PERCENT") {
      return `${formatNumericValue(letterSpacing.value)}%`;
    }
    return formatNumericValue(letterSpacing.value);
  }
  function formatLineHeight(lineHeight) {
    if (lineHeight.unit === "AUTO") {
      return "auto";
    }
    if (lineHeight.unit === "PERCENT") {
      return `${formatNumericValue(lineHeight.value)}%`;
    }
    return formatNumericValue(lineHeight.value);
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
    const variableMap = new Map(variables.map((variable) => [variable.id, variable]));
    function getValueForModeName(variable, modeName) {
      const collection = collectionMap.get(variable.variableCollectionId);
      if (!collection) {
        const firstValue = Object.values(variable.valuesByMode)[0];
        if (firstValue === void 0) {
          throw new Error(`\uBCC0\uC218 "${variable.name}"\uC758 \uAC12\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
        }
        return firstValue;
      }
      const matchedMode = collection.modes.find((mode) => mode.name === modeName) || collection.modes[0];
      if (!matchedMode) {
        throw new Error(`\uBCC0\uC218 "${variable.name}"\uC758 mode\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
      }
      return variable.valuesByMode[matchedMode.modeId];
    }
    function resolveVariableValue(variable, rawValue, modeName, visited = /* @__PURE__ */ new Set()) {
      if (!isVariableAlias(rawValue)) {
        return { value: rawValue };
      }
      if (visited.has(variable.id)) {
        throw new Error(`\uBCC0\uC218 alias \uC21C\uD658 \uCC38\uC870\uAC00 \uAC10\uC9C0\uB418\uC5C8\uC2B5\uB2C8\uB2E4: "${variable.name}"`);
      }
      const referenced = variableMap.get(rawValue.id);
      if (!referenced) {
        throw new Error(`\uBCC0\uC218 "${variable.name}"\uC774 \uCC38\uC870\uD558\uB294 alias \uB300\uC0C1\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
      }
      const referencedCollection = collectionMap.get(referenced.variableCollectionId);
      const nextRawValue = getValueForModeName(referenced, modeName);
      const nextVisited = new Set(visited);
      nextVisited.add(variable.id);
      const resolved = resolveVariableValue(referenced, nextRawValue, modeName, nextVisited);
      const referencePath = `${(referencedCollection == null ? void 0 : referencedCollection.name) || "global"}/${referenced.name}`;
      return {
        value: resolved.value,
        reference: resolved.reference || referencePath
      };
    }
    return variables.map((v) => {
      var _a;
      const collection = collectionMap.get(v.variableCollectionId);
      const modes = {};
      const collectionModes = collection ? collection.modes : [];
      for (const mode of collectionModes) {
        const value = v.valuesByMode[mode.modeId];
        if (value !== void 0) {
          modes[mode.name] = resolveVariableValue(v, value, mode.name).value;
        }
      }
      const primaryModeName = (_a = collectionModes[0]) == null ? void 0 : _a.name;
      const primaryReference = primaryModeName && v.valuesByMode[collectionModes[0].modeId] !== void 0 ? resolveVariableValue(v, v.valuesByMode[collectionModes[0].modeId], primaryModeName).reference : void 0;
      return {
        collection: (collection == null ? void 0 : collection.name) || "global",
        name: v.name,
        type: v.resolvedType,
        description: v.description,
        reference: primaryReference,
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
            fontSize: formatNumericValue(style.fontSize),
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
  function summarizeGroupKeys(node) {
    const keys = Object.keys(node);
    if (keys.length === 0) {
      return "\uBE44\uC5B4 \uC788\uB294 \uADF8\uB8F9";
    }
    if (keys.length <= 4) {
      return `\uD558\uC704 \uD0A4: ${keys.join(", ")}`;
    }
    return `\uD558\uC704 \uD0A4: ${keys.slice(0, 4).join(", ")} \uC678 ${keys.length - 4}\uAC1C`;
  }
  function getPathCollisionMessage(tokenName, conflictPath, reason, existing) {
    if (reason === "leaf") {
      return `\uD1A0\uD070 \uACBD\uB85C \uCDA9\uB3CC: \uCD94\uAC00\uD558\uB824\uB294 "${tokenName}"\uC774 \uAE30\uC874 \uB9AC\uD504 \uD1A0\uD070 "${conflictPath}"\uC640 \uACB9\uCE69\uB2C8\uB2E4. "${conflictPath}"\uB294 \uC774\uBBF8 \uAC12\uC774 \uC788\uB294 \uD1A0\uD070\uC774\uB77C \uD558\uC704 \uACBD\uB85C\uB97C \uB9CC\uB4E4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`;
    }
    const details = existing && !isTokenLeaf(existing) ? ` (${summarizeGroupKeys(existing)})` : "";
    return `\uD1A0\uD070 \uACBD\uB85C \uCDA9\uB3CC: \uCD94\uAC00\uD558\uB824\uB294 "${tokenName}"\uC774 \uAE30\uC874 \uADF8\uB8F9 "${conflictPath}"\uC640 \uACB9\uCE69\uB2C8\uB2E4.${details}`;
  }
  function insertToken(tree, tokenName, leaf) {
    const path = tokenName.split("/").filter(Boolean);
    let current = tree;
    path.forEach((key, i) => {
      const isLast = i === path.length - 1;
      const existing = current[key];
      const currentPath = path.slice(0, i + 1).join("/");
      if (isLast) {
        if (existing && !isTokenLeaf(existing)) {
          throw new Error(getPathCollisionMessage(tokenName, currentPath, "branch", existing));
        }
        current[key] = leaf;
        return;
      }
      if (isTokenLeaf(existing)) {
        throw new Error(getPathCollisionMessage(tokenName, currentPath, "leaf", existing));
      }
      if (!existing) {
        current[key] = {};
      }
      current = current[key];
    });
    return null;
  }
  function tryInsertToken(tree, tokenName, leaf, warnings, options) {
    try {
      insertToken(tree, tokenName, leaf);
    } catch (error) {
      if ((options == null ? void 0 : options.strict) !== false) {
        throw error;
      }
      warnings.push({
        tokenName,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
  function toStyleTokenPath(category, styleName) {
    return `${category}/${styleName}`;
  }
  function getOrCreateTokenSet(tokenSets, name) {
    if (!tokenSets[name]) {
      tokenSets[name] = {};
    }
    return tokenSets[name];
  }
  function insertStyleTokens(tree, category, styles, warnings, options) {
    for (const style of styles) {
      tryInsertToken(
        tree,
        toStyleTokenPath(category, style.name),
        style.token,
        warnings,
        options
      );
    }
  }
  function transformTokensWithDiagnostics(raw, styles, options) {
    const tokenSets = {};
    const warnings = [];
    for (const token of raw) {
      const modeValues = getModeValues(token);
      const primaryMode = Object.keys(modeValues)[0];
      const tree = getOrCreateTokenSet(tokenSets, token.collection || "global");
      tryInsertToken(
        tree,
        token.name,
        {
          type: mapVariableType(token.type),
          value: modeValues[primaryMode],
          description: token.description.trim() ? token.description : void 0,
          reference: token.reference
        },
        warnings,
        options
      );
    }
    if (styles) {
      const stylesTree = getOrCreateTokenSet(tokenSets, "styles");
      insertStyleTokens(stylesTree, "paint", styles.paint, warnings, options);
      insertStyleTokens(stylesTree, "text", styles.text, warnings, options);
      insertStyleTokens(stylesTree, "effect", styles.effect, warnings, options);
      insertStyleTokens(stylesTree, "grid", styles.grid, warnings, options);
    }
    if (Object.keys(tokenSets).length === 0) {
      tokenSets.global = {};
    }
    const tokenSetOrder = Object.keys(tokenSets);
    return {
      document: __spreadProps(__spreadValues({}, tokenSets), {
        $themes: [],
        $metadata: {
          tokenSetOrder
        }
      }),
      warnings
    };
  }
  function transformTokens(raw, styles, options) {
    return transformTokensWithDiagnostics(raw, styles, options).document;
  }

  // src/core/github.ts
  function normalizeRepoPart(value) {
    return value.trim();
  }
  function normalizePath(path) {
    return path.trim().replace(/^\/+/, "");
  }
  var BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function bytesToBase64(bytes) {
    var _a, _b, _c;
    let output = "";
    for (let index = 0; index < bytes.length; index += 3) {
      const byte1 = (_a = bytes[index]) != null ? _a : 0;
      const byte2 = (_b = bytes[index + 1]) != null ? _b : 0;
      const byte3 = (_c = bytes[index + 2]) != null ? _c : 0;
      const chunk = byte1 << 16 | byte2 << 8 | byte3;
      output += BASE64_ALPHABET[chunk >> 18 & 63];
      output += BASE64_ALPHABET[chunk >> 12 & 63];
      output += index + 1 < bytes.length ? BASE64_ALPHABET[chunk >> 6 & 63] : "=";
      output += index + 2 < bytes.length ? BASE64_ALPHABET[chunk & 63] : "=";
    }
    return output;
  }
  function base64ToBytes(base64) {
    var _a, _b, _c, _d;
    const normalized = base64.replace(/\s/g, "");
    const bytes = [];
    let index = 0;
    while (index < normalized.length) {
      const char1 = (_a = normalized[index]) != null ? _a : "A";
      const char2 = (_b = normalized[index + 1]) != null ? _b : "A";
      const char3 = (_c = normalized[index + 2]) != null ? _c : "A";
      const char4 = (_d = normalized[index + 3]) != null ? _d : "A";
      const enc1 = BASE64_ALPHABET.indexOf(char1);
      const enc2 = BASE64_ALPHABET.indexOf(char2);
      const enc3 = char3 === "=" ? 0 : BASE64_ALPHABET.indexOf(char3);
      const enc4 = char4 === "=" ? 0 : BASE64_ALPHABET.indexOf(char4);
      const chunk = enc1 << 18 | enc2 << 12 | enc3 << 6 | enc4;
      bytes.push(chunk >> 16 & 255);
      if (char3 !== "=") {
        bytes.push(chunk >> 8 & 255);
      }
      if (char4 !== "=") {
        bytes.push(chunk & 255);
      }
      index += 4;
    }
    return bytes;
  }
  function encodeUtf8(value) {
    const bytes = [];
    let index = 0;
    while (index < value.length) {
      const codePoint = value.codePointAt(index);
      if (codePoint === void 0) {
        break;
      }
      if (codePoint <= 127) {
        bytes.push(codePoint);
      } else if (codePoint <= 2047) {
        bytes.push(192 | codePoint >> 6);
        bytes.push(128 | codePoint & 63);
      } else if (codePoint <= 65535) {
        bytes.push(224 | codePoint >> 12);
        bytes.push(128 | codePoint >> 6 & 63);
        bytes.push(128 | codePoint & 63);
      } else {
        bytes.push(240 | codePoint >> 18);
        bytes.push(128 | codePoint >> 12 & 63);
        bytes.push(128 | codePoint >> 6 & 63);
        bytes.push(128 | codePoint & 63);
      }
      index += codePoint > 65535 ? 2 : 1;
    }
    return bytes;
  }
  function decodeUtf8(bytes) {
    var _a, _b, _c, _d, _e, _f;
    let output = "";
    let index = 0;
    while (index < bytes.length) {
      const byte1 = bytes[index];
      if (byte1 === void 0) {
        break;
      }
      if (byte1 <= 127) {
        output += String.fromCharCode(byte1);
        index += 1;
        continue;
      }
      if ((byte1 & 224) === 192) {
        const byte22 = (_a = bytes[index + 1]) != null ? _a : 0;
        const codePoint2 = (byte1 & 31) << 6 | byte22 & 63;
        output += String.fromCharCode(codePoint2);
        index += 2;
        continue;
      }
      if ((byte1 & 240) === 224) {
        const byte22 = (_b = bytes[index + 1]) != null ? _b : 0;
        const byte32 = (_c = bytes[index + 2]) != null ? _c : 0;
        const codePoint2 = (byte1 & 15) << 12 | (byte22 & 63) << 6 | byte32 & 63;
        output += String.fromCharCode(codePoint2);
        index += 3;
        continue;
      }
      const byte2 = (_d = bytes[index + 1]) != null ? _d : 0;
      const byte3 = (_e = bytes[index + 2]) != null ? _e : 0;
      const byte4 = (_f = bytes[index + 3]) != null ? _f : 0;
      const codePoint = (byte1 & 7) << 18 | (byte2 & 63) << 12 | (byte3 & 63) << 6 | byte4 & 63;
      const normalized = codePoint - 65536;
      output += String.fromCharCode(
        55296 + (normalized >> 10),
        56320 + (normalized & 1023)
      );
      index += 4;
    }
    return output;
  }
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
  async function getGitHubErrorMessage(res) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData.message) {
        message = errorData.message;
      }
    } catch (_error) {
    }
    return message;
  }
  async function pushToGitHub({
    token,
    repo,
    branch,
    path,
    base,
    content,
    commitMessage
  }) {
    const normalizedRepo = normalizeRepoPart(repo);
    const normalizedBranch = normalizeRepoPart(branch);
    const normalizedBase = normalizeRepoPart(base);
    const normalizedPath = normalizePath(path);
    const [owner, repoName] = normalizedRepo.split("/");
    if (!owner || !repoName) {
      throw new Error('\uC800\uC7A5\uC18C \uD615\uC2DD\uC774 \uC798\uBABB\uB418\uC5C8\uC2B5\uB2C8\uB2E4. "owner/repo" \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.');
    }
    if (!normalizedBranch) {
      throw new Error("\uBE0C\uB79C\uCE58\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
    }
    if (!normalizedBase) {
      throw new Error("\uAE30\uC900 \uBE0C\uB79C\uCE58\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
    }
    if (!normalizedPath) {
      throw new Error("\uD1A0\uD070 \uD30C\uC77C \uACBD\uB85C\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
    }
    const normalizedCommitMessage = commitMessage.trim() || "update tokens";
    const resolved = await resolvePushBranch({
      owner,
      repo: repoName,
      branch: normalizedBranch,
      base: normalizedBase,
      token
    });
    await uploadFile({
      owner,
      repo: repoName,
      path: normalizedPath,
      content: JSON.stringify(content, null, 2),
      branch: resolved.branch,
      token,
      commitMessage: normalizedCommitMessage
    });
  }
  async function pullFromGitHub({
    token,
    repo,
    branch,
    path
  }) {
    const normalizedRepo = normalizeRepoPart(repo);
    const normalizedBranch = normalizeRepoPart(branch);
    const normalizedPath = normalizePath(path);
    const [owner, repoName] = normalizedRepo.split("/");
    if (!owner || !repoName) {
      throw new Error('\uC800\uC7A5\uC18C \uD615\uC2DD\uC774 \uC798\uBABB\uB418\uC5C8\uC2B5\uB2C8\uB2E4. "owner/repo" \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.');
    }
    if (!normalizedBranch) {
      throw new Error("\uBE0C\uB79C\uCE58\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
    }
    if (!normalizedPath) {
      throw new Error("\uD1A0\uD070 \uD30C\uC77C \uACBD\uB85C\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
    }
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/contents/${normalizedPath}?ref=${normalizedBranch}`,
      {
        headers: { Authorization: `token ${token}` }
      }
    );
    if (res.status === 404) {
      throw new Error(
        `\uC6D0\uACA9 \uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${owner}/${repoName}@${normalizedBranch}:${normalizedPath}. \uD30C\uC77C\uC774 \uC5C6\uC73C\uBA74 Push\uB85C \uBA3C\uC800 \uC0DD\uC131\uD574 \uC8FC\uC138\uC694.`
      );
    }
    const data = await parseGitHubResponse(res);
    const decoded = decodeUtf8(base64ToBytes(data.content));
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
  async function getDefaultBranch(owner, repo, token) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Authorization: `token ${token}` }
    });
    const data = await parseGitHubResponse(res);
    return data.default_branch;
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
  async function ensureBranchExists(params) {
    const { owner, repo, branch, base, token } = params;
    const exists = await checkBranch(owner, repo, branch, token);
    if (exists) {
      return;
    }
    if (branch === base) {
      throw new Error(`\uBE0C\uB79C\uCE58\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${branch}`);
    }
    const baseSha = await getBranchSha(owner, repo, base, token);
    await createBranch(owner, repo, branch, baseSha, token);
  }
  async function resolvePushBranch(params) {
    const { owner, repo, branch, base, token } = params;
    try {
      await ensureBranchExists({ owner, repo, branch, base, token });
      return {
        branch,
        base,
        usedDefaultFallback: false
      };
    } catch (_error) {
      const defaultBranch = await getDefaultBranch(owner, repo, token);
      if (branch === defaultBranch) {
        await ensureBranchExists({
          owner,
          repo,
          branch: defaultBranch,
          base: defaultBranch,
          token
        });
        return {
          branch: defaultBranch,
          base: defaultBranch,
          usedDefaultFallback: true
        };
      }
      await ensureBranchExists({
        owner,
        repo,
        branch,
        base: defaultBranch,
        token
      });
      return {
        branch,
        base: defaultBranch,
        usedDefaultFallback: true
      };
    }
  }
  async function getFileSha(owner, repo, path, branch, token) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: { Authorization: `token ${token}` }
      }
    );
    if (res.status === 404) {
      return null;
    }
    const data = await parseGitHubResponse(res);
    return data.sha;
  }
  function encode(content) {
    return bytesToBase64(encodeUtf8(content));
  }
  async function uploadFile({
    owner,
    repo,
    path,
    content,
    branch,
    token,
    commitMessage
  }) {
    const requestBody = {
      message: commitMessage,
      content: encode(content),
      branch
    };
    const createRes = await fetch(
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
    if (createRes.ok) {
      await createRes.json();
      return;
    }
    if (createRes.status !== 422) {
      const message = await getGitHubErrorMessage(createRes);
      throw new Error(`GitHub \uC694\uCCAD \uC2E4\uD328: ${message}`);
    }
    const sha = await getFileSha(owner, repo, path, branch, token);
    if (!sha) {
      const message = await getGitHubErrorMessage(createRes);
      throw new Error(`GitHub \uC694\uCCAD \uC2E4\uD328: ${message}`);
    }
    requestBody.sha = sha;
    const updateRes = await fetch(
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
    await parseGitHubResponse(updateRes);
  }

  // src/core/apply.ts
  function isTokenLeaf2(node) {
    return "type" in node && "value" in node;
  }
  function isVariableTokenLeaf(node) {
    return node.type === "color" && typeof node.value === "string" || node.type === "number" && typeof node.value === "number" || node.type === "string" && typeof node.value === "string" || node.type === "boolean" && typeof node.value === "boolean";
  }
  function getTokenSets(tokens) {
    const tokenDocument = tokens;
    if (tokenDocument.$metadata) {
      const sets = {};
      for (const [key, value] of Object.entries(tokenDocument)) {
        if (key.startsWith("$")) {
          continue;
        }
        sets[key] = value;
      }
      if (Object.keys(sets).length > 0) {
        return sets;
      }
    }
    return {
      global: tokens
    };
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
  function getOrCreateCollection(collectionName) {
    const collections = figma.variables.getLocalVariableCollections();
    const existing = collections.find((collection) => collection.name === collectionName);
    if (existing) {
      return existing;
    }
    return figma.variables.createVariableCollection(collectionName);
  }
  function applyTokenNode(tokens, localVariables, collection, parentPath = "") {
    for (const [key, node] of Object.entries(tokens)) {
      const name = parentPath ? `${parentPath}/${key}` : key;
      if (isTokenLeaf2(node)) {
        if (!isVariableTokenLeaf(node)) {
          continue;
        }
        let variable = localVariables.find(
          (v) => v.name === name && v.variableCollectionId === collection.id
        );
        const variableType = toVariableResolvedType(node.type);
        if (!variableType) {
          continue;
        }
        if (!variable) {
          variable = figma.variables.createVariable(name, collection.id, variableType);
          localVariables.push(variable);
        }
        applyLeafToVariable(variable, node);
        continue;
      }
      applyTokenNode(node, localVariables, collection, name);
    }
  }
  async function applyTokens(tokens) {
    const localVariables = figma.variables.getLocalVariables();
    const tokenSets = getTokenSets(tokens);
    for (const [collectionName, tokenTree] of Object.entries(tokenSets)) {
      if (collectionName === "styles") {
        continue;
      }
      const collection = getOrCreateCollection(collectionName);
      applyTokenNode(tokenTree, localVariables, collection);
    }
  }

  // src/code.ts
  figma.showUI(__html__, { width: 420, height: 720 });
  var SETTINGS_KEY = "token-sync-settings";
  function formatError(error) {
    if (error instanceof Error) {
      return error.stack || `${error.name}: ${error.message}`;
    }
    return String(error);
  }
  function postPreviewContent(content) {
    figma.ui.postMessage({
      type: "PREVIEW_RESULT",
      content
    });
  }
  function postPreviewError(error) {
    postPreviewContent(`{}

/* Preview unavailable: ${formatError(error)} */`);
  }
  function toPreviewContent(tokens) {
    return JSON.stringify(tokens, null, 2);
  }
  function defaultSettings() {
    return {
      token: "",
      repo: "",
      branch: "",
      base: "main",
      path: "tokens.json",
      commitMessage: "update tokens"
    };
  }
  async function loadSettings() {
    const stored = await figma.clientStorage.getAsync(SETTINGS_KEY);
    return __spreadValues(__spreadValues({}, defaultSettings()), stored);
  }
  async function saveSettings(settings) {
    await figma.clientStorage.setAsync(SETTINGS_KEY, settings);
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
  function getPreviewContent() {
    const raw = extractVariables();
    const styles = extractStyleTokens();
    if (raw.length === 0 && styles.paint.length === 0 && styles.text.length === 0 && styles.effect.length === 0 && styles.grid.length === 0) {
      return toPreviewContent(emptyTokenDocument());
    }
    const result = transformTokensWithDiagnostics(raw, styles, { strict: false });
    const content = toPreviewContent(result.document);
    if (result.warnings.length === 0) {
      return content;
    }
    const warnings = result.warnings.map((warning) => `- ${warning.message}`).join("\n");
    return `${content}

/* Skipped conflicting tokens:
${warnings}
*/`;
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
  figma.ui.onmessage = async (msg) => {
    try {
      if (msg.type === "UI_READY") {
        figma.ui.postMessage({
          type: "SETTINGS_LOADED",
          settings: await loadSettings()
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
          commitMessage: msg.commitMessage
        });
        return;
      }
      if (msg.type === "PUSH") {
        const tokens = getCurrentTokens();
        await saveSettings({
          token: msg.token,
          repo: msg.repo,
          branch: msg.branch,
          base: msg.base,
          path: msg.path,
          commitMessage: msg.commitMessage
        });
        await pushToGitHub({
          token: msg.token,
          repo: msg.repo,
          branch: msg.branch,
          path: msg.path,
          base: msg.base,
          content: tokens,
          commitMessage: msg.commitMessage
        });
        figma.ui.postMessage({ type: "SUCCESS", action: "push" });
        syncPreviewToUI();
      }
      if (msg.type === "PULL") {
        const settings = await loadSettings();
        await saveSettings({
          token: msg.token,
          repo: msg.repo,
          branch: msg.branch,
          base: settings.base,
          path: msg.path,
          commitMessage: settings.commitMessage
        });
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
      figma.ui.postMessage({ type: "ERROR", error: formatError(e) });
    }
  };
})();
//# sourceMappingURL=code.js.map
