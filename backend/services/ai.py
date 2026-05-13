from typing import List

from config import settings


async def analyze_spectrum(prompt: str, readings: List) -> str:
    if not settings.openai_api_key:
        return (
            "AI analysis is not configured. "
            "Set OPENAI_API_KEY in your .env file to enable this feature."
        )

    # Build a compact text summary of the spectrum data
    lines = []
    for r in readings[:30]:
        mhz_low = r.hz_low / 1e6
        mhz_step = r.hz_step / 1e6
        # Sample every ~10th bin to keep context concise
        sampled = [(mhz_low + i * mhz_step, db) for i, db in enumerate(r.db_values)][::max(1, len(r.db_values) // 20)]
        bins_str = "  ".join(f"{mhz:.3f}MHz={db:.1f}dB" for mhz, db in sampled)
        lines.append(f"[{r.time.isoformat()}]  {bins_str}")

    data_text = "\n".join(lines)
    full_prompt = (
        f"{prompt}\n\n"
        f"Spectrum data ({len(readings)} readings, sampled bins shown):\n{data_text}"
    )

    try:
        import httpx

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.ai_endpoint}/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": settings.ai_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are an expert RF spectrum analyst. "
                                "Analyze the provided spectrum data and give detailed, "
                                "actionable insights."
                            ),
                        },
                        {"role": "user", "content": full_prompt},
                    ],
                    "max_tokens": 1200,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        return f"AI request failed: {exc}"
