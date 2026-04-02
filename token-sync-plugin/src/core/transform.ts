import {
  RawStyleToken,
  RawStyleTokens,
  RawVariableToken,
  TokenDocument,
  TokenLeaf,
  TokenSets,
  TokenTree,
  TokenValue,
} from "./types";

type TransformWarning = {
  tokenName: string;
  message: string;
};

type TransformOptions = {
  strict?: boolean;
};

type TransformResult = {
  document: TokenDocument;
  warnings: TransformWarning[];
};

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

function summarizeGroupKeys(node: TokenTree) {
  const keys = Object.keys(node);

  if (keys.length === 0) {
    return "비어 있는 그룹";
  }

  if (keys.length <= 4) {
    return `하위 키: ${keys.join(", ")}`;
  }

  return `하위 키: ${keys.slice(0, 4).join(", ")} 외 ${keys.length - 4}개`;
}

function getPathCollisionMessage(
  tokenName: string,
  conflictPath: string,
  reason: "leaf" | "branch",
  existing?: TokenTree | TokenLeaf
) {
  if (reason === "leaf") {
    return `토큰 경로 충돌: 추가하려는 "${tokenName}"이 기존 리프 토큰 "${conflictPath}"와 겹칩니다. "${conflictPath}"는 이미 값이 있는 토큰이라 하위 경로를 만들 수 없습니다.`;
  }

  const details =
    existing && !isTokenLeaf(existing) ? ` (${summarizeGroupKeys(existing)})` : "";

  return `토큰 경로 충돌: 추가하려는 "${tokenName}"이 기존 그룹 "${conflictPath}"와 겹칩니다.${details}`;
}

function insertToken(tree: TokenTree, tokenName: string, leaf: TokenLeaf): TransformWarning | null {
  const path = tokenName.split("/").filter(Boolean);
  let current: TokenTree = tree;

  path.forEach((key: string, i: number) => {
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

    current = current[key] as TokenTree;
  });

  return null;
}

function tryInsertToken(
  tree: TokenTree,
  tokenName: string,
  leaf: TokenLeaf,
  warnings: TransformWarning[],
  options?: TransformOptions
) {
  try {
    insertToken(tree, tokenName, leaf);
  } catch (error) {
    if (options?.strict !== false) {
      throw error;
    }

    warnings.push({
      tokenName,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function toStyleTokenPath(
  category: keyof RawStyleTokens,
  styleName: string
) {
  return `${category}/${styleName}`;
}

function getOrCreateTokenSet(tokenSets: TokenSets, name: string) {
  if (!tokenSets[name]) {
    tokenSets[name] = {};
  }

  return tokenSets[name];
}

function insertStyleTokens(
  tree: TokenTree,
  category: keyof RawStyleTokens,
  styles: RawStyleToken[],
  warnings: TransformWarning[],
  options?: TransformOptions
) {
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

export function transformTokensWithDiagnostics(
  raw: RawVariableToken[],
  styles?: RawStyleTokens,
  options?: TransformOptions
): TransformResult {
  const tokenSets: TokenSets = {};
  const warnings: TransformWarning[] = [];

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
      description: token.description.trim() ? token.description : undefined,
      reference: token.reference,
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
    document: {
      ...tokenSets,
      $themes: [],
      $metadata: {
        tokenSetOrder,
      },
    },
    warnings,
  };
}

export function transformTokens(
  raw: RawVariableToken[],
  styles?: RawStyleTokens,
  options?: TransformOptions
): TokenDocument {
  return transformTokensWithDiagnostics(raw, styles, options).document;
}
