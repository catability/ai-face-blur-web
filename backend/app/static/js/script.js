/*
 * AI 얼굴 인식 자동 블러 웹서비스
 * 프론트엔드 JavaScript 로직
 */

// DOM이 완전히 로드된 후에 스크립트를 실행합니다.
document.addEventListener('DOMContentLoaded', () => {

    // ==========================
    // 1. DOM 요소 선택
    // ==========================

    // 왼쪽 패널
    const videoDropArea = document.getElementById('video-drop-area');
    const fileInput = document.getElementById('file-input');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const dropAreaText = videoDropArea.querySelector('p');
    const uploadButton = document.getElementById('upload-button');
    
    // 메타데이터
    const metadataArea = document.getElementById('metadata-area');
    const metaFps = document.getElementById('meta-fps');
    const metaDuration = document.getElementById('meta-duration');
    const metaSize = document.getElementById('meta-size');

    // 상태/진행
    const statusArea = document.getElementById('status-area');
    const statusMessage = document.getElementById('status-message');
    const progressBar = document.getElementById('progress-bar');
    
    // 컨트롤 버튼
    const saveButton = document.getElementById('save-button');
    const exportButton = document.getElementById('export-button');
    const downloadButton = document.getElementById('download-button');
    
    // 중앙 패널
    const mainVideo = document.getElementById('main-video');
    const mainTimelineSeek = document.getElementById('main-timeline-seek');
    const playbackControls = document.getElementById('playback-controls');
    const rewindButton = document.getElementById('rewind-button');
    const playPauseButton = document.getElementById('play-pause-button');
    const forwardButton = document.getElementById('forward-button');
    const objectTimelineEditor = document.getElementById('object-timeline-editor');

    const mainCanvas = document.getElementById('main-canvas')
    const ctx = mainCanvas.getContext('2d')

    const CANVAS_WIDTH = 1280;
    const CANVAS_HEIGHT = 720;
    mainCanvas.width = CANVAS_WIDTH;
    mainCanvas.height = CANVAS_HEIGHT;
    
    // 오른쪽 패널
    const objectList = document.getElementById('detected-object-list');
    const detailsPlaceholder = document.getElementById('details-placeholder');
    const detailsContent = document.getElementById('details-content');
    const detailIdInput = document.getElementById('detail-id');
    const detailBlurCheckbox = document.getElementById('detail-blur');
    const detailTimestamps = document.getElementById('detail-timestamps');
    const detailRanges = document.getElementById('detail-ranges')

    // ==========================
    // 2. 상태 변수
    // ==========================
    let selectedFile = null;         // 사용자가 선택한 비디오 파일 객체
    let detectedObjects = [];        // 서버에서 받은 탐지 객체 데이터
    let selectedObjectID = null;     // 사용자가 리스트에서 선택한 객체 ID
    let finalDownloadUrl = null;     // Export 완료 후 받을 다운로드 URL

    let isPlaying = false;

    let videoFPS = 30
    let videoTotalFrames = 0
    let allDetectionData = []
    let baseFrameImage = new Image()
    let videoDrawParams = {}

    let isResizing = false
    let currentDragTarget = {
        barElement: null,
        rangeObject: null,
        handleType: null
    }

    // ==========================
    // 3. 헬퍼(Helper) 함수
    // ==========================

    /**
     * 상태 메시지 및 프로그레스 바를 업데이트합니다.
     * @param {string} message - 표시할 메시지
     * @param {'info' | 'error' | 'success'} type - 메시지 타입 (CSS 클래스에 사용)
     * @param {boolean} showProgress - 프로그레스 바 표시 여부
     * @param {number | null} progressValue - 프로그레스 값 (null이면 0)
     */
    function updateStatus(message, type = 'info', showProgress = false, progressValue = null) {
        statusArea.classList.remove('hidden');
        
        // CSS에서 .status-info, .status-error, .status-success 등을 정의하여 사용
        statusMessage.className = `status-${type}`;
        statusMessage.textContent = message;

        if (showProgress) {
            progressBar.classList.remove('hidden');
            progressBar.value = progressValue || 0;
            if (progressValue === null) {
                // 값이 null이면 '진행 중' 상태 (indeterminate)
                progressBar.removeAttribute('value');
            }
        } else {
            progressBar.classList.add('hidden');
        }
    }

    /**
     * 초(seconds)를 HH:MM:SS 형식의 문자열로 변환합니다.
     * @param {number} seconds - 총 초
     */
    function formatTime(seconds) {
        return new Date(seconds * 1000).toISOString().substr(11, 8);
    }

    /**
     * 바이트(bytes)를 MB 또는 KB 형식의 문자열로 변환합니다.
     * @param {number} bytes - 총 바이트
     */
    function formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    // ==========================
    // 4. 핵심 기능 함수
    // ==========================

    /**
     * 사용자가 파일을 선택(드롭 또는 클릭)했을 때 호출됩니다.
     * @param {File} file - 선택된 파일 객체
     */
    function handleFileSelect(file) {
        if (!file.type.startsWith('video/')) {
            updateStatus('비디오 파일만 업로드할 수 있습니다. (예: .mp4, .mov)', 'error');
            return;
        }

        selectedFile = file;
        const fileURL = URL.createObjectURL(file)

        mainVideo.src = fileURL

        mainVideo.addEventListener('seeked', () => {
            const canvas = document.createElement('canvas')

            canvas.width = mainVideo.videoWidth
            canvas.height = mainVideo.videoHeight

            const ctx = canvas.getContext("2d")
            ctx.drawImage(mainVideo, 0, 0, canvas.width, canvas.height)
            
            const dataURL = canvas.toDataURL('image/jpeg')

            videoThumbnail.src = dataURL

            videoThumbnail.classList.remove('hidden')
            dropAreaText.classList.add('hidden')
        }, { once: true})

        mainVideo.addEventListener('loadeddata', () => {
            mainVideo.currentTime = 0.0
        }, { once: true})
        
        // 3. 업로드 버튼 활성화
        uploadButton.disabled = false;
        
        // 4. 상태 메시지 업데이트
        updateStatus(`'${file.name}' 파일이 선택되었습니다. '영상 업로드' 버튼을 눌러주세요.`, 'info');
    }

    /**
     * '영상 업로드' 버튼 클릭 시 실행됩니다.
     */
    async function handleUpload() {
        if (!selectedFile) return;

        uploadButton.disabled = true;
        updateStatus('영상을 업로드하고 분석을 시작합니다...', 'info', true, null); // indeterminate progress

        const formData = new FormData();
        formData.append('file', selectedFile);

        // --- API 연동 (MOCKUP) ---
        // TODO: '/api/upload'를 실제 Flask API 엔드포인트로 변경하세요.
        try {
            const response = await fetch('/videos/', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => null)
                throw new Error(errorData?.error || `서버 오류: ${response.status}`)
            }
            
            const uploadResult = await response.json()
            
            console.log('Upload Result:', uploadResult)

            updateStatus('업로드 완료. 영상 분석을 시작합니다...', 'info', true, null)
                        
            // 메타데이터 표시
            metadataArea.classList.remove('hidden');
            metaFps.textContent = uploadResult.fps;
            metaDuration.textContent = formatTime(uploadResult.duration);
            metaSize.textContent = `${uploadResult.size_mb.toFixed(2)} MB`

            videoFPS = uploadResult.fps
            videoTotalFrames = uploadResult.total_frames

            await handleProcessVideo(uploadResult.video_id)

        } catch (error) {
            console.error('Upload failed:', error);
            updateStatus(`업로드 실패: ${error.message}`, 'error');
            uploadButton.disabled = false;
        }
    }

    /**
     * 
     * @param {string} video_id 
     */
    async function handleProcessVideo(video_id) {
        updateStatus('영상 분석 작업을 요청합니다...', 'info', true, 0)

        try {
            const processResponse = await fetch(`/videos/${video_id}/jobs`, {
                method: 'POST'
            })

            if (!processResponse.ok) {
                const errData = await processResponse.json().catch(() => null)
                throw new Error(errData?.error || '작업 시작 요청 실패')
            }

            const job = await processResponse.json()

            if (!job.job_id) {
                throw new Error('서버에서 job_id를 받지 못했습니다.')
            }

            updateStatus(`작업(ID: ${job.job_id})이 시작되었습니다. 상태 확인 중...`, 'info', true, job.progress || 0)

            const statusUrl = `/jobs/${job.job_id}/status`
            await pollForJobStatus(statusUrl)

            console.log("처리는 끝!!")
            
            const resultUrl = `/jobs/${job.job_id}/results`
            const resultResponse = await fetch(resultUrl)

            if (!resultResponse.ok) {
                throw new Error('최종 결과 데이터 요청 실패')
            }

            const analysisResult = await resultResponse.json()

            allDetectionData = analysisResult.detection_log
            detectedObjects = analysisResult.objects

            populateObjectList(detectedObjects)
            updateStatus('분석 완료! 편집 모드가 활성화되었습니다.', 'success')
            progressBar.classList.add('hidden')

            initializeEditor()

        } catch (error) {
            console.error('Analysis failed:', error)
            throw new Error(`영상 분석 실패: ${error.message}`)
        }

        saveButton.disabled = false
        exportButton.disabled = false
    }
    
    async function pollForJobStatus(statusUrl) {
        const POLLING_INTERVAL = 1000

        while (true) {
            await sleep(POLLING_INTERVAL)

            let statusResponse

            try {
                statusResponse = await fetch(statusUrl)

                if (!statusResponse.ok) {
                    throw new Error(`상태 확인 실패 (HTTP ${statusResponse.status})`)
                }

                const data = await statusResponse.json()

                if (data.status === 'completed') {
                    updateStatus('작업 완료. 결과 데이터를 가져옵니다...', 'success', true, 100)
                    return true
                } else if (data.status === 'failed') {
                    throw new Error(data.error_message || '서버에서 작업이 실패했습니다.')
                } else if (data.status === 'running' || data.status === 'rendering') {
                    const progress = data.progress || 0
                    updateStatus(`작업 진행 중... (${progress}%)`, 'info', true, progress)

                    if (data.preview_url) {
                        drawPreviewFrame(data.preview_url)
                    }
                } else {
                    throw new Error(`알 수 없는 작업 상태: ${data.status}`)
                }
            } catch (error) {
                throw new Error(`상태 확인 중 오류: ${error.message}`)
            }
        }
    }

    /**
     * [신규] 헬퍼: 현재 프레임이 객체의 ranges 배열 중 하나에 포함되는지 확인
     * @param {number} frameIndex - 현재 비디오 프레임 인덱스
     * @param {Array<Object>} ranges - [{start, end}, {start, end}, ...]
     */
    function isFrameInRange(frameIndex, ranges) {
        if (!ranges) return false;
        
        // ranges 배열의 [start, end] 구간 중 하나라도 
        // 현재 frameIndex를 포함하면 true를 반환합니다.
        return ranges.some(range => frameIndex >= range.start && frameIndex <= range.end);
    }

    /**
     * [수정] 헬퍼: bboxes를 그리되, 'ranges'를 확인하여 블러 처리를 수행합니다.
     * @param {Array<Object>} bboxes
     * @param {Object} drawParams
     * @param {number} currentFrameIndex - [신규] 현재 프레임 인덱스
     */
    function drawBoundingBoxes(bboxes, drawParams, currentFrameIndex) {
        if (!bboxes || bboxes.length === 0) return; // 데이터 없으면 반환

        // 캔버스 렌더링 좌표
        const { scale, offsetX, offsetY } = drawParams;

        bboxes.forEach(bbox => {
            // [핵심] 원본 bbox 좌표를 캔버스 좌표로 스케일링 및 오프셋 적용
            const canvasX = (bbox.x * scale) + offsetX;
            const canvasY = (bbox.y * scale) + offsetY;
            const canvasW = bbox.w * scale;
            const canvasH = bbox.h * scale;
            
            const obj = detectedObjects.find(o => o.id === bbox.id);

            const shouldBlur = obj && obj.meta.blur && isFrameInRange(currentFrameIndex, obj.ranges)

            if (shouldBlur) {
                ctx.save();
                ctx.filter = 'blur(8px)';
                ctx.drawImage(
                mainVideo,      // 원본 이미지
                    bbox.x, bbox.y, bbox.w, bbox.h,  // [소스] 원본 영상의 좌표
                    canvasX, canvasY, canvasW, canvasH  // [타겟] 캔버스의 스케일링된 좌표
                );
                ctx.restore();
            }

            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.font = '16px Arial';
            ctx.fillStyle = 'red';
            // 스케일링된 좌표로 사각형과 텍스트를 그립니다.
            ctx.strokeRect(canvasX, canvasY, canvasW, canvasH);
            ctx.fillText(`ID: ${obj ? (obj.label || obj.id) : bbox.id}`, canvasX, canvasY - 5);
        });
    }

    /**
     * [수정] 모드 1: '실시간 미리보기' 프레임을 고정 캔버스에 'contain' 스케일링하여 그립니다.
     * @param {string} url - 서버가 제공한 preview_url
     */
    function drawPreviewFrame(url) {
        baseFrameImage.onload = () => {
            const imgWidth = baseFrameImage.width;
            const imgHeight = baseFrameImage.height;

            // [핵심] 'contain' 스케일 및 중앙 정렬 좌표 계산
            const scale = Math.min(CANVAS_WIDTH / imgWidth, CANVAS_HEIGHT / imgHeight);
            const newWidth = imgWidth * scale;
            const newHeight = imgHeight * scale;
            const offsetX = (CANVAS_WIDTH - newWidth) / 2;
            const offsetY = (CANVAS_HEIGHT - newHeight) / 2;

            // 1. 검은색 배경으로 캔버스 클리어 (레터박스 효과)
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // 2. 스케일링된 이미지 그리기
            ctx.drawImage(baseFrameImage, offsetX, offsetY, newWidth, newHeight);
            
            // 3. (요구사항) bboxes는 그리지 않습니다.
        };
        baseFrameImage.src = url + '?t=' + new Date().getTime()
    }

    /**
     * [수정] 모드 2: '대화형 편집' 모드에서 현재 프레임과 bbox를 'contain' 스케일링하여 그립니다.
     */
    function drawCurrentFrameWithBboxes() {
        // 1. 검은색 배경으로 캔버스 클리어
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 2. [수정] 전역 변수 'videoDrawParams'를 사용하여 스케일링된 비디오 프레임 그리기
        const { offsetX, offsetY, newWidth, newHeight } = videoDrawParams;
        ctx.drawImage(mainVideo, offsetX, offsetY, newWidth, newHeight);

        // 3. [수정] 현재 프레임 인덱스 계산 (0부터 시작)
        const currentTime = mainVideo.currentTime;
        const currentFrameIndex = Math.round(currentTime * videoFPS);

        // 4. [수정] allDetectionData[index]가 bboxes 배열 자체임
        //    (예: allDetectionData[0] -> 1번 프레임의 bboxes)
        const bboxes = allDetectionData[currentFrameIndex]

        // 5. bbox 데이터가 있으면, 스케일링 파라미터와 함께 그리기
        if (bboxes) {
            drawBoundingBoxes(JSON.parse(bboxes), videoDrawParams, currentFrameIndex);
        }
    }

    /**
     * [수정] 모드 2: '대화형 편집' 모드를 초기화하고, 'videoDrawParams'를 계산합니다.
     */
    function initializeEditor() {
        // [핵심] 편집 모드 시작 시, 비디오의 렌더링 좌표를 *한 번만* 계산하여
        // 전역 변수 'videoDrawParams'에 저장합니다.
        const vidWidth = mainVideo.videoWidth;
        const vidHeight = mainVideo.videoHeight;
        
        const scale = Math.min(CANVAS_WIDTH / vidWidth, CANVAS_HEIGHT / vidHeight);
        const newWidth = vidWidth * scale;
        const newHeight = vidHeight * scale;
        const offsetX = (CANVAS_WIDTH - newWidth) / 2;
        const offsetY = (CANVAS_HEIGHT - newHeight) / 2;

        videoDrawParams = { scale, offsetX, offsetY, newWidth, newHeight };

        // 타임라인 활성화 및 설정
        mainTimelineSeek.disabled = false;
        mainTimelineSeek.max = mainVideo.duration; 
        mainTimelineSeek.value = 0;
        playbackControls.classList.remove('hidden');

        // 이벤트 리스너 연결
        mainTimelineSeek.addEventListener('input', () => {
            if (isPlaying) {
                isPlaying = false;
                mainVideo.pause();
                playPauseButton.textContent = '▶';
            }
            mainVideo.currentTime = mainTimelineSeek.value;
        });

        // [수정] 비디오 탐색 완료 시, 수정된 그리기 함수 호출
        mainVideo.addEventListener('seeked', () => {
            if (!isPlaying) {
                drawCurrentFrameWithBboxes();
            }
        });
        
        mainVideo.addEventListener('timeupdate', () => {
            mainTimelineSeek.value = mainVideo.currentTime;
        });

        // 첫 번째 프레임(0.1초)을 그리도록 강제 실행
        mainVideo.currentTime = 0.0;

        playPauseButton.addEventListener('click', () => {
            isPlaying = !isPlaying; // 재생 상태를 토글합니다.

            if (isPlaying) {
                mainVideo.play(); // 비디오 재생 시작
                playPauseButton.textContent = '❚❚'; // 아이콘을 '일시정지'로 변경
                requestAnimationFrame(playbackLoop); // 애니메이션 루프 시작
            } else {
                mainVideo.pause(); // 비디오 일시정지
                playPauseButton.textContent = '▶'; // 아이콘을 '재생'으로 변경
            }
        });

        rewindButton.addEventListener('click', () => {
            const seekAmount = mainVideo.duration * 0.1;
            mainVideo.currentTime = Math.max(0, mainVideo.currentTime - seekAmount);
        });
        
        // 앞으로 가기 버튼 (10%)
        forwardButton.addEventListener('click', () => {
            const seekAmount = mainVideo.duration * 0.1;
            mainVideo.currentTime = Math.min(mainVideo.duration, mainVideo.currentTime + seekAmount);
        });
    }

    /**
     * 서버에서 받은 객체 리스트를 오른쪽 패널에 채웁니다.
     * @param {Array<Object>} objects - 탐지된 객체 데이터 배열
     */
    function populateObjectList(objects) {
        objectList.innerHTML = ''; // 기존 리스트 초기화

        if (objects.length === 0) {
            objectList.innerHTML = '<li><p>탐지된 얼굴 객체가 없습니다.</p></li>';
            return;
        }

        objects.forEach((obj, index) => {
            const li = document.createElement('li');
            li.className = 'object-item';
            li.dataset.id = obj.id; // data-id 속성에 객체 ID 저장

            // 썸네일 이미지
            // const img = document.createElement('img');
            // img.src = obj.thumbnailUrl; // TODO: 실제 썸네일 URL 필드명으로 변경
            // img.alt = '탐지된 얼굴 썸네일';

            // [신규] 2. 텍스트 정보 (이름 + 블러 상태)
            const textContainer = document.createElement('div');
            textContainer.className = 'object-item-info';

            // [신규] 2-1. 객체 이름 (Label)
            const labelSpan = document.createElement('span');
            labelSpan.className = 'object-label';
            // 서버에 저장된 label이 있으면 사용, 없으면 'obj-[인덱스+1]'로 기본값\
            labelSpan.textContent = obj.label || `obj-${index + 1}`; 
            
            // [신규] 2-2. 블러 상태
            const blurSpan = document.createElement('span');
            blurSpan.className = 'object-blur-status';
            blurSpan.textContent = obj.meta.blur ? '🚫 블러됨' : '👁️ 표시됨';

            // li.appendChild(img);
            textContainer.appendChild(labelSpan);
            textContainer.appendChild(blurSpan);
            li.appendChild(textContainer);

            // 리스트 아이템 클릭 이벤트
            li.addEventListener('click', () => handleObjectSelect(obj.id));
            
            objectList.appendChild(li);
        });
    }

    function updateDetailRanges(selectedObj) {
        detailRanges.innerHTML = ''
        
        if (!selectedObj.ranges || selectedObj.ranges.length === 0) {
            detailTimestamps.innerHTML = '<p>등장 구간 정보 없음</p>';
            return;
        }

        selectedObj.ranges.forEach(range => {
            const p = document.createElement('p');
            p.textContent = `프레임: ${range.start} ~ ${range.end}`;
            detailRanges.appendChild(p);
        });
    }

    /**
     * 오른쪽 패널에서 특정 객체를 클릭했을 때 실행됩니다.
     * @param {string} id - 선택된 객체의 ID
     */
    function handleObjectSelect(id) {
        selectedObjectID = id;
        const selectedObj = detectedObjects.find(obj => obj.id === id);

        if (!selectedObj) return;

        // 1. 리스트에서 'active' 클래스 관리
        document.querySelectorAll('.object-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === id);
        });

        // 2. 상세 정보 패널 업데이트
        detailsPlaceholder.classList.add('hidden');
        detailsContent.classList.remove('hidden');

        detailIdInput.value = selectedObj.label;
        detailBlurCheckbox.checked = selectedObj.meta.blur;

        // 3. 상세 타임스탬프 정보 표시
        // detailTimestamps.innerHTML = '';
        // selectedObj.timestamps.forEach(ts => {
        //     const p = document.createElement('p');
        //     p.textContent = `${formatTime(ts.start)} - ${formatTime(ts.end)}`;
        //     detailTimestamps.appendChild(p);
        // });

        updateDetailRanges(selectedObj)

        renderObjectTimeline(selectedObj)
    }

    /**
     * [신규] 2단계: 선택된 객체의 타임라인 에디터에 범위 막대를 그립니다.
     * @param {Object} selectedObj - 현재 선택된 객체
     */
    function renderObjectTimeline(selectedObj) {
        // 1. 트랙 초기화 (기존 placeholder 텍스트 등을 지웁니다)
        objectTimelineEditor.innerHTML = ''; 

        // 2. 유효성 검사
        if (videoTotalFrames === 0) {
            objectTimelineEditor.innerHTML = '<p>전체 프레임 정보를 로드할 수 없습니다.</p>';
            return;
        }
        if (!selectedObj.ranges || selectedObj.ranges.length === 0) {
            objectTimelineEditor.innerHTML = '<p>선택된 객체의 등장 구간 정보가 없습니다.</p>';
            return;
        }

        // 3. ranges 배열을 순회하며 막대 생성
        selectedObj.ranges.forEach((range, index) => {
            
            // 4. 위치(left) 및 크기(width) 계산 (프레임 인덱스 기준)
            // (range.start / videoTotalFrames) * 100
            const startPercent = (range.start / videoTotalFrames) * 100;
            const widthPercent = ((range.end - range.start) / videoTotalFrames) * 100;
            
            // 5. 막대(div) 생성
            const bar = document.createElement('div');
            bar.className = 'timeline-range-bar';
            
            // 6. 계산된 스타일 적용
            bar.style.left = `${startPercent}%`;
            bar.style.width = `${widthPercent}%`;
            
            // [3단계를 위한 준비] 
            // 이 DOM 요소가 data 배열의 몇 번째 range를 참조하는지 저장
            bar.dataset.rangeIndex = index;

            const leftHandle = document.createElement('div');
            leftHandle.className = 'timeline-range-handle left';

            const rightHandle = document.createElement('div');
            rightHandle.className = 'timeline-range-handle right';
            
            bar.appendChild(leftHandle);
            bar.appendChild(rightHandle);

            // 7. 트랙에 막대 추가
            objectTimelineEditor.appendChild(bar);

            initDragEvents(bar, range);
        });
    }

    /**
     * [신규] 비디오 재생 중에 캔버스를 지속적으로 다시 그리는 애니메이션 루프
     */
    function playbackLoop() {
        if (!isPlaying) {
            return; // isPlaying이 false가 되면 루프 중단
        }
        // 현재 비디오 프레임과 bbox를 캔버스에 그립니다.
        drawCurrentFrameWithBboxes();
        // 브라우저의 다음 프레임에 맞춰 이 함수를 다시 호출합니다.
        requestAnimationFrame(playbackLoop);
    }

    /**
     * 객체 상세 정보(ID, 블러 여부)가 변경될 때 호출됩니다.
     */
    function handleDetailsChange() {
        if (!selectedObjectID) return;

        const selectedObj = detectedObjects.find(obj => obj.id === selectedObjectID);
        if (selectedObj) {
            selectedObj.label = detailIdInput.value;
            selectedObj.meta.blur = detailBlurCheckbox.checked;

            // 리스트의 레이블도 함께 업데이트
            const listItem = objectList.querySelector(`.object-item[data-id="${selectedObjectID}"]`);
            if (listItem) {
                // listItem.textContent = selectedObj.label;
                const labelSpan = listItem.querySelector('.object-label');
                if (labelSpan) {
                    labelSpan.textContent = selectedObj.label;
                }
                // 2-2. 블러 상태 텍스트 업데이트
                const blurSpan = listItem.querySelector('.object-blur-status');
                if (blurSpan) {
                    blurSpan.textContent = selectedObj.meta.blur ? '🚫 블러됨' : '👁️ 표시됨';
                }
            }
        }
    }

    /**
     * [신규] 3단계 (헬퍼): 막대에 드래그 이벤트를 초기화합니다.
     */
    function initDragEvents(barElement, rangeObject) {
        // 핸들 DOM 요소를 선택합니다.
        const leftHandle = barElement.querySelector('.timeline-range-handle.left');
        const rightHandle = barElement.querySelector('.timeline-range-handle.right');

        // 각 핸들에 mousedown 이벤트를 바인딩합니다.
        leftHandle.addEventListener('mousedown', (e) => onBarMouseDown(e, barElement, rangeObject, 'left'));
        rightHandle.addEventListener('mousedown', (e) => onBarMouseDown(e, barElement, rangeObject, 'right'));
    }

    /**
     * [신규] 3단계 (이벤트): 핸들에서 'mousedown' (클릭 시작)
     */
    function onBarMouseDown(e, barElement, rangeObject, handleType) {
        e.preventDefault();  // 기본 브라우저 드래그 방지
        e.stopPropagation(); // 이벤트 버블링 중지

        isResizing = true;
        currentDragTarget = { barElement, rangeObject, handleType };

        // [중요] 마우스가 브라우저 창 어디로 가든 이벤트를 감지하도록
        // 'window'에 mousemove와 mouseup 이벤트를 등록합니다.
        window.addEventListener('mousemove', onBarMouseMove);
        window.addEventListener('mouseup', onBarMouseUp);
    }

    /**
     * [신규] 3단계 (이벤트): 'mousemove' (드래그 중)
     */
    function onBarMouseMove(e) {
        if (!isResizing) return;

        // 1. 타임라인 트랙의 사각형 정보 가져오기
        const editorRect = objectTimelineEditor.getBoundingClientRect();
        
        // 2. 마우스 X좌표를 트랙 내부의 픽셀 좌표로 변환
        // (트랙의 왼쪽 모서리 = 0)
        let mouseX = e.clientX - editorRect.left;

        // 3. 픽셀 좌표를 퍼센트(%)로 변환 (0% ~ 100%)
        let percent = (mouseX / editorRect.width) * 100;
        
        // 4. 퍼센트(%)가 0 미만 100 초과가 되지 않도록 제한
        percent = Math.max(0, Math.min(100, percent));

        // 5. 퍼센트(%)를 실제 '프레임 인덱스'로 변환
        let newFrame = Math.round((percent / 100) * videoTotalFrames);

        // 6. 현재 드래그 중인 핸들 타입에 따라 데이터(rangeObject) 업데이트
        const { barElement, rangeObject, handleType } = currentDragTarget;

        if (handleType === 'left') {
            // 왼쪽 핸들: start 값 변경 (단, end 값보다 커질 수 없음)
            rangeObject.start = Math.min(newFrame, rangeObject.end);
        } else {
            // 오른쪽 핸들: end 값 변경 (단, start 값보다 작아질 수 없음)
            rangeObject.end = Math.max(newFrame, rangeObject.start);
        }

        // 7. [실시간 UI 업데이트] 변경된 데이터로 막대의 left, width 재계산
        const startPercent = (rangeObject.start / videoTotalFrames) * 100;
        const widthPercent = ((rangeObject.end - rangeObject.start) / videoTotalFrames) * 100;

        barElement.style.left = `${startPercent}%`;
        barElement.style.width = `${widthPercent}%`;
    }

    /**
     * [신규] 3단계 (이벤트): 'mouseup' (클릭 종료)
     */
    function onBarMouseUp(e) {
        if (!isResizing) return;
        
        isResizing = false;

        // [4단계 연동] 변경된 데이터를 오른쪽 상세 정보 패널에도 반영합니다.
        // 현재 선택된 객체를 다시 찾아 상세 정보 UI를 새로고침합니다.
        const selectedObj = detectedObjects.find(obj => obj.id === selectedObjectID);
        if (selectedObj) {
            updateDetailRanges(selectedObj);
        }

        // [중요] window에 등록했던 이벤트 리스너를 *반드시* 제거합니다.
        window.removeEventListener('mousemove', onBarMouseMove);
        window.removeEventListener('mouseup', onBarMouseUp);
    }

    /**
     * '수정 내용 저장' 버튼 클릭 시 실행됩니다.
     */
    async function handleSave() {
        updateStatus('수정된 내용을 서버에 저장 중...', 'info', true, null);

        // --- API 연동 (MOCKUP) ---
        // TODO: '/api/save'를 실제 Flask API 엔드포인트로 변경하세요.
        try {
            // (시뮬레이션) 1초간 지연
            await new Promise(resolve => setTimeout(resolve, 1000));

            // (시뮬레이션) 실제 fetch
            // const response = await fetch('/api/save', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(detectedObjects) // 현재 수정된 객체 정보 전체를 전송
            // });
            // if (!response.ok) throw new Error('저장 실패');

            updateStatus('수정 내용이 성공적으로 저장되었습니다.', 'success');
            progressBar.classList.add('hidden');

        } catch (error) {
            updateStatus(`저장 실패: ${error.message}`, 'error');
        }
    }

    /**
     * '영상 Export' 버튼 클릭 시 실행됩니다.
     */
    async function handleExport() {
        updateStatus('최종 영상 Export를 요청합니다. 시간이 걸릴 수 있습니다...', 'info', true, null);

        // --- API 연동 (MOCKUP) ---
        // TODO: '/api/export'를 실제 Flask API 엔드포인트로 변경하세요.
        // 현재 수정된 데이터를 기반으로 Export를 요청합니다.
        try {
            // (시뮬레이션) 5초간 Export 작업
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // (시뮬레이션) 실제 fetch
            // const response = await fetch('/api/export', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(detectedObjects)
            // });
            // if (!response.ok) throw new Error('Export 요청 실패');
            // const result = await response.json(); // { downloadUrl: '/api/download/final-video-123' }

            // (시뮬레이션) 가상 응답
            const result = {
                downloadUrl: '/api/download?file=processed_video_xyz.mp4' // 실제 다운로드 경로
            };
            // --- API 연동 (MOCKUP) 종료 ---

            finalDownloadUrl = result.downloadUrl;
            updateStatus(`Export 완료! '영상 다운로드' 버튼이 활성화되었습니다.`, 'success');
            progressBar.classList.add('hidden');
            downloadButton.disabled = false; // 다운로드 버튼 활성화

        } catch (error) {
            updateStatus(`Export 실패: ${error.message}`, 'error');
        }
    }

    /**
     * '영상 다운로드' 버튼 클릭 시 실행됩니다.
     */
    function handleDownload() {
        if (finalDownloadUrl) {
            // TODO: 'finalDownloadUrl'이 실제 Flask 다운로드 엔드포인트인지 확인하세요.
            // 이 방식은 서버가 'Content-Disposition: attachment' 헤더를 반환해야 합니다.
            window.location.href = finalDownloadUrl;
            updateStatus('다운로드를 시작합니다...', 'info');
        } else {
            updateStatus('다운로드 URL이 유효하지 않습니다.', 'error');
        }
    }

    /**
     * 비디오 플레이어와 타임라인 슬라이더를 동기화합니다.
     */
    // function syncPlayerControls() {
    //     // 비디오 재생 시 슬라이더 업데이트
    //     mainVideo.addEventListener('timeupdate', () => {
    //         if (mainVideo.duration) {
    //             const percentage = (mainVideo.currentTime / mainVideo.duration) * 100;
    //             mainTimelineSeek.value = percentage;
    //         }
    //     });

    //     // 슬라이더 조작 시 비디오 시간 업데이트
    //     mainTimelineSeek.addEventListener('input', () => {
    //         if (mainVideo.duration) {
    //             const time = (mainTimelineSeek.value / 100) * mainVideo.duration;
    //             mainVideo.currentTime = time;
    //         }
    //     });
    // }

    // ==========================
    // 5. 이벤트 리스너 초기화
    // ==========================

    // 파일 선택 (클릭)
    videoDropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
    
    // 파일 선택 (드래그 앤 드롭)
    videoDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        videoDropArea.style.backgroundColor = '#f0f6ff'; // 드래그 오버 시 배경색 변경
    });
    videoDropArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        videoDropArea.style.backgroundColor = '#f9faff'; // 원래 배경색
    });
    videoDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        videoDropArea.style.backgroundColor = '#f9faff';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    // 버튼 클릭 이벤트
    uploadButton.addEventListener('click', handleUpload);
    saveButton.addEventListener('click', handleSave);
    exportButton.addEventListener('click', handleExport);
    downloadButton.addEventListener('click', handleDownload);

    // 객체 상세 정보 수정 이벤트
    detailIdInput.addEventListener('input', handleDetailsChange);
    detailBlurCheckbox.addEventListener('change', handleDetailsChange);

    // 비디오 플레이어 컨트롤 초기화
    // syncPlayerControls();

});