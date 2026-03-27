export type TokenPrimitiveValue = string | number | boolean;

export type TokenValue =
  | TokenPrimitiveValue
  | null
  | { [key: string]: TokenValue }
  | TokenValue[];

export type TokenLeaf = {
  type: string;
  value: TokenValue;
  description?: string;
};

export type TokenTree = {
  [key: string]: TokenTree | TokenLeaf;
};

export type TokenDocument = {
  global: TokenTree;
  $themes: unknown[];
  $metadata: {
    tokenSetOrder: string[];
  };
};

export type RawVariableToken = {
  name: string;
  type: VariableResolvedDataType;
  modes: Record<string, VariableValue>;
  description: string;
};

export type RawStyleToken = {
  name: string;
  token: TokenLeaf;
};

export type RawStyleTokens = {
  paint: RawStyleToken[];
  text: RawStyleToken[];
  effect: RawStyleToken[];
  grid: RawStyleToken[];
};

export type PushMessage = {
  type: "PUSH";
  token: string;
  repo: string;
  branch: string;
  base: string;
  path: string;
};

export type PullMessage = {
  type: "PULL";
  token: string;
  repo: string;
  branch: string;
  path: string;
};

export type PreviewMessage = {
  type: "PREVIEW";
};

export type UiReadyMessage = {
  type: "UI_READY";
};

export type PluginMessage = PushMessage | PullMessage | PreviewMessage | UiReadyMessage;
