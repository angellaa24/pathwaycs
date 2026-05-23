import os
import re
from collections import Counter

import requests
from dotenv import load_dotenv

load_dotenv()

ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
ADZUNA_API_KEY = os.getenv("ADZUNA_API_KEY")
ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs/us/search/1"

# Curated tech skills checked by substring in job descriptions.
# Used for per-listing skill extraction (more meaningful than frequency analysis).
TECH_SKILLS = [
    "machine learning", "deep learning", "ci/cd", "react native",
    "python", "javascript", "typescript", "java", "kotlin", "swift",
    "golang", "rust", "scala", "ruby", "php",
    "react", "angular", "vue", "nextjs", "svelte",
    "nodejs", "express", "fastapi", "django", "flask", "spring",
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra",
    "sql", "graphql", "grpc",
    "aws", "azure", "gcp", "terraform", "ansible", "kubernetes", "docker",
    "linux", "bash", "git", "jenkins", "gitlab",
    "tensorflow", "pytorch", "pandas", "numpy", "scikit",
    "kafka", "airflow", "spark",
    "html", "css", "sass",
    "agile", "scrum", "jira",
    "ios", "android", "flutter",
    "security", "networking", "devops", "mlops",
]

# Maps lowercase role variations → canonical Adzuna search terms.
# Entries are checked via substring so "senior backend dev" still matches "backend dev".
_ROLE_ALIASES: list[tuple[str, str]] = [
    ("machine learning",    "Machine Learning Engineer"),
    ("ml engineer",         "Machine Learning Engineer"),
    ("data scientist",      "Data Scientist"),
    ("data science",        "Data Scientist"),
    ("data engineer",       "Data Engineer"),
    ("data analyst",        "Data Analyst"),
    ("devops",              "DevOps Engineer"),
    ("site reliability",    "Site Reliability Engineer"),
    ("full stack",          "Full Stack Developer"),
    ("fullstack",           "Full Stack Developer"),
    ("frontend",            "Frontend Developer"),
    ("front end",           "Frontend Developer"),
    ("front-end",           "Frontend Developer"),
    ("backend",             "Backend Developer"),
    ("back end",            "Backend Developer"),
    ("back-end",            "Backend Developer"),
    ("ios",                 "iOS Developer"),
    ("android",             "Android Developer"),
    ("mobile",              "Mobile Developer"),
    ("cloud engineer",      "Cloud Engineer"),
    ("security engineer",   "Security Engineer"),
    ("cybersecurity",       "Security Engineer"),
    ("embedded",            "Embedded Systems Engineer"),
    ("game dev",            "Game Developer"),
    ("game developer",      "Game Developer"),
    ("blockchain",          "Blockchain Developer"),
    ("qa engineer",         "QA Engineer"),
    ("quality assurance",   "QA Engineer"),
    ("software engineer",   "Software Engineer"),
    ("software developer",  "Software Engineer"),
    ("software dev",        "Software Engineer"),
]

def _normalize_role(role: str) -> str:
    """Map informal/abbreviated role names to terms Adzuna can search effectively."""
    lower = role.lower().strip()
    for fragment, canonical in _ROLE_ALIASES:
        if fragment in lower:
            return canonical
    return "Software Engineer"


STOP_WORDS = {
    # articles / prepositions / conjunctions
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "are", "was", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can", "not",
    "no", "nor", "so", "yet", "both", "either", "neither", "whether",
    "if", "then", "than", "that", "this", "these", "those", "it", "its",
    "we", "our", "you", "your", "they", "their", "he", "she", "his", "her",
    "what", "which", "who", "whom", "how", "when", "where", "why",
    # generic job-posting filler
    "job", "work", "working", "role", "position", "opportunity", "join",
    "team", "company", "organization", "employer", "employee", "candidate",
    "applicant", "apply", "application", "hiring", "hire", "looking",
    "seeking", "search", "include", "including", "includes", "included",
    "also", "well", "strong", "excellent", "good", "great", "highly",
    "must", "able", "ability", "will", "like", "use", "using", "used",
    "new", "other", "more", "all", "any", "some", "such", "each",
    "about", "into", "through", "during", "following", "across",
    "within", "between", "after", "before", "above", "below",
    "provide", "support", "ensure", "manage", "help", "make", "take",
    "get", "give", "need", "know", "create", "build", "develop",
    "implement", "design", "deliver", "drive", "lead", "collaborate",
    "communicate", "understand", "learn", "grow", "improve", "maintain",
    "responsible", "responsibilities", "required", "requirements",
    "preferred", "plus", "bonus", "benefit", "benefits", "salary",
    "competitive", "full", "part", "time", "year", "years", "day",
    "days", "month", "months", "week", "weeks",
}


def _fetch_adzuna(query: str, results: int = 20) -> list[dict]:
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_API_KEY,
        "results_per_page": results,
        "what": query,
        "where": "Boston",
        "content-type": "application/json",
    }
    response = requests.get(ADZUNA_BASE_URL, params=params, timeout=10)
    response.raise_for_status()
    return response.json().get("results", [])


def extract_job_skills(description: str) -> list[str]:
    text = re.sub(r"<[^>]+>", " ", description).lower()
    seen: list[str] = []
    for skill in TECH_SKILLS:
        if skill in text and skill not in seen:
            seen.append(skill)
        if len(seen) >= 8:
            break
    return seen


def get_job_listings(target_role: str, job_level: str = "junior") -> list[dict]:
    query = f"{job_level} {_normalize_role(target_role)}"
    jobs = _fetch_adzuna(query, results=20)
    listings = []
    for job in jobs:
        desc = job.get("description", "")
        snippet = desc[:220].rstrip() + ("…" if len(desc) > 220 else "")
        salary_min = job.get("salary_min")
        salary_max = job.get("salary_max")
        listings.append({
            "title":        job.get("title", ""),
            "company":      job.get("company", {}).get("display_name", ""),
            "location":     job.get("location", {}).get("display_name", ""),
            "redirect_url": job.get("redirect_url", ""),
            "salary_min":   salary_min,
            "salary_max":   salary_max,
            "description":  snippet,
            "skills":       extract_job_skills(desc),
        })
    return listings


def get_top_skills(target_role: str, job_level: str = "junior") -> list[str]:
    query = f"{job_level} {_normalize_role(target_role)}"
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_API_KEY,
        "results_per_page": 20,
        "what": query,
        "where": "United States",
        "content-type": "application/json",
    }

    response = requests.get(ADZUNA_BASE_URL, params=params, timeout=10)
    response.raise_for_status()
    results = response.json().get("results", [])

    # Count how many job listings mention each curated tech skill.
    # This produces meaningful skill names rather than raw word frequencies.
    skill_counts: Counter = Counter()
    for job in results:
        desc = re.sub(r"<[^>]+>", " ", job.get("description", "")).lower()
        seen_in_job: set[str] = set()
        for skill in TECH_SKILLS:
            if skill in desc and skill not in seen_in_job:
                skill_counts[skill] += 1
                seen_in_job.add(skill)

    return [skill for skill, _ in skill_counts.most_common(10)]
