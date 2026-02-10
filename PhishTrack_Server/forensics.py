import re

# --- SECTION 8.1: HEADER FORENSICS ---
def analyze_headers(raw_headers: str, stated_sender: str):
    risk = 0
    logs = []
    
    raw_lower = raw_headers.lower()
    
    # 1. Authentication Protocols (Simulated parsing of 'Authentication-Results')
    if "spf=fail" in raw_lower or "spf=softfail" in raw_lower:
        risk += 30
        logs.append("⚠️ SPF Check Failed: Sender IP not authorized.")
    
    if "dkim=fail" in raw_lower:
        risk += 30
        logs.append("⚠️ DKIM Check Failed: Email signature invalid.")
        
    if "dmarc=fail" in raw_lower:
        risk += 40
        logs.append("🚫 DMARC Policy Violation: Reject/Quarantine indicated.")

    # 2. Reply-To Mismatch (BEC Indicator)
    # Simple regex to find Reply-To. In prod, use email library.
    reply_match = re.search(r'reply-to:\s*<([^>]+)>', raw_lower)
    if reply_match:
        reply_email = reply_match.group(1)
        if stated_sender not in reply_email and reply_email not in stated_sender:
            risk += 30
            logs.append(f"⚠️ BEC Indicator: Reply-To ({reply_email}) != From ({stated_sender})")

    return min(risk, 100), logs

# --- SECTION 4.3: LEXICAL URL ANALYSIS ---
BRAND_WHITELIST = ["google", "paypal", "amazon", "microsoft", "apple", "netflix"]

def analyze_url_lexical(url: str):
    risk = 0
    logs = []
    
    # 1. IP Address
    if re.search(r'://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url):
        risk += 80
        logs.append(f"🚫 URL is a raw IP address: {url}")
        return risk, logs

    # 2. Typosquatting (Levenshtein Light)
    domain_match = re.search(r'://([^/]+)', url)
    if domain_match:
        domain = domain_match.group(1).lower()
        
        for brand in BRAND_WHITELIST:
            if brand in domain and not domain.endswith(f".{brand}.com"):
                # e.g., paypal-secure.com vs paypal.com
                # Simple containment check for demo
                if f".{brand}.com" not in domain and f"{brand}.com" != domain:
                     risk += 50
                     logs.append(f"⚠️ Brand Impersonation: '{brand}' found in non-official domain '{domain}'.")

    # 3. Suspicious TLDs
    if re.search(r'\.(xyz|top|ru|cn|work)$', url):
        risk += 20
        logs.append("⚠️ Low-trust TLD detected.")

    return min(risk, 100), logs
