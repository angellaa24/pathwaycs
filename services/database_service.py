import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

_url: str = os.environ["SUPABASE_URL"]
_key: str = os.environ["SUPABASE_KEY"]

supabase: Client = create_client(_url, _key)


def save_roadmap(
    target_role: str,
    job_level: str,
    current_skills: list[str],
    market_skills: list[str],
    steps: list[dict],
    user_id: str | None = None,
    pathway_type: str = "role",
) -> dict:
    # Deactivate all existing roadmaps for this user before saving the new one.
    if user_id:
        supabase.table("roadmaps").update({"is_active": False}).eq("user_id", user_id).execute()

    row = {
        "target_role": target_role,
        "job_level": job_level,
        "current_skills": current_skills,
        "market_skills": market_skills,
        "steps": steps,
        "is_active": True,
        "pathway_type": pathway_type,
    }
    if user_id:
        row["user_id"] = user_id
    response = supabase.table("roadmaps").insert(row).execute()
    return response.data[0]


def claim_roadmap(roadmap_id: str, user_id: str) -> dict:
    response = (
        supabase.table("roadmaps")
        .update({"user_id": user_id})
        .eq("id", roadmap_id)
        .execute()
    )
    return response.data[0] if response.data else {}


def get_progress(roadmap_id: str) -> list[dict]:
    response = (
        supabase.table("progress")
        .select("*")
        .eq("roadmap_id", roadmap_id)
        .execute()
    )
    return response.data


def mark_step_complete(roadmap_id: str, step_number: int) -> dict:
    now = datetime.now(timezone.utc).isoformat()

    update_resp = (
        supabase.table("progress")
        .update({"completed": True, "completed_at": now})
        .eq("roadmap_id", roadmap_id)
        .eq("step_number", step_number)
        .execute()
    )
    if update_resp.data:
        return update_resp.data[0]

    insert_resp = (
        supabase.table("progress")
        .insert({
            "roadmap_id": roadmap_id,
            "step_number": step_number,
            "completed": True,
            "completed_at": now,
        })
        .execute()
    )
    return insert_resp.data[0]


def get_user_roadmaps(user_id: str) -> list[dict]:
    response = (
        supabase.table("roadmaps")
        .select("id, target_role, job_level, pathway_type, is_active, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


def set_active_roadmap(roadmap_id: str, user_id: str) -> dict:
    """Set a roadmap as active and deactivate all others. Returns the full roadmap row."""
    supabase.table("roadmaps").update({"is_active": False}).eq("user_id", user_id).execute()
    response = (
        supabase.table("roadmaps")
        .update({"is_active": True})
        .eq("id", roadmap_id)
        .select("id, steps, target_role, job_level, current_skills, pathway_type")
        .execute()
    )
    return response.data[0] if response.data else {}


def delete_roadmap_with_progress(roadmap_id: str, user_id: str) -> dict:
    """Delete a roadmap and its progress rows. If it was active, auto-activate the most recent remaining."""
    check = (
        supabase.table("roadmaps")
        .select("is_active")
        .eq("id", roadmap_id)
        .eq("user_id", user_id)
        .execute()
    )
    was_active = check.data[0]["is_active"] if check.data else False

    supabase.table("progress").delete().eq("roadmap_id", roadmap_id).execute()
    supabase.table("roadmaps").delete().eq("id", roadmap_id).eq("user_id", user_id).execute()

    new_active_id = None
    if was_active:
        remaining = (
            supabase.table("roadmaps")
            .select("id")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if remaining.data:
            new_active_id = remaining.data[0]["id"]
            supabase.table("roadmaps").update({"is_active": True}).eq("id", new_active_id).execute()

    return {"deleted_id": roadmap_id, "new_active_id": new_active_id, "was_active": was_active}
