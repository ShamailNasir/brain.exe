/**
 * NexusChat — AI Chatbot Application
 * Powered by OpenRouter API
 */

// ============================================================
// Preset Personalities & Themes
// ============================================================
const THEMES = ['icy', 'midnight', 'emerald', 'sunset'];

const PRESET_PERSONALITIES = [
    {
        id: 'friendly',
        name: 'Friendly',
        emoji: '😊',
        description: 'Warm, helpful, and encouraging',
        systemPrompt: 'You are a friendly and warm AI assistant. Be encouraging, empathetic, and helpful. Use a conversational tone and occasionally use emojis. Make the user feel comfortable and supported.'
    },
    {
        id: 'professional',
        name: 'Professional',
        emoji: '💼',
        description: 'Formal, precise, and business-oriented',
        systemPrompt: 'You are a professional AI assistant. Be concise, accurate, and formal. Focus on delivering clear, well-structured responses. Avoid casual language. Prioritize efficiency and clarity.'
    },
    {
        id: 'creative',
        name: 'Creative',
        emoji: '🎨',
        description: 'Imaginative, expressive, and artistic',
        systemPrompt: 'You are a creative and imaginative AI assistant. Think outside the box, use vivid language, metaphors, and analogies. Be expressive and inspire creativity in your responses. Explore ideas freely.'
    },
    {
        id: 'coder',
        name: 'Coder',
        emoji: '💻',
        description: 'Technical, code-focused, developer buddy',
        systemPrompt: 'You are an expert software developer assistant. Provide clean, well-commented code examples. Explain technical concepts clearly. Follow best practices and modern patterns. Always consider edge cases and performance.'
    },
    {
        id: 'philosopher',
        name: 'Philosopher',
        emoji: '🧠',
        description: 'Deep thinker, reflective, thought-provoking',
        systemPrompt: 'You are a philosophical AI assistant. Explore ideas deeply, ask thought-provoking questions, and consider multiple perspectives. Reference philosophical concepts when relevant. Encourage critical thinking and self-reflection.'
    },
    {
        id: 'tutor',
        name: 'Tutor',
        emoji: '📚',
        description: 'Patient teacher, step-by-step explanations',
        systemPrompt: 'You are a patient and thorough tutor. Break down complex topics into simple, digestible steps. Use examples and analogies. Check for understanding and adapt your explanations. Encourage questions and curiosity.'
    },
    {
        id: 'comedian',
        name: 'Comedian',
        emoji: '😄',
        description: 'Witty, humorous, fun conversations',
        systemPrompt: 'You are a witty and humorous AI assistant. Sprinkle humor, puns, and clever observations into your responses while still being helpful. Keep the conversation fun and light-hearted. Still provide accurate information, but make it entertaining.'
    },
    {
        id: 'concise',
        name: 'Concise',
        emoji: '⚡',
        description: 'Brief, direct, no fluff',
        systemPrompt: 'You are an extremely concise AI assistant. Give the shortest possible accurate answers. Use bullet points when listing. No unnecessary pleasantries or filler. Get straight to the point.'
    }
];

// ============================================================
// App State
// ============================================================
class AppState {
    constructor() {
        this.conversations = [];
        this.activeConversationId = null;
        this.settings = {
            apiKey: '',
            model: 'google/gemini-2.5-flash:free',
            theme: 'icy',
            temperature: 0.7,
            maxTokens: 2048
        };
        this.customPersonalities = [];
        this.isGenerating = false;
        this.abortController = null;
        this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem('nexuschat_state');
            if (saved) {
                const data = JSON.parse(saved);
                this.conversations = data.conversations || [];
                this.activeConversationId = data.activeConversationId || null;
                this.settings = { ...this.settings, ...data.settings };
                this.customPersonalities = data.customPersonalities || [];
            }
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }

