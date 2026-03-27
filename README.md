# Token Sync

Figma Variables를 `tokens.json`으로 변환해 GitHub에 push/pull할 수 있는 Figma 플러그인입니다.

## 개요

이 프로젝트는 Figma의 로컬 Variables를 추출해 GitHub 저장소의 `tokens.json` 파일과 동기화합니다.

- `Push`: 현재 Figma 로컬 변수를 읽어 `tokens.json`으로 변환한 뒤 GitHub에 업로드
- `Pull`: GitHub의 `tokens.json`을 읽어 현재 Figma 로컬 변수에 반영
- 중첩 경로(`color/primary/default`) 지원
- mode별 값 저장 및 복원 지원
- 스타일 토큰 미리보기 지원

## Style Dictionary를 사용한 토큰 변환

이 플러그인은 Figma에서 추출한 토큰 문서를 GitHub에 저장한 뒤, 이후 개발 단계에서 `Style Dictionary`를 사용해 실제 플랫폼용 코드로 변환하는 흐름을 목표로 합니다.
이 프로젝트는 Tokens Studio의 토큰 구조와 Style Dictionary 연계 흐름을 참고했으며, 토큰 변환 단계에서는 공개 패키지인 `@tokens-studio/sd-transforms`를 사용합니다.

관련 문서:

