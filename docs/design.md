# Multi AI Workspace - 설계 문서 (design.md)

## 1. 아키텍처 개요

```
+-----------------------------------------------------------+
|                    index.html (UI Layer)                   |
+-----------------------------------------------------------+
|                   app.js (Entry Point)                   |
|  - 모듈 초기화, 이벤트 위임, 앱 부트스트랩                     |
+-----------------------------------------------------------+
|                     Scripts Layer                          |
|  +---------------+  +---------------+  +----------------+ |
|  | ui-controller |  | folder-manager|  | api-handler    | |
|  | .js           |  | .js           |  | .js            | |
|  | - UI 렌더링    |  | - 폴더 CRUD   |  | - API 호출     | |
|  | - 이벤트 처리  |  | - 대화 관리    |  | - 응답 파싱     | |
|  | - 상태 표시    |  | - 검색/필터   |  | - 에러 처리     | |
|  +---------------+  +---------------+  +----------------+ |
|                           |                               |
|                    +---------------+                      |
|                    | storage.js    |                      |
|                    | - CRUD 추상화  |                      |
|                    | - 데이터 직렬화 |                      |
|                    | - 내보내기/    |                      |
|                    |   가져오기     |                      |
|                    +---------------+                      |
|                           |                               |
+-----------------------------------------------------------+
|                localStorage (Persistence)                  |
+-----------------------------------------------------------+
```

---

## 2. 데이터 구조 설계

### 2.1 대화 (Conversation)

```javascript
{
  id: "conv_1707123456789",        // "conv_" + timestamp
  title: "React 컴포넌트 질문",      // 자동 생성 (첫 질문 앞 30자) 또는 사용자 수정
  folderId: "folder_1707100000000", // null이면 "일반 대화"
  isFavorite: false,                // 즐겨찾기 여부
  createdAt: 1707123456789,         // 생성 시간 (timestamp)
  updatedAt: 1707123456789,         // 마지막 수정 시간
  messages: [
    {
      id: "msg_1707123456789",
      role: "user",                 // "user"
      content: "React에서 상태관리는 어떻게 하나요?",
      timestamp: 1707123456789
    },
    {
      id: "msg_1707123456790",
      role: "assistant",
      aiType: "claude",             // "claude" | "gemini" | "chatgpt"
      content: "React에서 상태관리는...",
      timestamp: 1707123456790,
      responseTime: 2300,           // 응답 소요시간 (ms)
      rating: null                  // null | "up" | "down"
    },
    {
      id: "msg_1707123456791",
      role: "assistant",
      aiType: "gemini",
      content: "상태관리 방법은...",
      timestamp: 1707123456791,
      responseTime: 1800,
      rating: "up"
    },
    {
      id: "msg_1707123456792",
      role: "assistant",
      aiType: "chatgpt",
      content: "React 상태관리에는...",
      timestamp: 1707123456792,
      responseTime: 3100,
      rating: null
    }
  ]
}
```

### 2.2 폴더 (Folder)

```javascript
{
  id: "folder_1707100000000",    // "folder_" + timestamp
  name: "웹개발 프로젝트",
  createdAt: 1707100000000,
  order: 0                       // 정렬 순서
}
```

### 2.3 프롬프트 템플릿 (Template)

```javascript
{
  id: "tmpl_1707200000000",      // "tmpl_" + timestamp
  title: "코드 리뷰 요청",
  category: "development",       // "development" | "translation" | "writing" | "general"
  content: "다음 {language} 코드를 리뷰해주세요:\n{code}",
  variables: ["language", "code"], // 자동 파싱된 변수 목록
  createdAt: 1707200000000,
  updatedAt: 1707200000000
}
```

### 2.4 설정 (Settings)

```javascript
// localStorage에 저장
{
  apiKeys: {
    claude: "sk-ant-api03-...",   // 암호화 저장
    gemini: "AIza...",
    chatgpt: "sk-..."
  },
  theme: "dark",                  // "light" | "dark"
  defaultAIs: ["claude", "gemini", "chatgpt"], // 기본 선택 AI
  lastConversationId: "conv_1707123456789"     // 마지막 활성 대화
}
```

