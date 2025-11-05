# 1. 베이스 이미지
FROM python:3.13-slim

# 2. 작업 디렉토리 설정
WORKDIR /app

RUN apt update && apt install -y libgl1 libglib2.0-0 ffmpeg

# 3. (옵션) pip 업그레이드
RUN pip install --upgrade pip

# 4. 의존성 설치
# requirements.txt 복사
COPY backend/requirements.txt .

# opencv-python을 opencv-python-headless로 대체하여 설치 (GUI 의존성 제거)
# 기존 requirements.txt에 opencv-python이 있다면 이를 제거하고 headless 버전을 설치합니다.
# CPU 전용 PyTorch 선설치 (nvidia 패키지 설치 방지)
RUN pip install --no-cache-dir torch==2.9.0 torchvision==0.24.0 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# 5. 소스 코드 및 샘플 복사
COPY backend/ .
COPY samples/ ./samples/

# 6. 포트 노출
EXPOSE 5000

# 7. 실행 명령어
CMD ["python", "main.py"]




# docker cp my-blur-app:/app/samples .