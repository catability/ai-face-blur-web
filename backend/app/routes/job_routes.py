from flask import Blueprint, jsonify, current_app, url_for, send_file
from app.models import Video, Job, DetectionLog, FaceObject
from app.services.video_services import start_export_job_to_video
from app.app import db

import os
import json

job_bp = Blueprint("job", __name__, url_prefix="/jobs")


@job_bp.route("/<int:job_id>/status", methods=["GET"])
def get_job_status(job_id):
    job = Job.query.get(job_id)

    if not job:
        return jsonify({
            "error": "Job not found"
        }), 404
    
    response_data = {
        "job_id": job.id,
        "video_id": job.video_id,
        "status": job.status,
        "progress": job.progress
    }

    if job.status == "running":
        preview_dir = current_app.config["PREVIEWS_FOLDER"]
        preview_filename = f"{job.id}_preview.jpg"

        if os.path.exists(os.path.join(preview_dir, preview_filename)):
            response_data["preview_url"] = url_for("static", filename=f"previews/{preview_filename}")
        else:
            response_data["preview_url"] = None

    return jsonify(response_data)

@job_bp.route("/<int:job_id>/results", methods=["GET"])
def get_job_results(job_id):
    logs = DetectionLog.query.filter_by(job_id=job_id).order_by(DetectionLog.frame_idx).all()
    face_objects = FaceObject.query.filter_by(job_id=job_id).all()

    detection_log = []
    objectIndex = {}

    objects = None

    if face_objects:
        for log in logs:
            detection_log.append(json.loads(log.bboxes))
            
        for obj in face_objects:
            objectIndex[obj.face_id] = {
                "id": obj.face_id,
                "label": obj.label,
                "ranges": json.loads(obj.ranges),
                "meta": json.loads(obj.meta)
            }
        objects = list(objectIndex.values())
    else:
        for idx, log in enumerate(logs, start=0):
            bboxes = json.loads(log.bboxes)
            detection_log.append(bboxes)

            if len(bboxes) > 0:
                for bbox in bboxes:
                    id = bbox.get("id")
                    if id == None:
                        continue
                    if not objectIndex.get(id):
                        objectIndex[id] = {
                            "id": id,
                            "frames": [],
                            "ranges": [],
                            "meta": {
                                "blur": True
                            }
                        }
                    objectIndex[id]["frames"].append(idx)

        for id, obj in objectIndex.items():
            ranges = []
            frames = obj["frames"]
            if not frames:
                continue

            start = frames[0]
            prev = frames[0]

            for i in range(1, len(frames)):
                f = frames[i]
                if f == prev + 1:
                    prev = f
                else:
                    ranges.append({ "start": start, "end": prev })
                    start = f
                    prev = f
            ranges.append({ "start": start, "end": prev})
            obj["ranges"] = ranges

        
        objects_list = list(objectIndex.values())

        for i, obj in enumerate(objects_list, start=1):
            obj["label"] = f"obj-{i}"
            del obj["frames"]

            new_face_obj = FaceObject(
                job_id=job_id,
                face_id=obj["id"],
                label=obj["label"],
                ranges=json.dumps(obj["ranges"]),
                meta=json.dumps(obj["meta"])
            )
            db.session.add(new_face_obj)

        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            pass
        
        objects = objects_list

    return jsonify({
        "detection_log": detection_log,
        "objects": objects
    })

@job_bp.route("/<int:job_id>/export", methods=["POST"])
def export_job_to_video(job_id):
    job = Job.query.get(job_id)

    if not job:
        return jsonify({
            "error": "Job not found"
        }), 404
    
    if job.status != "completed":
        return jsonify({
            "error": "Job is not ready for export"
        }), 400
    
    start_export_job_to_video(job.id)

    return jsonify({
        "job_id": job.id,
        "video_id": job.video_id,
        "status": job.status,
        "progress": job.progress
    })

@job_bp.route("/<int:job_id>/download", methods=["GET"])
def download_job_video(job_id):
    job = Job.query.get(job_id)

    if not job:
        return jsonify({
            "error": "Job not found"
        }), 404
    
    if job.status != "done":
        return jsonify({
            "error" "Job is not done yet"
        }), 400
    
    output_path = os.path.join(current_app.config["OUTPUTS_FOLDER"], f"job_{job_id}.mp4")

    if not os.path.exists(output_path):
        return jsonify({
            "error": "Output file not found"
        }), 404
    
    video = Video.query.get(job.video_id)

    if video:
        filename, ext = os.path.splitext(video.filename_original)
        download_name = f"{filename}_export{ext}"
    else:
        download_name = f"job_{job_id}.mp4"

    return send_file(output_path, as_attachment=True, download_name=download_name)