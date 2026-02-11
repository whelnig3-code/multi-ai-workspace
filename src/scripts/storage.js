// ===== Storage Module =====
// localStorage 기반 데이터 관리 - 대화, 폴더, 템플릿, 설정 CRUD

const Storage = (() => {
  function load(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  // ===== Conversations =====
  const Conversations = {
    getAll() {
      return load('conversations') || {};
    },

    getById(id) {
      const all = this.getAll();
      return all[id] || null;
    },

    save(conversation) {
      const all = this.getAll();
      conversation.updatedAt = Date.now();
      all[conversation.id] = conversation;
      save('conversations', all);
      return conversation;
    },

    delete(id) {
      const all = this.getAll();
      delete all[id];
      save('conversations', all);
    },

    search(query) {
      const all = this.getAll();
      const q = query.toLowerCase();
      return Object.values(all).filter(conv => {
        if (conv.title.toLowerCase().includes(q)) return true;
        return conv.messages.some(m => m.content.toLowerCase().includes(q));
      });
    },

    createNew() {
      return {
        id: generateId('conv'),
        title: '새 대화',
        folderId: null,
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      };
    }
  };

  // ===== Folders =====
  const Folders = {
    getAll() {
      return load('folders') || {};
    },

    save(folder) {
      const all = this.getAll();
      all[folder.id] = folder;
      save('folders', all);
      return folder;
    },

    delete(id) {
      const all = this.getAll();
      delete all[id];
      save('folders', all);

      // 해당 폴더의 대화들을 일반 대화로 이동
      const convs = Conversations.getAll();
      for (const conv of Object.values(convs)) {
        if (conv.folderId === id) {
          conv.folderId = null;
        }
      }
      save('conversations', convs);
    },

    createNew(name) {
      return {
        id: generateId('folder'),
        name,
        createdAt: Date.now(),
        order: Date.now()
      };
    }
  };

  // ===== Templates =====
  const Templates = {
    getAll() {
      return load('templates') || {};
    },

    save(template) {
      const all = this.getAll();
      template.updatedAt = Date.now();
      template.variables = this.parseVariables(template.content);
      all[template.id] = template;
      save('templates', all);
      return template;
    },

    delete(id) {
      const all = this.getAll();
      delete all[id];
      save('templates', all);
    },

    parseVariables(content) {
      const matches = content.match(/\{([^}]+)\}/g);
      if (!matches) return [];
      return [...new Set(matches.map(m => m.slice(1, -1)))];
    },

    createNew() {
      return {
        id: generateId('tmpl'),
        title: '',
        category: 'general',
        content: '',
        variables: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }
  };

  // ===== Settings =====
  const Settings = {
    defaults: {
      apiKeys: { claude: '', gemini: '', chatgpt: '' },
      theme: 'dark',
      defaultAIs: ['claude', 'gemini', 'chatgpt'],
      lastConversationId: null
    },

    get() {
      const saved = load('settings');
      return { ...this.defaults, ...saved };
    },

    save(settings) {
      save('settings', settings);
    },

    getApiKey(aiType) {
      const settings = this.get();
      return settings.apiKeys[aiType] || '';
    },

    setApiKey(aiType, key) {
      const settings = this.get();
      settings.apiKeys[aiType] = key;
      this.save(settings);
    }
  };

  // ===== Export/Import =====
  const DataIO = {
    exportAll() {
      return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        data: {
          conversations: Conversations.getAll(),
          folders: Folders.getAll(),
          templates: Templates.getAll()
        }
      };
    },

    exportSelected(conversationIds) {
      const all = Conversations.getAll();
      const selected = {};
      for (const id of conversationIds) {
        if (all[id]) selected[id] = all[id];
      }
      return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        data: { conversations: selected, folders: {}, templates: {} }
      };
    },

    importData(jsonData) {
      if (!jsonData || !jsonData.data) throw new Error('잘못된 데이터 형식입니다.');

      const { conversations, folders, templates } = jsonData.data;

      if (conversations) {
        const existing = Conversations.getAll();
        save('conversations', { ...existing, ...conversations });
      }
      if (folders) {
        const existing = Folders.getAll();
        save('folders', { ...existing, ...folders });
      }
      if (templates) {
        const existing = Templates.getAll();
        save('templates', { ...existing, ...templates });
      }
    },

    downloadJSON(data, filename) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return { Conversations, Folders, Templates, Settings, DataIO, generateId };
})();
