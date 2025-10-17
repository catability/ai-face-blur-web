import cv2
import ffmpeg
import os

def get_video_metadata(file_path):
    cap = cv2.VideoCapture(file_path)

    if not cap.isOpened():
        return None, None, None, None, None
    
    fps = cap.get(cv2.CAP_PROP_FPS) or None
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or None
    duration = round((total_frames / fps), 2) if (fps and fps > 0) else None
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or None
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or None

    cap.release()

    return fps, total_frames, duration, width, height

def extract_frames(video_path, output_dir):
    ffmpeg.input(video_path).output(os.path.join(output_dir, "frame_%04d.jpg"), qscale=2).run()