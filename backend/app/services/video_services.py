from threading import Thread
from app.models import Video, Job
from app.app import db
from app.utils import extract_frames
from app.services.face_services import detect_faces

import os


def start_process_job(app, job_id):
    thread=Thread(target=extract_and_detect_task, args=(app, job_id))
    thread.start()

def extract_and_detect_task(app, job_id):
    with app.app_context():
        job = Job.query.get(job_id)
        video = Video.query.get(job.video_id)

        job.status = "running"
        db.session.commit()

        video_path = os.path.join(app.config["UPLOADS_FOLDER"], video.filename_stored)
        frame_dir = os.path.join(app.config["FRAMES_FOLDER"], f"job_{job_id}")
        os.makedirs(frame_dir, exist_ok=True)

        try:
            extract_frames(video_path, frame_dir)
            detect_faces(frame_dir, video, job)

            job.status = "completed"
            job.progress = 100.0
            db.session.commit()
        except Exception as e:
            job.status = "failed"
            job.progress = 0.0
            db.session.commit()
            print("Error processing video:", e)