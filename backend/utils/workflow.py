import os
import time
from .weather import get_current_weather
from .verification import FireVerifier

# Get base directory
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

verifier = FireVerifier()

def run_fire_verification_workflow(lat, lon, simulate=False):
    """
    Orchestrates the fire verification workflow:
    1. Satellite/Input (Simulated start)
    2. Check Weather/Environmental Data
    3. Trigger Webcam Verification (Edge AI)
    4. Generate Alert Result
    """
    results = {
        "steps": [],
        "final_verdict": "UNCERTAIN",
        "alert_generated": False,
        "timestamp": None,
        "lat": lat,
        "lon": lon
    }
    
    # Step 1: Environmental Check
    weather = get_current_weather(lat, lon)
    if weather:
        results["steps"].append({
            "name": "Environmental Analysis",
            "status": "COMPLETED",
            "data": weather
        })
        
        # Simple risk heuristic
        if weather['temp'] > 30 and weather['humidity'] < 40:
             results["steps"][-1]["risk_assessment"] = "HIGH"
        else:
             results["steps"][-1]["risk_assessment"] = "MODERATE"
    else:
        results["steps"].append({
            "name": "Environmental Analysis",
            "status": "FAILED",
            "error": "Could not fetch weather data"
        })

    # Step 2: Verification (Drone/Webcam)
    if simulate:
        # FAKE POSITIVE for Testing - Use existing test image
        is_fire = True
        confidence = 0.98
        details = {
            "total_frames": 50,
            "fire_frames": 20,
            "max_confidence": 0.98,
            "detections": ["fire (0.98)", "smoke (0.85)"],
            "proof_image": "/assets/fire_test.jpg"
        }
    else:
        # Review: In a real scenario, this might trigger a drone. Here we use the local webcam.
        is_fire, confidence, details = verifier.verify_with_webcam(duration=5)
    
    results["steps"].append({
        "name": "Visual Verification (Edge AI)",
        "status": "COMPLETED",
        "is_fire_confirmed": is_fire,
        "confidence": confidence,
        "details": details
    })

    # Step 3: Final Decision
    if is_fire:
        results["final_verdict"] = "FIRE CONFIRMED"
        results["alert_generated"] = True
        results["alert_message"] = f"CRITICAL: Fire detected with {confidence:.2f} confidence at location {lat}, {lon}."
    else:
        results["final_verdict"] = "NO FIRE DETECTED"
        results["alert_generated"] = False

    return results