    save() {
        try {
            localStorage.setItem('nexuschat_state', JSON.stringify({
                conversations: this.conversations,
                activeConversationId: this.activeConversationId,
                settings: this.settings,
                customPersonalities: this.customPersonalities
            }));
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    }

    getActiveConversation() {
        return this.conversations.find(c => c.id === this.activeConversationId) || null;
    }

    createConversation() {
        const conv = {
            id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            title: 'New Chat',
            personalityId: 'friendly',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.conversations.unshift(conv);
        this.activeConversationId = conv.id;
        this.save();
        return conv;
    }

    deleteConversation(id) {
        this.conversations = this.conversations.filter(c => c.id !== id);
        if (this.activeConversationId === id) {
            this.activeConversationId = this.conversations.length > 0 ? this.conversations[0].id : null;
        }
        this.save();
    }

    renameConversation(id, title) {
        const conv = this.conversations.find(c => c.id === id);
        if (conv) {
            conv.title = title;
            conv.updatedAt = new Date().toISOString();
            this.save();
        }
    }

    addMessage(conversationId, role, content) {
        const conv = this.conversations.find(c => c.id === conversationId);
        if (conv) {
            conv.messages.push({
                id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                role,
                content,
                timestamp: new Date().toISOString()
            });
            conv.updatedAt = new Date().toISOString();
            // Auto-title from first user message
            if (conv.title === 'New Chat' && role === 'user') {
                conv.title = content.length > 40 ? content.substring(0, 40) + '…' : content;
            }
            this.save();
        }
    }

    getPersonality(id) {
        return PRESET_PERSONALITIES.find(p => p.id === id) ||
               this.customPersonalities.find(p => p.id === id) ||
               PRESET_PERSONALITIES[0];
    }

    addCustomPersonality(name, emoji, systemPrompt) {
        const personality = {
            id: 'custom_' + Date.now(),
            name,
            emoji: emoji || '🤖',
            description: 'Custom personality',
            systemPrompt,
            isCustom: true
        };
        this.customPersonalities.push(personality);
        this.save();
        return personality;
    }

    deleteCustomPersonality(id) {
        this.customPersonalities = this.customPersonalities.filter(p => p.id !== id);
        this.save();
    }
}

// ============================================================
// Markdown Parser (lightweight)
// ============================================================
function parseMarkdown(text) {
    if (!text) return '';
    let html = text;

    // Escape HTML (but keep intentional markdown)
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Code blocks (```...```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic *text* or _text_
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');

    // Unordered lists
    html = html.replace(/^[\s]*[-*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Paragraphs — wrap remaining text blocks
    html = html.replace(/\n\n/g, '</p><p>');
    // Wrap in paragraph if not starting with a block element
    if (!html.match(/^<(h[1-4]|ul|ol|pre|blockquote|hr)/)) {
        html = '<p>' + html + '</p>';
    }
    // Line breaks within paragraphs
    html = html.replace(/\n/g, '<br>');

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p><br>/g, '<p>');

    return html;
}

// ============================================================
// Toast Notifications
// ============================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============================================================
// UI Controller
// ============================================================
class UIController {
    constructor(state) {
        this.state = state;
        this.elements = {};
        this.cacheElements();
        this.bindEvents();
        this.render();
    }

    cacheElements() {
        const ids = [
            'sidebar', 'themeBtn', 'sidebarToggleBtn', 'newChatBtn', 'conversationsList',
            'settingsBtn', 'main', 'chatHeader', 'chatAvatar',
            'chatTitle', 'chatPersonality', 'personalityBtn', 'renameChatBtn',
            'deleteChatBtn', 'messagesArea', 'welcomeScreen', 'welcomeSuggestions',
            'messageInput', 'sendBtn', 'inputArea',
            // Settings modal
            'settingsModal', 'settingsCloseBtn', 'apiKeyInput', 'toggleApiKey',
            'modelInput', 'temperatureSlider', 'temperatureValue', 'maxTokensInput',
            'settingsCancelBtn', 'settingsSaveBtn',
            // Personality modal
            'personalityModal', 'personalityCloseBtn', 'personalityGrid',
            'customPersonalityName', 'customPersonalityEmoji', 'customPersonalityPrompt',
            'saveCustomPersonality', 'customPersonalitiesList',
            // Rename modal
            'renameModal', 'renameCloseBtn', 'renameInput', 'renameCancelBtn', 'renameSaveBtn'
        ];
        ids.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });
    }

    bindEvents() {
        const { elements, state } = this;

        // New chat
        elements.newChatBtn.addEventListener('click', () => {
            state.createConversation();
            this.render();
            elements.messageInput.focus();
        });

        // Sidebar Toggle
        elements.sidebarToggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                elements.sidebar.classList.toggle('open');
            } else {
                elements.sidebar.classList.toggle('collapsed');
            }
        });

