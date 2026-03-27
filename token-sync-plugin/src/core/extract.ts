import { RawStyleToken, RawStyleTokens, RawVariableToken, TokenLeaf, TokenValue } from "./types";

function rgbChannelToHex(value: number) {
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, "0");
}

function rgbaToHex(color: RGB | RGBA, opacity?: number) {
  const alpha = opacity !== undefined ? opacity : "a" in color ? color.a : 1;
  const hex = `#${rgbChannelToHex(color.r)}${rgbChannelToHex(color.g)}${rgbChannelToHex(color.b)}`;

  if (alpha >= 1) {
    return hex;
  }

  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

function serializeOptionalColor(color?: RGB | RGBA) {
  return color ? rgbaToHex(color) : null;
}

function compactToken(name: string, token: TokenLeaf): RawStyleToken {
  return {
    name,
    token,
  };
}

function toDescription(description: string) {
  return description.trim() ? description : undefined;
}

function toFontWeight(style: string) {
  const normalized = style.toLowerCase();

  if (normalized.includes("thin")) return "100";
  if (normalized.includes("extralight") || normalized.includes("ultralight")) return "200";
  if (normalized.includes("light")) return "300";
  if (normalized.includes("regular") || normalized.includes("normal")) return "400";
  if (normalized.includes("medium")) return "500";
  if (normalized.includes("semibold") || normalized.includes("demibold")) return "600";
  if (normalized.includes("bold")) return "700";
  if (normalized.includes("extrabold") || normalized.includes("ultrabold")) return "800";
  if (normalized.includes("black") || normalized.includes("heavy")) return "900";

  return style;
}

function formatLetterSpacing(letterSpacing: LetterSpacing) {
  if (letterSpacing.unit === "PERCENT") {
    return `${letterSpacing.value}%`;
  }

  return `${letterSpacing.value}`;
}

function formatLineHeight(lineHeight: LineHeight) {
  if (lineHeight.unit === "AUTO") {
    return "auto";
  }

  if (lineHeight.unit === "PERCENT") {
    return `${lineHeight.value}%`;
  }

  return `${lineHeight.value}`;
}

function serializePaint(paint: Paint) {
  if (paint.type === "SOLID") {
    return {
      type: paint.type,
      color: rgbaToHex(paint.color, paint.opacity),
      visible: paint.visible !== false,
      blendMode: paint.blendMode || "NORMAL",
    };
  }

  if (
    paint.type === "GRADIENT_LINEAR" ||
    paint.type === "GRADIENT_RADIAL" ||
    paint.type === "GRADIENT_ANGULAR" ||
    paint.type === "GRADIENT_DIAMOND"
  ) {
    return {
      type: paint.type,
      visible: paint.visible !== false,
      opacity: paint.opacity !== undefined ? paint.opacity : 1,
      blendMode: paint.blendMode || "NORMAL",
      stops: paint.gradientStops.map((stop) => ({
        position: stop.position,
        color: rgbaToHex(stop.color),
      })),
    };
  }

  if (paint.type === "IMAGE") {
    return {
      type: paint.type,
      imageHash: paint.imageHash,
      scaleMode: paint.scaleMode,
      opacity: paint.opacity !== undefined ? paint.opacity : 1,
      blendMode: paint.blendMode || "NORMAL",
    };
  }

  if (paint.type === "VIDEO") {
    return {
      type: paint.type,
      videoHash: paint.videoHash,
      scaleMode: paint.scaleMode,
      opacity: paint.opacity !== undefined ? paint.opacity : 1,
      blendMode: paint.blendMode || "NORMAL",
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
      opacity: paint.opacity !== undefined ? paint.opacity : 1,
      blendMode: paint.blendMode || "NORMAL",
    };
  }

  return {
    type: paint.type,
    visible: paint.visible !== false,
    opacity: paint.opacity !== undefined ? paint.opacity : 1,
    blendMode: paint.blendMode || "NORMAL",
    stops: paint.gradientStops.map((stop) => ({
      position: stop.position,
      color: rgbaToHex(stop.color),
    })),
  };
}

function serializeEffect(effect: Effect) {
  if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
    return {
      type: effect.type,
      color: rgbaToHex(effect.color),
      offset: effect.offset,
      radius: effect.radius,
      spread: effect.spread !== undefined ? effect.spread : 0,
      visible: effect.visible,
      blendMode: effect.blendMode,
    };
  }

  if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
    return {
      type: effect.type,
      radius: effect.radius,
      visible: effect.visible,
      blurType: effect.blurType,
      ...(effect.blurType === "PROGRESSIVE"
        ? {
            startRadius: effect.startRadius,
            startOffset: effect.startOffset,
            endOffset: effect.endOffset,
          }
        : {}),
    };
  }

  if (effect.type === "NOISE") {
    return {
      type: effect.type,
      noiseType: effect.noiseType,
      color: rgbaToHex(effect.color),
      visible: effect.visible,
      blendMode: effect.blendMode,
      noiseSize: effect.noiseSize,
      density: effect.density,
      ...(effect.noiseType === "DUOTONE"
        ? { secondaryColor: rgbaToHex(effect.secondaryColor) }
        : {}),
      ...(effect.noiseType === "MULTITONE" ? { opacity: effect.opacity } : {}),
    };
  }

  if (effect.type === "TEXTURE") {
    return {
      type: effect.type,
      visible: effect.visible,
      noiseSize: effect.noiseSize,
      radius: effect.radius,
      clipToShape: effect.clipToShape,
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
      radius: effect.radius,
    };
  }

  return {
    type: effect.type,
    radius: effect.radius,
    visible: effect.visible,
    blurType: effect.blurType,
  };
}

