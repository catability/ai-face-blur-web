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
    const objectTimelineEditor = document.getElementById('object-timeline-editor');
    
    // 오른쪽 패널
    const objectList = document.getElementById('detected-object-list');
    const detailsPlaceholder = document.getElementById('details-placeholder');
    const detailsContent = document.getElementById('details-content');
    const detailIdInput = document.getElementById('detail-id');
    const detailBlurCheckbox = document.getElementById('detail-blur');
    const detailTimestamps = document.getElementById('detail-timestamps');

    // ==========================
    // 2. 상태 변수
    // ==========================
    let selectedFile = null;         // 사용자가 선택한 비디오 파일 객체
    let detectedObjects = [];        // 서버에서 받은 탐지 객체 데이터
    let selectedObjectID = null;     // 사용자가 리스트에서 선택한 객체 ID
    let finalDownloadUrl = null;     // Export 완료 후 받을 다운로드 URL

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
        
        // 1. 썸네일 미리보기 생성
        const fileURL = URL.createObjectURL(file);
        videoThumbnail.src = fileURL;
        videoThumbnail.classList.remove('hidden');
        dropAreaText.classList.add('hidden');
        
        console.log(fileURL)
        // 2. 중앙 패널 비디오 플레이어에 영상 로드
        mainVideo.src = fileURL;
        
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
        formData.append('video', selectedFile);

        // --- API 연동 (MOCKUP) ---
        // TODO: '/api/upload'를 실제 Flask API 엔드포인트로 변경하세요.
        try {
            // (시뮬레이션) 2초간 지연
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // (시뮬레이션) 실제로는 fetch API를 사용합니다.
            // const response = await fetch('/api/upload', {
            //     method: 'POST',
            //     body: formData
            // });
            // if (!response.ok) {
            //     throw new Error('서버 업로드 실패');
            // }
            // const result = await response.json(); 

            // (시뮬레이션) 서버로부터 받은 가상 응답 데이터
            const result = {
                metadata: {
                    fps: 30,
                    duration: 185.5, // 초 단위
                    size: selectedFile.size
                },
                objects: [
                    { id: 'p1', label: 'Person 1', isBlurred: true, thumbnailUrl: 'https://via.placeholder.com/45', timestamps: [{start: 10.5, end: 25.2}, {start: 50.1, end: 60.0}] },
                    { id: 'p2', label: 'Person 2', isBlurred: false, thumbnailUrl: 'https://via.placeholder.com/45', timestamps: [{start: 15.0, end: 40.7}] }
                ]
            };
            // --- API 연동 (MOCKUP) 종료 ---

            // 성공 시 UI 업데이트
            updateStatus('업로드 및 자동 분석 완료!', 'success');
            progressBar.classList.add('hidden');
            
            // 메타데이터 표시
            metadataArea.classList.remove('hidden');
            metaFps.textContent = result.metadata.fps;
            metaDuration.textContent = formatTime(result.metadata.duration);
            metaSize.textContent = formatSize(result.metadata.size);

            // 탐지된 객체 리스트 채우기
            detectedObjects = result.objects;
            populateObjectList(detectedObjects);

        } catch (error) {
            console.error('Upload failed:', error);
            updateStatus(`업로드 실패: ${error.message}`, 'error');
            uploadButton.disabled = false;
        }
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

        objects.forEach(obj => {
            const li = document.createElement('li');
            li.className = 'object-item';
            li.dataset.id = obj.id; // data-id 속성에 객체 ID 저장

            // 썸네일 이미지
            const img = document.createElement('img');
            img.src = obj.thumbnailUrl; // TODO: 실제 썸네일 URL 필드명으로 변경
            img.alt = '탐지된 얼굴 썸네일';

            // 객체 레이블(ID)
            const span = document.createElement('span');
            span.textContent = obj.label;

            li.appendChild(img);
            li.appendChild(span);

            // 리스트 아이템 클릭 이벤트
            li.addEventListener('click', () => handleObjectSelect(obj.id));
            
            objectList.appendChild(li);
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
        detailBlurCheckbox.checked = selectedObj.isBlurred;

        // 3. 상세 타임스탬프 정보 표시
        detailTimestamps.innerHTML = '';
        selectedObj.timestamps.forEach(ts => {
            const p = document.createElement('p');
            p.textContent = `${formatTime(ts.start)} - ${formatTime(ts.end)}`;
            detailTimestamps.appendChild(p);
        });

        // 4. (TODO) 중앙 패널의 '선택 객체 타임라인' 업데이트
        objectTimelineEditor.innerHTML = `
            <p><strong>${selectedObj.label}</strong>의 등장 구간 (편집 기능 구현 필요)</p>
            `;
    }

    /**
     * 객체 상세 정보(ID, 블러 여부)가 변경될 때 호출됩니다.
     */
    function handleDetailsChange() {
        if (!selectedObjectID) return;

        const selectedObj = detectedObjects.find(obj => obj.id === selectedObjectID);
        if (selectedObj) {
            selectedObj.label = detailIdInput.value;
            selectedObj.isBlurred = detailBlurCheckbox.checked;

            // 리스트의 레이블도 함께 업데이트
            const listItem = objectList.querySelector(`.object-item[data-id="${selectedObjectID}"] span`);
            if (listItem) {
                listItem.textContent = selectedObj.label;
            }
        }
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
    function syncPlayerControls() {
        // 비디오 재생 시 슬라이더 업데이트
        mainVideo.addEventListener('timeupdate', () => {
            if (mainVideo.duration) {
                const percentage = (mainVideo.currentTime / mainVideo.duration) * 100;
                mainTimelineSeek.value = percentage;
            }
        });

        // 슬라이더 조작 시 비디오 시간 업데이트
        mainTimelineSeek.addEventListener('input', () => {
            if (mainVideo.duration) {
                const time = (mainTimelineSeek.value / 100) * mainVideo.duration;
                mainVideo.currentTime = time;
            }
        });
    }

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
    syncPlayerControls();

});