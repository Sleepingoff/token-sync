import { TokenDocument, TokenTree } from "./types";

type GitHubRequest = {
  token: string;
  repo: string;
  branch: string;
  path: string;
};

type PushToGitHubParams = GitHubRequest & {
  base: string;
  content: TokenDocument;
  commitMessage: string;
};

type PullRequestRequest = {
  token: string;
  repo: string;
  branch: string;
  base: string;
};

type ResolvedBranch = {
  branch: string;
  base: string;
  usedDefaultFallback: boolean;
};

type PullRequestTemplateResult = {
  body: string;
  path: string | null;
};

type CreatedPullRequest = {
  number: number;
  url: string;
};

function normalizeRepoPart(value: string) {
  return value.trim();
}

function normalizePath(path: string) {
  return path.trim().replace(/^\/+/, "");
}

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: number[]) {
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index] ?? 0;
    const byte2 = bytes[index + 1] ?? 0;
    const byte3 = bytes[index + 2] ?? 0;
    const chunk = (byte1 << 16) | (byte2 << 8) | byte3;

    output += BASE64_ALPHABET[(chunk >> 18) & 63];
    output += BASE64_ALPHABET[(chunk >> 12) & 63];
    output += index + 1 < bytes.length ? BASE64_ALPHABET[(chunk >> 6) & 63] : "=";
    output += index + 2 < bytes.length ? BASE64_ALPHABET[chunk & 63] : "=";
  }

  return output;
}

function base64ToBytes(base64: string) {
  const normalized = base64.replace(/\s/g, "");
  const bytes: number[] = [];
  let index = 0;

  while (index < normalized.length) {
    const char1 = normalized[index] ?? "A";
    const char2 = normalized[index + 1] ?? "A";
    const char3 = normalized[index + 2] ?? "A";
    const char4 = normalized[index + 3] ?? "A";

    const enc1 = BASE64_ALPHABET.indexOf(char1);
    const enc2 = BASE64_ALPHABET.indexOf(char2);
    const enc3 = char3 === "=" ? 0 : BASE64_ALPHABET.indexOf(char3);
    const enc4 = char4 === "=" ? 0 : BASE64_ALPHABET.indexOf(char4);

    const chunk = (enc1 << 18) | (enc2 << 12) | (enc3 << 6) | enc4;

    bytes.push((chunk >> 16) & 255);

    if (char3 !== "=") {
      bytes.push((chunk >> 8) & 255);
    }

    if (char4 !== "=") {
      bytes.push(chunk & 255);
    }

    index += 4;
  }

  return bytes;
}

function encodeUtf8(value: string) {
  const bytes: number[] = [];
  let index = 0;

  while (index < value.length) {
    const codePoint = value.codePointAt(index);

    if (codePoint === undefined) {
      break;
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >> 12));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(0xf0 | (codePoint >> 18));
      bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    }

    index += codePoint > 0xffff ? 2 : 1;
  }

  return bytes;
}

function decodeUtf8(bytes: number[]) {
  let output = "";
  let index = 0;

  while (index < bytes.length) {
    const byte1 = bytes[index];

    if (byte1 === undefined) {
      break;
    }

    if (byte1 <= 0x7f) {
      output += String.fromCharCode(byte1);
      index += 1;
      continue;
    }

    if ((byte1 & 0xe0) === 0xc0) {
      const byte2 = bytes[index + 1] ?? 0;
      const codePoint = ((byte1 & 0x1f) << 6) | (byte2 & 0x3f);
      output += String.fromCharCode(codePoint);
      index += 2;
      continue;
    }

    if ((byte1 & 0xf0) === 0xe0) {
      const byte2 = bytes[index + 1] ?? 0;
      const byte3 = bytes[index + 2] ?? 0;
      const codePoint =
        ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f);
      output += String.fromCharCode(codePoint);
      index += 3;
      continue;
    }

    const byte2 = bytes[index + 1] ?? 0;
    const byte3 = bytes[index + 2] ?? 0;
    const byte4 = bytes[index + 3] ?? 0;
    const codePoint =
      ((byte1 & 0x07) << 18) |
      ((byte2 & 0x3f) << 12) |
      ((byte3 & 0x3f) << 6) |
      (byte4 & 0x3f);
    const normalized = codePoint - 0x10000;

    output += String.fromCharCode(
      0xd800 + (normalized >> 10),
      0xdc00 + (normalized & 0x3ff)
    );
    index += 4;
  }

  return output;
}