function serializeGrid(grid: LayoutGrid) {
  if (grid.pattern === "GRID") {
    return {
      pattern: grid.pattern,
      sectionSize: grid.sectionSize,
      visible: grid.visible,
      color: serializeOptionalColor(grid.color),
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
    count: grid.count,
  };
}

export function extractVariables(): RawVariableToken[] {
  // 컬렉션 정보가 있어야 modeId를 사람이 읽을 수 있는 mode 이름으로 바꿀 수 있다.
  const collections = figma.variables.getLocalVariableCollections();
  const variables = figma.variables.getLocalVariables();

  const collectionMap = new Map(collections.map((c) => [c.id, c]));

  return variables.map((v) => {
    const collection = collectionMap.get(v.variableCollectionId);

    const modes: Record<string, VariableValue> = {};

    // 각 모드 값을 mode 이름 기준 객체로 평탄화한다.
    const collectionModes = collection ? collection.modes : [];

    for (const mode of collectionModes) {
      const value = v.valuesByMode[mode.modeId];
      if (value !== undefined) {
        modes[mode.name] = value;
      }
    }

    return {
      name: v.name,
      type: v.resolvedType,
      description: v.description,
      // transform 단계가 이 구조를 그대로 사용한다.
      modes,
    };
  });
}

export function extractStyleTokens(): RawStyleTokens {
  return {
    paint: figma.getLocalPaintStyles().map((style) => {
      const solidPaint = style.paints.length === 1 && style.paints[0].type === "SOLID"
        ? style.paints[0]
        : null;

      if (solidPaint) {
        return compactToken(style.name, {
          type: "color",
          value: rgbaToHex(solidPaint.color, solidPaint.opacity),
          description: toDescription(style.description),
        });
      }

      return compactToken(style.name, {
        type: "paintStyle",
        value: {
          paints: style.paints.map((paint) => serializePaint(paint) as unknown as TokenValue),
        },
        description: toDescription(style.description),
      });
    }),
    text: figma.getLocalTextStyles().map((style) =>
      compactToken(style.name, {
        type: "typography",
        value: {
          fontFamily: style.fontName.family,
          fontWeight: toFontWeight(style.fontName.style),
          fontSize: `${style.fontSize}`,
          lineHeight: formatLineHeight(style.lineHeight),
          letterSpacing: formatLetterSpacing(style.letterSpacing),
        },
        description: toDescription(style.description),
      })
    ),
    effect: figma.getLocalEffectStyles().map((style) => {
      const shadowEffect =
        style.effects.length === 1 &&
        (style.effects[0].type === "DROP_SHADOW" || style.effects[0].type === "INNER_SHADOW")
          ? style.effects[0]
          : null;

      if (shadowEffect) {
        return compactToken(style.name, {
          type: "boxShadow",
          value: {
            color: rgbaToHex(shadowEffect.color),
            type: shadowEffect.type === "DROP_SHADOW" ? "dropShadow" : "innerShadow",
            x: `${shadowEffect.offset.x}`,
            y: `${shadowEffect.offset.y}`,
            blur: `${shadowEffect.radius}`,
            spread: `${shadowEffect.spread !== undefined ? shadowEffect.spread : 0}`,
          },
          description: toDescription(style.description),
        });
      }

      return compactToken(style.name, {
        type: "effectStyle",
        value: {
          effects: style.effects.map((effect) => serializeEffect(effect) as unknown as TokenValue),
        },
        description: toDescription(style.description),
      });
    }),
    grid: figma.getLocalGridStyles().map((style) =>
      compactToken(style.name, {
        type: "grid",
        value: {
          layoutGrids: style.layoutGrids.map((grid) => serializeGrid(grid) as unknown as TokenValue),
        },
        description: toDescription(style.description),
      })
    ),
  };
}
