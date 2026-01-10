# OpenRouter Service — Implementation Guide (Backend / FastAPI)

## 1. Service description

The **OpenRouter service** is the backend component responsible for executing **LLM chat completions** via the **OpenRouter API** (OpenAI-compatible `chat/completions` interface). It provides:

- A **single, typed integration point** for all model calls (triage + specialized agents + future structured tasks).
- **Consistent message construction** (system/user + optional RAG context).
- **Support for structured responses** via `response_format` using JSON Schema.
- **Robust error handling** (timeouts, retries, rate limits, provider failures, invalid responses).
- **Security controls** (key management, safe logging, allowlisting models, input constraints).

This repo already contains `backend/app/clients/ai_client.py` which calls OpenRouter directly. This plan proposes implementing an explicit `OpenRouterService` (or evolving `AIClient` into it) so orchestration code can stay focused on domain logic while the OpenRouter integration becomes testable, reusable, and extensible.

**Recommended placement (fits current layout):**

- `backend/app/clients/openrouter_service.py` (new) — OpenRouter integration (HTTP, retries, normalization)
- `backend/app/schemas/openrouter.py` (new) — Pydantic request/response models + normalized response shapes
- `backend/app/api/dependencies.py` (update) — provide `get_openrouter_service()` as a FastAPI dependency

## 2. Constructor description

### `OpenRouterService.__init__(...)`

**Purpose**: Configure and own an HTTP client, OpenRouter settings, defaults for model + parameters, and safe metadata headers.

**Inputs (recommended):**

- **`settings`**: use `app.core.config.settings` (already exists) for:
  - `openrouter_api_key`
  - `openrouter_base_url` (default `https://openrouter.ai/api/v1`)
  - `openrouter_default_chat_model` (default chat model for most agent responses)
  - `openrouter_routing_model` (deterministic/cheap model for triage/routing)
  - `openrouter_default_embedding_model` (model for embeddings / vector search)
- **`http_client`** *(optional)*: `httpx.AsyncClient` injected for testability.
- **`mock_mode`** *(optional)*: keep parity with existing `AIClient` behavior:
  - enabled when key missing / placeholder
  - returns deterministic mock responses for local dev/tests
- **`app_url` / `app_name`** *(optional but recommended)*: set OpenRouter-identifying headers (helps OpenRouter support, analytics, and some providers).
- **Default request options** *(optional)*:
  - `default_model` (e.g. `openai/gpt-4o-mini` or your chosen default)
  - `default_temperature`, `default_max_tokens`, `default_top_p`, etc.
- **Operational limits** *(recommended)*:
  - `timeout_seconds` (e.g. 30)
  - `max_retries` (e.g. 2)
  - `max_prompt_chars` / `max_messages` guardrails

**State owned by the service:**

- `self._api_key: str`
- `self._base_url: str`
- `self._client: httpx.AsyncClient`
- `self._mock_mode: bool`
- `self._defaults: ModelParams` (a small Pydantic model/dict of defaults)
- `self._app_headers: dict[str, str]` (referer + title)

## 3. Public methods and fields

### Public fields (recommended)

- **`mock_mode: bool`**: whether the service is returning mock outputs.
- **`default_model: str`**: the service’s default model name.

### Public methods (recommended)

#### `async chat_completion(...) -> NormalizedChatResult`

**Purpose**: Execute an OpenRouter chat completion and return a normalized shape used across the backend.

**Parameters (recommended):**

- `system_message: str | None` — optional “system” instruction
- `user_message: str` — the user’s primary message
- `messages: list[ChatMessage] | None` — advanced usage (full message list). If provided, it overrides `system_message/user_message` composition.
- `model: str | None` — OpenRouter model name (falls back to `default_model`)
- `params: ModelParams | None` — temperature/max_tokens/top_p/etc. (merged with defaults)
- `response_format: ResponseFormat | None` — optional JSON-schema response request
- `metadata: dict[str, Any] | None` — optional request metadata (for logging/tracing only; never sent unless you explicitly support it)

**Return (normalized):**

