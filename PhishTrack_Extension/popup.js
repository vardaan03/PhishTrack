// --- Advanced Analysis Logic (V4 Zero Trust) ---

const BRAND_WHITELIST = [
    "google.com", "paypal.com", "amazon.com", "facebook.com",
    "apple.com", "microsoft.com", "netflix.com", "instagram.com",
    "linkedin.com", "dropbox.com", "adobe.com", "twitter.com",
    "accounts.google.com", "login.microsoftonline.com"
];

// Global state for aggregation
let collectedData = {
    links: [],
    inputs: [],
    forms: [],
    textLength: 0,
    urls: [],
    text: ""  // NEW: Collect page text for scam analysis
};
let frameCount = 0;
let scanTimer = null;

// UI Elements
const btn = document.getElementById('scanBtn');
const hero = document.getElementById('hero');
const resultCard = document.getElementById('resultCard');

document.getElementById('scanBtn').addEventListener('click', async () => {
    // Reset UI
    btn.disabled = true;
    btn.innerText = "Analyzing Deep Signals...";
    resultCard.style.display = 'none';

    // Reset Data
    collectedData = { links: [], inputs: [], forms: [], textLength: 0, urls: [], text: "" };
    frameCount = 0;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Setup Listener
        chrome.runtime.onMessage.addListener(handleFrameMessage);

        // Inject into ALL frames
        await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ['content.js']
        });

        // Wait Aggregation
        scanTimer = setTimeout(() => {
            finalizeScan(tab.url);
        }, 800);

    } catch (e) {
        renderError("Error: " + e.message);
        btn.disabled = false;
        chrome.runtime.onMessage.removeListener(handleFrameMessage);
    }
});

function handleFrameMessage(request, sender, sendResponse) {
    if (request.action === "frameResult") {
        frameCount++;
        const d = request.data;
        collectedData.links.push(...d.links);
        collectedData.inputs.push(...d.inputs);
        collectedData.forms.push(...d.forms);
        collectedData.textLength += d.contentLength;
        collectedData.urls.push(d.url);
        if (d.text) collectedData.text += " " + d.text.substring(0, 2000); // Collect text
    }
}

function finalizeScan(mainTabUrl) {
    chrome.runtime.onMessage.removeListener(handleFrameMessage);

    const compositeData = {
        url: mainTabUrl,
        links: collectedData.links,
        inputs: collectedData.inputs,
        forms: collectedData.forms,
        textLength: collectedData.textLength,
        text: collectedData.text  // NEW: Pass text for analysis
    };

    const analysis = performForensics(compositeData);
    renderResults(analysis);

    btn.innerText = `Scan Complete (${frameCount} Frames)`;
    btn.disabled = false;
    hero.style.display = 'none';
}

