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
    anthropic_model: str = "claude-opus-5"
    anthropic_effort: str = "medium"
    anthropic_max_tokens: int = 8192

    # DB
    db_host: str = "localhost"
    db_port: int = 5432
    db_username: str = "postgres"
    db_password: str = "postgres"
    db_name: str = "geniein_db"

    # 설정 디렉터리 — 도구와 인격은 코드가 아니라 설정이다
    tools_dir: Path = SERVICE_ROOT / "tools"
    personas_dir: Path = SERVICE_ROOT / "personas"

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