- `content: str` — assistant message content (raw text or JSON string)
- `model: str`
- `finish_reason: str | None`
- `usage: TokenUsage | None` — prompt/completion/total if present
- `raw: dict[str, Any]` — raw provider response (optional; ensure redaction if logged)

#### `async chat_completion_json(...) -> tuple[T, NormalizedChatResult]`

**Purpose**: Call `chat_completion` with a JSON schema `response_format`, then parse/validate the assistant output into a typed Pydantic model `T`.

**Parameters (recommended):**

- Same as `chat_completion`, plus:
  - `schema_name: str`
  - `schema: dict[str, Any]` (JSON Schema)
  - `output_model: type[pydantic.BaseModel]` (optional; for stronger validation)

**Behavior:**

- Sends `response_format` exactly in this shape:

```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "your_schema_name",
    "strict": true,
    "schema": { "type": "object", "properties": {}, "required": [] }
  }
}
```

- Parses assistant content as JSON.
- Validates it against:
  - `output_model` if provided (preferred)
  - otherwise the JSON Schema (optional secondary validation)
- Returns `(parsed_object, normalized_result)` or raises a structured parsing/validation exception.

#### `async close() -> None`

**Purpose**: Close the underlying `httpx.AsyncClient` cleanly (especially important in tests).

#### `def get_openrouter_service(...) -> OpenRouterService` (FastAPI dependency)

**Purpose**: Provide a DI-friendly constructor similar to existing `get_ai_client()` usage.

## 4. Private methods and fields

### Private fields (recommended)

- `self._client`: `httpx.AsyncClient`
- `self._timeout`: timeout config (connect/read/write)
- `self._max_retries`: retry count for retryable failures
- `self._logger`: module logger

### Private methods (recommended)

#### `_build_headers() -> dict[str, str]`

Include:

- `Authorization: Bearer <OPENROUTER_API_KEY>`
- `Content-Type: application/json`
- `HTTP-Referer: <your app url>` *(recommended by OpenRouter)*
- `X-Title: <your app name>` *(recommended by OpenRouter)*

Also ensure **no secrets** are logged.

#### `_build_messages(system_message, user_message, messages) -> list[dict[str, str]]`

Rules:

- If `messages` provided: validate and return it.
- Else:
  - if `system_message`: prepend `{"role":"system","content":...}`
  - append `{"role":"user","content": user_message}`

#### `_build_payload(...) -> dict[str, Any]`

OpenRouter/OpenAI-compatible payload fields:

- `model`
- `messages`
- `temperature`, `max_tokens`, `top_p`, `presence_penalty`, `frequency_penalty`, `stop`, `seed`
- `response_format` (when requesting structured JSON outputs)

Add only supported fields; keep a clear mapping so orchestration code doesn’t need to know OpenRouter specifics.

#### `_request_chat_completions(payload) -> dict[str, Any]`

Implementation details:

- POST to `"{base_url}/chat/completions"`
- Apply timeouts
- Capture and normalize error bodies
- Retry only when safe (see error handling section)

#### `_normalize_chat_response(raw: dict[str, Any]) -> NormalizedChatResult`

Extract:

- `raw["choices"][0]["message"]["content"]`
- `raw["model"]`
- `raw["usage"]` fields if present
- `raw["choices"][0]["finish_reason"]`

#### `_parse_json_content(content: str) -> Any`

- Strip leading/trailing whitespace
- Attempt JSON parse
- Raise a **dedicated parse exception** when invalid (include a short excerpt, not full content)

#### `_should_retry(status_code, error_body) -> bool`

Retryable (typical):

- 408 (timeout), 429 (rate limit), 5xx (server/provider)
- network errors, connection resets

Non-retryable:

- 400/401/403 (bad request/auth)
- 404 (wrong endpoint/model)
- schema/validation failures (your bug, not transient)

#### `_mock_chat_completion(...)`

Keep a deterministic mock mode (like current `AIClient`) to enable local flows without external calls.

## 5. Error handling

### Error scenarios (numbered)

