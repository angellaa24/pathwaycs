import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from services.jobs_service import get_top_skills, get_job_listings
from services.claude_service import generate_smart_roadmap, suggest_roles, chat_with_tutor
from services.database_service import (
    save_roadmap, get_progress, mark_step_complete, claim_roadmap,
    get_user_roadmaps, set_active_roadmap, delete_roadmap_with_progress,
)

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://pathwaycs.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RoadmapRequest(BaseModel):
    current_skills: list[str]
    target_role: str
    job_level: str = "junior"
    user_id: str | None = None
    missing_skills: list[str] = []
    context: str | None = None
    pathway_type: str = "role"


class SuggestRolesRequest(BaseModel):
    skills: list[str] = []
    enjoys: str | None = None
    strongest_skill: str | None = None
    career_priority: str | None = None


class ClaimRoadmapRequest(BaseModel):
    user_id: str


class ChatRequest(BaseModel):
    message: str
    step_title: str
    step_description: str = ""
    history: list[dict] = []


class DeleteAccountRequest(BaseModel):
    user_id: str


class SetActiveRequest(BaseModel):
    user_id: str


class DeleteRoadmapRequest(BaseModel):
    user_id: str


@app.post("/chat")
def chat(body: ChatRequest):
    try:
        reply = chat_with_tutor(
            message=body.message,
            step_title=body.step_title,
            step_description=body.step_description,
            history=body.history,
        )
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/")
def read_root():
    return {"message": "Hello, World!"}


@app.get("/jobs")
def jobs(target_role: str):
    try:
        skills = get_top_skills(target_role)
        return {"target_role": target_role, "top_skills": skills}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/job-listings")
def job_listings(target_role: str, job_level: str = "junior"):
    try:
        listings = get_job_listings(target_role, job_level)
        return {"listings": listings}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/suggest-roles")
def suggest_roles_endpoint(body: SuggestRolesRequest):
    try:
        return suggest_roles(
            skills=body.skills,
            enjoys=body.enjoys,
            strongest_skill=body.strongest_skill,
            career_priority=body.career_priority,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/generate-roadmap")
def generate_roadmap(body: RoadmapRequest):
    try:
        market_skills = get_top_skills(body.target_role, body.job_level)
        result = generate_smart_roadmap(
            current_skills=body.current_skills,
            target_role=body.target_role,
            market_skills=market_skills,
            job_level=body.job_level,
        )
        record = save_roadmap(
            target_role=body.target_role,
            job_level=body.job_level,
            current_skills=body.current_skills,
            market_skills=market_skills,
            steps=result.get("steps", []),
            user_id=body.user_id,
            pathway_type=body.pathway_type,
        )
        return {
            **result,
            "roadmap_id":   record["id"],
            "target_role":  record["target_role"],
            "job_level":    record["job_level"],
            "pathway_type": record.get("pathway_type", "role"),
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/progress/{roadmap_id}")
def fetch_progress(roadmap_id: str):
    try:
        rows = get_progress(roadmap_id)
        return {"roadmap_id": roadmap_id, "progress": rows}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/progress/{roadmap_id}/{step_number}")
def complete_step(roadmap_id: str, step_number: int):
    try:
        row = mark_step_complete(roadmap_id, step_number)
        return row
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/roadmaps")
def list_roadmaps(user_id: str):
    try:
        rows = get_user_roadmaps(user_id)
        return {"roadmaps": rows}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/roadmaps/{roadmap_id}/set-active")
def set_active_endpoint(roadmap_id: str, body: SetActiveRequest):
    try:
        result = set_active_roadmap(roadmap_id, body.user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.delete("/roadmaps/{roadmap_id}")
def delete_roadmap_endpoint(roadmap_id: str, body: DeleteRoadmapRequest):
    try:
        result = delete_roadmap_with_progress(roadmap_id, body.user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/roadmaps/{roadmap_id}/claim")
def claim_roadmap_endpoint(roadmap_id: str, body: ClaimRoadmapRequest):
    try:
        result = claim_roadmap(roadmap_id, body.user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.delete("/auth/account")
def delete_account(body: DeleteAccountRequest):
    service_key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not service_key:
        raise HTTPException(
            status_code=501,
            detail="Account deletion is not configured on this server.",
        )
    try:
        from supabase import create_client
        admin = create_client(os.environ["SUPABASE_URL"], service_key)
        admin.auth.admin.delete_user(body.user_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