        // Theme Toggle
        elements.themeBtn.addEventListener('click', () => {
            const currentIdx = THEMES.indexOf(this.state.settings.theme || 'icy');
            const nextIdx = (currentIdx + 1) % THEMES.length;
            this.state.settings.theme = THEMES[nextIdx];
            this.state.save();
            this.applyTheme();
        });

        // Close sidebar on mobile when clicking outside
        elements.main.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                elements.sidebar.classList.remove('open');
            }
        });

        // Settings
        elements.settingsBtn.addEventListener('click', () => this.openSettings());
        elements.settingsCloseBtn.addEventListener('click', () => this.closeModal('settingsModal'));
        elements.settingsCancelBtn.addEventListener('click', () => this.closeModal('settingsModal'));
        elements.settingsSaveBtn.addEventListener('click', () => this.saveSettings());
        elements.toggleApiKey.addEventListener('click', () => {
            const input = elements.apiKeyInput;
            input.type = input.type === 'password' ? 'text' : 'password';
        });
        
        // Auto-save settings when changed so they never get lost
        elements.apiKeyInput.addEventListener('input', (e) => {
            this.state.settings.apiKey = e.target.value.trim();
            this.state.save();
        });
        elements.modelInput.addEventListener('change', (e) => {
            const oldModel = this.state.settings.model;
            const newModel = e.target.value.trim();
            if (oldModel !== newModel) {
                this.state.settings.model = newModel;
                this.state.save();
                
                const conv = this.state.getActiveConversation();
                if (conv && conv.messages.length > 0) {
                    conv.messages.push({
                        role: 'system_notification',
                        content: `Model switched to ${newModel.split('/').pop()}`,
                        timestamp: new Date().toISOString()
                    });
                    this.state.save();
                    this.renderChatArea();
                }
            }
        });
        elements.temperatureSlider.addEventListener('input', (e) => {
            elements.temperatureValue.textContent = e.target.value;
        });

        // Personality
        elements.personalityBtn.addEventListener('click', () => this.openPersonalityModal());
        elements.personalityCloseBtn.addEventListener('click', () => this.closeModal('personalityModal'));
        elements.saveCustomPersonality.addEventListener('click', () => this.saveCustomPersonality());

        // Rename
        elements.renameChatBtn.addEventListener('click', () => this.openRenameModal());
        elements.renameCloseBtn.addEventListener('click', () => this.closeModal('renameModal'));
        elements.renameCancelBtn.addEventListener('click', () => this.closeModal('renameModal'));
        elements.renameSaveBtn.addEventListener('click', () => this.saveRename());
        elements.renameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.saveRename();
        });

        // Delete chat
        elements.deleteChatBtn.addEventListener('click', () => {
            const conv = state.getActiveConversation();
            if (conv && confirm(`Delete "${conv.title}"?`)) {
                state.deleteConversation(conv.id);
                this.render();
                showToast('Chat deleted', 'success');
            }
        });

        // Message input
        elements.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
            elements.sendBtn.disabled = !elements.messageInput.value.trim();
        });
        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });
        elements.sendBtn.addEventListener('click', () => this.handleSend());

        // Welcome suggestion chips
        elements.welcomeSuggestions.addEventListener('click', (e) => {
            const chip = e.target.closest('.suggestion-chip');
            if (chip) {
                const prompt = chip.dataset.prompt;
                elements.messageInput.value = prompt;
                elements.sendBtn.disabled = false;
                this.handleSend();
            }
        });

        // Close modals with Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal('settingsModal');
                this.closeModal('personalityModal');
                this.closeModal('renameModal');
            }
        });

        // Close modals clicking overlay
        ['settingsModal', 'personalityModal', 'renameModal'].forEach(id => {
            elements[id].addEventListener('click', (e) => {
                if (e.target === elements[id]) this.closeModal(id);
            });
        });
    }

    // ---- Rendering ----

    applyTheme() {
        document.body.setAttribute('data-theme', this.state.settings.theme || 'icy');
    }

    render() {
        this.applyTheme();
        this.renderConversationsList();
        this.renderChatArea();
    }

    renderConversationsList() {
        const { conversationsList } = this.elements;
        const { conversations, activeConversationId } = this.state;

        if (conversations.length === 0) {
            conversationsList.innerHTML = `
                <div style="text-align:center; padding:32px 16px; color:var(--text-muted); font-size:0.8rem;">
                    No conversations yet.<br>Click "New Chat" to start.
                </div>
            `;
            return;
        }

        conversationsList.innerHTML = conversations.map(conv => {
            const personality = this.state.getPersonality(conv.personalityId);
            const lastMsg = conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
            const preview = lastMsg ? (lastMsg.content.length > 50 ? lastMsg.content.substring(0, 50) + '…' : lastMsg.content) : 'No messages yet';
            const isActive = conv.id === activeConversationId;

            return `
                <div class="conversation-item ${isActive ? 'active' : ''}" data-id="${conv.id}">
                    <div style="font-size: 0.95rem; color: var(--text-secondary); margin-right: 8px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <div class="conv-info">
                        <div class="conv-title">${this.escapeHtml(conv.title)}</div>
                        <div class="conv-preview">${this.escapeHtml(preview)}</div>
                    </div>
                    <button class="btn-icon conv-delete delete-btn" data-delete="${conv.id}" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
            `;
        }).join('');

        // Bind click events
        conversationsList.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.conv-delete')) return;
                this.state.activeConversationId = item.dataset.id;
                this.state.save();
                this.render();
                if (window.innerWidth <= 768) {
                    this.elements.sidebar.classList.remove('open');
                }
            });
        });

        conversationsList.querySelectorAll('.conv-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.delete;
                const conv = this.state.conversations.find(c => c.id === id);
                if (conv && confirm(`Delete "${conv.title}"?`)) {
                    this.state.deleteConversation(id);
                    this.render();
                    showToast('Chat deleted', 'success');
                }
            });
        });
    }

    renderChatArea() {
        const conv = this.state.getActiveConversation();

        if (!conv) {
            // Show welcome with no active chat
            this.elements.chatTitle.textContent = 'NexusChat';
            this.elements.chatPersonality.textContent = 'Select or create a chat to begin';
            this.elements.chatAvatar.textContent = '🤖';
            this.elements.messagesArea.innerHTML = '';
            this.elements.messagesArea.appendChild(this.elements.welcomeScreen);
            this.elements.welcomeScreen.style.display = 'flex';
            this.elements.inputArea.style.display = 'block';
            // Auto-create a conversation on first send
            return;
        }

        const personality = this.state.getPersonality(conv.personalityId);
        this.elements.chatTitle.textContent = conv.title;
        this.elements.chatPersonality.textContent = personality.name;

        if (conv.messages.length === 0) {
            this.elements.messagesArea.innerHTML = '';
            this.elements.messagesArea.appendChild(this.elements.welcomeScreen);
            this.elements.welcomeScreen.style.display = 'flex';
        } else {
            this.elements.welcomeScreen.style.display = 'none';
            this.renderMessages(conv);
        }
        this.elements.inputArea.style.display = 'block';
    }

    renderMessages(conv) {
        const personality = this.state.getPersonality(conv.personalityId);
        const messagesHtml = conv.messages.map(msg => {
            if (msg.role === 'system_notification') {
                return `<div class="message system-msg"><div class="system-text">${this.escapeHtml(msg.content)}</div></div>`;
            }
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const isUser = msg.role === 'user';
            const isError = msg.role === 'error';
            const avatarContent = isUser ? '' : personality.emoji;
            const roleClass = isError ? 'assistant' : msg.role;

            return `
                <div class="message ${roleClass}">
                    <div class="message-avatar">${avatarContent}</div>
                    <div>
                        <div class="message-content ${isError ? 'message-error' : ''}">${parseMarkdown(msg.content)}</div>
                        <div class="message-time">${time}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Preserve welcome screen element but hide it
        this.elements.messagesArea.innerHTML = messagesHtml;
        this.elements.messagesArea.appendChild(this.elements.welcomeScreen);
        this.elements.welcomeScreen.style.display = 'none';

        this.scrollToBottom();
    }

    showTypingIndicator() {
        const conv = this.state.getActiveConversation();
        const personality = conv ? this.state.getPersonality(conv.personalityId) : PRESET_PERSONALITIES[0];

        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="message-avatar" style="background:var(--bg-surface);border:1px solid var(--border);">${personality.emoji}</div>
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        `;
        this.elements.messagesArea.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.elements.messagesArea.scrollTop = this.elements.messagesArea.scrollHeight;
        });
    }

    autoResizeTextarea() {
        const ta = this.elements.messageInput;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ---- Message Handling ----

    async handleSend() {
        const content = this.elements.messageInput.value.trim();
        if (!content || this.state.isGenerating) return;

        // Ensure we have a conversation
        if (!this.state.getActiveConversation()) {
            this.state.createConversation();
        }

        const conv = this.state.getActiveConversation();

        // Add user message
        this.state.addMessage(conv.id, 'user', content);
        this.elements.messageInput.value = '';
        this.elements.sendBtn.disabled = true;
        this.autoResizeTextarea();
        this.render();

        // Check for API key
        if (!this.state.settings.apiKey) {
            this.state.addMessage(conv.id, 'error', '⚠️ Please set your OpenRouter API key in Settings before sending messages.');
            this.render();
            showToast('API key not configured', 'error');
            return;
        }

        // Call API
        await this.callAPI(conv);
    }

    async callAPI(conv) {
        this.state.isGenerating = true;
        this.showTypingIndicator();

        const personality = this.state.getPersonality(conv.personalityId);
        const systemPrompt = personality.systemPrompt + '\n\nIMPORTANT: You must always respond in English, regardless of the language the user uses. Format your responses beautifully using Markdown. Use clear headings (##), bullet points, bold text, and code blocks to structure your answers logically. Never output giant walls of unstructured text.';
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conv.messages
                .filter(m => m.role === 'user' || m.role === 'assistant')
                .map(m => ({ role: m.role, content: m.content }))
        ];

        try {
            this.state.abortController = new AbortController();

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.state.settings.apiKey}`,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'NexusChat'
                },
                body: JSON.stringify({
                    model: this.state.settings.model,
                    messages,
                    temperature: this.state.settings.temperature,
                    max_tokens: this.state.settings.maxTokens
                }),
                signal: this.state.abortController.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("OpenRouter API Error Data:", errorData);
                
                let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                if (errorData?.error?.message) {
                    errorMsg = errorData.error.message;
                }
                
                throw new Error(errorMsg);
            }

            const data = await response.json();
            const assistantMessage = data.choices?.[0]?.message?.content;

            if (assistantMessage) {
                this.state.addMessage(conv.id, 'assistant', assistantMessage);
            } else {
                throw new Error('No response content received from the model.');
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                this.state.addMessage(conv.id, 'error', 'Response generation was cancelled.');
            } else {
                console.error('API Error:', error);
                this.state.addMessage(conv.id, 'error', `❌ Error: ${error.message}`);
                showToast('Failed to get response', 'error');
            }
        } finally {
            this.state.isGenerating = false;
            this.state.abortController = null;
            this.hideTypingIndicator();
            this.render();
        }
    }

    // ---- Settings Modal ----

    openSettings() {
        const { settings } = this.state;
        this.elements.apiKeyInput.value = settings.apiKey;
        this.elements.modelInput.value = settings.model;
        this.elements.temperatureSlider.value = settings.temperature;
        this.elements.temperatureValue.textContent = settings.temperature;
        this.elements.maxTokensInput.value = settings.maxTokens;
        this.openModal('settingsModal');
    }

    saveSettings() {
        this.state.settings.apiKey = this.elements.apiKeyInput.value.trim();
        this.state.settings.model = this.elements.modelInput.value.trim() || 'nvidia/nemotron-3-super-120b-a12b:free';
        this.state.settings.temperature = parseFloat(this.elements.temperatureSlider.value);
        this.state.settings.maxTokens = parseInt(this.elements.maxTokensInput.value) || 2048;
        this.state.save();
        this.closeModal('settingsModal');
        showToast('Settings saved', 'success');
    }

    // ---- Personality Modal ----

    openPersonalityModal() {
        const conv = this.state.getActiveConversation();
        const currentId = conv ? conv.personalityId : 'friendly';

        // Render preset grid
        this.elements.personalityGrid.innerHTML = PRESET_PERSONALITIES.map(p => `
            <div class="personality-card ${p.id === currentId ? 'active' : ''}" data-personality="${p.id}">
                <div class="p-emoji">${p.emoji}</div>
                <div class="p-name">${p.name}</div>
                <div class="p-desc">${p.description}</div>
            </div>
        `).join('');

        // Bind preset clicks
        this.elements.personalityGrid.querySelectorAll('.personality-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectPersonality(card.dataset.personality);
            });
        });

        // Render custom personalities
        this.renderCustomPersonalities(currentId);

        // Clear custom personality form
        this.elements.customPersonalityName.value = '';
        this.elements.customPersonalityEmoji.value = '';
        this.elements.customPersonalityPrompt.value = '';

        this.openModal('personalityModal');
    }

    renderCustomPersonalities(currentId) {
        const list = this.elements.customPersonalitiesList;
        if (this.state.customPersonalities.length === 0) {
            list.innerHTML = '';
            return;
        }

        list.innerHTML = '<h3 style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">Your Custom Personalities</h3>' +
            this.state.customPersonalities.map(p => `
                <div class="custom-personality-item ${p.id === currentId ? 'active' : ''}" data-personality="${p.id}">
                    <span class="cp-emoji">${p.emoji}</span>
                    <span class="cp-name">${this.escapeHtml(p.name)}</span>
                    <button class="btn-icon cp-delete delete-btn" data-delete-custom="${p.id}" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
            `).join('');

        // Bind clicks
        list.querySelectorAll('.custom-personality-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.cp-delete')) return;
                this.selectPersonality(item.dataset.personality);
            });
        });

        list.querySelectorAll('[data-delete-custom]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.state.deleteCustomPersonality(btn.dataset.deleteCustom);
                this.openPersonalityModal(); // Re-render
                showToast('Custom personality deleted', 'success');
            });
        });
    }

    selectPersonality(personalityId) {
        let conv = this.state.getActiveConversation();
        if (!conv) {
            conv = this.state.createConversation();
        }
        conv.personalityId = personalityId;
        this.state.save();
        this.closeModal('personalityModal');
        this.render();
        const personality = this.state.getPersonality(personalityId);
        showToast(`Personality set to ${personality.name} ${personality.emoji}`, 'success');
    }

    saveCustomPersonality() {
        const name = this.elements.customPersonalityName.value.trim();
        const emoji = this.elements.customPersonalityEmoji.value.trim();
        const prompt = this.elements.customPersonalityPrompt.value.trim();

        if (!name) {
            showToast('Please enter a name', 'error');
            return;
        }
        if (!prompt) {
            showToast('Please enter a system prompt', 'error');
            return;
        }

        const personality = this.state.addCustomPersonality(name, emoji, prompt);
        showToast(`${personality.name} personality created!`, 'success');
        this.openPersonalityModal(); // Re-render the modal
    }

    // ---- Rename Modal ----

    openRenameModal() {
        const conv = this.state.getActiveConversation();
        if (!conv) return;
        this.elements.renameInput.value = conv.title;
        this.openModal('renameModal');
        setTimeout(() => this.elements.renameInput.select(), 100);
    }

    saveRename() {
        const conv = this.state.getActiveConversation();
        if (!conv) return;
        const newTitle = this.elements.renameInput.value.trim();
        if (newTitle) {
            this.state.renameConversation(conv.id, newTitle);
            this.closeModal('renameModal');
            this.render();
            showToast('Chat renamed', 'success');
        }
    }

    // ---- Modal Helpers ----

    openModal(id) {
        this.elements[id].classList.add('open');
    }

    closeModal(id) {
        this.elements[id].classList.remove('open');
    }
}

// ============================================================
// Initialize App
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const state = new AppState();
    const ui = new UIController(state);

    // Auto-create first conversation if none exist
    if (state.conversations.length === 0) {
        // Don't auto-create, let the welcome screen show
    }

    // Focus input
    document.getElementById('messageInput').focus();
});