- [Tokens Studio: Style Dictionary + SD Transforms](https://docs.tokens.studio/transform-tokens/style-dictionary)
- [Style Dictionary 공식 문서](https://styledictionary.com/)
- [@tokens-studio/sd-transforms npm](https://www.npmjs.com/package/@tokens-studio/sd-transforms)
- [Style Dictionary Configurator](https://configurator.tokens.studio)

사용자 입장에서의 기본 흐름은 다음과 같습니다.

1. Figma 플러그인으로 토큰 문서를 `tokens.json` 형태로 GitHub에 저장합니다.
2. 저장소에 `style-dictionary`와 `@tokens-studio/sd-transforms`를 설치합니다.
3. Style Dictionary 설정 파일로 원하는 플랫폼 출력 형식을 정의합니다.
4. GitHub Actions 또는 로컬 명령으로 변환을 실행합니다.
5. 생성된 CSS 변수나 기타 산출물을 앱/웹 프로젝트에서 사용합니다.

필요 패키지 설치 명령은 아래 한 번이면 됩니다.

```bash
npm install style-dictionary @tokens-studio/sd-transforms
```

추가로 [Style Dictionary Configurator](https://configurator.tokens.studio)는 브라우저에서 Style Dictionary 설정을 미리 실험하고 확인할 수 있는 도구입니다. 실제 로컬 설정 파일을 작성하기 전에 어떤 출력 형식이 나오는지 빠르게 검토할 때 유용합니다.

이 저장소에는 바로 참고할 수 있는 예시 파일도 포함되어 있습니다.

- [style-dictionary.config.mjs](./token-sync-plugin/style-dictionary.config.mjs): Style Dictionary 설정 예시
- [build-style-dictionary.mjs](./token-sync-plugin/scripts/build-style-dictionary.mjs): 로컬 빌드 실행 스크립트
- [style-dictionary.yml](./token-sync-plugin/.github/workflows/style-dictionary.yml): GitHub Actions 예시 workflow

로컬에서 직접 변환을 실행하려면 아래 명령을 사용할 수 있습니다.

```bash
npm run build:tokens
```

특정 토큰 파일 경로를 직접 지정해서 실행할 수도 있습니다.

```bash
npm run build:tokens -- --input tokens.json --output build/tokens/
```

## GitHub Actions 변환 자동화

이 저장소에는 GitHub push를 기준으로 Style Dictionary 변환을 실행할 수 있는 workflow 예시가 포함되어 있습니다.

- workflow 파일: [style-dictionary.yml](./token-sync-plugin/.github/workflows/style-dictionary.yml)
- 설정 파일: [style-dictionary.config.mjs](./token-sync-plugin/style-dictionary.config.mjs)
- 실행 스크립트: [build-style-dictionary.mjs](./token-sync-plugin/scripts/build-style-dictionary.mjs)

기본 동작은 다음과 같습니다.

1. GitHub Actions가 실행되면 `npm ci`로 의존성을 설치합니다.
2. 기본 토큰 파일 경로(`tokens.json`)를 읽습니다.
3. `style-dictionary`와 `@tokens-studio/sd-transforms`를 이용해 CSS 변수 파일을 생성합니다.
4. 결과물을 GitHub Actions artifact로 업로드합니다.

기본 토큰 파일 경로가 `tokens.json`이 아니라면 workflow의 `DEFAULT_TOKENS_FILE` 값을 저장소에 맞게 수정하면 됩니다. 수동 실행(`workflow_dispatch`)에서는 원하는 경로를 직접 입력할 수도 있습니다.

## 주요 동작 방식

1. Figma 로컬 Variables를 읽습니다.
2. 변수 이름을 `/` 기준 경로로 분해해 중첩 JSON 구조로 변환합니다.
3. 스타일 정보가 있으면 함께 토큰 문서에 포함합니다.
4. 결과를 `global`, `$themes`, `$metadata`를 포함하는 토큰 문서 구조로 저장합니다.
5. Pull 시 `tokens.json`을 다시 읽어 Figma Variables로 복원합니다.

예시 토큰 구조:

```json
{
  "global": {
    "color": {
      "primary": {
        "default": {
          "value": "#3366ff",
          "type": "color",
          "description": "Primary color"
        }
      }
    },
    "typography": {
      "h1": {
        "value": {
          "fontFamily": "Pretendard",
          "fontWeight": "600",
          "fontSize": "18",
          "lineHeight": "20",
          "letterSpacing": "0"
        },
        "type": "typography"
      }
    }
  },
  "$themes": [],
  "$metadata": {
    "tokenSetOrder": ["global"]
  }
}
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 빌드

```bash
npm run build
```

개발 중 자동 빌드:

```bash
npm run watch
```

### 3. Figma에서 플러그인 연결

1. Figma Desktop 실행
2. `Plugins > Development > Import plugin from manifest...`
3. 프로젝트의 [manifest.json](./token-sync-plugin/manifest.json) 선택

## 사용 방법

플러그인 UI에서 아래 값을 입력합니다.

- `GitHub Token`: 저장소 접근 권한이 있는 Personal Access Token
- `owner/repo`: 예시 `my-org/design-tokens`
- `branch`: 작업할 대상 브랜치
- `base branch`: push 시 브랜치가 없으면 기준이 되는 브랜치
- `token file path`: 예시 `tokens.json`, `tokens/global/tokens.json`

### Push

1. Figma 로컬 Variables를 추출합니다.
2. 현재 스타일 정보와 함께 토큰 문서 구조로 변환합니다.
3. 지정한 브랜치와 파일 경로에 `tokens.json`을 생성하거나 업데이트합니다.

### Pull

1. GitHub의 지정한 경로에서 `tokens.json`을 읽습니다.
2. 현재는 변수형 토큰(`color`, `number`, `string`, `boolean`)만 Figma Variables로 복원합니다.
3. 스타일 토큰(`typography`, `boxShadow` 등)은 현재 읽기/미리보기 중심이며, 별도 스타일 복원 로직은 추후 확장 대상입니다.

## 프로젝트 구조

- [src/code.ts](./token-sync-plugin/src/code.ts): Figma 메인 컨텍스트, UI 메시지 처리
- [src/ui.ts](./token-sync-plugin/src/ui.ts): 플러그인 UI 이벤트 처리
- [src/ui.html](./token-sync-plugin/src/ui.html): 간단한 입력 UI
- [src/core/extract.ts](./token-sync-plugin/src/core/extract.ts): Figma Variables 추출
- [src/core/transform.ts](./token-sync-plugin/src/core/transform.ts): Variables를 토큰 JSON으로 변환
- [src/core/apply.ts](./token-sync-plugin/src/core/apply.ts): 토큰 JSON을 Figma Variables에 반영
- [src/core/github.ts](./token-sync-plugin/src/core/github.ts): GitHub API 연동
- [src/core/types.ts](./token-sync-plugin/src/core/types.ts): 공통 타입 정의

## 제한 사항

- 현재 Pull은 변수형 토큰만 복원하며, 스타일 토큰을 Figma Styles로 다시 만드는 기능은 아직 구현하지 않았습니다.
- mode 복원 로직은 이전 구조 기준에서만 일부 호환되며, 현재 문서 구조에서는 단일 대표값 중심으로 동작합니다.
- 컬렉션 선택 UI는 없고, 첫 번째 로컬 변수 컬렉션을 기준으로 적용합니다.
- alias/reference variable 같은 고급 케이스는 아직 별도 처리하지 않습니다.

## 개발 메모

- 번들링은 `esbuild`로 처리합니다.
- UI 스크립트와 메인 스크립트를 각각 `dist/ui.js`, `dist/code.js`로 빌드합니다.
- `src/ui.html`은 빌드 시 `dist/ui.js`를 인라인한 `dist/ui.html`로 생성됩니다.
- 장기적으로는 이 플러그인이 생성한 토큰 문서를 Style Dictionary 빌드 파이프라인의 입력으로 사용하는 것을 목표로 합니다.

## AI 사용 고지

이 프로젝트의 코드는 GPT와 Codex를 활용해 작성 및 보완되었습니다.

- 구조 정리
- 타입 보강
- 주석 추가
- README 및 문서화
- 일부 로직 개선

최종 검토와 실제 사용 환경 검증은 사람이 직접 수행하는 것을 전제로 합니다.
