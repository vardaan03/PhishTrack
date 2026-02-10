// 1. Core Scraper Function
function scanContext() {
    // Links
    const links = Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.innerText.trim(),
        href: a.href
    }));

    // DOM Signals (Inputs)
    const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        name: i.name || i.id,
        placeholder: i.placeholder
    }));

    // DOM Signals (Forms)
    const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        method: f.method
    }));

    const bodyText = document.body.innerText.trim();

    return {
        url: window.location.href,
        domain: window.location.hostname,
        links,
        inputs,
        forms,
        text: bodyText,
        contentLength: bodyText.length
    };
}

// 2. Immediate Execution & Reporting
// 2. Immediate Execution & Reporting
try {
    const data = scanContext();
    // Send back to popup (if open)
    chrome.runtime.sendMessage({
        action: "frameResult",
        data: data
    }).catch(() => { }); // Ignore if popup closed

    // --- NEW: AUTO-SCAN WITH AI ---
    // Wait for page to settle slightly
    setTimeout(() => {
        if (data.contentLength > 50) { // Don't scan empty frames
            chrome.runtime.sendMessage({
                action: "scanPage",
                text: data.text,
                title: document.title,
                links: data.links
            }, (response) => {
                if (chrome.runtime.lastError) return; // Background might be sleeping

                if (response && response.verdict === "CRITICAL") {
                    showWarningOverlay(response.risk_score, response.logs);
                } else if (response && response.verdict === "SUSPICIOUS") {
                    // Maybe a smaller toast for suspicious?
                    // showToast("PhishTrack: Suspicious Content Detected");
                }
            });
        }
    }, 1500);

} catch (e) {
    console.log("PhishTrack Scan Error:", e);
}

// 3. Warning Overlay Injection
function showWarningOverlay(score, logs) {
    // Create Shadow DOM to isolate styles
    const host = document.createElement('div');
    host.id = "phishtrack-overlay-host";
    host.style.position = "fixed";
    host.style.top = "0";
    host.style.left = "0";
    host.style.width = "100%";
    host.style.height = "100%";
    host.style.zIndex = "2147483647"; // Max int
    host.style.pointerEvents = "none"; // Let clicks pass through initially? No, we want to block interaction for critical.

    const shadow = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);

    const overlay = document.createElement('div');
    overlay.style = `
        position: absolute;
        bottom: 20px;
        right: 20px;
        width: 400px;
        background: #1a1a1a;
        color: white;
        border: 2px solid #ff4444;
        border-radius: 12px;
        font-family: 'Segoe UI', sans-serif;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        padding: 20px;
        pointer-events: auto;
        animation: slideIn 0.5s ease-out;
    `;

    const reasonsList = logs.slice(0, 3).map(l => `<li style="margin-bottom:5px; font-size:13px; color:#ccc;">${l}</li>`).join('');

    overlay.innerHTML = `
        <style>
            @keyframes slideIn { from { transform: translateX(120%); } to { transform: translateX(0); } }
            button:hover { opacity: 0.9; }
        </style>
        <div style="display:flex; align-items:center; margin-bottom:15px;">
            <div style="background:#ff4444; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-right:15px; font-size:24px;">🚫</div>
            <div>
                <h2 style="margin:0; font-size:18px; color:#ff4444;">CRITICAL THREAT</h2>
                <div style="font-size:12px; color:#888;">AI Confidence: ${score}%</div>
            </div>
        </div>
        <div style="margin-bottom:15px; background:#222; padding:10px; border-radius:8px;">
            <ul style="margin:0; padding-left:20px;">
                ${reasonsList}
            </ul>
        </div>
        <div style="display:flex; gap:10px;">
            <button id="pt-leave" style="flex:1; background:#ff4444; border:none; color:white; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold;">LEAVE SITE</button>
            <button id="pt-ignore" style="flex:1; background:#333; border:1px solid #555; color:#aaa; padding:10px; border-radius:6px; cursor:pointer;">Ignore</button>
        </div>
    `;

    shadow.appendChild(overlay);

    shadow.getElementById('pt-leave').addEventListener('click', () => {
        window.location.href = "about:blank";
    });

    shadow.getElementById('pt-ignore').addEventListener('click', () => {
        host.remove();
    });
}
