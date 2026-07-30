from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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
    tools_dir: Path = Path("tools")
    personas_dir: Path = Path("personas")

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
