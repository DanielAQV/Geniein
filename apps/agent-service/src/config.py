from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# 경로는 실행 위치(CWD)가 아니라 이 파일 위치에 매단다.
SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_ROOT.parent.parent


class Settings(BaseSettings):
    # 로컬 개발은 저장소 루트 .env 를 그대로 읽는다 — 키를 두 곳에 복제하지 않는다.
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", SERVICE_ROOT / ".env"),
        extra="ignore",
    )

    # LLM — 어댑터 안에서만 읽는다. 호출부는 이 값을 모른다 (3.5)
    anthropic_api_key: str = ""
    # 사규 검색은 청크를 읽고 인용을 붙이는 작업이지 난제가 아니다.
    anthropic_model: str = "claude-sonnet-5"
    anthropic_effort: str = "medium"
    # thinking + 응답을 합쳐서 제한한다. 사고가 예산을 먹으면 답변이 중간에 잘리고
    # stop_reason 이 "max_tokens" 가 된다. 상한이지 예약이 아니다.
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

    # 게이트웨이(NestJS)만 이 서비스를 부를 수 있게 하는 공유 토큰. 사용자 자격증명이
    # 아니고, apps/api 의 ADMIN_SERVICE_TOKEN 과는 다른 값을 쓴다.
    # 빈 값은 "인증 없음"이 아니라 "설정 오류"다 (main.require_service_token).
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
