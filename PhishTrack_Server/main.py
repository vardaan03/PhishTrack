from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import time

# Internal Modules (To be created)
from forensics import analyze_headers, analyze_url_lexical
from ai_engine import PhishDetectorAI

app = FastAPI(title="PhishTrack_ AI Core", version="6.0", description="PhishTrack Web Portal")

# Allow CORS for Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to chrome-extension://<id>
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve Static Files (The Web Frontend)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Load AI Model (Singleton)
ai_engine = None

@app.on_event("startup")
async def load_model():
    global ai_engine
    print("[SYSTEM] Loading BERT-PhishFinder & ONNX Runtime...")
    try:
        ai_engine = PhishDetectorAI()
        print("[SYSTEM] AI Engine Online.")
    except Exception as e:
        print(f"[SYSTEM] AI Load Failed: {e}")

# --- Data Models ---
class EmailRequest(BaseModel):
    headers: str
    body_text: str
    urls: List[str]
    sender: str

class ScanResult(BaseModel):
    risk_score: float
    verdict: str
    components: dict
    logs: List[str]
    latency_ms: float

# --- Endpoints ---
from fastapi.responses import FileResponse

@app.get("/")
def read_root():
    return FileResponse('static/index.html')

@app.get("/health")
def health_check():
    return {"status": "active", "model": "DistilBERT-PhishFinder", "version": "6.0.0"}

@app.post("/scan/email", response_model=ScanResult)
async def scan_email(email: EmailRequest):
    start_time = time.time()
    logs = []
    
    # 0. LIVE URL SCRAPING (The "Real-Time" Fix)
    # If the user provided a URL but no body text (URL Scan Mode),
    # we fetch the page content so the AI has something to read.
    import requests
    from bs4 import BeautifulSoup
    
    if email.body_text == "URL Scan" and len(email.urls) > 0:
        target_url = email.urls[0]
        try:
            logs.append(f"📡 Connecting to {target_url}...")
            # Timeout to prevent hanging
            resp = requests.get(target_url, timeout=5, headers={"User-Agent": "PhishTrack-Scanner/6.0"})
            
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, 'html.parser')
                page_text = soup.get_text(separator=' ', strip=True)
                email.body_text = page_text[:5000] 
                logs.append(f"✅ Live Content Scraped ({len(page_text)} chars).")
            elif resp.status_code in [403, 406, 503]:
                # CLOUDFLARE / ANTI-BOT DETECTED
                # Many legitimate sites use this, BUT phishing sites use it to hide from scanners.
                # We flag this as "Evasive" to prevent false "Safe" verdicts.
                logs.append(f"⚠️ Anti-Bot Protection Detected (HTTP {resp.status_code}). Site is evasive.")
                headers_risk_penalty = 40 # Penalize for hiding
                email.headers += " X-PhishTrack-Evasion: True" # Signal to forensics
            else:
                logs.append(f"⚠️ Live Scan Failed: Server returned {resp.status_code}")
        except Exception as e:
            logs.append(f"⚠️ Live Scan Error: Could not reach site ({str(e)})")

    # 1. Header Forensics (Deterministic)
    header_risk, header_logs = analyze_headers(email.headers, email.sender)
    logs.extend(header_logs)
    
    # 2. AI Intent Analysis (Probabilistic)
    ai_risk = 0.0
    if ai_engine:
        ai_prob, ai_logs = ai_engine.predict(email.body_text)
        ai_risk = ai_prob * 100
        logs.extend(ai_logs)
    
    # 3. URL Lexical Analysis (Heuristic)
    url_risk = 0.0
    for url in email.urls:
        u_score, u_logs = analyze_url_lexical(url)
        if u_score > url_risk:
            url_risk = u_score # Take max risk
            logs.extend(u_logs)

    # 4. Unified Risk Score
    # Weights: NLP=0.6 (primary), Header=0.2, URL=0.2
    # AI is the main detector now
    
    total_risk = (ai_risk * 0.6) + (header_risk * 0.2) + (url_risk * 0.2)
    
    # Critical Overrides - if any signal is very strong, trust it
    if ai_risk >= 60: total_risk = max(total_risk, 85)  # Strong AI signal
    if url_risk >= 90: total_risk = max(total_risk, 95)
    if header_risk >= 90: total_risk = max(total_risk, 90)

    verdict = "SAFE"
    if total_risk > 60: verdict = "CRITICAL"
    elif total_risk > 30: verdict = "SUSPICIOUS"

    latency = (time.time() - start_time) * 1000
    
    return {
        "risk_score": round(total_risk, 2),
        "verdict": verdict,
        "components": {
            "header_risk": header_risk,
            "ai_intent_risk": ai_risk,
            "url_max_risk": url_risk
        },
        "logs": logs,
        "latency_ms": round(latency, 2)
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
