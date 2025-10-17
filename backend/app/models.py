from app.app import db
from datetime import datetime

class Video(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    filename_original = db.Column(db.String(255), nullable=False)
    filename_stored = db.Column(db.String(255), nullable=False)
    
    size_mb = db.Column(db.Float, nullable=False)
    fps = db.Column(db.Float, nullable=False)
    total_frames = db.Column(db.Integer, nullable=False)
    width = db.Column(db.Integer, nullable=False)
    height = db.Column(db.Integer, nullable=False)
    
    status = db.Column(db.String(50), default="uploaded")
    uploaded_at = db.column(db.DateTime, default = datetime.utcnow)

class Job(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey("video.id"), nullable=False)

    status = db.Column(db.String(50), default="pending")
    progress = db.Column(db.Float, default=0.0)