/**
 * Smart Context Compressor - 提示词截断与动态无损注入模块
 */

const activeMarkerBackups = [];
const activeDynamicInjections = new Set();

export const ContextInjector = {
    /**
     * 截断临时 chat 数组，仅保留临近楼层
     * @param {Array} chat - ST 生成引擎的临时 chat 数组
     * @param {number} keepRounds - 保留的轮数（1轮 = 用户+助手 2条消息）
     * @returns {number} 实际截断移除的消息条数
     */
    truncateChatSlice(chat, keepRounds = 15) {
        if (!Array.isArray(chat)) return 0;

        // 保留总条数（包含开场白等，通常 1 轮对应 2 条消息）
        const maxKeepCount = Math.max(2, keepRounds * 2);

        if (chat.length <= maxKeepCount) {
            return 0;
        }

        const removeCount = chat.length - maxKeepCount;
        chat.splice(0, removeCount);
        console.log(`[Context Injector] 截断了 ${removeCount} 条过往历史，保留最近 ${chat.length} 条消息 (${keepRounds} 轮)。`);
        return removeCount;
    },

    /**
     * 在截断后的聊天顶部插入剧情提要卡片 (Story Bridge)
     * @param {Array} chat - 截断后的 chat 数组
     * @param {string} storySummary - 前情提要文本
     */
    injectStoryBridge(chat, storySummary) {
        if (!Array.isArray(chat) || !storySummary || !storySummary.trim()) return;

        const bridgeCard = {
            name: 'System',
            is_user: false,
            is_system: true,
            mes: `[前文剧情提要 / Context Summary]\n${storySummary.trim()}`,
            extra: { type: 'st_context_story_bridge' }
        };

        // 插入在第一条，作为被截断历史的承接
        chat.unshift(bridgeCard);
        console.log('[Context Injector] 已在截断边界成功注入前情提要卡片。');
    },

    /**
     * 将角色最新状态无损挂载到角色卡（优先 personality，无角色卡则使用 In-Chat Top）
     * @param {string} characterState - 角色状态提要
     * @param {Array} chat - 当前 chat 数组
     */
    mountCharacterState(characterState, chat = null) {
        if (!characterState || !characterState.trim()) return false;

        const formattedState = `\n\n【角色当前最新状态与情感演变】：\n${characterState.trim()}\n`;

        const ctx = SillyTavern.getContext();
        const charId = ctx.characterId;
        const charObj = (charId && ctx.characters) ? ctx.characters[charId] : null;

        if (!charObj) {
            // 没有角色卡时降级为 In-Chat 顶部注入
            const depth = Array.isArray(chat) ? chat.length : 10;
            this.injectDynamicPrompt(formattedState, depth, 'system');
            return true;
        }

        // 默认且固定挂载到角色性格/设定区 personality
        let targetObj = charObj.data && typeof charObj.data === 'object' ? charObj.data : charObj;
        let targetKey = 'personality';

        // 1. 备份原值
        const originalVal = targetObj[targetKey] || '';
        activeMarkerBackups.push({
            marker: 'charPersonality',
            targetObject: targetObj,
            targetKey: targetKey,
            originalValue: originalVal,
            charObj: charObj
        });

        // 2. 挂载新状态
        const newVal = (originalVal ? originalVal + '\n' : '') + formattedState;
        targetObj[targetKey] = newVal;
        if (charObj.data && charObj[targetKey] !== undefined) {
            charObj[targetKey] = newVal;
        }

        console.log(`[Context Injector] 成功挂载角色最新状态至角色卡 [${targetKey}]。`);
        return true;
    },

    /**
     * 还原所有被临时挂载的字段，保障角色卡 0 污染、无损
     */
    unmountMarker() {
        // 清理 In-Chat 动态提示词
        if (activeDynamicInjections.size > 0) {
            this.uninjectDynamicPrompts(Array.from(activeDynamicInjections));
        }

        // 还原角色卡内存对象
        while (activeMarkerBackups.length > 0) {
            const backup = activeMarkerBackups.pop();
            const { targetObject, targetKey, originalValue, charObj } = backup;
            if (targetObject && targetKey) {
                targetObject[targetKey] = originalValue;
                if (charObj && charObj[targetKey] !== undefined) {
                    charObj[targetKey] = originalValue;
                }
                console.log(`[Context Injector] 角色卡字段 [${targetKey}] 已安全还原。`);
            }
        }
    },

    /**
     * In-Chat 动态系统提示词注入
     */
    injectDynamicPrompt(content, depth = 0, role = 'system') {
        const { setExtensionPrompt, eventSource, event_types } = SillyTavern.getContext();
        if (typeof setExtensionPrompt !== 'function') return null;

        const id = `st-compressor-inject-${Date.now()}`;
        const numericRole = { system: 0, user: 1, assistant: 2 }[role] ?? 0;

        setExtensionPrompt(id, content, 1, depth, false, numericRole);
        activeDynamicInjections.add(id);

        if (eventSource && event_types) {
            const cleanup = () => this.uninjectDynamicPrompts([id]);
            eventSource.once(event_types.GENERATION_ENDED, cleanup);
            eventSource.once(event_types.GENERATION_STOPPED, cleanup);
        }

        return id;
    },

    /**
     * 清理动态提示词
     */
    uninjectDynamicPrompts(ids = []) {
        const { setExtensionPrompt } = SillyTavern.getContext();
        const targetIds = ids.length > 0 ? ids : Array.from(activeDynamicInjections);

        targetIds.forEach(id => {
            try {
                if (typeof setExtensionPrompt === 'function') {
                    setExtensionPrompt(id, '', 1, 0, false, 0);
                }
            } catch (e) {
                console.warn(`[Context Injector] 清理提示词 ${id} 失败:`, e);
            }
            activeDynamicInjections.delete(id);
        });
    }
};
