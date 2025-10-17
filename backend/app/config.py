import os

BASE_DIR = os.path.abspath(os.path.dirname((__file__)))

class Config:
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, "app.db")}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    UPLOADS_FOLDER = os.path.join(BASE_DIR, "..", "uploads")
    FRAMES_FOLDER = os.path.join(BASE_DIR, "..", "frames")
    PROCESSED_FRAMES_FOLDER = os.path.join(BASE_DIR, "..", "processed_frames")
    OUTPUTS_FOLDER = os.path.join(BASE_DIR, "..", "outputs")

    os.makedirs(UPLOADS_FOLDER, exist_ok=True)
    os.makedirs(FRAMES_FOLDER, exist_ok=True)
    os.makedirs(PROCESSED_FRAMES_FOLDER, exist_ok=True)
    os.makedirs(OUTPUTS_FOLDER, exist_ok=True)