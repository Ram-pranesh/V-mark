import os
import cv2
import time
import numpy as np
from ultralytics import YOLO
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH_FIRE = os.path.join(BASE_DIR, os.environ.get("MODEL_PATH_FIRE", "models/fire and person.pt"))
MODEL_PATH_AERIAL = os.path.join(BASE_DIR, os.environ.get("MODEL_PATH_AERIAL", "models/aerial_images.pt"))

class FireVerifier:
    def __init__(self):
        self.model_fire = None
        self.model_aerial = None
        self._load_models()

    def _load_models(self):
        print(f"Loading Fire model from: {MODEL_PATH_FIRE}")
        if os.path.exists(MODEL_PATH_FIRE):
            self.model_fire = YOLO(MODEL_PATH_FIRE)
        else:
            print("Fire model not found!")

        print(f"Loading Aerial model from: {MODEL_PATH_AERIAL}")
        if os.path.exists(MODEL_PATH_AERIAL):
            self.model_aerial = YOLO(MODEL_PATH_AERIAL)
        else:
            print("Aerial model not found!")

    def verify_with_webcam(self, duration=5, source=0):
        """
        Captures video from webcam for `duration` seconds.
        Runs detection on frames.
        Returns: (is_fire_confirmed, confidence, details)
        """
        if not self.model_fire and not self.model_aerial:
            return False, 0.0, "Models not loaded"

        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            # Try index 1 if 0 fails (sometimes external cams are 1)
            cap = cv2.VideoCapture(1)
            if not cap.isOpened():
                return False, 0.0, "Could not open webcam"

        start_time = time.time()
        max_conf = 0.0
        max_conf_frame = None
        detections = []
        fire_detected_count = 0
        total_frames = 0

        print(f"Starting webcam verification for {duration} seconds...")

        while (time.time() - start_time) < duration:
            ret, frame = cap.read()
            if not ret:
                break
            
            total_frames += 1
            
            # Run inference (using Fire model primarily for ground verification)
            # You can switch to aerial if simulating drone, but for webcam user likely uses 'fire' model views
            results = []
            if self.model_fire:
                results = self.model_fire(frame, verbose=False, conf=0.4)
            
            frame_has_fire = False
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    cls_name = self.model_fire.names[cls_id].lower()
                    
                    if 'fire' in cls_name:
                        frame_has_fire = True
                        if conf > max_conf:
                            max_conf = conf
                            max_conf_frame = frame.copy()
                        detections.append(f"{cls_name} ({conf:.2f})")

            if frame_has_fire:
                fire_detected_count += 1
            
            # Optional: Show feedback window (for demo purposes)
            # cv2.imshow("Verification", frame)
            # cv2.waitKey(1)

        cap.release()
        cv2.destroyAllWindows()


        # Logic for confirmation: e.g., Fire seen in > 10% of frames
        is_confirmed = (fire_detected_count > 0)
        
        # Save proof image if confirmed
        proof_image_path = ""
        if is_confirmed and max_conf_frame is not None:
             # Ensure directory exists
             captures_dir = os.path.join(BASE_DIR, "frontend", "assets", "captures")
             os.makedirs(captures_dir, exist_ok=True)
             
             timestamp = int(time.time())
             filename = f"fire_proof_{timestamp}.jpg"
             filepath = os.path.join(captures_dir, filename)
             cv2.imwrite(filepath, max_conf_frame)
             proof_image_path = f"/assets/captures/{filename}"
        
        details = {
            "total_frames": total_frames,
            "fire_frames": fire_detected_count,
            "max_confidence": max_conf,
            "detections": list(set(detections)),
            "proof_image": proof_image_path
        }

        return is_confirmed, max_conf, details
