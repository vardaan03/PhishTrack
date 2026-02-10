import sys
import os

# Mock the pipeline to avoid downloading 500MB model if we just want to test logic flow
# But for real verification we want to see if it loads. 
# We'll try to load it.

try:
    from ai_engine import PhishDetectorAI
    
    print("Initializing AI Engine...")
    ai = PhishDetectorAI()
    
    test_cases = [
        "This is a safe message about your meeting.",
        "URGENT: Your account is suspended. Click here to verify your identity immediately or you will lose access.",
        "Congratulations! You have won a lottery. Claim you prize now."
    ]
    
    print("\n--- Testing Predictions ---")
    for text in test_cases:
        score, logs = ai.predict(text)
        print(f"\nText: {text[:50]}...")
        print(f"Score: {score}")
        for log in logs:
            print(f"Log: {log}")
            
except Exception as e:
    print(f"\nFATAL ERROR: {e}")
    import traceback
    traceback.print_exc()
