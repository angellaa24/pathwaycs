import json
import re

import anthropic

client = anthropic.Anthropic()

SYSTEM_PROMPT = (
    "You are a career coach and technical curriculum designer. "
    "You create precise, actionable learning roadmaps grounded in real job market data. "
    "Always respond with valid JSON only — no prose, no markdown fences."
)


def generate_smart_roadmap(
    current_skills: list[str],
    target_role: str,
    market_skills: list[str],
    job_level: str = "junior",
) -> dict:
    level_guidance = {
        "intern":    "Focus on foundational concepts, guided projects, and basic tooling. Assume minimal professional experience.",
        "junior":    "Cover core skills and common workflows. Assume some academic or personal project experience but limited industry exposure.",
        "mid-level": "Go deeper on system design, best practices, and independent ownership of features. Assume 2–4 years of experience.",
        "senior":    "Emphasize architecture, leadership, cross-team impact, and advanced specialization. Assume 5+ years of hands-on experience.",
    }.get(job_level.lower(), f"Tailor the roadmap for a {job_level}-level engineer.")

    prompt = f"""
I want to become a {job_level} {target_role}.

My current skills: {', '.join(current_skills) if current_skills else 'none listed'}

Top skills currently in demand for {job_level} {target_role} roles based on real job postings:
{', '.join(market_skills)}

Target level guidance: {level_guidance}

Create a personalized step-by-step learning roadmap that:
- Is calibrated for the {job_level} level — not too basic, not too advanced
- Builds on my existing skills
- Prioritizes skills with high market demand that I don't already have
- Skips or fast-tracks anything I already know well

For each step, assign a market_relevance of:
- "high"   — skill appears frequently in job postings and I don't already have it
- "medium" — skill appears in job postings but I partially have it, or it's complementary
- "low"    — useful but less commonly required or already covered by my background

Respond ONLY with a valid JSON object in this exact structure:
{{
  "steps": [
    {{
      "step": 1,
      "title": "...",
      "description": "...",
      "market_relevance": "high" | "medium" | "low",
      "resources": ["..."]
    }}
  ]
}}
""".strip()

    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        message = stream.get_final_message()

    text = next(
        (block.text for block in message.content if block.type == "text"), ""
    )

    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"roadmap": text}


def chat_with_tutor(
    message: str,
    step_title: str,
    step_description: str = "",
    history: list[dict] | None = None,
) -> str:
    system = (
        f'You are a friendly, encouraging CS tutor helping a student learn "{step_title}". '
        f"Here is what this step covers: {step_description} "
        "Keep responses concise and practical — 2 to 4 short paragraphs. "
        "Use concrete examples and analogies. Be encouraging but honest about difficulty. "
        f"When suggesting projects, make them directly relevant to {step_title}. "
        "When asked about jobs, name real companies and specific roles that use this skill."
    )

    msgs = list(history or []) + [{"role": "user", "content": message}]

    with client.messages.stream(
        model="claude-haiku-4-5-20251001",
        max_tokens=600,
        system=system,
        messages=msgs,
    ) as stream:
        final = stream.get_final_message()

    return next((b.text for b in final.content if b.type == "text"), "")


def suggest_roles(
    skills: list[str] | None = None,
    enjoys: str | None = None,
    strongest_skill: str | None = None,
    career_priority: str | None = None,
) -> dict:
    if enjoys or career_priority:
        prompt = f"""
Based on these career preferences:
- What they enjoy most: {enjoys or 'not specified'}
- Strongest current skill: {strongest_skill or 'not specified'}
- What matters most to them: {career_priority or 'not specified'}

Suggest exactly 3 CS career roles that best match this profile.
For each role, explain specifically why it fits their preferences and describe what their day-to-day would look like.

Respond ONLY with a valid JSON object in this exact structure:
{{
  "roles": [
    {{
      "title": "Job title, e.g. Frontend Engineer",
      "description": "2-3 sentences on why this role fits their preferences and what their day looks like.",
      "demand": "high | medium | low"
    }}
  ]
}}

For "demand", base it on current job market conditions.
""".strip()
        max_tokens = 900
    else:
        prompt = f"""
I have the following skills: {', '.join(skills) if skills else 'none listed'}

Suggest the top 4 CS career roles that best match these skills.

Respond ONLY with a valid JSON object in this exact structure:
{{
  "roles": [
    {{
      "title": "Job title, e.g. Frontend Engineer",
      "description": "1-2 sentences describing what this role does day-to-day.",
      "demand": "high | medium | low"
    }}
  ]
}}

For "demand", base it on current job market conditions: high = actively hiring with many openings, medium = steady hiring, low = fewer openings or niche market.
""".strip()
        max_tokens = 800

    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        message = stream.get_final_message()

    text = next(
        (block.text for block in message.content if block.type == "text"), ""
    )

    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"roles": []}