### 2.5 Storage 키 구조

```
localStorage:
  ├── conversations          → { [id]: Conversation }  // 전체 대화 데이터
  ├── folders                → { [id]: Folder }        // 폴더 목록
  ├── templates              → { [id]: Template }      // 템플릿 목록
  └── settings               → { apiKeys, theme, defaultAIs, lastConversationId }
```

---

## 3. API 연동 설계

### 3.1 API 요청 공통 인터페이스

```javascript
// api-handler.js가 제공하는 통합 인터페이스
async function sendToAI(aiType, messages) → { content, responseTime, error }

// 내부적으로 각 AI별 어댑터 호출
function buildClaudeRequest(messages) → fetch options
function buildGeminiRequest(messages) → fetch options
function buildChatGPTRequest(messages) → fetch options
```

### 3.2 Claude API (Anthropic Messages API)

```javascript
// Endpoint
POST https://api.anthropic.com/v1/messages

// Headers
{
  "Content-Type": "application/json",
  "x-api-key": "{API_KEY}",
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true"
}

// Request Body
{
  "model": "claude-sonnet-4-5-20250929",
  "max_tokens": 4096,
  "messages": [
    { "role": "user", "content": "질문 내용" },
    { "role": "assistant", "content": "이전 응답" },
    { "role": "user", "content": "후속 질문" }
  ]
}

// Response
{
  "content": [{ "type": "text", "text": "응답 텍스트" }],
  "usage": { "input_tokens": 100, "output_tokens": 200 }
}
```

### 3.3 Gemini API (Google Generative AI)

```javascript
// Endpoint
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}

// Headers
{
  "Content-Type": "application/json"
}

// Request Body
{
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "질문 내용" }]
    },
    {
      "role": "model",
      "parts": [{ "text": "이전 응답" }]
    },
    {
      "role": "user",
      "parts": [{ "text": "후속 질문" }]
    }
  ]
}

// Response
{
  "candidates": [{
    "content": {
      "parts": [{ "text": "응답 텍스트" }]
    }
  }]
}
```

### 3.4 ChatGPT API (OpenAI Chat Completions)

```javascript
// Endpoint
POST https://api.openai.com/v1/chat/completions

// Headers
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {API_KEY}"
}

// Request Body
{
  "model": "gpt-4o-mini",
  "messages": [
    { "role": "user", "content": "질문 내용" },
    { "role": "assistant", "content": "이전 응답" },
    { "role": "user", "content": "후속 질문" }
  ],
  "max_tokens": 4096
}

// Response
{
  "choices": [{
    "message": { "role": "assistant", "content": "응답 텍스트" }
  }],
  "usage": { "prompt_tokens": 100, "completion_tokens": 200 }
}
```

### 3.5 대화 히스토리 변환

각 AI API의 메시지 형식이 다르므로, 내부 메시지를 각 AI 형식으로 변환합니다.

```javascript
// 내부 메시지 → Claude 형식
function toClaudeMessages(messages, aiType) {
  return messages
    .filter(m => m.role === "user" || m.aiType === aiType)
    .map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content
    }));
}

// 내부 메시지 → Gemini 형식
function toGeminiMessages(messages, aiType) {
  return messages
    .filter(m => m.role === "user" || m.aiType === aiType)
    .map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));
}

// 내부 메시지 → ChatGPT 형식
function toChatGPTMessages(messages, aiType) {
  return messages
    .filter(m => m.role === "user" || m.aiType === aiType)
    .map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content
    }));
}
```

### 3.6 병렬 호출 및 에러 처리

```javascript
async function sendToMultipleAIs(selectedAIs, messages) {
  const promises = selectedAIs.map(ai =>
    sendToAI(ai, messages).catch(error => ({
      aiType: ai,
      error: error.message,
      content: null
    }))
  );

  // Promise.allSettled로 하나가 실패해도 나머지 결과 반환
  return Promise.allSettled(promises);
}
```

에러 유형별 처리:

