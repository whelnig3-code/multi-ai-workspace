// ===== API Handler Module =====
// Claude, Gemini, ChatGPT API 호출 및 응답 처리

const APIHandler = (() => {
  const AI_CONFIG = {
    claude: {
      name: 'Claude',
      endpoint: 'https://api.anthropic.com/v1/messages',
      model: 'claude-sonnet-4-5-20250929'
    },
    gemini: {
      name: 'Gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      model: 'gemini-2.0-flash'
    },
    chatgpt: {
      name: 'ChatGPT',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini'
    }
  };

  // ===== Message Format Converters =====

  function toClaudeMessages(messages) {
    return messages
      .filter(m => m.role === 'user' || m.aiType === 'claude')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));
  }

  function toGeminiMessages(messages) {
    return messages
      .filter(m => m.role === 'user' || m.aiType === 'gemini')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
  }

  function toChatGPTMessages(messages) {
    return messages
      .filter(m => m.role === 'user' || m.aiType === 'chatgpt')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));
  }

  // ===== Request Builders =====

  function buildClaudeRequest(messages, apiKey) {
    const formatted = toClaudeMessages(messages);
    return {
      url: AI_CONFIG.claude.endpoint,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: AI_CONFIG.claude.model,
          max_tokens: 4096,
          messages: formatted
        })
      }
    };
  }

  function buildGeminiRequest(messages, apiKey) {
    const formatted = toGeminiMessages(messages);
    return {
      url: `${AI_CONFIG.gemini.endpoint}?key=${apiKey}`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: formatted })
      }
    };
  }

  function buildChatGPTRequest(messages, apiKey) {
    const formatted = toChatGPTMessages(messages);
    return {
      url: AI_CONFIG.chatgpt.endpoint,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: AI_CONFIG.chatgpt.model,
          messages: formatted,
          max_tokens: 4096
        })
      }
    };
  }

  // ===== Response Parsers =====

  function parseClaudeResponse(data) {
    if (data.error) throw new Error(data.error.message || 'Claude API 오류');
    if (data.content && data.content.length > 0) {
      return data.content.map(c => c.text).join('');
    }
    throw new Error('응답 형식 오류');
  }

  function parseGeminiResponse(data) {
    if (data.error) throw new Error(data.error.message || 'Gemini API 오류');
    if (data.candidates && data.candidates.length > 0) {
      const parts = data.candidates[0].content?.parts;
      if (parts && parts.length > 0) {
        return parts.map(p => p.text).join('');
      }
    }
    throw new Error('응답 형식 오류');
  }

  function parseChatGPTResponse(data) {
    if (data.error) throw new Error(data.error.message || 'ChatGPT API 오류');
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }
    throw new Error('응답 형식 오류');
  }

  // ===== Error Handling =====

  function getErrorMessage(status, aiType) {
    if (status === 401) return 'API 키가 유효하지 않습니다. 설정에서 확인해주세요.';
    if (status === 429) return '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    if (status >= 500) return '서버 오류가 발생했습니다. 다시 시도해주세요.';
    if (status === 403) return '접근이 거부되었습니다. API 키 권한을 확인해주세요.';
    return `${AI_CONFIG[aiType].name} API 호출에 실패했습니다. (${status})`;
  }

  // ===== Main API Call =====

  async function sendToAI(aiType, messages) {
    const apiKey = await Storage.Settings.getApiKey(aiType);
    if (!apiKey) {
      throw new Error(`${AI_CONFIG[aiType].name} API 키를 설정해주세요. (설정 → API 키)`);
    }

    let request;
    let parser;

    switch (aiType) {
      case 'claude':
        request = buildClaudeRequest(messages, apiKey);
        parser = parseClaudeResponse;
        break;
      case 'gemini':
        request = buildGeminiRequest(messages, apiKey);
        parser = parseGeminiResponse;
        break;
      case 'chatgpt':
        request = buildChatGPTRequest(messages, apiKey);
        parser = parseChatGPTResponse;
        break;
      default:
        throw new Error(`지원하지 않는 AI: ${aiType}`);
    }

    const startTime = Date.now();

    try {
      const response = await fetch(request.url, request.options);

      if (!response.ok) {
        throw new Error(getErrorMessage(response.status, aiType));
      }

      const data = await response.json();
      const content = parser(data);
      const responseTime = Date.now() - startTime;

      return {
        aiType,
        content,
        responseTime,
        error: null
      };
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('네트워크 연결을 확인해주세요.');
      }
      throw error;
    }
  }

  async function sendToMultipleAIs(selectedAIs, messages, onResult) {
    const promises = selectedAIs.map(async (aiType) => {
      try {
        const result = await sendToAI(aiType, messages);
        if (onResult) onResult(result);
        return result;
      } catch (error) {
        const result = {
          aiType,
          content: null,
          responseTime: 0,
          error: error.message
        };
        if (onResult) onResult(result);
        return result;
      }
    });

    return Promise.allSettled(promises).then(results =>
      results.map(r => r.status === 'fulfilled' ? r.value : r.reason)
    );
  }

  function getAIConfig(aiType) {
    return AI_CONFIG[aiType] || null;
  }

  return {
    sendToAI,
    sendToMultipleAIs,
    getAIConfig,
    AI_CONFIG
  };
})();
