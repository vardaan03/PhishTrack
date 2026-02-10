let currentMode = 'url';

function setMode(mode) {
    currentMode = mode;

    // UI Toggles
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active'); // Assumes click event

    if (mode === 'url') {
        document.getElementById('urlSection').classList.remove('hidden');
        document.getElementById('emailSection').classList.add('hidden');
        document.getElementById('sectionTitle').innerText = 'URL Scanner';
    } else {
        document.getElementById('urlSection').classList.add('hidden');
        document.getElementById('emailSection').classList.remove('hidden');
        document.getElementById('sectionTitle').innerText = 'Email Forensics';
    }
}

function loadDemo() {
    setMode('email');
    // Pre-fill with a classic PayPal Phishing Example
    document.getElementById('subjectInput').value = "ACTION REQUIRED: Your account has been limited";
    document.getElementById('headersInput').value = `Authentication-Results: spf=fail (sender IP is 102.10.10.1); dkim=fail
From: "PayPal Service" <support@paypal-security-check.com>
Reply-To: admin@hacker-site.ru`;
    document.getElementById('bodyInput').value = `Dear Customer,

We noticed suspicious activity on your account. To prevent unauthorized access, we have temporarily limited your features.
You must verify your identity immediately or your account will be permanently closed.

Click here to verify: http://paypal-verify-login.udp.jp/signin

Do not ignore this message.
Thank you,
PayPal Security Team`;

    // Simulate Tab switch visually
    document.querySelectorAll('.tab-btn')[0].classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

async function runAnalysis() {
    const btn = document.querySelector('.action-btn');
    btn.innerHTML = 'Scanning...';
    btn.disabled = true;

    // Prep Data
    let payload = {};
    if (currentMode === 'url') {
        payload = {
            headers: "",
            body_text: "URL Scan",
            urls: [document.getElementById('urlInput').value],
            sender: "web-user"
        };
    } else {
        const body = document.getElementById('bodyInput').value;
        const headers = document.getElementById('headersInput').value;

        // rudimentary link extraction
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = body.match(urlRegex) || [];

        payload = {
            headers: headers,
            body_text: body,
            urls: urls,
            sender: "manual-check"
        };
    }

    // Call Backend
    try {
        const res = await fetch('/scan/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        renderResults(data);
    } catch (e) {
        alert("Server Error: Is python main.py running?");
    } finally {
        btn.innerHTML = 'RUN AI ANALYSIS';
        btn.disabled = false;
    }
}

function renderResults(data) {
    document.getElementById('initialState').classList.add('hidden');
    document.getElementById('resultState').classList.remove('hidden');

    // Values
    document.getElementById('scoreVal').innerText = Math.round(data.risk_score);
    document.getElementById('verdictText').innerText = data.verdict;
    document.getElementById('timeVal').innerText = data.latency_ms;

    // Styling
    const circle = document.getElementById('riskCircle');
    const text = document.getElementById('verdictText');

    circle.className = 'risk-circle'; // reset
    if (data.verdict === 'CRITICAL' || data.risk_score > 70) {
        circle.classList.add('danger');
        text.style.color = 'var(--danger)';
    } else if (data.verdict === 'SUSPICIOUS') {
        circle.classList.add('warn');
        text.style.color = '#f59e0b';
    } else {
        circle.classList.add('safe');
        text.style.color = 'var(--success)';
    }

    // Logs
    const logList = document.getElementById('logList');
    logList.innerHTML = '';
    data.logs.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'log-entry';

        let icon = 'ℹ️';
        if (msg.includes('⚠️')) icon = '⚠️';
        if (msg.includes('🚫')) icon = '🚫';

        // Strip icon from msg to avoid double
        const cleanMsg = msg.replace(/^[⚠️🚫✅ℹ️]\s?/, '');

        div.innerHTML = `<div>${icon}</div><div>${cleanMsg}</div>`;
        logList.appendChild(div);
    });
}
