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
  reference?: string;
};

export type TokenTree = {
  [key: string]: TokenTree | TokenLeaf;
};

export type TokenSets = {
  [key: string]: TokenTree;
};

export type TokenDocument = TokenSets & {
  $themes: unknown[];
  $metadata: {
    tokenSetOrder: string[];
  };
};

export type RawVariableToken = {
  collection: string;
  name: string;
  type: VariableResolvedDataType;
  modes: Record<string, VariableValue>;
  description: string;
  reference?: string;
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
  commitMessage: string;
};

export type LoadPullRequestTemplateMessage = {
  type: "LOAD_PULL_REQUEST_TEMPLATE";
  token: string;
  repo: string;
  branch: string;
  base: string;
};

export type CreatePullRequestMessage = {
  type: "CREATE_PULL_REQUEST";
  token: string;
  repo: string;
  branch: string;
  base: string;
  title: string;
  body: string;
};

export type PullMessage = {
  type: "PULL";
  token: string;
  repo: string;
  branch: string;
  path: string;
};

export type PersistedSettings = {
  token: string;
  repo: string;
  branch: string;
  base: string;
  path: string;
  commitMessage: string;
};

export type SaveSettingsMessage = PersistedSettings & {
  type: "SAVE_SETTINGS";
};

export type PreviewMessage = {
  type: "PREVIEW";
};

export type UiReadyMessage = {
  type: "UI_READY";
};

export type ResizeUiMessage = {
  type: "RESIZE_UI";
  width: number;
  height: number;
  manual?: boolean;
};

export type PluginMessage =
  | PushMessage
  | LoadPullRequestTemplateMessage
  | CreatePullRequestMessage
  | PullMessage
  | SaveSettingsMessage
  | PreviewMessage
  | UiReadyMessage
  | ResizeUiMessage;
