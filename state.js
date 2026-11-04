/**
 * Smart Context Compressor - 配置与状态管理模块
 */

import { ContextCompressor } from './compressor.js';

const MODULE_KEY = 'st_context_compressor';

const DEFAULT_SETTINGS = {
    enabled: true,
    compressMode: 'incremental', // 'incremental' (增量压缩) 或 'full' (全量压缩)
    keepRounds: 15, // 保留临近轮数（1轮通常为2条消息）
    autoTrigger: true, // 是否开启自动压缩
    autoTriggerInterval: 10, // 自动压缩触发频率（累积超过多少未压缩轮数）
    customPrompt: ContextCompressor.getDefaultPrompt(),
    maxTokens: 1200
};

export class CompressorState {
    static _isProcessing = false;
    static _isAborted = false;

    /**
     * 初始化插件全局设置
     */
    static init() {
        const ctx = SillyTavern.getContext();
        if (!ctx.extensionSettings[MODULE_KEY]) {
            ctx.extensionSettings[MODULE_KEY] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        } else {
            ctx.extensionSettings[MODULE_KEY] = Object.assign({}, DEFAULT_SETTINGS, ctx.extensionSettings[MODULE_KEY]);
            // 自动无缝升级迁移：若用户本地仍为未携带防42tk过滤的旧版提示词，自动升级为小猫之神文学档案学防封提示词
            const currentPrompt = ctx.extensionSettings[MODULE_KEY].customPrompt;
            if (!currentPrompt || !currentPrompt.includes('[SYSTEM MANDATE: OBJECTIVE FICTIONAL ARCHIVE ENGINE]')) {
                console.log('[Context Compressor] 检测到旧版无防护提示词，已自动无缝平滑升级为虚构文学档案防封提示词！');
                ctx.extensionSettings[MODULE_KEY].customPrompt = ContextCompressor.getDefaultPrompt();
                this.saveSettings();
            }
        }
    }

    static getSettings() {
        const ctx = SillyTavern.getContext();
        return ctx.extensionSettings[MODULE_KEY] || DEFAULT_SETTINGS;
    }

    static saveSettings() {
        const ctx = SillyTavern.getContext();
        if (typeof ctx.saveSettingsDebounced === 'function') {
            ctx.saveSettingsDebounced();
        }
    }

    static isProcessing() {
        return this._isProcessing;
    }

    static setProcessing(status) {
        this._isProcessing = !!status;
    }

    static isAborted() {
        return this._isAborted;
    }

    static setAborted(status) {
        this._isAborted = !!status;
    }

    /**
     * 获取当前会话存储的压缩数据 (绑定在当前会话的 chatMetadata 中)
     */
    static getSessionCompressionData() {
        const ctx = SillyTavern.getContext();
        if (!ctx.chatId) return null;

        const chatMetadata = ctx.chatMetadata || {};
        if (!chatMetadata[MODULE_KEY]) {
            chatMetadata[MODULE_KEY] = {
                lastCompressedIndex: 0,
                characterState: '',
                storySummary: '',
                lastCompressedTime: null
            };
        }
        return chatMetadata[MODULE_KEY];
    }

    /**
     * 保存当前会话压缩数据
     */
    static saveSessionCompressionData(data) {
        const ctx = SillyTavern.getContext();
        if (!ctx.chatId) return;

        if (!ctx.chatMetadata) ctx.chatMetadata = {};
        ctx.chatMetadata[MODULE_KEY] = Object.assign(this.getSessionCompressionData() || {}, data);

        if (typeof ctx.saveMetadataDebounced === 'function') {
            ctx.saveMetadataDebounced();
        }
    }

    /**
     * 计算当前会话自上次压缩以来新增了多少轮消息
     */
    static getUncompressedRoundsCount() {
        const ctx = SillyTavern.getContext();
        const chat = ctx.chat || [];
        const sessionData = this.getSessionCompressionData();
        const lastIndex = sessionData ? sessionData.lastCompressedIndex : 0;

        const uncompressedMessages = Math.max(0, chat.length - lastIndex);
        return Math.floor(uncompressedMessages / 2);
    }
}
