# In-memory refresh token store: {user_id_str: hashed_refresh_token}
_refresh_tokens: dict[str, str] = {}


def store_refresh_token(user_id: str, token_hash: str):
    _refresh_tokens[user_id] = token_hash


def get_refresh_token_hash(user_id: str) -> str | None:
    return _refresh_tokens.get(user_id)


def revoke_refresh_token(user_id: str):
    _refresh_tokens.pop(user_id, None)
