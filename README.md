# Multi AI Workspace

Claude, Gemini, ChatGPT 3개 AI를 하나의 화면에서 동시에 사용하고 비교할 수 있는 워크스페이스입니다.

## 주요 기능

- **동시 질문** - 하나의 질문을 3개 AI에 동시 전송하여 답변 비교
- **선택 질문** - 원하는 AI만 골라서 질문
- **프로젝트 폴더** - 대화를 폴더별로 정리
- **즐겨찾기** - 중요한 대화를 북마크
- **프롬프트 템플릿** - 자주 쓰는 프롬프트를 저장하고 재사용
- **데이터 백업** - JSON으로 내보내기/가져오기
- **다크/라이트 테마** 지원

## 기술 스택

- Vanilla JavaScript (프레임워크 없음)
- HTML5 + CSS3 (Grid, Flexbox)
- localStorage (데이터 저장)
- 서버 불필요 - 브라우저에서 바로 실행

## 설치 및 실행

### 방법 1: 직접 실행

1. 저장소를 클론합니다:
   ```bash
   git clone https://github.com/YOUR_USERNAME/multi-ai-workspace.git
   ```
2. `src/index.html` 파일을 브라우저에서 엽니다.

### 방법 2: BAT 파일 실행 (Windows)

1. `Multi-AI-Workspace.bat`을 더블클릭합니다.
2. 브라우저가 자동으로 열립니다.

### 방법 3: USB 휴대용

1. 프로젝트 폴더 전체를 USB에 복사합니다.
2. 어느 컴퓨터에서든 `Multi-AI-Workspace.bat` 또는 `src/index.html`을 실행합니다.
3. 대화 데이터는 JSON 내보내기/가져오기로 이동할 수 있습니다.

## 사용법

### API 키 설정

1. 우측 상단 **설정(톱니바퀴)** 버튼을 클릭합니다.
2. 사용할 AI의 API 키를 입력합니다:
   - **Claude**: [Anthropic Console](https://console.anthropic.com/)에서 발급
   - **Gemini**: [Google AI Studio](https://aistudio.google.com/apikey)에서 발급
   - **ChatGPT**: [OpenAI Platform](https://platform.openai.com/api-keys)에서 발급
3. 저장 버튼을 클릭합니다.

### 질문하기

1. 하단 입력창에 질문을 입력합니다.
2. 전송할 AI를 선택합니다 (기본: 3개 모두 선택).
3. 전송 버튼 클릭 또는 `Ctrl + Enter`로 전송합니다.
4. 각 AI의 응답이 카드 형태로 표시됩니다.

### 대화 관리

- **새 대화**: 사이드바 상단 `+ 새 대화` 버튼
- **폴더 생성**: 사이드바에서 `+ 폴더` 버튼
- **대화 이동**: 대화를 드래그하여 폴더로 이동
- **즐겨찾기**: 대화를 우클릭 후 즐겨찾기 설정
- **검색**: 사이드바 검색창에서 대화 검색

### 데이터 백업

- **내보내기**: 사이드바 하단 `내보내기` 버튼 → JSON 파일 다운로드
- **가져오기**: 사이드바 하단 `가져오기` 버튼 → JSON 파일 업로드

## GitHub Pages 배포

이 프로젝트는 GitHub Pages로 배포하여 어디서든 웹으로 접속할 수 있습니다.

### 배포 방법

1. GitHub에 저장소를 Push합니다:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/multi-ai-workspace.git
   git push -u origin main
   ```

2. GitHub 저장소 페이지에서 **Settings** → **Pages**로 이동합니다.

3. **Source**에서 다음을 설정합니다:
   - Branch: `main`
   - Folder: `/src`
   - **Save** 클릭

4. 잠시 후 다음 URL로 접속할 수 있습니다:
   ```
   https://YOUR_USERNAME.github.io/multi-ai-workspace/
   ```

> **참고**: GitHub Pages 배포 시 API 키는 각 브라우저의 localStorage에 저장되므로 기기마다 별도로 설정해야 합니다.

## 프로젝트 구조

```
multi-ai-workspace/
├── src/
│   ├── index.html              # 메인 페이지
│   ├── app.js                  # 앱 부트스트랩
│   ├── scripts/
│   │   ├── storage.js          # localStorage 데이터 관리
│   │   ├── api-handler.js      # AI API 통신
│   │   ├── ui-controller.js    # UI 렌더링, 이벤트
│   │   └── folder-manager.js   # 폴더/대화 관리
│   ├── styles/
│   │   ├── main.css            # 전체 레이아웃, 테마
│   │   ├── sidebar.css         # 사이드바 스타일
│   │   └── chat.css            # 채팅 영역 스타일
│   └── assets/icons/           # SVG 아이콘
├── docs/                       # 설계 문서
├── Multi-AI-Workspace.bat      # Windows 실행 파일
└── README.md
```

## 라이선스

MIT License
