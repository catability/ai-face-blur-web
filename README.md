# ai-face-blur-web
AI 활용 얼굴 인식 자동 블러 처리 웹서비스 구현


## 다운로드 및 실행하는 방법

1. 깃허브 내용 다운로드
cmd를 열고 `git clone https://github.com/catability/ai-face-blur-web.git` 입력

그럼 해당 경로에서 ai-face-blur-web 폴더가 생깁니다.

2. 파이썬 가상환경 생성
경로도 크게 상관 없고, 굳이 가상환경 안 만들어도 되는데
그래도 로컬 환경 최대한 영향 없도록 가상환경에 필요 라이브러리 설치하여 진행하겠습니다.

경로 그대로에서 `python -m venv venv` 입력

그럼 venv 폴더 생깁니다.

3. 가상환경 활성화
```
cd venv
cd Scripts
activate
```

그럼 가상환경이 활성화됩니다.

 4. 필요한 라이브러리 다운로드
```
cd ../..
cd ai-face-blur-web
cd backend
pip install -r requirements.txt
```

그럼 필요한 파이썬 라이브러리들이 설치됩니다.

5. 웹 서버 실행
라이브러리 설치가 완료되면 `python main.py` 입력

잠시 기다리면 웹 서버가 실행되며 발생하는 콘솔 출력 확인
웹 브라우저에서 웹 서버 경로(아마 127.0.0.1:5000) 접속
