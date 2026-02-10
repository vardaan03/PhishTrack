from transformers import pipeline
import onnxruntime as ort
import os
import re

class PhishDetectorAI:
    def __init__(self):
        # Use the fast, lightweight DistilBERT that's likely already cached
        # We layer on SMART phishing detection logic on top of sentiment
        print("Loading DistilBERT (Lightweight Mode)...")
        try:
            self.classifier = pipeline("text-classification", model="distilbert-base-uncased-finetuned-sst-2")
            print("AI Engine Loaded Successfully.")
        except Exception as e:
            print(f"Error loading model: {e}")
            self.classifier = None

    def predict(self, text: str):
        if not text or len(text.strip()) < 10:
            return 0.0, ["ℹ️ AI: Data insufficient for inference."]

        text_lower = text.lower()
        logs = []
        
        # ============================================
        # LAYER 1: SEMANTIC PHISHING PATTERN DETECTION
        # These are not just keywords - they are semantic PATTERNS
        # ============================================
        
        phishing_patterns = {
            # Urgency + Account threat
            r'(urgent|immediate|now|asap).{0,30}(account|password|verify|suspend|limit)': 70,
            # Authority impersonation
            r'(security team|support team|administrator|helpdesk)': 40,
            # Prize/Lottery scams
            r'(won|winner|lottery|prize|congratulations).{0,20}(claim|collect|\$|dollar|million)': 80,
            # Credential harvesting
            r'(click here|log ?in|sign ?in).{0,20}(verify|confirm|update).{0,20}(account|password|identity)': 75,
            # Fear tactics
            r'(will be|has been).{0,15}(suspend|terminat|delet|lock|compromis)': 65,
            # Direct scam language
            r'\b(scam|fraud|phishing)\b': 90,
            # Nigerian prince style
            r'(transfer|wire|send).{0,20}(money|funds|\$|usd|dollar)': 50,
        }
        
        pattern_score = 0
        matched_patterns = []
        for pattern, score in phishing_patterns.items():
            if re.search(pattern, text_lower):
                pattern_score = max(pattern_score, score)  # Take highest score
                matched_patterns.append(pattern)
        
        if matched_patterns:
            logs.append(f"⚠️ Pattern: {len(matched_patterns)} suspicious semantic pattern(s) detected.")
        
        # ============================================
        # LAYER 2: NEURAL SENTIMENT ANALYSIS
        # Phishing often has NEGATIVE sentiment (fear/urgency)
        # But scams can also be POSITIVE (lottery/prize)
        # ============================================
        
        ai_score = 0
        if self.classifier:
            result = self.classifier(text[:512])[0]
            label = result['label']
            confidence = result['score']
            
            if label == "NEGATIVE" and confidence > 0.7:
                ai_score = 30
                logs.append(f"⚠️ AI: High urgency/fear tone detected ({round(confidence*100)}%).")
            elif label == "POSITIVE" and confidence > 0.85:
                # Extremely positive can indicate "too good to be true" scams
                if pattern_score > 20:  # Only if patterns already flagged it
                    ai_score = 20
                    logs.append(f"⚠️ AI: 'Too good to be true' tone detected.")
        
        # ============================================
        # LAYER 3: COMBINE SCORES
        # ============================================
        
        final_risk = min(pattern_score + ai_score, 100)
        
        if final_risk >= 70:
            logs.insert(0, "🚫 CRITICAL: High-confidence phishing attempt detected.")
        elif final_risk >= 40:
            logs.insert(0, "⚠️ WARNING: Suspicious content detected.")
        elif final_risk < 20:
            logs.append("✅ AI: Content appears benign.")
        
        return final_risk / 100.0, logs
