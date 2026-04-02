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

function getTokenSets(tokens: TokenTree | TokenDocument) {
  const tokenDocument = tokens as TokenDocument;

  if (tokenDocument.$metadata) {
    const sets: Record<string, TokenTree> = {};

    for (const [key, value] of Object.entries(tokenDocument)) {
      if (key.startsWith("$")) {
        continue;
      }

      sets[key] = value as TokenTree;
    }

    if (Object.keys(sets).length > 0) {
      return sets;
    }
  }

  return {
    global: tokens as TokenTree,
  };
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

function getOrCreateCollection(collectionName: string) {
  const collections = figma.variables.getLocalVariableCollections();
  const existing = collections.find((collection) => collection.name === collectionName);

  if (existing) {
    return existing;
  }

  return figma.variables.createVariableCollection(collectionName);
}

function applyTokenNode(
  tokens: TokenTree,
  localVariables: Variable[],
  collection: VariableCollection,
  parentPath = ""
) {
  for (const [key, node] of Object.entries(tokens)) {
    const name = parentPath ? `${parentPath}/${key}` : key;

    if (isTokenLeaf(node)) {
      if (!isVariableTokenLeaf(node)) {
        continue;
      }

      // 같은 이름의 로컬 변수가 있으면 재사용하고, 없으면 새로 만든다.
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

    applyTokenNode(node as TokenTree, localVariables, collection, name);
  }
}

export async function applyTokens(tokens: TokenTree | TokenDocument) {
  const localVariables = figma.variables.getLocalVariables();
  const tokenSets = getTokenSets(tokens);

  for (const [collectionName, tokenTree] of Object.entries(tokenSets)) {
    if (collectionName === "styles") {
      continue;
    }

    const collection = getOrCreateCollection(collectionName);
    // 중첩 depth와 무관하게 토큰 트리를 순회하면서 변수를 적용한다.
    applyTokenNode(tokenTree, localVariables, collection);
  }
}