1. **Missing/invalid API key** (401/403)
2. **Model not found / unavailable provider** (404/400 depending on provider)
3. **Bad request payload** (400) — invalid `messages`, invalid params, invalid `response_format`
4. **Rate limiting / quota exceeded** (429)
5. **Provider-side errors** (5xx) — upstream model failure, OpenRouter issues
6. **Network failures** — DNS, connection reset, TLS issues
7. **Timeouts** — connect/read timeouts for long generations
8. **Invalid response shape** — missing `choices`, missing `message.content`
9. **Structured output parse failure** — assistant returned non-JSON when JSON expected
10. **Structured output validation failure** — JSON parses but fails schema/model validation
11. **Context too long** — prompt exceeds model context window (often 400)
12. **Cancellation** — request cancelled by client (FastAPI disconnect)

### Exception model (recommended)

Create a small exception hierarchy in `backend/app/clients/openrouter_service.py` (or `backend/app/utils/exceptions.py`):

- `OpenRouterError(Exception)` (base)
  - `OpenRouterAuthError`
  - `OpenRouterRateLimitError`
  - `OpenRouterBadRequestError`
  - `OpenRouterProviderError`
  - `OpenRouterTimeoutError`
  - `OpenRouterNetworkError`
  - `OpenRouterResponseError` (unexpected shape)
  - `OpenRouterParseError` (invalid JSON)
  - `OpenRouterValidationError` (schema/model validation failed)

### Handling strategy

- **At the service boundary**:
  - catch `httpx.TimeoutException` → `OpenRouterTimeoutError`
  - catch `httpx.RequestError` → `OpenRouterNetworkError`
  - catch `httpx.HTTPStatusError` → map by status code + body
  - validate response shape; if invalid → `OpenRouterResponseError`
- **At the API layer**:
  - map these exceptions to `HTTPException` with safe messages and appropriate codes:
    - 401/403 → 502 or 500 to clients (do not leak auth details), unless internal admin endpoint
    - 429 → 503 with retry-after guidance
    - timeouts/provider → 503
    - bad request (developer error) → 500 internally; log full details
- **Retry**:
  - exponential backoff with jitter, max 1–2 retries
  - never retry on 400/401/403
- **Logging**:
  - log **request IDs** and high-level metadata
  - never log full prompts or user PII by default

## 6. Security considerations

- **Secret management**:
  - `OPENROUTER_API_KEY` must come from environment / secret store.
  - Never return it in API responses; never log it.
- **Safe logging**:
  - Do not log raw `messages` content in production logs.
  - Redact document chunks and project memory unless explicitly enabled in dev.
- **Model allowlist**:
  - Restrict `model` to an allowlist (or a controlled mapping per agent) to prevent abuse and surprise costs.
- **Rate limiting & abuse prevention**:
  - Apply per-user / per-project limits at API boundary (even if OpenRouter also enforces).
- **Timeouts**:
  - Enforce strict timeouts to avoid hanging worker resources.
- **Input constraints**:
  - cap message count, message length, and total prompt size.
  - sanitize/validate `messages` roles (`system|user|assistant|tool`) and content types.
- **Structured responses**:
  - treat model output as **untrusted input**; always parse+validate.
  - never directly execute instructions/code from model output.
- **Data minimization**:
  - only send what is necessary to OpenRouter; avoid sending internal IDs if not needed.

## 7. Step-by-step implementation plan

### Step 1 — Define typed schemas (Pydantic)

Create `backend/app/schemas/openrouter.py` with:

- `ChatMessage`:
  - `role: Literal["system","user","assistant","tool"]`
  - `content: str`
- `ModelParams`:
  - `temperature: float | None`
  - `max_tokens: int | None`
  - `top_p: float | None`
  - `presence_penalty: float | None`
  - `frequency_penalty: float | None`
  - `stop: list[str] | str | None`
  - `seed: int | None`
- `ResponseFormatJsonSchema` and `ResponseFormat` union:
  - enforce shape:
    - `{ type: "json_schema", json_schema: { name: str, strict: bool, schema: dict } }`
- `TokenUsage` normalized model
- `NormalizedChatResult` normalized model

