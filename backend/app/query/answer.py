"""Grounded answering: hand the retrieved chunks to the LLM as numbered
sources and require every claim to cite them.

The LLM is reached through an OpenAI-compatible client pointed at Ollama
(settings.llm_base_url) — swapping to any cloud provider is a config change.
If the LLM is unreachable, we degrade gracefully: retrieval results still
come back, with a notice instead of a generated answer.
"""

from openai import OpenAI

from app.config import settings

SYSTEM_PROMPT = """You are a careful research assistant for a document intelligence system.
Answer the user's question using ONLY the numbered sources provided.
Rules:
- Cite the source number in square brackets, e.g. [1] or [2][3], after every factual claim.
- If the sources do not contain the answer, say exactly that — never invent or hallucinate information.
- Be concise, factual, and direct. Do not use filler phrases like "Based on the sources provided".
- Maintain a professional and objective tone."""


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


def generate_answer(question: str, hits: list[dict]) -> str:
    if not hits:
        return "No relevant content found in the ingested files. Upload some documents first."

    user_prompt = f"Sources:\n\n{build_sources_block(hits)}\n\nQuestion: {question}"
    try:
        client = OpenAI(base_url=settings.llm_base_url, api_key="ollama")
        response = client.chat.completions.create(
            model=settings.llm_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,  # factual task: keep generation close to the sources
        )
        return response.choices[0].message.content or ""
    except Exception as exc:  # LLM down/missing — retrieval results still useful
        return (
            f"[LLM unavailable: {exc.__class__.__name__}] "
            f"Retrieved the sources below; start Ollama (`ollama serve`) and pull "
            f"`{settings.llm_model}` to get generated answers."
        )
