import {
  RawStyleToken,
  RawStyleTokens,
  RawVariableToken,
  TokenDocument,
  TokenLeaf,
  TokenTree,
  TokenValue,
} from "./types";

function rgbaToHex(color: RGB | RGBA) {
  // Figma RGB(0~1)를 일반적인 16진수 색상 문자열로 변환한다.
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function normalizeModeValue(
  token: RawVariableToken,
  rawValue: VariableValue
): TokenValue {
  if (token.type === "COLOR") {
    return rgbaToHex(rawValue as RGB | RGBA);
  }

  if (
    typeof rawValue === "string" ||
    typeof rawValue === "number" ||
    typeof rawValue === "boolean"
  ) {
    return rawValue;
  }

  throw new Error(`변수 "${token.name}"의 타입 ${token.type}은 아직 지원하지 않습니다.`);
}

function getModeValues(token: RawVariableToken): Record<string, TokenValue> {
  const entries = Object.entries(token.modes);

  if (entries.length === 0) {
    throw new Error(`변수 "${token.name}"에 사용할 mode 값이 없습니다.`);
  }

  const modeValues: Record<string, TokenValue> = {};

  for (const [modeName, value] of entries) {
    modeValues[modeName] = normalizeModeValue(token, value);
  }

  return modeValues;
}

function mapVariableType(type: VariableResolvedDataType) {
  if (type === "COLOR") return "color";
  if (type === "FLOAT") return "number";
  if (type === "STRING") return "string";
  return "boolean";
}

function isTokenLeaf(value: TokenTree | TokenLeaf | undefined): value is TokenLeaf {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      "value" in value
  );
}

function insertToken(tree: TokenTree, tokenName: string, leaf: TokenLeaf) {
  const path = tokenName.split("/").filter(Boolean);
  let current: TokenTree = tree;

  path.forEach((key: string, i: number) => {
    const isLast = i === path.length - 1;
    const existing = current[key];

    if (isLast) {
      current[key] = leaf;
      return;
    }

    if (isTokenLeaf(existing)) {
      throw new Error(`토큰 경로 충돌: "${tokenName}"이 기존 리프 노드와 겹칩니다.`);
    }

    if (!existing) {
      current[key] = {};
    }

    current = current[key] as TokenTree;
  });
}

function insertStyleTokens(tree: TokenTree, styles: RawStyleToken[]) {
  for (const style of styles) {
    insertToken(tree, style.name, style.token);
  }
}

export function transformTokens(raw: RawVariableToken[], styles?: RawStyleTokens): TokenDocument {
  const globalTree: TokenTree = {};

  for (const token of raw) {
    const modeValues = getModeValues(token);
    const primaryMode = Object.keys(modeValues)[0];

    insertToken(globalTree, token.name, {
      type: mapVariableType(token.type),
      value: modeValues[primaryMode],
      description: token.description.trim() ? token.description : undefined,
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
      tokenSetOrder: ["global"],
    },
  };
}