### Step 2 — Implement `OpenRouterService`

Create `backend/app/clients/openrouter_service.py`:

- Implement constructor reading from `app.core.config.settings`
- Implement:
  - `chat_completion(...)`
  - `chat_completion_json(...)`
  - `close()`
- Implement private helpers:
  - `_build_headers`, `_build_messages`, `_build_payload`
  - `_request_chat_completions`
  - `_normalize_chat_response`
  - `_parse_json_content`
  - `_should_retry` + backoff helper
- Ensure **mock mode** mirrors current developer experience.

### Step 3 — Incorporate OpenRouter API expectations (explicit examples)

Implement message and request building so the service can produce the following shapes.

---

## 3.A Model selection (recommended, low-cost defaults)

This project has a few distinct LLM “usages”. To keep costs predictable while maintaining reliability (especially for **strict JSON schema** outputs), use the following **low-cost defaults**:

### Usage → model mapping

- **Default agent chat (most assistant replies + RAG synthesis)**:
  - **Model**: `openai/gpt-4o-mini`
  - **Why**: strong instruction-following and consistent formatting at a low price; good for frequent, general-purpose calls.

- **Routing / triage (structured JSON schema output)**:
  - **Model**: `openai/gpt-4o-mini`
  - **Why**: routing calls are frequent and must be reliable; `gpt-4o-mini` performs well with `response_format: json_schema` while staying inexpensive.

- **Embeddings / vector search**:
  - **Model**: `openai/text-embedding-3-small`
  - **Why**: excellent cost/performance for general-purpose RAG embeddings.

### Suggested environment defaults

- `OPENROUTER_DEFAULT_CHAT_MODEL="openai/gpt-4o-mini"`
- `OPENROUTER_ROUTING_MODEL="openai/gpt-4o-mini"`
- `OPENROUTER_DEFAULT_EMBEDDING_MODEL="openai/text-embedding-3-small"`

### Optional “quality bump” (still cost-aware)

If later you want higher-quality writing/reasoning for a subset of replies (e.g., long regulatory explanations, complex tradeoff analysis), add a *second* allowlisted model and route only selected calls to it:

- **Optional model**: `anthropic/claude-3.5-haiku`
- **Guidance**: keep `openai/gpt-4o-mini` as the default; use the optional model only for explicitly-tagged higher-quality generations.

---

#### (1) System message — example

```json
[
  { "role": "system", "content": "You are a home-building assistant. Answer concisely." },
  { "role": "user", "content": "What permits do I need in Warsaw?" }
]
```

**Implementation approach**:

- Provide `system_message` parameter, and in `_build_messages()` prepend it as the first message.

#### (2) User message — example

```json
[
  { "role": "user", "content": "Estimate cost per m² for a mid-range finish." }
]
```

**Implementation approach**:

- Always include exactly one primary user message; additional context (RAG) should be added as system messages or assistant “history” messages depending on your orchestration design.

#### (3) Structured responses via `response_format` (JSON schema) — examples

**Example 3.1 — “routing” response (triage agent)**

Payload fragment:

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "agent_routing",
      "strict": true,
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "agent_id": {
            "type": "string",
            "enum": [
              "LAND_FEASIBILITY_AGENT",
              "REGULATORY_PERMITTING_AGENT",
              "ARCHITECTURAL_DESIGN_AGENT",
              "FINANCE_LEGAL_AGENT",
              "SITE_PREP_FOUNDATION_AGENT",
              "SHELL_SYSTEMS_AGENT",
              "PROCUREMENT_QUALITY_AGENT",
              "FINISHES_FURNISHING_AGENT",
              "TRIAGE_MEMORY_AGENT"
            ]
          },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "reasoning": { "type": "string" }
        },
        "required": ["agent_id", "confidence", "reasoning"]
      }
    }
  }
}
```

**Implementation approach**:

- Add `chat_completion_json(schema_name="agent_routing", schema=..., output_model=...)`.
- In orchestration (`ChatOrchestrationService._route_to_agent`), replace “Respond with ONLY agent name” with structured output, then validate.

**Example 3.2 — “extract project facts” response**

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "project_facts_extract",
      "strict": true,
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "facts": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "domain": { "type": "string" },
                "key": { "type": "string" },
                "value": { "type": "string" },
                "source": { "type": "string" }
              },
              "required": ["domain", "key", "value"]
            }
          }
        },
        "required": ["facts"]
      }
    }
  }
}
```