async function parseGitHubResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }

  throw new Error(`GitHub 요청 실패: ${await getGitHubErrorMessage(res)}`);
}

async function getGitHubErrorMessage(res: Response) {
  let message = `${res.status} ${res.statusText}`;

  try {
    const errorData = (await res.json()) as {
      message?: string;
      errors?: Array<{
        message?: string;
        code?: string;
        field?: string;
      }>;
    };
    if (errorData.message) {
      message = errorData.message;
    }

    if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
      const details = errorData.errors
        .map((error) => {
          const parts = [error.field, error.code, error.message].filter(Boolean);
          return parts.join(": ");
        })
        .filter(Boolean)
        .join(" | ");

      if (details) {
        message = `${message} (${details})`;
      }
    }
  } catch (_error) {
    // 응답 본문이 JSON이 아니면 상태 코드 메시지만 사용한다.
  }

  return message;
}

export async function pushToGitHub({
  token,
  repo,
  branch,
  path,
  base,
  content,
  commitMessage,
}: PushToGitHubParams) {
  const normalizedRepo = normalizeRepoPart(repo);
  const normalizedBranch = normalizeRepoPart(branch);
  const normalizedBase = normalizeRepoPart(base);
  const normalizedPath = normalizePath(path);
  const [owner, repoName] = normalizedRepo.split("/");

  if (!owner || !repoName) {
    throw new Error('저장소 형식이 잘못되었습니다. "owner/repo" 형식이어야 합니다.');
  }

  if (!normalizedBranch) {
    throw new Error("브랜치를 입력해 주세요.");
  }

  if (!normalizedBase) {
    throw new Error("기준 브랜치를 입력해 주세요.");
  }

  if (!normalizedPath) {
    throw new Error("토큰 파일 경로를 입력해 주세요.");
  }

  const normalizedCommitMessage = commitMessage.trim() || "update tokens";

  const resolved = await resolvePushBranch({
    owner,
    repo: repoName,
    branch: normalizedBranch,
    base: normalizedBase,
    token,
  });

  await uploadFile({
    owner,
    repo: repoName,
    path: normalizedPath,
    content: JSON.stringify(content, null, 2),
    branch: resolved.branch,
    token,
    commitMessage: normalizedCommitMessage,
  });

  return {
    branch: resolved.branch,
    base: resolved.base,
    usedDefaultFallback: resolved.usedDefaultFallback,
  };
}

export async function loadPullRequestTemplate({
  token,
  repo,
  branch,
  base,
}: PullRequestRequest): Promise<PullRequestTemplateResult> {
  const { owner, repoName, normalizedBranch, normalizedBase } = parsePullRequestRequest({
    token,
    repo,
    branch,
    base,
  });

  const resolved = await resolvePushBranch({
    owner,
    repo: repoName,
    branch: normalizedBranch,
    base: normalizedBase,
    token,
  });

  const refCandidates = Array.from(new Set([resolved.branch, resolved.base]));
  const pathCandidates = [
    ".github/pull_request_template.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    "docs/pull_request_template.md",
    "pull_request_template.md",
  ];

  for (const ref of refCandidates) {
    for (const path of pathCandidates) {
      const content = await fetchOptionalTextFile({
        owner,
        repo: repoName,
        path,
        ref,
        token,
      });

      if (content !== null) {
        return {
          body: content,
          path,
        };
      }
    }

    const directoryTemplate = await fetchPullRequestTemplateFromDirectory({
      owner,
      repo: repoName,
      ref,
      token,
    });

    if (directoryTemplate) {
      return directoryTemplate;
    }
  }

  return {
    body: "",
    path: null,
  };
}

