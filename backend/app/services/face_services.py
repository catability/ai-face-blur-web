from ultralytics import YOLO
from model.sort.sort import Sort
from flask import current_app
from app.models import DetectionLog, FaceObject
from app.app import db

import os
import cv2
import numpy as np
import json
import math

# model = YOLO("model/yolov11n-face.pt")
model = YOLO("model/yolov11n-face_openvino_model")

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
            job.progress = current_per
            db.session.commit()

            cv2.imwrite(preview_path, img)
    
    db.session.commit()

def blur_faces(frames_dir, processed_frames_dir, video, job):
    logs = DetectionLog.query.filter_by(job_id=job.id).order_by(DetectionLog.frame_idx).all()
    face_objects = FaceObject.query.filter_by(job_id=job.id).all()
    obj_map = { obj.face_id: obj for obj in face_objects}

    last_per = 0

    for idx, log in enumerate(logs, start=1):
        frame_file = f"frame_{log.frame_idx:04d}.jpg"
        input_path = os.path.join(frames_dir, frame_file)
        output_path = os.path.join(processed_frames_dir, frame_file)

        img = cv2.imread(input_path)

        if img is None:
            continue

        try:
            bboxes = json.loads(log.bboxes)
        except:
            bboxes = []

        for bbox in bboxes:
            x, y, w, h, track_id = bbox["x"], bbox["y"], bbox["w"], bbox["h"], bbox["id"]

            should_blur = False

            obj = obj_map.get(track_id)
            if obj:
                meta = json.loads(obj.meta)
                if meta["blur"]:
                    ranges = json.loads(obj.ranges)
                    for _range in ranges:
                        if _range.get("start") <= idx <= _range.get("end"):
                            should_blur = True
                            break
            else:
                should_blur = True

            if should_blur:
                face_region = img[y:y+h, x:x+w]
                if face_region.size > 0:
                    blurred = cv2.GaussianBlur(face_region, (51, 51), 30)
                    img[y:y+h, x:x+w] = blurred
        
        cv2.imwrite(output_path, img)


        progress = (idx / video.total_frames) * 100
        current_per = math.floor(progress)

        if current_per > last_per:
            last_per = current_per
            job.progress = current_per
            db.session.commit()