import streamlit as st
import time
import random
import pandas as pd
import json

# --- Page Configuration ---
st.set_page_config(
    page_title="PhishTrack_ | Bio-Telemetry Defense",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# --- Custom CSS (The "Hacker" Aesthetic) ---
st.markdown("""
<style>
    /* Global Styles */
    body {
        color: #00ff00;
        background-color: #0d0d0d;
        font-family: 'Courier New', Courier, monospace;
    }
    .stApp {
        background-color: #000000;
    }
    
    /* Headings */
    h1, h2, h3, h4, h5, h6 {
        color: #00ff00 !important;
        font-family: 'Courier New', Courier, monospace !important;
        text-transform: uppercase;
        border-bottom: 1px dashed #004400;
        padding-bottom: 5px;
    }

    /* Text */
    p, li, label, .stMarkdown {
        color: #e0e0e0 !important;
        font-family: 'Courier New', Courier, monospace !important;
    }
    
    /* Metrics */
    div[data-testid="stMetricValue"] {
        color: #ff0000 !important;
        font-family: 'Courier New', Courier, monospace !important;
        text-shadow: 0 0 5px #ff0000;
    }
    div[data-testid="stMetricLabel"] {
        color: #00ff00 !important;
    }

    /* Buttons */
    .stButton > button {
        background-color: #000000;
        color: #00ff00;
        border: 1px solid #00ff00;
        border-radius: 0px;
        font-family: 'Courier New', Courier, monospace;
        text-transform: uppercase;
        transition: all 0.3s ease;
    }
    .stButton > button:hover {
        background-color: #00ff00;
        color: #000000;
        box-shadow: 0 0 10px #00ff00;
    }

    /* Progress Bar */
    .stProgress > div > div > div > div {
        background-color: #00ff00;
    }

    /* Dataframe/Table */
    div[data-testid="stDataFrame"] {
        border: 1px solid #004400;
    }

    /* Custom Classes */
    .terminal-log {
        background-color: #111;
        border: 1px solid #333;
        padding: 10px;
        border-radius: 5px;
        font-family: 'Consolas', 'Courier New', monospace;
        color: #00ff41;
        height: 200px;
        overflow-y: scroll;
        white-space: pre-wrap;
    }
    
    .status-badge {
        background-color: #003300;
        color: #00ff00;
        padding: 2px 8px;
        border: 1px solid #00ff00;
        font-size: 0.8em;
    }
</style>
""", unsafe_allow_html=True)

# --- Header ---
col1, col2 = st.columns([3, 1])
with col1:
    st.title("PhishTrack_ v1.0")
with col2:
    st.markdown('<div style="text-align: right; margin-top: 20px;"><span class="status-badge">INTELLIGENCE INITIALIZED</span><br><span style="font-size: 0.8em; color: #666;">TRACK: CYBERSECURITY</span></div>', unsafe_allow_html=True)

st.markdown("---")

# --- 01 PROBLEM ---
st.header("## 01__PROBLEM")
st.markdown("""
> **SYSTEM WARNING**: Traditional filters are compromised.
>
> AI-generated phishing emails utilize **LLM-driven personalization** to bypass syntactic filters.
> The critical vulnerability is no longer software—it is the **HUMAN FACTOR**.
> Users are unable to distinguish hyper-realistic social engineering attacks.
""")

# --- 02 SOLUTION ---
st.header("## 02__SOLUTION")
col_s1, col_s2 = st.columns(2)
with col_s1:
    st.markdown("### BEHAVIORAL BIOMETRICS")
    st.markdown("""
    Instead of analyzing content, we analyze **intent**.
    
    *   **Mouse Jitter**: Micro-tremors indicating cognitive load.
    *   **Click Velocity**: Millisecond disparities in decision speed.
    *   **Input Hesitation**: Pauses correlated with skepticism or confusion.
    """)
with col_s2:
    st.info("DEFENSE STRATEGY: Real-time analysis of user interaction patterns to detect anomalies indicative of social engineering.")

# --- 03 LIVE DEMO ---
st.header("## 03__LIVE_DEMO // SIMULATION")

start_sim = st.button(">>> INITIATE LOGIN SEQUENCE [SIMULATE]")

if start_sim:
    # Containers for dynamic updates
    status_text = st.empty()
    progress_bar = st.progress(0)
    log_container = st.empty()
    
    # Simulation Memory
    logs = []
    
    # Step 1: Extracting Telemetry
    status_text.markdown("**>> PHASE 1: EXTRACTING TELEMETRY...**")
    for i in range(1, 41):
        time.sleep(0.05)
        progress_bar.progress(i)
        
        # Generate fake telemetry
        telemetry = {
            "timestamp": time.time(),
            "mouse_x": random.randint(0, 1920),
            "mouse_y": random.randint(0, 1080),
            "velocity_px_ms": round(random.uniform(0.1, 5.0), 2)
        }
        logs.append(f"[CAPTURE] {json.dumps(telemetry)}")
        log_container.code("\n".join(logs[-5:]), language="json")

    # Step 2: Calculating Risk
    status_text.markdown("**>> PHASE 2: CALCULATING RISK METRICS...**")
    for i in range(41, 81):
        time.sleep(0.05)
        progress_bar.progress(i)
        
        metric = {
            "jitter_variance": round(random.random(), 4),
            "hesitation_ms": random.randint(500, 2500),
            "pattern_match": "ANOMALY_DETECTED" if random.random() > 0.7 else "NORMAL"
        }
        logs.append(f"[CALC] {json.dumps(metric)}")
        log_container.code("\n".join(logs[-5:]), language="json")

    # Step 3: ML Classification
    status_text.markdown("**>> PHASE 3: ML CLASSIFICATION [RANDOM_FOREST]...**")
    for i in range(81, 101):
        time.sleep(0.05)
        progress_bar.progress(i)

    # Final Result
    risk_score = random.randint(65, 99)
    status_text.markdown(f"**>> SEQUENCE COMPLETE. EOF.**")
    
    col_res1, col_res2 = st.columns(2)
    with col_res1:
        st.metric(label="THREAT PROBABILITY", value=f"{risk_score}%", delta=f"+{random.randint(1,5)}% (Real-time)")
    with col_res2:
        if risk_score > 80:
            st.error("!!! CRITICAL ALERT: SOCIAL ENGINEERING DETECTED !!!")
        else:
            st.warning("ELEVATED RISK: USER CAUTION ADVISED")
            
    st.json({
        "final_verdict": "MALICIOUS" if risk_score > 80 else "SUSPICIOUS",
        "confidence": f"{risk_score/100:.2f}",
        "model_version": "v2.4.1_beta",
        "latency_ms": 42
    })

else:
    st.markdown("Checking system integrity... **READY**.")
    st.code("Waiting for user interaction trigger...", language="bash")

# --- 04 STACK ---
st.header("## 04__STACK")

stack_data = pd.DataFrame({
    "COMPONENT": ["Frontend", "Backend", "ML Engine", "Deployment"],
    "TECHNOLOGY": ["Streamlit (Python)", "FastAPI", "Scikit-Learn", "Docker/Cloud"],
    "STATUS": ["ACTIVE", "CONNECTED", "TRAINED", "READY"]
})

st.table(stack_data)

# --- FOOTER ---
st.markdown("---")
st.markdown("""
<div style="text-align: center; color: #333; font-size: 0.7em;">
    EOF // THANK YOU FOR REVIEWING PHISHTRACK_<br>
    SECURE CONNECTION TERMINATED.
</div>
""", unsafe_allow_html=True)
