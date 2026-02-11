// ===== Multi AI Workspace - Entry Point =====
// 앱 부트스트랩, 모듈 초기화, 전역 이벤트 위임

(async function initApp() {
  // 1. 설정 로드 및 테마 적용
  const settings = Storage.Settings.get();
  UIController.applyTheme(settings.theme);
  UIController.applyDefaultAIs(settings.defaultAIs);

  // 2. FolderManager 초기화 (콜백 연결)
  FolderManager.init({
    onConversationChange: (conversation) => {
      UIController.updateChatHeader(conversation);
      if (conversation) {
        UIController.renderMessages(conversation.messages);
      } else {
        UIController.clearChat();
        UIController.showEmptyState();
        UIController.updateChatHeader(null);
      }
    },
    onSidebarUpdate: (folders, conversations, activeId) => {
      FolderManager.renderSidebar(folders, conversations, activeId);
    }
  });

  // 3. UI 컨트롤러 초기화
  UIController.init();

  // 4. 새 대화 버튼
  const newChatBtn = document.getElementById('new-chat-btn');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      FolderManager.createConversation();
    });
  }

  // 5. 마지막 대화 복원 또는 빈 상태
  if (settings.lastConversationId) {
    const conv = Storage.Conversations.getById(settings.lastConversationId);
    if (conv) {
      FolderManager.setCurrentConversationId(conv.id);
      UIController.updateChatHeader(conv);
      UIController.renderMessages(conv.messages);
    }
  }

  // 6. 사이드바 렌더링
  FolderManager.refreshSidebar();
})();
