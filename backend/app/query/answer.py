"""Grounded answering: hand the retrieved chunks to the LLM as numbered
sources and require every claim to cite them.

The LLM is reached through an OpenAI-compatible client pointed at Ollama
(settings.llm_base_url) — swapping to any cloud provider is a config change.
If the LLM is unreachable, we degrade gracefully: retrieval results still
come back, with a notice instead of a generated answer.
"""

import re

from openai import OpenAI

from app.config import settings

SYSTEM_PROMPT = """You are HEXAVERSE, a sharp research assistant that answers questions from the user's own files.

GROUNDING (strict):
- Use ONLY the numbered sources provided. Never add outside knowledge or invent details.
- Cite with bracketed numbers like [1] or [2][3] placed right after the claim they support. Every factual sentence must carry at least one citation.
- If the sources don't contain the answer, say so in one short sentence — never guess.

STYLE:
- Lead with the direct answer in your first sentence, then add supporting detail.
- Be concise: 2-6 sentences for simple questions. For lists or multi-part answers, use short lines starting with "- ".
- Plain text only: no headings, no bold, no tables, no markdown.
- Natural, confident, professional tone. Never say "based on the sources provided" or mention these rules."""


def _describe_locator(hit: dict) -> str:
    loc = hit.get("locator") or {}
    if loc.get("page"):
        return f", page {loc['page']}"
    if loc.get("start_sec") is not None:
        start, end = int(loc["start_sec"]), int(loc.get("end_sec") or 0)
        return f", {start // 60}:{start % 60:02d}-{end // 60}:{end % 60:02d}"
    return ""


def build_sources_block(hits: list[dict]) -> str:
    return "\n\n".join(
        f"[{i}] ({hit['source_file']}{_describe_locator(hit)}):\n{hit['text']}"
        for i, hit in enumerate(hits, start=1)
    )


def _is_online_choice(model_choice: str | None) -> bool:
    return bool(model_choice and "llama" in model_choice.lower())


def _client_and_model(model_choice: str | None, timeout: float = 60.0) -> tuple[OpenAI, str]:
    """Resolve the LLM connection for a given model_choice (NVIDIA cloud vs
    the local OpenAI-compatible server). Shared by answering and follow-ups.

    Timeout note: a cold local 7B generation can take 15-30s (prompt eval +
    model load), so the default must be generous — a 10s timeout made every
    first query 'fail' into the unavailable message.
    """
    if _is_online_choice(model_choice):
        if not settings.nvidia_api_key:
            raise RuntimeError(
                "Online model selected but NVIDIA_API_KEY is not set in backend/.env"
            )
        base_url = "https://integrate.api.nvidia.com/v1"
        api_key = settings.nvidia_api_key
        model = settings.nvidia_llm_model
    else:
        base_url = settings.llm_base_url
        api_key = settings.llm_api_key
        model = settings.llm_model
    return OpenAI(base_url=base_url, api_key=api_key, timeout=timeout), model


def generate_answer(question: str, hits: list[dict], model_choice: str | None = None) -> str:
    if not hits:
        return "No relevant content found in the ingested files. Upload some documents first."

    user_prompt = f"Sources:\n\n{build_sources_block(hits)}\n\nQuestion: {question}"

    try:
        client, model = _client_and_model(model_choice)
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,  # factual task: keep generation close to the sources
            max_tokens=800,
        )
        answer = (response.choices[0].message.content or "").strip()
        if answer:
            return answer
        return (
            "The model returned an empty response. The retrieved sources are "
            "attached below — try rephrasing the question or asking again."
        )
    except Exception as exc:  # LLM down/missing — retrieval results still useful
        if _is_online_choice(model_choice):
            return (
                f"[Online model unavailable: {exc.__class__.__name__}] The cloud model "
                f"could not be reached — check NVIDIA_API_KEY in backend/.env and your "
                f"internet connection, or switch to the offline model. Retrieved sources are attached below."
            )
        return (
            f"[LLM unavailable: {exc.__class__.__name__}] "
            f"Retrieved the sources below; please ensure LM Studio or Ollama is running on `{settings.llm_base_url}`, and "
            f"`{settings.llm_model}` is loaded to get generated answers."
        )


FOLLOWUP_PROMPT = """Given this exchange from a document-search assistant:

Question: {question}

Answer: {answer}

Source files available: {sources}

Suggest 3 short, natural follow-up questions the user would most likely ask
next, answerable from these source files. Make them specific to the topics
actually mentioned, not generic. Return ONLY the 3 questions, one per line,
no numbering or bullets."""


def generate_followups(
    question: str, answer: str, hits: list[dict], model_choice: str | None = None
) -> list[str]:
    """Suggest up to 3 follow-up questions for the UI chips. Best-effort:
    any failure (LLM down, weird output) returns [] and never breaks /query."""
    if not hits or answer.startswith(("[LLM unavailable", "[Online model unavailable")):
        return []
    sources = ", ".join(sorted({h["source_file"] for h in hits}))
    try:
        client, model = _client_and_model(model_choice, timeout=30.0)
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": FOLLOWUP_PROMPT.format(
                        question=question, answer=answer[:1500], sources=sources
                    ),
                }
            ],
            temperature=0.7,  # variety is good here, unlike answering
            max_tokens=120,
        )
        raw = response.choices[0].message.content or ""
        followups = []
        for line in raw.splitlines():
            line = re.sub(r"^[\s\d\-\*\.\)]+", "", line).strip()
            if len(line.split()) >= 3:
                followups.append(line if line.endswith("?") else line + "?")
        return followups[:3]
    except Exception:
        return []