**Implementation approach**:

- Use strict schema + `additionalProperties: false` to keep outputs stable.
- Treat the output as untrusted; validate before storing into JSONB project memory.

#### (4) Model name — examples

**Example 4.1 — simple chat**

```json
{ "model": "openai/gpt-4o-mini" }
```

**Example 4.2 — specialized agent**

```json
{ "model": "anthropic/claude-3.7-sonnet" }
```

**Implementation approach**:

- Make the used model(s) configurable via `app.core.config.settings` (Pydantic `BaseSettings`) so deployments can change models without code edits.
  - Recommended env/config keys:
    - `OPENROUTER_DEFAULT_CHAT_MODEL` → `settings.openrouter_default_chat_model`
    - `OPENROUTER_ROUTING_MODEL` → `settings.openrouter_routing_model`
    - `OPENROUTER_DEFAULT_EMBEDDING_MODEL` → `settings.openrouter_default_embedding_model`
- Store model choices in a single mapping (e.g., `agent_id -> model`) so orchestration passes either `model=None` (use defaults) or a mapped model.
- Add allowlist enforcement: reject unknown model strings.

#### (5) Model parameters — examples

**Example 5.1 — deterministic routing**

```json
{
  "temperature": 0.0,
  "max_tokens": 120,
  "top_p": 1.0
}
```

**Example 5.2 — creative drafting**

```json
{
  "temperature": 0.7,
  "max_tokens": 800,
  "top_p": 0.9,
  "presence_penalty": 0.2,
  "frequency_penalty": 0.2
}
```

**Implementation approach**:

- Implement `ModelParams.merge(defaults, overrides)` so callers only override what they need.
- Keep parameter bounds validated by Pydantic validators.

### Step 4 — Add DI wiring (FastAPI dependencies)

In `backend/app/api/dependencies.py`, add:

- `get_openrouter_service()` that:
  - instantiates once per-request or uses a singleton pattern consistent with your project
  - returns `OpenRouterService`

Update `ChatOrchestrationService` constructor to accept `OpenRouterService` (or keep `AIClient` name but backed by the new implementation).

### Step 5 — Integrate into chat orchestration

Update `backend/app/services/chat_orchestration_service.py`:

- Replace direct use of `AIClient.chat_completion` with:
  - `openrouter_service.chat_completion(...)` for normal agent responses
  - `openrouter_service.chat_completion_json(...)` for routing + any other structured tasks
- Ensure RAG context injection stays consistent:
  - system prompt for agent identity/instructions
  - additional system message(s) for RAG context blocks
  - final user message as the user query

### Step 6 — Testing strategy

Add tests under `backend/tests/`:

- Unit tests for:
  - `_build_payload` (correct `response_format` shape)
  - normalization of success responses
  - mapping of common error codes to exceptions
  - retry logic behavior
  - JSON parse + validation failures
- Use `httpx.MockTransport` (or dependency-injected client) to avoid real network calls.
- Keep mock mode tests to ensure dev experience remains stable.

### Step 7 — Operational hardening

- Add structured logging (request_id, model, latency, retry_count) without prompt content.
- Add metrics hooks (optional): counts for 2xx/4xx/5xx, timeouts, retries, tokens (if reported).
- Document configuration keys in `README.md` / `SETUP_COMPLETE.md` if needed:
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_BASE_URL`
  - `OPENROUTER_DEFAULT_CHAT_MODEL`
  - `OPENROUTER_ROUTING_MODEL`
  - `OPENROUTER_DEFAULT_EMBEDDING_MODEL`
  - optionally `OPENROUTER_APP_URL`, `OPENROUTER_APP_NAME`

