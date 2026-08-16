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

AI 반짝이 두 개가 살짝 겹친 모양. PNG 는 커밋돼 있고, 모양이나 색을 바꿀 때만
`python make-icons.py` 를 돌린다 (Pillow 필요).

색은 지어내지 않고 `apps/web/src/app/globals.css` 다크 테마의 `--primary`(oklch)를
그대로 변환해 쓴다 — 지금 값은 `#5874EA`. 사이트 테마가 바뀌면 스크립트 상단
상수만 맞추면 된다.

`outline.png` 는 단색이라 두 모양이 겹치면 한 덩어리로 보인다. 작은 반짝이를 키운
모양으로 큰 쪽에 구멍을 내 틈을 만든다 — 앱 바에서 "두 개"로 읽혀야 하기 때문이다.
바꾼 뒤에는 **어두운 배경에 올려 확인할 것.** 흰 배경에서는 아무것도 안 보인다.

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
| `CONTENT_HOST` | 선택 | 기본값은 Application ID URI 의 도메인. 터널 검증 때만 덮는다 |
| `TEAMS_PRIVACY_URL` / `TEAMS_TERMS_URL` | 선택 | 기본값 `<호스트>/privacy`, `<호스트>/terms` |

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