export async function createPullRequest({
  token,
  repo,
  branch,
  base,
  title,
  body,
}: PullRequestRequest & { title: string; body: string }): Promise<CreatedPullRequest> {
  const { owner, repoName, normalizedBranch, normalizedBase } = parsePullRequestRequest({
    token,
    repo,
    branch,
    base,
  });
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    throw new Error("PR 제목을 입력해 주세요.");
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: normalizedTitle,
      head: normalizedBranch,
      base: normalizedBase,
      body,
    }),
  });

  const data = await parseGitHubResponse<{ number: number; html_url: string }>(res);

  return {
    number: data.number,
    url: data.html_url,
  };
}

export async function pullFromGitHub({
  token,
  repo,
  branch,
  path,
}: GitHubRequest): Promise<TokenTree | TokenDocument> {
  const normalizedRepo = normalizeRepoPart(repo);
  const normalizedBranch = normalizeRepoPart(branch);
  const normalizedPath = normalizePath(path);
  const [owner, repoName] = normalizedRepo.split("/");

  if (!owner || !repoName) {
    throw new Error('저장소 형식이 잘못되었습니다. "owner/repo" 형식이어야 합니다.');
  }

  if (!normalizedBranch) {
    throw new Error("브랜치를 입력해 주세요.");
  }

  if (!normalizedPath) {
    throw new Error("토큰 파일 경로를 입력해 주세요.");
  }

  // GitHub contents API는 파일 내용을 base64로 반환한다.
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/contents/${normalizedPath}?ref=${normalizedBranch}`,
    {
      headers: { Authorization: `token ${token}` },
    }
  );

  if (res.status === 404) {
    throw new Error(
      `원격 파일을 찾을 수 없습니다: ${owner}/${repoName}@${normalizedBranch}:${normalizedPath}. 파일이 없으면 Push로 먼저 생성해 주세요.`
    );
  }

  const data = await parseGitHubResponse<{ content: string }>(res);

  const decoded = decodeUtf8(base64ToBytes(data.content));

  return JSON.parse(decoded) as TokenTree | TokenDocument;
}

async function checkBranch(
  owner: string,
  repo: string,
  branch: string,
  token: string
) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
    {
      headers: { Authorization: `token ${token}` },
    }
  );

  return res.status === 200;
}

function parsePullRequestRequest({
  token,
  repo,
  branch,
  base,
}: PullRequestRequest) {
  const normalizedRepo = normalizeRepoPart(repo);
  const normalizedBranch = normalizeRepoPart(branch);
  const normalizedBase = normalizeRepoPart(base);
  const [owner, repoName] = normalizedRepo.split("/");

  if (!token.trim()) {
    throw new Error("GitHub 토큰을 입력해 주세요.");
  }

  if (!owner || !repoName) {
    throw new Error('저장소 형식이 잘못되었습니다. "owner/repo" 형식이어야 합니다.');
  }

  if (!normalizedBranch) {
    throw new Error("브랜치를 입력해 주세요.");
  }

  if (!normalizedBase) {
    throw new Error("기준 브랜치를 입력해 주세요.");
  }

  return {
    owner,
    repoName,
    normalizedBranch,
    normalizedBase,
  };
}

async function getDefaultBranch(owner: string, repo: string, token: string) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Authorization: `token ${token}` },
  });

  const data = await parseGitHubResponse<{ default_branch: string }>(res);
  return data.default_branch;
}

async function getBranchSha(
  owner: string,
  repo: string,
  branch: string,
  token: string
) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    {
      headers: { Authorization: `token ${token}` },
    }
  );

  const data = await parseGitHubResponse<{ object: { sha: string } }>(res);
  return data.object.sha;
}

async function createBranch(
  owner: string,
  repo: string,
  newBranch: string,
  baseSha: string,
  token: string
) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref: `refs/heads/${newBranch}`,
      sha: baseSha,
    }),
  });

  await parseGitHubResponse(res);
}

async function ensureBranchExists(params: {
  owner: string;
  repo: string;
  branch: string;
  base: string;
  token: string;
}) {
  const { owner, repo, branch, base, token } = params;
  const exists = await checkBranch(owner, repo, branch, token);

  if (exists) {
    return;
  }

  if (branch === base) {
    throw new Error(`브랜치를 찾을 수 없습니다: ${branch}`);
  }

  const baseSha = await getBranchSha(owner, repo, base, token);
  await createBranch(owner, repo, branch, baseSha, token);
}

async function resolvePushBranch(params: {
  owner: string;
  repo: string;
  branch: string;
  base: string;
  token: string;
}): Promise<ResolvedBranch> {
  const { owner, repo, branch, base, token } = params;

  try {
    await ensureBranchExists({ owner, repo, branch, base, token });

    return {
      branch,
      base,
      usedDefaultFallback: false,
    };
  } catch (_error) {
    const defaultBranch = await getDefaultBranch(owner, repo, token);

    if (branch === defaultBranch) {
      await ensureBranchExists({
        owner,
        repo,
        branch: defaultBranch,
        base: defaultBranch,
        token,
      });

      return {
        branch: defaultBranch,
        base: defaultBranch,
        usedDefaultFallback: true,
      };
    }

    await ensureBranchExists({
      owner,
      repo,
      branch,
      base: defaultBranch,
      token,
    });

    return {
      branch,
      base: defaultBranch,
      usedDefaultFallback: true,
    };
  }
}

async function getFileSha(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string
) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: { Authorization: `token ${token}` },
    }
  );

  if (res.status === 404) {
    return null;
  }

  const data = await parseGitHubResponse<{ sha: string }>(res);
  return data.sha;
}

function encode(content: string) {
  return bytesToBase64(encodeUtf8(content));
}

async function uploadFile({
  owner,
  repo,
  path,
  content,
  branch,
  token,
  commitMessage,
}: {
  owner: string;
  repo: string;
  path: string;
  content: string;
  branch: string;
  token: string;
  commitMessage: string;
}) {
  const requestBody: {
    message: string;
    content: string;
    branch: string;
    sha?: string;
  } = {
    message: commitMessage,
    content: encode(content),
    branch,
  };

  const createRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (createRes.ok) {
    await createRes.json();
    return;
  }

  // 파일이 이미 있으면 sha를 포함해 overwrite로 재시도한다.
  if (createRes.status !== 422) {
    const message = await getGitHubErrorMessage(createRes);
    throw new Error(`GitHub 요청 실패: ${message}`);
  }

  const sha = await getFileSha(owner, repo, path, branch, token);

  if (!sha) {
    const message = await getGitHubErrorMessage(createRes);
    throw new Error(`GitHub 요청 실패: ${message}`);
  }

  requestBody.sha = sha;

  const updateRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  await parseGitHubResponse(updateRes);
}

async function fetchOptionalTextFile({
  owner,
  repo,
  path,
  ref,
  token,
}: {
  owner: string;
  repo: string;
  path: string;
  ref: string;
  token: string;
}) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
    {
      headers: { Authorization: `token ${token}` },
    }
  );

  if (res.status === 404) {
    return null;
  }

  const data = await parseGitHubResponse<{ content: string }>(res);
  return decodeUtf8(base64ToBytes(data.content));
}

async function fetchPullRequestTemplateFromDirectory({
  owner,
  repo,
  ref,
  token,
}: {
  owner: string;
  repo: string;
  ref: string;
  token: string;
}) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/.github/PULL_REQUEST_TEMPLATE?ref=${ref}`,
    {
      headers: { Authorization: `token ${token}` },
    }
  );

  if (res.status === 404) {
    return null;
  }

  const entries = await parseGitHubResponse<Array<{ type: string; name: string; path: string }>>(res);
  const markdownTemplate = entries
    .filter((entry) => entry.type === "file" && /\.md$/i.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))[0];

  if (!markdownTemplate) {
    return null;
  }

  const content = await fetchOptionalTextFile({
    owner,
    repo,
    path: markdownTemplate.path,
    ref,
    token,
  });

  if (content === null) {
    return null;
  }

  return {
    body: content,
    path: markdownTemplate.path,
  };
}
