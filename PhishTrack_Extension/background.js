// Background Service Worker for PhishTrack
// Handles communication between Content Script and Python AI Server

const API_ENDPOINT = "http://127.0.0.1:8000/scan/email";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanPage") {
        console.log("Analyzing page content via AI...");

        // Prepare data for the API
        const payload = {
            headers: `Page Title: ${request.title}`,
            body_text: request.text,
            urls: request.links ? request.links.map(l => l.href) : [],
            sender: "Web-Page-Scan"
        };

        fetch(API_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(data => {
                console.log("AI Verdict:", data);
                sendResponse(data);
            })
            .catch(error => {
                console.error("AI Analysis Failed:", error);
                sendResponse({ error: true, message: error.message });
            });

        return true; // Indicates we will respond asynchronously
    }
});
