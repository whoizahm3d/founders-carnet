import json
import os
import urllib.request

from service import generate_assessment, ReadinessError

API_KEY = os.environ["GEMINI_API_KEY"]
MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"


def llm_call(prompt: str) -> str:
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2},
    }).encode()
    req = urllib.request.Request(URL, body, {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    return data["candidates"][0]["content"]["parts"][0]["text"]


PROFILES = {
    "thin": {"name": "Test", "problem": "people need better tools"},
    "rich": {
        "name": "FarmLink",
        "one_liner": "Marketplace connecting small farmers in Punjab to restaurants",
        "problem": "Small farmers lose 20-30% of income to middlemen; 12 farmers interviewed confirmed it",
        "target_users": "Farmers with 5-20 acres near Lahore; restaurants buying vegetables",
        "market": "Initial segment: 200 restaurants in Lahore. Source: PBS food service data",
        "competitors": "Local mandis, Kissan Pakistan; we offer same-day delivery and price transparency",
        "business_model": "8% commission per order; pilot restaurants agreed to pricing",
        "traction": "3 farmers and 5 restaurants in pilot, 40 orders in 2 months",
        "team": "CEO (ex-agri trader), CTO (CS grad), ops lead; all full-time",
        "growth_plan": "Expand to Faisalabad using the same logistics partner",
    },
}

for label, profile in PROFILES.items():
    print(f"\n=== {label} ===")
    try:
        res = generate_assessment(profile, llm_call)
    except ReadinessError as e:
        print("FAILED:", e)
        continue  
    print("overall:", res.overall_score)
    for d in res.assessment.dimensions:
        print(f"  {d.dimension}: {d.score} | {d.reasoning} | NEXT: {d.next_action}")