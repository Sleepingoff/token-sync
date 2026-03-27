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
};

async function parseGitHubResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }

  let message = `${res.status} ${res.statusText}`;

  try {
    const errorData = (await res.json()) as { message?: string };
    if (errorData.message) {
      message = errorData.message;
    }
  } catch (_error) {
    // 응답 본문이 JSON이 아니면 상태 코드 메시지만 사용한다.
  }

  throw new Error(`GitHub 요청 실패: ${message}`);
}

export async function pushToGitHub({
  token,
  repo,
  branch,
  path,
  base,
  content,
}: PushToGitHubParams) {
  const [owner, repoName] = repo.split("/");

  if (!owner || !repoName) {
    throw new Error('저장소 형식이 잘못되었습니다. "owner/repo" 형식이어야 합니다.');
  }

  // 1. 대상 브랜치가 이미 있는지 확인한다.
  const exists = await checkBranch(owner, repoName, branch, token);

  // 2. 없으면 base 브랜치를 기준으로 새 브랜치를 만든다.
  if (!exists) {
    const baseSha = await getBranchSha(owner, repoName, base, token);
    await createBranch(owner, repoName, branch, baseSha, token);
  }

  // 3. 기존 파일이 있으면 sha를 가져와 update 요청으로 보낸다.
  const sha = await getFileSha(owner, repoName, path, branch, token);

  // 4. tokens.json을 새로 만들거나 덮어쓴다.
  await uploadFile({
    owner,
    repo: repoName,
    path,
    content: JSON.stringify(content, null, 2),
    branch,
    token,
    sha,
  });
}

export async function pullFromGitHub({
  token,
  repo,
  branch,
  path,
}: GitHubRequest): Promise<TokenTree | TokenDocument> {
  const [owner, repoName] = repo.split("/");

  if (!owner || !repoName) {
    throw new Error('저장소 형식이 잘못되었습니다. "owner/repo" 형식이어야 합니다.');
  }

  // GitHub contents API는 파일 내용을 base64로 반환한다.
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/contents/${path}?ref=${branch}`,
    {
      headers: { Authorization: `token ${token}` },
    }
  );

  const data = await parseGitHubResponse<{ content: string }>(res);

  // Figma 런타임에서 한글/유니코드가 깨지지 않게 문자열로 복원한다.
  const decoded = decodeURIComponent(escape(atob(data.content)));

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

  if (res.status !== 200) return null;

  const data = await parseGitHubResponse<{ sha: string }>(res);
  return data.sha;
}

function encode(content: string) {
  // 업로드 전 contents API 요구사항에 맞게 base64로 인코딩한다.
  return btoa(unescape(encodeURIComponent(content)));
}

async function uploadFile({
  owner,
  repo,
  path,
  content,
  branch,
  token,
  sha,
}: {
  owner: string;
  repo: string;
  path: string;
  content: string;
  branch: string;
  token: string;
  sha: string | null;
}) {
  // sha가 있으면 update, 없으면 create로 처리된다.
  const requestBody: {
    message: string;
    content: string;
    branch: string;
    sha?: string;
  } = {
    message: "update tokens",
    content: encode(content),
    branch,
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
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  await parseGitHubResponse(res);
}
