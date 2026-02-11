// ===== UI Controller Module =====
// DOM 렌더링, 이벤트 처리, 모달 관리, 테마, 마크다운

const UIController = (() => {
  let isSending = false;

  function init() {
    setupTextareaAutoResize();
    setupSendButton();
    setupModalEvents();
    setupSettingsModal();
    setupTemplateModal();
    setupFolderModal();
    setupContextMenu();
    setupSearch();
    setupExportImport();
    setupChatHeaderActions();
    setupSidebarToggle();
  }

  // ===== Textarea & Send =====

  function setupTextareaAutoResize() {
    const textarea = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    if (!textarea || !sendBtn) return;

    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      sendBtn.disabled = !textarea.value.trim();
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (textarea.value.trim() && !isSending) handleSend();
      }
    });
  }

  function setupSendButton() {
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (!isSending) handleSend();
      });
    }
  }

  async function handleSend() {
    const textarea = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const content = textarea.value.trim();
    if (!content) return;

    const selectedAIs = getSelectedAIs();
    if (selectedAIs.length === 0) {
      alert('최소 1개의 AI를 선택해주세요.');
      return;
    }

    let convId = FolderManager.getCurrentConversationId();
    if (!convId) {
      const conv = FolderManager.createConversation();
      convId = conv.id;
    }

    const userMessage = {
      id: Storage.generateId('msg'),
      role: 'user',
      content,
      timestamp: Date.now()
    };

    const conv = FolderManager.addMessageToConversation(convId, userMessage);
    renderUserMessage(userMessage);

    textarea.value = '';
    textarea.style.height = 'auto';
    sendBtn.disabled = true;
    isSending = true;
    sendBtn.classList.add('loading');

    const loadingGroup = showLoading(selectedAIs);

    await APIHandler.sendToMultipleAIs(selectedAIs, conv.messages, (result) => {
      updateLoadingCard(loadingGroup, result);

      const aiMessage = {
        id: Storage.generateId('msg'),
        role: 'assistant',
        aiType: result.aiType,
        content: result.content || result.error,
        timestamp: Date.now(),
        responseTime: result.responseTime,
        rating: null,
        isError: !!result.error
      };
      FolderManager.addMessageToConversation(convId, aiMessage);
    });

    isSending = false;
    sendBtn.classList.remove('loading');
    scrollToBottom();
  }

  function getSelectedAIs() {
    const checkboxes = document.querySelectorAll('.ai-selector .ai-checkbox input');
    return Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
  }

  // ===== Message Rendering =====

  function clearChat() {
    const container = document.getElementById('messages-container');
    if (container) container.innerHTML = '';
  }

  function showEmptyState() {
    const container = document.getElementById('messages-container');
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="80" height="80" viewBox="0 0 64 64" fill="none">
            <circle cx="20" cy="32" r="10" stroke="var(--claude-color)" stroke-width="2"/>
            <circle cx="44" cy="22" r="10" stroke="var(--gemini-color)" stroke-width="2"/>
            <circle cx="44" cy="42" r="10" stroke="var(--chatgpt-color)" stroke-width="2"/>
          </svg>
        </div>
        <h2>Multi AI Workspace</h2>
        <p>Claude, Gemini, ChatGPT에 동시에 질문하고 답변을 비교하세요.</p>
      </div>
    `;
  }

  function renderMessages(messages) {
    clearChat();
    if (!messages || messages.length === 0) {
      showEmptyState();
      return;
    }

    let i = 0;
    while (i < messages.length) {
      if (messages[i].role === 'user') {
        renderUserMessage(messages[i]);
        const responses = [];
        let j = i + 1;
        while (j < messages.length && messages[j].role === 'assistant') {
          responses.push(messages[j]);
          j++;
        }
        if (responses.length > 0) {
          renderAIResponses(responses);
        }
        i = j;
      } else {
        i++;
      }
    }
    scrollToBottom();
  }

  function renderUserMessage(message) {
    const container = document.getElementById('messages-container');
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const group = document.createElement('div');
    group.className = 'message-group';
    group.dataset.messageId = message.id;

    const time = new Date(message.timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit', minute: '2-digit'
    });

    group.innerHTML = `
      <div class="user-message">
        <div class="user-avatar">You</div>
        <div class="user-message-content">
          <div class="user-message-header">
            <span class="user-name">You</span>
            <span class="message-time">${time}</span>
          </div>
          <div class="user-message-text">${escapeHtml(message.content)}</div>
        </div>
      </div>
    `;

    container.appendChild(group);
    scrollToBottom();
  }

  function renderAIResponses(responses) {
    const container = document.getElementById('messages-container');
    const responsesDiv = document.createElement('div');
    responsesDiv.className = 'ai-responses';

    for (const resp of responses) {
      if (resp.isError) {
        responsesDiv.appendChild(createErrorCard(resp.aiType, resp.content));
      } else {
        responsesDiv.appendChild(createAICard(resp));
      }
    }

    container.appendChild(responsesDiv);
  }

  function createAICard(response) {
    const config = APIHandler.getAIConfig(response.aiType);
    const card = document.createElement('div');
    card.className = `ai-card ${response.aiType}`;
    card.dataset.messageId = response.id;

    const timeStr = response.responseTime
      ? `${(response.responseTime / 1000).toFixed(1)}s`
      : '';

    card.innerHTML = `
      <div class="ai-card-header">
        <div class="ai-info">
          <span class="ai-dot"></span>
          <span class="ai-name">${config.name}</span>
        </div>
        <span class="ai-response-time">${timeStr}</span>
      </div>
      <div class="ai-card-body">${renderMarkdown(response.content)}</div>
      <div class="ai-card-footer">
        <button class="ai-card-action ${response.rating === 'up' ? 'active-up' : ''}"
                data-action="rate-up" data-message-id="${response.id}">
          &#128077;
        </button>
        <button class="ai-card-action ${response.rating === 'down' ? 'active-down' : ''}"
                data-action="rate-down" data-message-id="${response.id}">
          &#128078;
        </button>
        <button class="ai-card-action" data-action="copy" data-content="${encodeURIComponent(response.content)}">
          &#128203; 복사
        </button>
      </div>
    `;

    card.querySelector('[data-action="rate-up"]').addEventListener('click', () => handleRating(response.id, 'up'));
    card.querySelector('[data-action="rate-down"]').addEventListener('click', () => handleRating(response.id, 'down'));
    card.querySelector('[data-action="copy"]').addEventListener('click', (e) => {
      const content = decodeURIComponent(e.currentTarget.dataset.content);
      copyToClipboard(content, e.currentTarget);
    });

    return card;
  }

  function showLoading(aiTypes) {
    const container = document.getElementById('messages-container');
    const responsesDiv = document.createElement('div');
    responsesDiv.className = 'ai-responses loading-group';

    for (const aiType of aiTypes) {
      const config = APIHandler.getAIConfig(aiType);
      const card = document.createElement('div');
      card.className = `ai-card ${aiType}`;
      card.dataset.aiType = aiType;
      card.dataset.loading = 'true';

      card.innerHTML = `
        <div class="ai-card-header">
          <div class="ai-info">
            <span class="ai-dot"></span>
            <span class="ai-name">${config.name}</span>
          </div>
          <span class="ai-response-time"></span>
        </div>
        <div class="ai-card-loading">
          <div class="loading-dots">
            <span></span><span></span><span></span>
          </div>
          <span>응답 생성 중...</span>
        </div>
      `;

      responsesDiv.appendChild(card);
    }

    container.appendChild(responsesDiv);
    scrollToBottom();
    return responsesDiv;
  }

  function updateLoadingCard(loadingGroup, result) {
    if (!loadingGroup) return;
    const card = loadingGroup.querySelector(`[data-ai-type="${result.aiType}"]`);
    if (!card) return;

    card.dataset.loading = 'false';

    if (result.error) {
      const body = card.querySelector('.ai-card-loading');
      if (body) {
        body.outerHTML = `
          <div class="ai-card-error">
            <span>${escapeHtml(result.error)}</span>
            <button class="retry-btn" data-ai-type="${result.aiType}">다시 시도</button>
          </div>
        `;
      }
      const timeEl = card.querySelector('.ai-response-time');
      if (timeEl) timeEl.textContent = 'Error';
    } else {
      const body = card.querySelector('.ai-card-loading');
      const timeStr = `${(result.responseTime / 1000).toFixed(1)}s`;

      if (body) {
        body.outerHTML = `
          <div class="ai-card-body">${renderMarkdown(result.content)}</div>
          <div class="ai-card-footer">
            <button class="ai-card-action" data-action="rate-up">&#128077;</button>
            <button class="ai-card-action" data-action="rate-down">&#128078;</button>
            <button class="ai-card-action" data-action="copy" data-content="${encodeURIComponent(result.content)}">
              &#128203; 복사
            </button>
          </div>
        `;
      }

      const timeEl = card.querySelector('.ai-response-time');
      if (timeEl) timeEl.textContent = timeStr;

      const copyBtn = card.querySelector('[data-action="copy"]');
      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          const content = decodeURIComponent(e.currentTarget.dataset.content);
          copyToClipboard(content, e.currentTarget);
        });
      }
    }

    scrollToBottom();
  }

  function createErrorCard(aiType, errorMessage) {
    const config = APIHandler.getAIConfig(aiType);
    const card = document.createElement('div');
    card.className = `ai-card ${aiType}`;

    card.innerHTML = `
      <div class="ai-card-header">
        <div class="ai-info">
          <span class="ai-dot"></span>
          <span class="ai-name">${config.name}</span>
        </div>
        <span class="ai-response-time">Error</span>
      </div>
      <div class="ai-card-error">
        <span>${escapeHtml(errorMessage)}</span>
      </div>
    `;

    return card;
  }

  // ===== Rating =====

  function handleRating(messageId, rating) {
    const convId = FolderManager.getCurrentConversationId();
    if (!convId) return;

    const conv = Storage.Conversations.getById(convId);
    if (!conv) return;

    const msg = conv.messages.find(m => m.id === messageId);
    if (!msg) return;

    msg.rating = msg.rating === rating ? null : rating;
    Storage.Conversations.save(conv);

    const card = document.querySelector(`[data-message-id="${messageId}"]`);
    if (card) {
      const upBtn = card.querySelector('[data-action="rate-up"]');
      const downBtn = card.querySelector('[data-action="rate-down"]');
      if (upBtn) upBtn.className = `ai-card-action ${msg.rating === 'up' ? 'active-up' : ''}`;
      if (downBtn) downBtn.className = `ai-card-action ${msg.rating === 'down' ? 'active-down' : ''}`;
    }
  }

  // ===== Clipboard =====

  async function copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      const originalHTML = button.innerHTML;
      button.innerHTML = '&#10003; 복사됨';
      setTimeout(() => { button.innerHTML = originalHTML; }, 1500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  // ===== Markdown Renderer =====

  function renderMarkdown(text) {
    if (!text) return '';

    let html = escapeHtml(text);

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Unordered list
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Ordered list
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = `<p>${html}</p>`;

    // Clean up
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');

    return html;
  }

  // ===== Sidebar Toggle =====

  function setupSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
      });
    }
  }

  // ===== Modal System =====

  function setupModalEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.hidden = true;
      }
      if (e.target.classList.contains('modal-close') || e.target.classList.contains('modal-cancel')) {
        const modal = e.target.closest('.modal-overlay');
        if (modal) modal.hidden = true;
      }
    });

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', () => openSettings());

    const templateBtn = document.getElementById('template-btn');
    if (templateBtn) templateBtn.addEventListener('click', () => openTemplates());
  }

  // ===== Settings Modal =====

  function setupSettingsModal() {
    const saveBtn = document.getElementById('settings-save');
    if (saveBtn) saveBtn.addEventListener('click', saveSettings);

    document.querySelectorAll('.toggle-visibility').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        if (input) input.type = input.type === 'password' ? 'text' : 'password';
      });
    });
  }

  function openSettings() {
    const modal = document.getElementById('settings-modal');
    const settings = Storage.Settings.get();

    document.getElementById('api-key-claude').value = settings.apiKeys.claude || '';
    document.getElementById('api-key-gemini').value = settings.apiKeys.gemini || '';
    document.getElementById('api-key-chatgpt').value = settings.apiKeys.chatgpt || '';

    document.querySelectorAll('input[name="theme"]').forEach(r => { r.checked = r.value === settings.theme; });

    document.getElementById('default-ai-claude').checked = settings.defaultAIs.includes('claude');
    document.getElementById('default-ai-gemini').checked = settings.defaultAIs.includes('gemini');
    document.getElementById('default-ai-chatgpt').checked = settings.defaultAIs.includes('chatgpt');

    modal.hidden = false;
  }

  function saveSettings() {
    const settings = Storage.Settings.get();

    settings.apiKeys.claude = document.getElementById('api-key-claude').value.trim();
    settings.apiKeys.gemini = document.getElementById('api-key-gemini').value.trim();
    settings.apiKeys.chatgpt = document.getElementById('api-key-chatgpt').value.trim();

    const selectedTheme = document.querySelector('input[name="theme"]:checked');
    if (selectedTheme) settings.theme = selectedTheme.value;

    settings.defaultAIs = [];
    if (document.getElementById('default-ai-claude').checked) settings.defaultAIs.push('claude');
    if (document.getElementById('default-ai-gemini').checked) settings.defaultAIs.push('gemini');
    if (document.getElementById('default-ai-chatgpt').checked) settings.defaultAIs.push('chatgpt');

    Storage.Settings.save(settings);
    applyTheme(settings.theme);
    applyDefaultAIs(settings.defaultAIs);

    document.getElementById('settings-modal').hidden = true;
  }

  // ===== Template Modal =====

  let editingTemplateId = null;

  function setupTemplateModal() {
    const newBtn = document.getElementById('new-template-btn');
    if (newBtn) newBtn.addEventListener('click', () => openTemplateEdit(null));

    const saveBtn = document.getElementById('template-save');
    if (saveBtn) saveBtn.addEventListener('click', saveTemplate);

    const categoryFilter = document.getElementById('template-category-filter');
    if (categoryFilter) categoryFilter.addEventListener('change', () => renderTemplateList());

    const applyBtn = document.getElementById('template-vars-apply');
    if (applyBtn) applyBtn.addEventListener('click', applyTemplateVars);
  }

  function openTemplates() {
    document.getElementById('template-modal').hidden = false;
    renderTemplateList();
  }

  function renderTemplateList() {
    const list = document.getElementById('template-list');
    const filter = document.getElementById('template-category-filter').value;
    const templates = Storage.Templates.getAll();

    let items = Object.values(templates).sort((a, b) => b.updatedAt - a.updatedAt);
    if (filter !== 'all') items = items.filter(t => t.category === filter);

    if (items.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:20px;">템플릿이 없습니다.</p>';
      return;
    }

    list.innerHTML = items.map(t => `
      <div class="template-item" data-template-id="${t.id}">
        <div class="template-item-header">
          <span class="template-item-title">${escapeHtml(t.title)}</span>
          <div class="template-item-actions">
            <button data-action="edit" data-id="${t.id}">편집</button>
            <button data-action="delete" data-id="${t.id}">삭제</button>
          </div>
        </div>
        <div class="template-item-preview">${escapeHtml(t.content)}</div>
      </div>
    `).join('');

    list.querySelectorAll('.template-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.template-item-actions')) return;
        useTemplate(item.dataset.templateId);
      });
    });

    list.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => openTemplateEdit(btn.dataset.id));
    });

    list.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('템플릿을 삭제하시겠습니까?')) {
          Storage.Templates.delete(btn.dataset.id);
          renderTemplateList();
        }
      });
    });
  }

  function openTemplateEdit(id) {
    const modal = document.getElementById('template-edit-modal');
    const title = document.getElementById('template-edit-title');

    if (id) {
      const templates = Storage.Templates.getAll();
      const tmpl = templates[id];
      if (!tmpl) return;
      editingTemplateId = id;
      title.textContent = '템플릿 편집';
      document.getElementById('template-name').value = tmpl.title;
      document.getElementById('template-category').value = tmpl.category;
      document.getElementById('template-content').value = tmpl.content;
    } else {
      editingTemplateId = null;
      title.textContent = '새 템플릿';
      document.getElementById('template-name').value = '';
      document.getElementById('template-category').value = 'general';
      document.getElementById('template-content').value = '';
    }

    modal.hidden = false;
  }

  function saveTemplate() {
    const name = document.getElementById('template-name').value.trim();
    const category = document.getElementById('template-category').value;
    const content = document.getElementById('template-content').value.trim();

    if (!name || !content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    let template;
    if (editingTemplateId) {
      const templates = Storage.Templates.getAll();
      template = templates[editingTemplateId];
      template.title = name;
      template.category = category;
      template.content = content;
    } else {
      template = Storage.Templates.createNew();
      template.title = name;
      template.category = category;
      template.content = content;
    }

    Storage.Templates.save(template);
    document.getElementById('template-edit-modal').hidden = true;
    renderTemplateList();
  }

  let activeTemplateContent = '';

  function useTemplate(id) {
    const templates = Storage.Templates.getAll();
    const tmpl = templates[id];
    if (!tmpl) return;

    if (tmpl.variables.length > 0) {
      activeTemplateContent = tmpl.content;
      showTemplateVarsModal(tmpl.variables);
    } else {
      document.getElementById('message-input').value = tmpl.content;
      document.getElementById('message-input').dispatchEvent(new Event('input'));
      document.getElementById('template-modal').hidden = true;
    }
  }

  function showTemplateVarsModal(variables) {
    const form = document.getElementById('template-vars-form');
    form.innerHTML = variables.map(v => `
      <div class="form-group">
        <label>{${escapeHtml(v)}}</label>
        <input type="text" data-var="${escapeHtml(v)}" placeholder="${escapeHtml(v)} 입력">
      </div>
    `).join('');
    document.getElementById('template-vars-modal').hidden = false;
  }

  function applyTemplateVars() {
    let content = activeTemplateContent;
    document.querySelectorAll('#template-vars-form input').forEach(input => {
      content = content.replace(new RegExp(`\\{${input.dataset.var}\\}`, 'g'), input.value);
    });
    document.getElementById('message-input').value = content;
    document.getElementById('message-input').dispatchEvent(new Event('input'));
    document.getElementById('template-vars-modal').hidden = true;
    document.getElementById('template-modal').hidden = true;
  }

  // ===== Folder Modal =====

  function setupFolderModal() {
    const addBtn = document.getElementById('add-folder-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        document.getElementById('folder-name-input').value = '';
        document.getElementById('folder-modal').hidden = false;
        document.getElementById('folder-name-input').focus();
      });
    }

    const saveBtn = document.getElementById('folder-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const name = document.getElementById('folder-name-input').value.trim();
        if (!name) { alert('폴더 이름을 입력해주세요.'); return; }
        FolderManager.createFolder(name);
        document.getElementById('folder-modal').hidden = true;
      });
    }

    const input = document.getElementById('folder-name-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('folder-save').click();
      });
    }
  }

  // ===== Context Menu =====

  function setupContextMenu() {
    document.addEventListener('click', (e) => {
      const menuBtn = e.target.closest('.folder-menu-btn, .conversation-menu-btn');
      if (menuBtn) {
        FolderManager.showContextMenu(e, menuBtn.dataset.type, menuBtn.dataset.id);
        return;
      }

      const menuItem = e.target.closest('.context-menu-item');
      if (menuItem) {
        FolderManager.handleContextAction(menuItem.dataset.action);
        return;
      }

      FolderManager.hideContextMenu();
    });
  }

  // ===== Search =====

  function setupSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;

    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = input.value.trim();
        if (!query) {
          FolderManager.refreshSidebar();
          return;
        }
        const results = FolderManager.search(query);
        if (results) {
          const generalList = document.getElementById('general-conversations');
          generalList.innerHTML = '';
          for (const conv of results) {
            const div = document.createElement('div');
            div.className = `conversation-item${conv.id === FolderManager.getCurrentConversationId() ? ' active' : ''}`;
            div.innerHTML = `
              <span class="conversation-icon">&#128172;</span>
              <span class="conversation-title">${escapeHtml(conv.title)}</span>
            `;
            div.addEventListener('click', () => FolderManager.selectConversation(conv.id));
            generalList.appendChild(div);
          }
        }
      }, 300);
    });
  }

  // ===== Export/Import =====

  function setupExportImport() {
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = Storage.DataIO.exportAll();
        const filename = `multi-ai-workspace-${new Date().toISOString().slice(0, 10)}.json`;
        Storage.DataIO.downloadJSON(data, filename);
      });
    }

    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          Storage.DataIO.importData(data);
          FolderManager.refreshSidebar();
          alert('가져오기가 완료되었습니다.');
        } catch (err) {
          alert('가져오기 실패: ' + err.message);
        }
        importFile.value = '';
      });
    }
  }

  // ===== Chat Header =====

  function setupChatHeaderActions() {
    const favoriteBtn = document.getElementById('favorite-toggle');
    if (favoriteBtn) {
      favoriteBtn.addEventListener('click', () => {
        const convId = FolderManager.getCurrentConversationId();
        if (convId) FolderManager.toggleFavorite(convId);
      });
    }

    const editBtn = document.getElementById('edit-title-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const convId = FolderManager.getCurrentConversationId();
        if (!convId) return;
        const conv = Storage.Conversations.getById(convId);
        if (!conv) return;
        const newTitle = prompt('대화 제목:', conv.title);
        if (newTitle && newTitle.trim()) {
          FolderManager.renameConversation(convId, newTitle.trim());
        }
      });
    }
  }

  // ===== Theme =====

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function applyDefaultAIs(defaultAIs) {
    document.querySelectorAll('.ai-selector .ai-checkbox input').forEach(cb => {
      cb.checked = defaultAIs.includes(cb.value);
    });
  }

  function updateChatHeader(conversation) {
    const titleEl = document.getElementById('chat-title');
    const favoriteBtn = document.getElementById('favorite-toggle');

    if (!conversation) {
      if (titleEl) titleEl.textContent = '새 대화';
      if (favoriteBtn) favoriteBtn.classList.remove('favorited');
      return;
    }

    if (titleEl) titleEl.textContent = conversation.title;
    if (favoriteBtn) {
      favoriteBtn.classList.toggle('favorited', conversation.isFavorite);
    }
  }

  // ===== Utility =====

  function scrollToBottom() {
    const container = document.getElementById('messages-container');
    if (container) {
      requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return {
    init, clearChat, showEmptyState, renderMessages,
    renderUserMessage, updateChatHeader, applyTheme,
    applyDefaultAIs, getSelectedAIs
  };
})();