function performForensics(data) {
    let score = 0;
    let findings = [];

    const urlObj = new URL(data.url);
    const domain = urlObj.hostname;
    const isWhitelisted = BRAND_WHITELIST.some(b => domain.endsWith(b));

    // --- NEW: TEXT CONTENT SCAM ANALYSIS ---
    const textLower = (data.text || "").toLowerCase();

    // Semantic phishing patterns (not just keywords)
    const scamPatterns = [
        { pattern: /(urgent|immediate|now|asap).{0,30}(account|password|verify|suspend|limit)/i, score: 70, msg: "Urgency + Account threat detected" },
        { pattern: /(security team|support team|administrator|helpdesk)/i, score: 40, msg: "Authority impersonation detected" },
        { pattern: /(won|winner|lottery|prize|congratulations).{0,20}(claim|collect|\$|dollar|million)/i, score: 80, msg: "Prize/Lottery scam pattern" },
        { pattern: /(click here|log ?in|sign ?in).{0,20}(verify|confirm|update).{0,20}(account|password|identity)/i, score: 75, msg: "Credential harvesting pattern" },
        { pattern: /(will be|has been).{0,15}(suspend|terminat|delet|lock|compromis)/i, score: 65, msg: "Fear/Threat tactics detected" },
        { pattern: /\b(scam|fraud|phishing)\b/i, score: 90, msg: "Direct scam language found" },
        { pattern: /(transfer|wire|send).{0,20}(money|funds|\$|usd|dollar)/i, score: 50, msg: "Money transfer request" },
    ];

    let textScore = 0;
    for (const { pattern, score: patScore, msg } of scamPatterns) {
        if (pattern.test(textLower)) {
            if (patScore > textScore) {
                textScore = patScore;
                findings.push({ type: 'danger', msg: `<strong>Content Analysis</strong>: ${msg}` });
            }
        }
    }
    score += textScore;

    // --- 1. ZERO TRUST: Blank/Evasive Page Check ---
    if (data.textLength < 50 && data.links.length === 0 && data.inputs.length === 0) {
        // Only warn if not a browser internal page
        if (!data.url.startsWith('chrome://') && !data.url.startsWith('about:')) {
            return {
                score: 65,
                findings: [
                    { type: 'warn', msg: `<strong>Inconclusive Scan</strong>: Page contains almost no content.` },
                    { type: 'danger', msg: `<strong>Possible Evasion</strong>: Attackers often use blank pages or overlays.` }
                ]
            };
        }
    }

    // 2. Sensitive Input Detection (Passwords)
    const hasPassword = data.inputs.some(i => i.type === 'password');
    if (hasPassword) {
        if (!isWhitelisted) {
            score += 35;
            findings.push({ type: 'warn', msg: `<strong>Sensitive Input</strong>: Password field detected on unverified site.` });
        } else {
            findings.push({ type: 'safe', msg: `Login field detected on known domain (${domain}).` });
        }
    }

    // 3. Form Action Risk
    data.forms.forEach(f => {
        if (f.action && !f.action.startsWith('javascript')) {
            try {
                const actionUrl = new URL(f.action, data.url); // Resolve relative
                if (actionUrl.hostname !== domain && !isWhitelisted) {
                    score += 40;
                    findings.push({ type: 'danger', msg: `<strong>Exfiltration Risk</strong>: Form sends data to external host: ${actionUrl.hostname}` });
                }
            } catch (e) { }
        }
    });

    // 4. Homoglyphs & Typosquatting
    const hasCyrillic = /[\u0400-\u04FF]/.test(domain);
    if (hasCyrillic && !domain.startsWith('xn--')) {
        score += 90;
        findings.push({ type: 'danger', msg: `<strong>Homoglyph Detected</strong>: Non-Latin characters in domain.` });
    }

    let squatted = false;
    for (const brand of BRAND_WHITELIST) {
        if (domain === brand || domain.endsWith("." + brand)) continue;
        const dist = levenshtein(domain, brand);
        if (dist > 0 && dist <= 2) {
            score += 80;
            squatted = true;
            findings.push({ type: 'danger', msg: `<strong>Typosquatting</strong>: "${domain}" mimics "${brand}".` });
            break;
        }
    }

    // 5. Insecure Protocol
    if (urlObj.protocol === 'http:') {
        score += 25;
        findings.push({ type: 'warn', msg: `Connection is not encrypted (HTTP).` });
    } else {
        findings.push({ type: 'safe', msg: `Connection secured with HTTPS.` });
    }

    // 6. Link Analysis (IPs, Deception)
    let badLinks = 0;
    data.links.forEach(link => {
        if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(link.href)) {
            score += 40;
            findings.push({ type: 'danger', msg: `<strong>Suspicious Link</strong>: Points to raw IP address.` });
            badLinks++;
        }
        // Text mismatch (e.g. text says "google.com" but href is "evil.com")
        if (link.text.includes('.') && link.text.length > 5) {
            const textDomainMatch = link.text.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
            if (textDomainMatch) {
                const textDomain = textDomainMatch[1];
                if (!link.href.includes(textDomain) && !link.href.startsWith('/')) {
                    score += 50;
                    findings.push({ type: 'danger', msg: `<strong>Deceptive Link</strong>: Text shows "${textDomain}" but links to different site.` });
                    badLinks++;
                }
            }
        }
    });

    // 7. "Zero Trust" Verdict logic
    // If score is 0, we still want to be careful.
    if (score === 0) {
        if (!hasPassword && data.links.length === 0 && data.textLength < 500) {
            findings.push({ type: 'wait', msg: `Low content volume. Verify manually.` });
        } else {
            findings.push({ type: 'safe', msg: `Scanned ${data.links.length} links & ${data.inputs.length} inputs. No threats found.` });
        }
    }

    return { score: Math.min(score, 100), findings };
}

function renderResults(analysis) {
    const icon = document.getElementById('verdictIcon');
    const title = document.getElementById('verdictTitle');
    const score = document.getElementById('riskScore');
    const list = document.getElementById('proofList');

    document.getElementById('resultCard').style.display = 'block';
    list.innerHTML = '';

    if (analysis.score >= 70) {
        icon.innerText = "🚫";
        title.innerText = "CRITICAL THREAT";
        title.className = "verdict-title verdict-danger";
    } else if (analysis.score >= 20) {
        icon.innerText = "⚠️";
        title.innerText = "SUSPICIOUS";
        title.className = "verdict-title verdict-warn";
    } else {
        icon.innerText = "✅";
        title.innerText = "LIKELY SAFE";
        title.className = "verdict-title verdict-safe";
    }
    score.innerText = `Risk Confidence: ${analysis.score}%`;

    analysis.findings.forEach(f => {
        let iconHtml = '';
        if (f.type === 'safe') iconHtml = '<svg class="icon icon-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        if (f.type === 'warn' || f.type === 'wait') iconHtml = '<svg class="icon icon-alert" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        if (f.type === 'danger') iconHtml = '<svg class="icon icon-ban" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>';

        list.innerHTML += `<li class="detail-item">${iconHtml} <span>${f.msg}</span></li>`;
    });
}

function renderError(msg) {
    const list = document.getElementById('proofList');
    document.getElementById('resultCard').style.display = 'block';
    list.innerHTML = `<li class="detail-item" style="color:red;">✖ ${msg}</li>`;
}

function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
}
