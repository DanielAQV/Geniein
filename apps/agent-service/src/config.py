from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# 경로는 실행 위치(CWD)가 아니라 이 파일 위치에 매단다.
# 컨테이너(/app/src/config.py)와 호스트(apps/agent-service/src/config.py)가
# 같은 상대 구조이므로 양쪽 모두에서 맞는다.
SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_ROOT.parent.parent


class Settings(BaseSettings):
    # 로컬 개발은 저장소 루트 .env 를 그대로 읽는다 — 키를 두 곳에 복제하지 않는다.
    # 컨테이너에는 두 파일 다 없고, compose 가 넘긴 실제 환경변수를 읽는다.
    # 뒤에 오는 파일이 우선하므로 서비스 로컬 .env 가 루트를 덮어쓴다.
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", SERVICE_ROOT / ".env"),
        extra="ignore",
    )

    # LLM — 어댑터 안에서만 읽는다. 호출부는 이 값을 모른다 (3.5)
    anthropic_api_key: str = ""
    # 사규 검색은 청크를 읽고 인용을 붙이는 작업이지 난제가 아니다.
    # Sonnet 5 는 이 구간에서 Opus 5 에 근접하면서 지연·비용이 크게 낮다.
    #
    # ⚠ effort 를 low 까지 내리지 않는다. Sonnet 5 는 낮은 쪽 effort 를 엄격히
    #   지켜서 "시킨 것만" 하는데, 청크 8건에서 맞는 조항을 골라 개정일까지
    #   인용하는 건 그 경계에 걸린다. 근거를 얕게 읽는 게 보이면 프롬프트로
    #   우회하지 말고 effort 를 올린다.
    anthropic_model: str = "claude-sonnet-5"
    anthropic_effort: str = "medium"
    # ★ 이 값은 thinking + 응답을 **합쳐서** 제한한다. thinking 이 기본 ON 이므로
    #   사고가 예산을 먹으면 답변이 중간에 잘리고 stop_reason 이 "max_tokens" 가 된다.
    #   상한이지 예약이 아니라서 올려도 실제로 쓰지 않으면 비용이 늘지 않는다.
    #   비스트리밍 요청의 권장 기본값이 16000 이다 (그 위는 HTTP 타임아웃 위험이
    #   있어 스트리밍이 필요해진다).
    anthropic_max_tokens: int = 16000

    # DB
    db_host: str = "localhost"
    db_port: int = 5432
    db_username: str = "postgres"
    db_password: str = "postgres"
    db_name: str = "geniein_db"

    # 설정 디렉터리 — 도구와 인격은 코드가 아니라 설정이다
    tools_dir: Path = SERVICE_ROOT / "tools"
    personas_dir: Path = SERVICE_ROOT / "personas"
    # 회사 어휘 사전 (glossary.py). 없어도 검색은 돈다 — 질의 확장만 꺼진다.
    glossary_path: Path = SERVICE_ROOT / "glossary.yaml"

    # 테넌트(Entra tid) → 인격 파일 키. `tid:키` 를 쉼표로 잇는다.
    #
    #   PERSONA_ORG_MAP=<AQV 테넌트 tid>:aqv
    #
    # 지니(코어)와 마이키(AQV)는 같은 뇌를 쓰고 이름·소속만 다르다. 그 "어느
    # 테넌트가 누구인가"를 정하는 값이 이것이다.
    #
    # ★ 매핑이 **여기(.env)** 에 있고 인격 **내용**은 저장소의 personas/*.yaml 에
    #   있다. 테넌트 GUID 를 저장소에 넣지 않으면서 인격 파일 이름은 사람이 읽을
    #   수 있게 두기 위해서다.
    # ★ 클라이언트가 인격을 고를 수 없다. `org_id` 는 게이트웨이가 검증한 토큰의
    #   `tid` 에서 오고, 서버가 이 표로 인격을 정한다 (원칙③).
    #
    # 비어 있으면 모든 테넌트가 코어 인격(지니)을 쓴다 — 지금까지의 동작 그대로다.
    persona_org_map: str = ""

    # 게이트웨이(NestJS)만 이 서비스를 부를 수 있게 하는 공유 토큰.
    #
    # ⚠ 사용자 자격증명이 아니다. 사용자 신원은 게이트웨이가 Entra 토큰을 검증해
    #   `internal_user_id` 로 넘긴다. 이 값은 "호출자가 우리 게이트웨이인가"만 답한다.
    #   apps/api 의 ADMIN_SERVICE_TOKEN 과는 **다른 값**을 쓴다 — 경계가 다르면
    #   토큰도 다르다. 하나가 새도 다른 하나가 남는다.
    #
    # 빈 값은 "인증 없음"이 아니라 "설정 오류"로 취급한다 (main.require_service_token).
    agent_service_token: str = ""

    log_level: str = "INFO"

    # 에이전트 루프 안전장치. 도구 연쇄가 무한히 돌지 않게.
    max_tool_iterations: int = 8

    @property
    def dsn(self) -> str:
        return (
            f"host={self.db_host} port={self.db_port} "
            f"user={self.db_username} password={self.db_password} dbname={self.db_name}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