| 에러 유형 | HTTP 코드 | 사용자 메시지 |
|----------|-----------|-------------|
| API 키 없음 | - | "API 키를 설정해주세요. (설정 → API 키)" |
| 인증 실패 | 401 | "API 키가 유효하지 않습니다." |
| 요청 한도 초과 | 429 | "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." |
| 서버 오류 | 500+ | "서버 오류가 발생했습니다. 다시 시도해주세요." |
| 네트워크 오류 | - | "네트워크 연결을 확인해주세요." |

---

## 4. 모듈 설계

### 4.1 app.js (엔트리 포인트)

```
역할: 앱 초기화 및 모듈 연결
┌─────────────────────────────┐
│ DOMContentLoaded            │
│  ├── Storage.init()         │
│  ├── UIController.init()    │
│  ├── FolderManager.init()   │
│  └── 이벤트 리스너 등록       │
└─────────────────────────────┘
```

**주요 함수:**
- `initApp()` - 앱 부트스트랩
- `setupEventDelegation()` - 전역 이벤트 위임 설정

### 4.2 storage.js (데이터 관리)

```
역할: localStorage 래퍼, 데이터 CRUD
┌─────────────────────────────────────┐
│ Storage                             │
│  ├── Conversations                  │
│  │    ├── getAll()                   │
│  │    ├── getById(id)               │
│  │    ├── save(conversation)        │
│  │    ├── delete(id)                │
│  │    └── search(query)             │
│  ├── Folders                        │
│  │    ├── getAll()                   │
│  │    ├── save(folder)              │
│  │    ├── delete(id)                │
│  │    └── reorder(folderIds)        │
│  ├── Templates                      │
│  │    ├── getAll()                   │
│  │    ├── save(template)            │
│  │    └── delete(id)                │
│  ├── Settings                       │
│  │    ├── get()                      │
│  │    ├── save(settings)            │
│  │    ├── getApiKey(aiType)         │
│  │    └── setApiKey(aiType, key)    │
│  └── Export/Import                  │
│       ├── exportAll()               │
│       ├── exportSelected(ids)       │
│       └── importData(jsonData)      │
└─────────────────────────────────────┘
```

### 4.3 api-handler.js (API 통신)

```
역할: AI API 호출, 응답 변환, 에러 처리
┌─────────────────────────────────────┐
│ APIHandler                          │
│  ├── sendToAI(aiType, messages)     │
│  ├── sendToMultipleAIs(ais, msgs)   │
│  ├── buildClaudeRequest(messages)   │
│  ├── buildGeminiRequest(messages)   │
│  ├── buildChatGPTRequest(messages)  │
│  ├── parseClaudeResponse(response)  │
│  ├── parseGeminiResponse(response)  │
│  ├── parseChatGPTResponse(response) │
│  ├── toClaudeMessages(msgs, ai)     │
│  ├── toGeminiMessages(msgs, ai)     │
│  └── toChatGPTMessages(msgs, ai)    │
└─────────────────────────────────────┘
```

### 4.4 ui-controller.js (UI 관리)

```
역할: DOM 렌더링, 이벤트 처리, UI 상태 관리
┌─────────────────────────────────────┐
│ UIController                        │
│  ├── Chat                           │
│  │    ├── renderMessages(msgs)      │
│  │    ├── renderUserMessage(msg)    │
│  │    ├── renderAICards(responses)   │
│  │    ├── showLoading(aiTypes)      │
│  │    ├── showError(aiType, err)    │
│  │    ├── handleSend()              │
│  │    └── clearChat()               │
│  ├── Sidebar                        │
│  │    ├── toggle()                   │
│  │    ├── renderFolders(folders)     │
│  │    ├── renderConversations(convs) │
│  │    └── highlightActive(id)       │
│  ├── Modal                          │
│  │    ├── openSettings()             │
│  │    ├── openTemplates()            │
│  │    ├── openFolderCreate()         │
│  │    └── close()                    │
│  └── Theme                          │
│       └── apply(theme)               │
└─────────────────────────────────────┘
```

### 4.5 folder-manager.js (폴더/대화 관리)

