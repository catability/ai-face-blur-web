from ultralytics import YOLO
from model.sort.sort import Sort
from flask import current_app
from app.models import DetectionLog
from app.app import db

import os
import cv2
import numpy as np
import json
import math

model = YOLO("model/yolov11n-face.pt")

def detect_faces(frame_dir, video, job):
    tracker = Sort()

    last_per = 0
    preview_path = os.path.join(current_app.config["PREVIEWS_FOLDER"], f"{job.id}_preview.jpg")

    for idx, filename in enumerate(sorted(os.listdir(frame_dir)), start=1):
        frame_path = os.path.join(frame_dir, filename)

        img = cv2.imread(frame_path)
        results = model(img)

        detections = []
        for box in results[0].boxes.xyxy.cpu().numpy():
            x1, y1, x2, y2 = box[:4]
            conf = box[4] if len(box) > 4 else 0.9
            detections.append([x1, y1, x2, y2, conf])

        tracked_objects = tracker.update(np.array(detections)) if len(detections) else []
        bboxes = []

        for x1, y1, x2, y2, track_id in tracked_objects:
            bboxes.append({
                "x": int(x1), "y": int(y1),
                "w": int(x2-x1), "h": int(y2-y1),
                "id": int(track_id)
            })

        
        log = DetectionLog(
            job_id = job.id,
            frame_idx = idx,
            bboxes = json.dumps(bboxes)
        )
        db.session.add(log)

        
        progress = (idx / video.total_frames) * 100
        current_per = math.floor(progress)

        if current_per > last_per or (idx - 1) % int(video.fps) == 0:
            last_per = current_per
            job.progress = progress
            db.session.commit()
            print(current_per)

            cv2.imwrite(preview_path, img)
    
    db.session.commit()