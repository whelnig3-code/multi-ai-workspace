// ===== Folder Manager Module =====
// 폴더/대화 CRUD, 드래그앤드롭, 검색

const FolderManager = (() => {
  let currentConversationId = null;
  let onConversationChange = null;
  let onSidebarUpdate = null;

  function init(callbacks) {
    onConversationChange = callbacks.onConversationChange;
    onSidebarUpdate = callbacks.onSidebarUpdate;
    initDragDrop();
  }

  // ===== Folder CRUD =====
  function createFolder(name) {
    const folder = Storage.Folders.createNew(name);
    Storage.Folders.save(folder);
    refreshSidebar();
    return folder;
  }

  function renameFolder(id, newName) {
    const folders = Storage.Folders.getAll();
    const folder = folders[id];
    if (folder) {
      folder.name = newName;
      Storage.Folders.save(folder);
      refreshSidebar();
    }
  }

  function deleteFolder(id) {
    Storage.Folders.delete(id);
    refreshSidebar();
  }

  // ===== Conversation CRUD =====
  function createConversation() {
    const conv = Storage.Conversations.createNew();
    Storage.Conversations.save(conv);
    currentConversationId = conv.id;
    refreshSidebar();
    if (onConversationChange) onConversationChange(conv);
    return conv;
  }

  function selectConversation(id) {
    const conv = Storage.Conversations.getById(id);
    if (conv) {
      currentConversationId = id;
      const settings = Storage.Settings.get();
      settings.lastConversationId = id;
      Storage.Settings.save(settings);
      refreshSidebar();
      if (onConversationChange) onConversationChange(conv);
    }
  }

  function renameConversation(id, newTitle) {
    const conv = Storage.Conversations.getById(id);
    if (conv) {
      conv.title = newTitle;
      Storage.Conversations.save(conv);
      refreshSidebar();
      if (id === currentConversationId && onConversationChange) {
        onConversationChange(conv);
      }
    }
  }

  function deleteConversation(id) {
    Storage.Conversations.delete(id);
    if (id === currentConversationId) {
      currentConversationId = null;
      if (onConversationChange) onConversationChange(null);
    }
    refreshSidebar();
  }

  function moveToFolder(conversationId, folderId) {
    const conv = Storage.Conversations.getById(conversationId);
    if (conv) {
      conv.folderId = folderId;
      Storage.Conversations.save(conv);
      refreshSidebar();
    }
  }

  function toggleFavorite(id) {
    const conv = Storage.Conversations.getById(id);
    if (conv) {
      conv.isFavorite = !conv.isFavorite;
      Storage.Conversations.save(conv);
      refreshSidebar();
      if (id === currentConversationId && onConversationChange) {
        onConversationChange(conv);
      }
    }
  }

  function addMessageToConversation(conversationId, message) {
    const conv = Storage.Conversations.getById(conversationId);
    if (conv) {
      conv.messages.push(message);
      // 첫 사용자 메시지면 제목 자동 생성
      if (conv.messages.filter(m => m.role === 'user').length === 1 && message.role === 'user') {
        conv.title = message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '');
      }
      Storage.Conversations.save(conv);
      refreshSidebar();
      return conv;
    }
    return null;
  }

  // ===== Search =====
  function search(query) {
    if (!query.trim()) return null;
    return Storage.Conversations.search(query);
  }

  // ===== Sidebar Rendering =====
  function refreshSidebar() {
    if (onSidebarUpdate) {
      const folders = Storage.Folders.getAll();
      const conversations = Storage.Conversations.getAll();
      onSidebarUpdate(folders, conversations, currentConversationId);
    }
  }

  function renderSidebar(folders, conversations, activeId) {
    const folderList = document.getElementById('folder-list');
    const generalList = document.getElementById('general-conversations');
    const favoriteList = document.getElementById('favorite-conversations');

    if (!folderList || !generalList || !favoriteList) return;

    const convArray = Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt);
    const folderArray = Object.values(folders).sort((a, b) => a.order - b.order);

    // Render folders
    folderList.innerHTML = '';
    for (const folder of folderArray) {
      const folderConvs = convArray.filter(c => c.folderId === folder.id);
      folderList.appendChild(createFolderElement(folder, folderConvs, activeId));
    }

    // Render general conversations
    generalList.innerHTML = '';
    const generalConvs = convArray.filter(c => !c.folderId);
    for (const conv of generalConvs) {
      generalList.appendChild(createConversationElement(conv, activeId));
    }

    // Render favorites
    favoriteList.innerHTML = '';
    const favConvs = convArray.filter(c => c.isFavorite);
    for (const conv of favConvs) {
      favoriteList.appendChild(createConversationElement(conv, activeId));
    }
  }

  function createFolderElement(folder, conversations, activeId) {
    const div = document.createElement('div');
    div.className = 'folder-item';
    div.dataset.folderId = folder.id;

    div.innerHTML = `
      <div class="folder-header" data-folder-id="${folder.id}">
        <span class="folder-icon">&#9654;</span>
        <span class="folder-name">${escapeHtml(folder.name)}</span>
        <button class="folder-menu-btn" data-type="folder" data-id="${folder.id}">&ctdot;</button>
      </div>
      <div class="folder-conversations"></div>
    `;

    const convContainer = div.querySelector('.folder-conversations');
    for (const conv of conversations) {
      convContainer.appendChild(createConversationElement(conv, activeId));
    }

    const header = div.querySelector('.folder-header');
    header.addEventListener('click', (e) => {
      if (e.target.classList.contains('folder-menu-btn')) return;
      div.classList.toggle('expanded');
    });

    return div;
  }

  function createConversationElement(conv, activeId) {
    const div = document.createElement('div');
    div.className = `conversation-item${conv.id === activeId ? ' active' : ''}`;
    div.dataset.conversationId = conv.id;
    div.draggable = true;

    const favoriteIcon = conv.isFavorite ? '<span class="conversation-favorite">&#9733;</span>' : '';

    div.innerHTML = `
      <span class="conversation-icon">&#128172;</span>
      <span class="conversation-title">${escapeHtml(conv.title)}</span>
      ${favoriteIcon}
      <button class="conversation-menu-btn" data-type="conversation" data-id="${conv.id}">&ctdot;</button>
    `;

    div.addEventListener('click', (e) => {
      if (e.target.classList.contains('conversation-menu-btn')) return;
      selectConversation(conv.id);
    });

    return div;
  }

  // ===== Drag & Drop =====
  function initDragDrop() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    sidebar.addEventListener('dragstart', (e) => {
      const convItem = e.target.closest('.conversation-item');
      if (convItem) {
        e.dataTransfer.setData('text/plain', convItem.dataset.conversationId);
        convItem.classList.add('dragging');
      }
    });

    sidebar.addEventListener('dragend', (e) => {
      const convItem = e.target.closest('.conversation-item');
      if (convItem) convItem.classList.remove('dragging');
      document.querySelectorAll('.folder-item.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    sidebar.addEventListener('dragover', (e) => {
      e.preventDefault();
      const folderItem = e.target.closest('.folder-item');
      document.querySelectorAll('.folder-item.drag-over').forEach(el => el.classList.remove('drag-over'));
      if (folderItem) folderItem.classList.add('drag-over');
    });

    sidebar.addEventListener('drop', (e) => {
      e.preventDefault();
      const convId = e.dataTransfer.getData('text/plain');
      const folderItem = e.target.closest('.folder-item');
      document.querySelectorAll('.folder-item.drag-over').forEach(el => el.classList.remove('drag-over'));
      if (convId && folderItem) {
        moveToFolder(convId, folderItem.dataset.folderId);
      }
    });
  }

  // ===== Context Menu =====
  function showContextMenu(e, type, id) {
    e.preventDefault();
    e.stopPropagation();

    const menu = document.getElementById('context-menu');
    if (!menu) return;

    const favoriteBtn = menu.querySelector('[data-action="favorite"]');
    const moveBtn = menu.querySelector('[data-action="move"]');
    if (favoriteBtn) favoriteBtn.hidden = type === 'folder';
    if (moveBtn) moveBtn.hidden = type === 'folder';

    menu.dataset.targetType = type;
    menu.dataset.targetId = id;
    menu.hidden = false;

    const rect = document.body.getBoundingClientRect();
    let x = e.clientX;
    let y = e.clientY;
    if (x + 160 > rect.width) x = rect.width - 170;
    if (y + 150 > rect.height) y = rect.height - 160;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
  }

  function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    if (menu) menu.hidden = true;
  }

  function handleContextAction(action) {
    const menu = document.getElementById('context-menu');
    const type = menu.dataset.targetType;
    const id = menu.dataset.targetId;
    hideContextMenu();

    if (type === 'folder') {
      if (action === 'rename') {
        const folders = Storage.Folders.getAll();
        const folder = folders[id];
        if (folder) {
          const newName = prompt('새 폴더 이름:', folder.name);
          if (newName && newName.trim()) renameFolder(id, newName.trim());
        }
      } else if (action === 'delete') {
        if (confirm('폴더를 삭제하시겠습니까? 대화는 일반 대화로 이동됩니다.')) {
          deleteFolder(id);
        }
      }
    } else if (type === 'conversation') {
      if (action === 'rename') {
        const conv = Storage.Conversations.getById(id);
        if (conv) {
          const newTitle = prompt('새 대화 제목:', conv.title);
          if (newTitle && newTitle.trim()) renameConversation(id, newTitle.trim());
        }
      } else if (action === 'favorite') {
        toggleFavorite(id);
      } else if (action === 'move') {
        const folders = Storage.Folders.getAll();
        const folderArray = Object.values(folders);
        if (folderArray.length === 0) {
          alert('폴더가 없습니다. 먼저 폴더를 생성해주세요.');
          return;
        }
        const folderNames = folderArray.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
        const choice = prompt(`이동할 폴더 번호를 선택하세요:\n${folderNames}\n0. 일반 대화로 이동`);
        if (choice === null) return;
        const idx = parseInt(choice);
        if (idx === 0) {
          moveToFolder(id, null);
        } else if (idx > 0 && idx <= folderArray.length) {
          moveToFolder(id, folderArray[idx - 1].id);
        }
      } else if (action === 'delete') {
        if (confirm('대화를 삭제하시겠습니까?')) {
          deleteConversation(id);
        }
      }
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getCurrentConversationId() {
    return currentConversationId;
  }

  function setCurrentConversationId(id) {
    currentConversationId = id;
  }

  return {
    init,
    createFolder,
    renameFolder,
    deleteFolder,
    createConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    moveToFolder,
    toggleFavorite,
    addMessageToConversation,
    search,
    refreshSidebar,
    renderSidebar,
    showContextMenu,
    hideContextMenu,
    handleContextAction,
    getCurrentConversationId,
    setCurrentConversationId
  };
})();
