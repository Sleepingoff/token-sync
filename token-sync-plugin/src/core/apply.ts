import { TokenDocument, TokenLeaf, TokenTree } from "./types";

function isTokenLeaf(node: TokenTree | TokenLeaf): node is TokenLeaf {
  return "type" in node && "value" in node;
}

function isVariableTokenLeaf(node: TokenLeaf) {
  return (
    (node.type === "color" && typeof node.value === "string") ||
    (node.type === "number" && typeof node.value === "number") ||
    (node.type === "string" && typeof node.value === "string") ||
    (node.type === "boolean" && typeof node.value === "boolean")
  );
}

function getTokenTree(tokens: TokenTree | TokenDocument) {
  const tokenDocument = tokens as TokenDocument;

  if (tokenDocument.global && tokenDocument.$metadata) {
    return tokenDocument.global;
  }

  return tokens as TokenTree;
}

function hexToRgb(value: string): RGB {
  const normalized = value.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`지원하지 않는 색상 형식입니다: ${value}`);
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

function toFigmaValue(token: TokenLeaf): VariableValue {
  if (token.type === "color") {
    if (typeof token.value !== "string") {
      throw new Error("COLOR 토큰 값은 문자열 hex여야 합니다.");
    }

    return hexToRgb(token.value);
  }

  if (
    typeof token.value === "string" ||
    typeof token.value === "number" ||
    typeof token.value === "boolean"
  ) {
    return token.value;
  }

  throw new Error(`지원하지 않는 토큰 값 형식입니다: ${token.type}`);
}

function applyLeafToVariable(variable: Variable, token: TokenLeaf) {
  variable.setValueForMode(
    Object.keys(variable.valuesByMode)[0],
    toFigmaValue(token)
  );
}

function toVariableResolvedType(type: TokenLeaf["type"]): VariableResolvedDataType | null {
  if (type === "color") return "COLOR";
  if (type === "number") return "FLOAT";
  if (type === "string") return "STRING";
  if (type === "boolean") return "BOOLEAN";
  return null;
}

function applyTokenNode(
  tokens: TokenTree,
  localVariables: Variable[],
  parentPath = ""
) {
  for (const [key, node] of Object.entries(tokens)) {
    const name = parentPath ? `${parentPath}/${key}` : key;

    if (isTokenLeaf(node)) {
      if (!isVariableTokenLeaf(node)) {
        continue;
      }

      // 같은 이름의 로컬 변수가 있으면 재사용하고, 없으면 새로 만든다.
      let variable = localVariables.find((v) => v.name === name);
      const variableType = toVariableResolvedType(node.type);

      if (!variableType) {
        continue;
      }

      if (!variable) {
        const collection = figma.variables.getLocalVariableCollections()[0];

        if (!collection) {
          throw new Error("적용할 로컬 변수 컬렉션이 없습니다.");
        }

        variable = figma.variables.createVariable(name, collection.id, variableType);
        localVariables.push(variable);
      }

      applyLeafToVariable(variable, node);
      continue;
    }

    applyTokenNode(node as TokenTree, localVariables, name);
  }
}

export async function applyTokens(tokens: TokenTree | TokenDocument) {
  const collection = figma.variables.getLocalVariableCollections()[0];

  if (!collection) {
    throw new Error("적용할 로컬 변수 컬렉션이 없습니다.");
  }

  const localVariables = figma.variables.getLocalVariables();

  // 중첩 depth와 무관하게 토큰 트리를 순회하면서 변수를 적용한다.
  applyTokenNode(getTokenTree(tokens), localVariables);
}
