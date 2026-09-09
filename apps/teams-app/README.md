# Teams 앱 패키지

Teams 좌측 사이드바에 꽂히는 **개인 앱**. 탭 하나(`사규검색`)만 있고, 봇은 없다.

```
manifest.template.json   값이 비어 있는 원본
build.mjs                템플릿 + 아이콘 → dist/
validate.mjs             생성물을 Microsoft 실제 스키마와 대조
color.png                192×192 (앱 카탈로그·탭 헤더)
outline.png               32×32  투명 배경 + 흰 실루엣 (좌측 앱 바)
make-icons.py            아이콘 생성기. 빌드에 포함되지 않는다
```

## 아이콘

AI 반짝이 두 개가 살짝 겹친 모양. **배경도 면도 없이 선으로만** 그린다 —
Teams 앱 아이콘의 일반적인 결이 픽토그램이고, 채도 높은 사각형 하나가 앱 목록에서
유독 튀는 것도 피한다.

PNG 는 커밋돼 있다. 모양이나 색을 바꿀 때만 `python make-icons.py` 를 돌린다
(Pillow 필요).

| | 선 색 | 이유 |
|---|---|---|
| `color.png` | 브랜드 `#5874EA` | 무배경이라 **라이트·다크 표면 양쪽**에 놓인다. 흰 선은 라이트에서 사라진다 |
| `outline.png` | 흰색 | Teams 규정. 앱 바(어두움)에서만 쓰인다 |

색은 지어내지 않고 `apps/web/src/app/globals.css` 다크 테마의 `--primary`(oklch)를
그대로 변환한다. 사이트 테마가 바뀌면 스크립트 상단 상수만 맞추면 된다.

두 가지가 눈에 안 띄지만 중요하다:

- **겹치는 자리에서 큰 쪽 선을 끊는다** (`GAP`). 두 윤곽이 그냥 교차하면 매듭처럼
  보여서 "반짝이 두 개"가 아니라 정체불명의 도형이 된다.
- **32px 선 굵기는 비례로 줄이지 않는다** (`STROKE_SMALL`). 192px 기준 비율을 그대로
  적용하면 선이 1px 미만이 되어 사라진다.

바꾼 뒤 확인할 때 **32px 을 보간 확대하지 말 것** — 흐려져서 뭉개진 것처럼 보인다.
`Image.NEAREST` 로 확대해 실제 픽셀을 봐야 한다.

## 왜 완성된 매니페스트를 커밋하지 않나

안에 들어가는 값(Application ID, Application ID URI, 호스트)은 이미
`apps/api/.env` 에 있다. 저장소에 두 벌을 두면 한쪽만 고치는 사고가 나므로
빌드 시점에 조립한다. 아이콘 2개와 템플릿만 형상관리 대상이다.

`dist/` 는 `.gitignore` 대상이다.

## 만들기

```bash
cd apps/teams-app
node build.mjs && node validate.mjs        # 또는 pnpm package
```

`build.mjs` 는 환경변수를 먼저 보고, 없으면 `apps/api/.env` 에서 읽는다.

| 값 | 출처 | 비고 |
|---|---|---|
| `ENTRA_CLIENT_ID` | `apps/api/.env` | 매니페스트 `id` 와 `webApplicationInfo.id` 에 **둘 다** 쓴다 |
| `ENTRA_API_AUDIENCE` | `apps/api/.env` | `webApplicationInfo.resource` |
| `CONTENT_HOST` | 선택 | 탭 콘텐츠를 받아올 곳. 터널 검증 때만 덮는다 |
| `TEAMS_APP_VERSION` | 선택 | 버전을 직접 지정. 아래 참조 |
| `TEAMS_WEBSITE_URL` | 선택 | 기본값은 서비스 도메인. 아래 참조 |
| `TEAMS_PRIVACY_URL` / `TEAMS_TERMS_URL` | 선택 | 기본값 `<서비스>/privacy`, `<서비스>/terms` |

### 게시자와 서비스는 다른 주체다

**게시자는 AirQuay Vina, 서비스는 Geniein 이다.** 그래서 호스트가 둘이고 섞으면 안 된다:

| | 값 | 터널을 따라가나 |
|---|---|---|
| `contentUrl`, `validDomains` | 탭 콘텐츠를 지금 받아올 곳 | **예** — `CONTENT_HOST` |
| `developer.*` 링크 | 서비스가 실제로 사는 곳 | **아니오** — Application ID URI 의 도메인 |

섞으면 개발 빌드에서 `websiteUrl` 이 `xxxx.trycloudflare.com` 이 된다 —
몇 시간 뒤 사라질 임시 터널이 회사 사이트로 박히는 것이다.

공개 사이트가 `genie.geniein.com` 이 아니라면 `TEAMS_WEBSITE_URL` 로 지정한다.