```
역할: 폴더/대화 CRUD, 드래그앤드롭, 검색
┌─────────────────────────────────────┐
│ FolderManager                       │
│  ├── Folder CRUD                    │
│  │    ├── createFolder(name)        │
│  │    ├── renameFolder(id, name)    │
│  │    ├── deleteFolder(id)          │
│  │    └── getFolderTree()           │
│  ├── Conversation CRUD              │
│  │    ├── createConversation()      │
│  │    ├── renameConversation(id)    │
│  │    ├── deleteConversation(id)    │
│  │    ├── moveToFolder(convId, fId) │
│  │    └── toggleFavorite(id)        │
│  ├── Drag & Drop                    │
│  │    ├── initDragDrop()            │
│  │    ├── onDragStart(e)            │
│  │    ├── onDragOver(e)             │
│  │    └── onDrop(e)                 │
│  └── Search                         │
│       └── search(query)             │
└─────────────────────────────────────┘
```

---

## 5. 이벤트 흐름

### 5.1 질문 전송 시퀀스

```
사용자 입력 → app.js (이벤트 감지)
  → UIController.handleSend()
    1. 입력값 & 선택된 AI 검증
    2. UIController.renderUserMessage(content)
    3. UIController.showLoading(selectedAIs)
    4. FolderManager: 첫 질문이면 대화 제목 자동 생성
    5. APIHandler.sendToMultipleAIs(selectedAIs, messages)
    6. 각 응답 도착 시 UIController.renderAICards(response)
    7. Storage.save(conversation)  // 자동 저장
```

### 5.2 대화 전환 시퀀스

```
사이드바 대화 클릭 → app.js (이벤트 감지)
  → FolderManager.selectConversation(id)
    1. Storage.getById(id)
    2. UIController.clearChat()
    3. UIController.renderMessages(conversation.messages)
    4. UIController.highlightActive(id)
    5. Settings.lastConversationId 업데이트
```

---

## 6. 보안 설계

### 6.1 API 키 보안

- `localStorage`에 저장 (JSON 내보내기/가져오기로 기기 간 이동)
- UI에서 마스킹 표시 (`sk-ant-api03-****`)
- 토글로 키 표시/숨김
- 코드 내 하드코딩 금지

### 6.2 XSS 방지

```javascript
// AI 응답 렌더링 시 안전한 방식 사용
function renderContent(content) {
  // textContent 사용 (기본)
  element.textContent = content;

  // 마크다운 렌더링이 필요한 경우 허용된 태그만 사용
  // 간단한 마크다운 파서 직접 구현 (외부 라이브러리 미사용)
  // - **bold** → <strong>
  // - `code` → <code>
  // - ```block``` → <pre><code>
  // - - list → <ul><li>
}
```

### 6.3 API 통신 보안

- HTTPS를 통한 API 호출만 허용
- 허용된 API 도메인:
  - `https://api.anthropic.com` (Claude)
  - `https://generativelanguage.googleapis.com` (Gemini)
  - `https://api.openai.com` (ChatGPT)
- 외부 서버로 사용자 데이터 전송 금지

---

## 7. 파일별 구현 순서

### Step 1: 기본 구조 및 UI 레이아웃
1. `index.html` - HTML 구조 전체 (엔트리 포인트)
3. `styles/main.css` - 전체 레이아웃, 공통 변수, 테마
4. `styles/sidebar.css` - 사이드바 스타일
5. `styles/chat.css` - 채팅 영역, 카드, 입력 스타일

### Step 2: 데이터 레이어
6. `scripts/storage.js` - Storage CRUD

### Step 3: 비즈니스 로직
7. `scripts/folder-manager.js` - 폴더/대화 관리
8. `scripts/api-handler.js` - API 통신

### Step 4: UI 통합
9. `scripts/ui-controller.js` - UI 렌더링, 이벤트
10. `app.js` - 엔트리포인트, 모듈 연결

---

## 8. 실행 환경

### 8.1 실행 방법

- `index.html`을 브라우저에서 직접 열어 사용 (file:// 프로토콜)
- 서버 설치 불필요, 빌드 과정 불필요

### 8.2 휴대용 실행 (Windows)

- `Multi-AI-Workspace.bat` 더블클릭으로 브라우저에서 자동 실행
- USB 등에 프로젝트 폴더를 복사하여 회사/집 어디서든 사용 가능
- JSON 내보내기/가져오기로 대화 데이터 이동
