from flask import Blueprint, jsonify, current_app, url_for
from app.models import Job
from app.services.video_services import start_export_job_to_video

import os

job_bp = Blueprint("job", __name__, url_prefix="/jobs")


@job_bp.route("/<int:job_id>", methods=["GET"])
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

@job_bp.route("/<int:job_id>/export", methods=["POST"])
def export_job_to_video(job_id):
    job = Job.query.get(job_id)

    if not job:
        return jsonify({
            "error": "Job not found"
        }), 404
    
    if job.status != "completed":
        return jsonify({
            "error" "Job is not ready for export"
        }), 400
    
    start_export_job_to_video(job.id)

    return jsonify({
        "job_id": job.id,
        "video_id": job.video_id,
        "status": job.status,
        "progress": job.progress
    })