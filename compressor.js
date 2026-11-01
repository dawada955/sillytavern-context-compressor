/**
 * Smart Context Compressor - 纯前端大模型压缩器
 * 复用 SillyTavern 内置主模型接口 generateRaw 进行上下文结构化提炼
 */

const DEFAULT_COMPRESS_PROMPT = `你是一位专业的小说剧情编辑与角色心理分析师。请对提供的对话历史进行高质量的结构化提炼与长文上下文压缩。

【处理原则】：
1. 严禁臆造原文未提及的情节或设定，必须100%基于对话事实。
2. 提炼【剧情提要】时聚焦于截止到截断点前的因果转折；提炼【角色状态】时需反映对话截止目前的最新态势。
3. 严格遵循以下输出结构，不要输出任何多余的寒暄、解释或前言：

===角色状态===
【各角色最新状态追踪】：
※ 请列出对话中登场的所有主要角色（包含 Character 与 User），按下列格式分别陈述：
- [角色名 / User]：
  * 心境与潜意识：当前情绪起伏、内心真实动机与隐藏想法。
  * 关系态度与羁绊：对对方的信任度、好感/矛盾演变、双方特有的私密默契或芥蒂。
  * 生理与处境现状：健康/负伤情况、衣着仪容、随身携带/交接的关键道具、特殊Buff或物理位置。

===剧情提要===
【时空基准】：当前所处时间推进节点（如第几日/时辰/环境天气）及具体空间位置。
【核心因果回顾】：按事件因果逻辑陈述已发生的大事件链（说明“因何而起”、“做了何种抉择”、“导致何种不可逆结果”，避免流水账）。
【关键情报与既定事实】：已确认的真相、世界观信息、达成的契约/承诺（明确人名、地点、数字等硬指标）。
【当下矛盾与未解悬念】：当前未完成的危机、正在执行但未果的行动、亟待解决的分歧。`;

export class ContextCompressor {
    /**
     * 估算文本的 Token 数量（中文字符约 0.6~0.8 token/字，英文单词约 1.3 token/词）
     */
    static estimateTokenCount(text) {
        if (!text || typeof text !== 'string') return 0;
        const clean = text.trim();
        if (!clean) return 0;
        // 中文字符数
        const cjkMatches = clean.match(/[一-龥　-〿！-～]/g);
        const cjkCount = cjkMatches ? cjkMatches.length : 0;
        // 英文单词数
        const enWords = clean.replace(/[一-龥　-〿！-～]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
        return Math.round(cjkCount * 0.75 + enWords * 1.3);
    }

    /**
     * 调用 ST 内部 generateRaw 接口发起压缩
     * @param {string} rawChatText - 需要压缩的历史聊天文本
     * @param {Object} options - 自定义配置（提示词、温度、max_tokens等）
     * @returns {Promise<{ raw: string, characterState: string, storySummary: string, tokens: number }>}
     */
    static async compress(rawChatText, options = {}) {
        const systemPrompt = options.prompt || DEFAULT_COMPRESS_PROMPT;
        const maxTokens = options.maxTokens || 1200;

        // 获取 ST 上下文与方法
        const stContext = SillyTavern.getContext();
        const generateRawFn = stContext.generateRaw || window.generateRaw;

        if (typeof generateRawFn !== 'function') {
            throw new Error('未检测到 SillyTavern 的 generateRaw API，请确保插件在 ST 环境中运行。');
        }

        const promptText = `【待压缩的上下文对白】：\n${rawChatText}\n\n请严格基于上述内容提炼输出：`;

        console.log('[Context Compressor] 正在调用前端大模型进行上下文压缩...');

        /** @type {import('../../../script.js').GenerateRawParams} */
        const params = {
            prompt: promptText,
            systemPrompt: systemPrompt,
            responseLength: maxTokens
        };

        const rawResponse = await generateRawFn(params);
        if (!rawResponse || !rawResponse.trim()) {
            throw new Error('大模型返回结果为空');
        }

        // 去除可能的思考链/思维过程 (如 <thought> / <think>)
        let cleanText = rawResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        cleanText = cleanText.replace(/```(?:markdown|txt)?/gi, '').replace(/```/g, '').trim();

        // 结构化分割解析
        const parsed = this.parseStructuredOutput(cleanText);
        const tokenEstimate = this.estimateTokenCount(cleanText);

        return {
            raw: cleanText,
            characterState: parsed.characterState,
            storySummary: parsed.storySummary,
            tokens: tokenEstimate,
            timestamp: Date.now()
        };
    }

    /**
     * 将模型输出解析为角色状态与剧情提要
     */
    static parseStructuredOutput(text) {
        let characterState = '';
        let storySummary = '';

        const charHeaderIdx = text.search(/===角色状态===|【角色状态】|### 角色状态/i);
        const storyHeaderIdx = text.search(/===剧情提要===|【剧情提要】|### 剧情提要/i);

        if (charHeaderIdx !== -1 && storyHeaderIdx !== -1) {
            if (charHeaderIdx < storyHeaderIdx) {
                characterState = text.slice(charHeaderIdx, storyHeaderIdx).replace(/===角色状态===|【角色状态】|### 角色状态/i, '').trim();
                storySummary = text.slice(storyHeaderIdx).replace(/===剧情提要===|【剧情提要】|### 剧情提要/i, '').trim();
            } else {
                storySummary = text.slice(storyHeaderIdx, charHeaderIdx).replace(/===剧情提要===|【剧情提要】|### 剧情提要/i, '').trim();
                characterState = text.slice(charHeaderIdx).replace(/===角色状态===|【角色状态】|### 角色状态/i, '').trim();
            }
        } else if (charHeaderIdx !== -1) {
            characterState = text.slice(charHeaderIdx).replace(/===角色状态===|【角色状态】|### 角色状态/i, '').trim();
        } else if (storyHeaderIdx !== -1) {
            storySummary = text.slice(storyHeaderIdx).replace(/===剧情提要===|【剧情提要】|### 剧情提要/i, '').trim();
        } else {
            // 兜底直接作为剧情提要
            storySummary = text.trim();
        }

        return {
            characterState: characterState || '暂无详细角色状态变动。',
            storySummary: storySummary || text.trim()
        };
    }

    /**
     * 将聊天数组序列化为对白文本供模型阅读
     */
    static formatChatForCompression(chatSlice) {
        if (!Array.isArray(chatSlice) || chatSlice.length === 0) return '';

        return chatSlice.map((msg, idx) => {
            if (msg.is_system) return null;
            const sender = msg.name || (msg.is_user ? 'User' : 'Character');
            const content = (msg.mes || '').trim();
            return `[${sender}]: ${content}`;
        }).filter(Boolean).join('\n\n');
    }

    static getDefaultPrompt() {
        return DEFAULT_COMPRESS_PROMPT;
    }
}
