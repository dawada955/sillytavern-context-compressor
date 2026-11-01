/**
 * Smart Context Compressor - 主控制中心与拦截器
 */

import { ContextCompressor } from './compressor.js';
import { ContextInjector } from './injector.js';
import { CompressorState } from './state.js';
import { CompressorUI } from './ui.js';

/**
 * 执行一次压缩提炼任务
 * @param {boolean} isManual - 是否手动触发
 * @param {number} targetEndIndex - 压缩到的目标楼层索引（默认截断保留区之前）
 */
export async function executeContextCompression(isManual = false, targetEndIndex = null) {
    if (CompressorState.isProcessing()) {
        toastr.warning('当前正有压缩任务进行中，请稍候...', '上下文压缩');
        return false;
    }

    const ctx = SillyTavern.getContext();
    const chat = ctx.chat || [];

    if (chat.length <= 2) {
        if (isManual) toastr.info('当前聊天记录过少，无需压缩。', '上下文压缩');
        return false;
    }

    const settings = CompressorState.getSettings();
    const isFullMode = settings.compressMode === 'full';
    let sessionData = CompressorState.getSessionCompressionData() || {};

    // 1. 硬性铁律判定：计算需要保留的活跃消息条数（1轮 = 2条消息）
    const keepCount = Math.max(2, (settings.keepRounds || 15) * 2);
    const endIndex = targetEndIndex !== null ? targetEndIndex : (chat.length - keepCount);

    // 只要当前总楼层不超过保留区，历史待压缩对白就等于 0，绝无压缩必要
    if (endIndex <= 0) {
        if (isManual) {
            toastr.info(`当前对话（#${chat.length}条）均在保留活跃区（保留 ${settings.keepRounds} 轮 / #${keepCount}条）内，无需压缩。`, '上下文压缩');
        } else {
            console.log(`[Context Compressor] 当前对话均在保留区内 (#${chat.length} <= #${keepCount})，跳过本次自动压缩。`);
        }
        return false;
    }

    // 2. 确定本次压缩的起始位置
    // 全量模式：彻底清空历史旧产物，从第 0 层重新开始
    if (isFullMode) {
        console.log('[Context Compressor] 触发全量模式：已清空历史旧产物，从第 0 条全量提炼。');
        sessionData = {
            lastCompressedIndex: 0,
            characterState: '',
            storySummary: '',
            compressedTokens: 0,
            lastCompressedTime: null
        };
        CompressorState.saveSessionCompressionData(sessionData);
    }

    const effectiveStartIndex = isFullMode ? 0 : (sessionData.lastCompressedIndex || 0);

    // 增量模式下：如果待压缩边界 endIndex 还没超过上次压缩点，说明没有新增待压缩历史
    if (endIndex <= effectiveStartIndex) {
        if (isManual) {
            toastr.info('暂无可压缩的新增历史消息（未超出保留区与上次压缩节点）。', '上下文压缩');
        } else {
            console.log('[Context Compressor] 未压缩消息量不足，跳过本次自动压缩。');
        }
        return false;
    }

    const sliceToCompress = chat.slice(effectiveStartIndex, endIndex);
    if (sliceToCompress.length === 0) {
        if (isManual) toastr.info('暂无可压缩的新历史消息。', '上下文压缩');
        return false;
    }

    const formattedHistoryChat = ContextCompressor.formatChatForCompression(sliceToCompress);
    if (!formattedHistoryChat.trim()) {
        return false;
    }

    // 获取最新保留区对白
    const recentChatSlice = (endIndex < chat.length) ? chat.slice(endIndex) : [];
    const formattedRecentChat = ContextCompressor.formatChatForCompression(recentChatSlice);

    CompressorState.setProcessing(true);
    CompressorUI.updateStatus('正在压缩...', true);

    try {
        const modeLabel = isFullMode ? '【全量模式】' : '【增量模式】';
        toastr.info(`${modeLabel} 正在压缩第 ${effectiveStartIndex + 1} 至 ${endIndex} 条对白...`, '上下文压缩', { timeOut: 3000 });

        // 构建输入
        let compressionInput = '';
        if (!isFullMode) {
            // 增量模式：附带历史基准
            if (sessionData.storySummary) {
                compressionInput += `【此前累积的历史剧情基准】：\n${sessionData.storySummary}\n\n`;
            }
            if (sessionData.characterState) {
                compressionInput += `【此前累积的角色状态基准】：\n${sessionData.characterState}\n\n`;
            }
            compressionInput += `【本次待归纳进剧情提要的历史对白（第 ${startIndex + 1} 至 ${endIndex} 条）】：\n${formattedHistoryChat}\n\n`;
        } else {
            // 全量模式：干净直接的全量对白输入，杜绝任何历史冗余标签污染
            compressionInput += `【完整历史对话记录（第 1 至 ${endIndex} 条）】：\n${formattedHistoryChat}\n\n`;
        }

        if (formattedRecentChat.trim()) {
            compressionInput += `【最新活跃对话（供参考最新角色心境与状态）】：\n${formattedRecentChat}\n\n`;
        }

        const result = await ContextCompressor.compress(compressionInput, {
            prompt: settings.customPrompt,
            maxTokens: settings.maxTokens
        });

        // 保存更新会话元数据（包含 tokens 统计）
        CompressorState.saveSessionCompressionData({
            lastCompressedIndex: endIndex,
            characterState: result.characterState,
            storySummary: result.storySummary,
            compressedTokens: result.tokens || ContextCompressor.estimateTokenCount(result.characterState + '\n' + result.storySummary),
            lastCompressedTime: Date.now()
        });

        console.log('[Context Compressor] 压缩提炼成功！', result);
        toastr.success(`已成功压缩 ${sliceToCompress.length} 条对白，状态已更新！`, '上下文压缩');

        CompressorUI.renderSessionPreview();
        return true;
    } catch (err) {
        if (CompressorState.isAborted()) {
            console.log('[Context Compressor] 用户主动中断了压缩任务。');
            toastr.warning('压缩任务已中断。', '上下文压缩');
            // 恢复之前保存的会话快照
            CompressorUI.renderSessionPreview();
            return false;
        }
        console.error('[Context Compressor] 压缩过程失败:', err);
        toastr.error(`压缩失败: ${err.message || '未知错误'}`, '上下文压缩');
        return false;
    } finally {
        CompressorState.setProcessing(false);
        CompressorState.setAborted(false);
        CompressorUI.updateStatus('就绪', false);
    }
}

