from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app.utils import get_video_metadata
from app.models import Video, Job
from app.app import db
from app.services.video_services import start_process_job

import os
import uuid

video_bp = Blueprint("video", __name__, url_prefix="/videos")


@video_bp.route("/", methods=["POST"])
def upload_video():
    if "file" not in request.files:
        return jsonify({
            "error": "No file uploaded"
        }), 400
    
    file = request.files["file"]

    if file.filename == "":
        return jsonify({
            "error": "Empty filename"
        }), 400
    
    allowed_extensions = { "mp4", "avi", "mov" }
    ext = file.filename.rsplit(".", -1)[-1].lower()

    if ext not in allowed_extensions:
        return jsonify({
            "error": "Unsupported file type"
        }), 400
    
    original_name = secure_filename(file.filename)
    ext = os.path.splitext(original_name)[1]

    unique_name = f"{uuid.uuid4().hex}{ext}"

    save_path = os.path.join(current_app.config["UPLOADS_FOLDER"], unique_name)
    file.save(save_path)

    file_size_byte = os.path.getsize(save_path)
    file_size_mb = file_size_byte / (1024 * 1024)
    
    video_size_mb = round(file_size_mb, 2)
    fps, total_frames, duration, width, height = get_video_metadata(save_path)

    video = Video(
        filename_original=original_name,
        filename_stored=unique_name,
        size_mb=video_size_mb,
        fps=fps,
        total_frames=total_frames,
        duration=duration,
        width=width,
        height=height
    )
    db.session.add(video)
    db.session.commit()

    return jsonify({
        "video_id": video.id,
        "filename_original": video.filename_original,
        "size_mb": video.size_mb,
        "fps": video.fps,
        "total_frames": video.total_frames,
        "duration": video.duration,
        "width": video.width,
        "height": video.height,
        "status": video.status,
        "uploaded_at": video.uploaded_at
    }), 201

@video_bp.route("/<int:video_id>/jobs", methods=["POST"])
def create_job(video_id):
    video = Video.query.get(video_id)

    if not video:
        return jsonify({
            "error": "Video not found"
        }), 404
    
    job = Job(video_id=video_id)
    db.session.add(job)
    db.session.commit()

    start_process_job(current_app._get_current_object(), job.id)

    return jsonify({
        "job_id": job.id,
        "video_id": job.video_id,
        "status": job.status,
        "progress": job.progress
    })