### 버전 — 재업로드하면 반드시 올라가야 한다

Teams 는 **이미 올라간 앱과 같은 버전을 거부한다**:

> 이 업데이트에는 새 앱 버전 번호가 필요합니다.

터널로 반복 업로드하는 동안 이걸 손으로 올리면 매번 걸리므로, `CONTENT_HOST` 를
준 **개발 빌드는 패치 번호를 자동으로 만든다** — 2026-01-01 이후 경과 분(分).
상태를 저장하지 않는데도 항상 이전보다 크다.

```
운영 빌드 (CONTENT_HOST 없음)   1.0.0          build.mjs 의 RELEASE_VERSION
개발 빌드 (터널)                1.0.327410     자동. 1분마다 오른다
TEAMS_APP_VERSION=2.1.0         2.1.0          지정한 값 그대로
```

자동 번호를 운영에 쓰지 않는 것은 의도다 — 버전이 시각이 되어 버리면 무엇이
배포됐는지 말할 수 없다. 운영 릴리스는 `RELEASE_VERSION` 을 올린다.

> **`id` 에 Application (client) ID 를 그대로 쓴다.** Teams 앱 ID 는 안정적이기만
> 하면 되는 식별자이고, 새 GUID 를 만들면 **관리 대상이 하나 늘어난다** — 잃어버리면
> 다시 올릴 때 Teams 가 다른 앱으로 인식해서 사용자가 고정해둔 탭이 사라진다.
> 이미 관리 중인 값을 재사용하면 그 위험이 없다.

### zip 만들기

파일 3개가 **zip 최상위**에 있어야 한다. 폴더째 압축하면 Teams 가 거부한다.

```powershell
Compress-Archive -Path dist\* -DestinationPath dist\teams-app.zip -Force
```

```bash
(cd dist && zip -r teams-app.zip manifest.json color.png outline.png)
```

## 올리기

**두 테넌트에 각각 올려야 한다.** Teams 앱 카탈로그는 테넌트 경계를 넘지 않는다 —
앱 등록이 멀티테넌트 하나여도 이건 두 번 하는 일이다.

- 개별 사이드로드: Teams → 앱 → 앱 관리 → 앱 업로드 → 사용자 지정 앱 업로드
- 전사 배포: Teams 관리 센터 → Teams 앱 → 앱 관리 → 업로드

앱 등록이 사는 테넌트가 **아닌** 쪽에는 서비스 주체가 없어서 SSO 가 실패한다.
관리자 동의를 한 번 받아 만들어야 한다:

```
https://login.microsoftonline.com/<두 번째 tid>/adminconsent?client_id=<clientId>
```

## 로컬에서 검증하려면

Teams 는 `contentUrl` 에 **HTTPS 만** 허용한다. `localhost` 를 그대로 못 쓰므로
터널이 필요하다.

```bash
# 1) 터널을 연다 (devtunnel / ngrok 등)
# 2) 그 주소로 패키지를 만든다
CONTENT_HOST=https://xxxx.devtunnels.ms node build.mjs && node validate.mjs
# 3) zip 을 사이드로드
```

`webApplicationInfo.resource` 는 터널 주소를 따라가지 **않는다.** Application ID URI
는 API 의 식별자이지 UI 호스팅 위치가 아니다 — 바꾸면 토큰의 `aud` 가 달라져
게이트웨이가 거부한다.

터널 주소는 재시작마다 바뀌므로, 바뀔 때마다 다시 만들어 올려야 한다.

## 알아둘 것

- **`validate.mjs` 를 건너뛰지 말 것.** 스키마가 `additionalProperties: false` 라
  필드 이름 하나만 틀려도 패키지 전체가 거부되는데, Teams 는 "앱 패키지가 올바르지
  않습니다" 한 줄만 말한다. 이 검사가 구버전 필드 `packageName` 을 실제로 잡아냈다.
- ⚠ `privacyUrl` / `termsOfUseUrl` 은 스키마상 **필수**라 기본값을 채워두었지만,
  `<호스트>/privacy` 와 `/terms` 는 **아직 실제로 없는 페이지다.** 개별 사이드로드는
  통과하지만, 전사 카탈로그에 올리기 전에 실제 페이지를 만들거나
  `TEAMS_PRIVACY_URL` / `TEAMS_TERMS_URL` 로 유효한 주소를 지정해야 한다.
- 매니페스트 스키마는 v1.17 로 고정했다. 상위 버전 기능을 쓰면 조용히 렌더가
  깨질 수 있어 보수적으로 잡은 값이다 (설계문서 997행이 Adaptive Card 에 대해
  남긴 경고와 같은 이유). 올릴 때는 실제 Teams 클라이언트에서 렌더를 확인할 것.