/**
 * SillyTavern 生成拦截器
 * 核心逻辑：截断 + 注入剧情提要与角色状态
 */
window.stContextCompressorInterceptor = async function (chat, contextSize, abort, type) {
    const settings = CompressorState.getSettings();
    if (!settings.enabled) {
        return chat;
    }

    // 1. 确保前一轮如果残留 Marker 则无损还原
    ContextInjector.unmountMarker();

    // 2. 检查自动触发条件
    const uncompressedRounds = CompressorState.getUncompressedRoundsCount();
    if (settings.autoTrigger && uncompressedRounds >= (settings.autoTriggerInterval || 10)) {
        console.log(`[Context Compressor] 达到自动触发阈值 (未压缩 ${uncompressedRounds} 轮 >= 阈值 ${settings.autoTriggerInterval})，开始执行压缩...`);
        try {
            await executeContextCompression(false);
        } catch (e) {
            console.warn('[Context Compressor] 自动压缩过程遇到警告:', e);
        }
    }

    // 3. 获取当前会话保存的压缩成果
    const sessionData = CompressorState.getSessionCompressionData();
    const keepRounds = settings.keepRounds || 15;

    // 4. 截断 chat 数组（原位修改发给 LLM 的临时 chat 数组）
    const removedCount = ContextInjector.truncateChatSlice(chat, keepRounds);

    // 5. 若有历史剧情提要且发生了截断，将前情提要注入到截断边界作为桥梁
    if (sessionData && sessionData.storySummary) {
        // 当发生截断或者历史很长时注入提要
        if (removedCount > 0 || (chat.length > keepRounds)) {
            ContextInjector.injectStoryBridge(chat, sessionData.storySummary);
        }
    }

    // 6. 挂载角色最新状态到角色卡
    if (sessionData && sessionData.characterState) {
        ContextInjector.mountCharacterState(
            sessionData.characterState,
            chat
        );
    }

    return chat;
};

// 初始化入口函数
function initExtension() {
    console.log('[Context Compressor] 插件初始化中...');
    CompressorState.init();
    CompressorUI.initUI();

    const ctx = SillyTavern?.getContext ? SillyTavern.getContext() : null;
    // 切换会话时刷新 UI 预览与指示，并在移动端 DOM 发生重排时确保浮球挂载保活
    if (ctx && ctx.eventSource && ctx.event_types) {
        const { eventSource, event_types } = ctx;

        // 发送前即时还原角色卡
        if (event_types.CHAT_COMPLETION_PROMPT_READY) {
            eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, () => {
                ContextInjector.unmountMarker();
            });
        }

        // 生成结束或用户中止时双重安全还原
        if (event_types.GENERATION_ENDED) {
            eventSource.on(event_types.GENERATION_ENDED, () => {
                ContextInjector.unmountMarker();
            });
        }

        if (event_types.GENERATION_STOPPED) {
            eventSource.on(event_types.GENERATION_STOPPED, () => {
                ContextInjector.unmountMarker();
            });
        }

        // 切换会话时刷新 UI 预览与指示
        if (event_types.CHAT_CHANGED) {
            eventSource.on(event_types.CHAT_CHANGED, () => {
                ContextInjector.unmountMarker();
                if (!$('#st-compressor-floating-wrapper').length) {
                    CompressorUI.initUI();
                } else {
                    CompressorUI.renderSessionPreview();
                }
            });
        }
    }

    // 针对移动端初始化异步挂载保活（防止 ST 移动端延迟重刷 body）
    setTimeout(() => {
        if (!$('#st-compressor-floating-wrapper').length) {
            CompressorUI.initUI();
        }
    }, 1500);

    // 注册全局调试/外部调用接口
    window.stContextCompress = {
        compress: executeContextCompression,
        state: CompressorState,
        injector: ContextInjector,
        ui: CompressorUI
    };

    console.log('[Context Compressor] 插件加载完成。');
}

// 扩展初始化
if (document.readyState === 'loading') {
    jQuery(initExtension);
} else {
    initExtension();
}
