/**
 * Smart Context Compressor - 白色智能悬浮球与卡片UI (重力吸附 + 巨大球形环状按键)
 */

import { CompressorState } from './state.js';
import { executeContextCompression } from './index.js';
import { ContextCompressor } from './compressor.js';

export const CompressorUI = {
    _isOpen: false,

    /**
     * 初始化 UI 容器与悬浮球
     */
    initUI() {
        this.injectFloatingWidget();
        this.bindEvents();
    },

    /**
     * 渲染主体结构
     */
    injectFloatingWidget() {
        $('#st-compressor-floating-wrapper').remove();

        const settings = CompressorState.getSettings();

        const html = `
        <!-- 移动端背景半透明遮罩 -->
        <div id="st-mobile-drawer-backdrop" class="st-mobile-backdrop"></div>

        <div id="st-compressor-floating-wrapper" class="snapped-right">
            <!-- 纯白智能悬浮球 -->
            <div id="st-compressor-ball" class="st-floating-ball">
                <div class="st-ball-core">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="4 14 10 14 10 20"></polyline>
                        <polyline points="20 10 14 10 14 4"></polyline>
                        <line x1="14" y1="10" x2="21" y2="3"></line>
                        <line x1="3" y1="21" x2="10" y2="14"></line>
                    </svg>
                </div>
                <div id="st-ball-pulse" class="st-ball-halo"></div>
            </div>

            <!-- 白色轻拟物展开面板 (展开时固定浮球，禁止拖拽) -->
            <div id="st-compressor-card" class="st-floating-card pos-top-left">
                <div class="st-card-header">
                    <div class="st-header-title">
                        <div class="st-indicator-dot" id="st-status-dot"></div>
                        <span class="st-title-text">上下文压缩</span>
                    </div>
                    <div class="st-header-ctrls">
                        <span id="st-status-badge" class="st-status-tag">就绪</span>
                        <button id="st-card-close-btn" class="st-close-icon">✕</button>
                    </div>
                </div>

                <div class="st-card-body">
                    <!-- 中心球形压缩按键与其外环指示轨道 -->
                    <div class="st-giant-dial-container">
                        <div class="st-dial-ring-wrapper">
                            <!-- SVG 环形进度/保留轮数指示轨道 (直径从160放大到180，半径80) -->
                            <svg class="st-dial-svg" viewBox="0 0 180 180">
                                <circle class="st-dial-bg-track" cx="90" cy="90" r="80"></circle>
                                <circle id="st-dial-progress-arc" class="st-dial-progress" cx="90" cy="90" r="80"
                                    stroke-dasharray="502.65" stroke-dashoffset="200"></circle>
                            </svg>

                            <!-- 中心球形压缩按键（纵向纯粹布局：图标在正上方居中，Tokens数值在正中，进度条在正下方） -->
                            <div class="st-giant-orb-btn" id="st_btn_giant_compress">
                                <div class="st-orb-glow"></div>
                                <div class="st-orb-content">
                                    <div class="st-orb-icon-btn" id="st_btn_toggle_mode">
                                        <span id="st-mode-icon">
                                            ${(settings.compressMode === 'full') ?
                                                `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>` :
                                                `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`
                                            }
                                        </span>
                                    </div>
                                    <div class="st-orb-main-metric">
                                        <span id="st-orb-tokens-val" class="st-orb-tokens">0</span>
                                        <span class="st-orb-unit">Tokens</span>
                                    </div>
                                    <div class="st-orb-sub">压缩进度: #<span id="st-orb-floor-val">0</span> 条</div>
                                </div>
                            </div>
                        </div>

                        <!-- 环绕交互状态显示 -->
                        <div class="st-dial-control-row">
                            <span class="st-dial-label">保留活跃轮数: <strong id="st_compressor_keep_rounds_val" class="text-primary">${settings.keepRounds} 轮</strong></span>
                            <span class="st-dial-sub-label">待压缩: <strong id="st_stat_uncompressed_rounds">0</strong> 轮</span>
                        </div>
                    </div>

                    <!-- 紧凑圆形图标栏位组 (Circular Icon Dock) -->
                    <div class="st-dock-group-container">
                        <div class="st-dock-icons-row">
                            <!-- 1. 保留轮数微调 (点击弹出拖动条) -->
                            <div class="st-dock-item-wrapper" id="st_dock_item_keep_rounds">
                                <button type="button" class="st-dock-btn" id="st_dock_btn_keep_rounds">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    <span class="st-dock-badge" id="st_dock_keep_rounds_badge">${settings.keepRounds}</span>
                                </button>
                                <span class="st-dock-label">保留轮数</span>
                            </div>

                            <!-- 2. 拦截截断 (点击切换开关) -->
                            <div class="st-dock-item-wrapper" id="st_dock_item_enabled">
                                <button type="button" class="st-dock-btn ${settings.enabled ? 'active' : ''}" id="st_dock_btn_enabled">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                    </svg>
                                </button>
                                <span class="st-dock-label">拦截截断</span>
                            </div>

                            <!-- 3. 自动压缩 (点击切换开关，双击或长按/展开调整阈值) -->
                            <div class="st-dock-item-wrapper" id="st_dock_item_auto">
                                <button type="button" class="st-dock-btn ${settings.autoTrigger ? 'active' : ''}" id="st_dock_btn_auto">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                                    </svg>
                                </button>
                                <span class="st-dock-label">自动压缩</span>
                            </div>

                            <!-- 4. 打开窗口 (点击打开大配置弹窗) -->
                            <div class="st-dock-item-wrapper" id="st_dock_item_modal">
                                <button type="button" class="st-dock-btn" id="st_dock_btn_modal">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                </button>
                                <span class="st-dock-label">打开窗口</span>
                            </div>
                        </div>

                        <!-- 容器内滑块调节区（安全内嵌在卡片中，永不被卡片边框遮挡或裁切） -->
                        <div class="st-dock-inline-slider-panel" id="st_panel_keep_rounds" style="display: none;">
                            <div class="st-popover-header">
                                <span>保留轮数调节</span>
                                <strong id="st_popover_keep_val" class="text-primary">${settings.keepRounds} 轮</strong>
                            </div>
                            <input type="range" id="st_compressor_keep_rounds" min="3" max="30" step="1" value="${settings.keepRounds}" />
                        </div>

                        <div class="st-dock-inline-slider-panel" id="st_panel_auto_interval" style="display: none;">
                            <div class="st-popover-header">
                                <span>自动压缩阈值</span>
                                <strong id="st_popover_interval_val" class="text-primary">${settings.autoTriggerInterval} 轮</strong>
                            </div>
                            <input type="range" id="st_compressor_interval" min="5" max="30" step="1" value="${settings.autoTriggerInterval}" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- 紧凑大弹窗：展示压缩成果与配置 -->
            <div id="st-compressor-modal-overlay" class="st-modal-overlay">
                <div class="st-compressor-large-modal">
                    <div class="st-large-modal-header">
                        <div class="st-large-header-left">
                            <div class="st-modal-icon-badge">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                                    <polyline points="2 17 12 22 22 17"></polyline>
                                    <polyline points="2 12 12 17 22 12"></polyline>
                                </svg>
                            </div>
                            <div>
                                <h3 class="st-modal-main-title">压缩管理</h3>
                            </div>
                        </div>
                        <button id="st_btn_close_large_modal" class="st-modal-close-icon">✕</button>
                    </div>

                    <!-- 选项卡切换 -->
                    <div class="st-modal-tabs">
                        <button class="st-modal-tab-btn active" data-tab="result">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            提炼产物
                        </button>
                        <button class="st-modal-tab-btn" data-tab="prompt">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                            提示词
                        </button>
                    </div>

                    <div class="st-large-modal-body">
                        <!-- Tab 1: 压缩结果展示与在线校准 -->
                        <div id="st-tab-content-result" class="st-tab-pane active">
                            <div class="st-result-columns">
                                <div class="st-result-box">
                                    <div class="st-box-header">
                                        <span class="st-box-tag tag-purple">角色状态</span>
                                    </div>
                                    <textarea id="st_modal_char_state" class="st-modal-textarea" rows="12" placeholder="暂无角色状态数据..."></textarea>
                                </div>
                                <div class="st-result-box">
                                    <div class="st-box-header">
                                        <span class="st-box-tag tag-blue">剧情提要</span>
                                    </div>
                                    <textarea id="st_modal_story_summary" class="st-modal-textarea" rows="12" placeholder="暂无剧情提要数据..."></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- Tab 2: 提示词模板编辑与重置 -->
                        <div id="st-tab-content-prompt" class="st-tab-pane">
                            <div class="st-prompt-box">
                                <div class="st-prompt-header-row">
                                    <div>
                                        <span class="st-box-tag tag-green">系统提示词</span>
                                    </div>
                                    <button id="st_btn_modal_restore_prompt" class="st-btn-outline-danger">
                                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                                        恢复默认
                                    </button>
                                </div>
                                <textarea id="st_modal_compress_prompt" class="st-modal-textarea font-mono" rows="14" placeholder="加载中..."></textarea>
                            </div>
                        </div>
                    </div>

                    <div class="st-large-modal-footer">
                        <div class="st-footer-status">
                            <span>产物预估: </span><strong id="st-modal-status-tokens" class="text-primary">0 Tokens</strong>
                        </div>
                        <div class="st-footer-actions">
                            <button id="st_btn_modal_cancel" class="st-modal-btn st-btn-cancel">取消</button>
                            <button id="st_btn_modal_save_all" class="st-modal-btn st-btn-save">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        $('body').append(html);
        this.updateDialArc(settings.keepRounds);
    },

    /**
     * 更新外环圆弧进度 (外环半径 80，周长 502.65)
     */
    updateDialArc(rounds) {
        const min = 3;
        const max = 30;
        const pct = Math.max(0, Math.min(1, (rounds - min) / (max - min)));
        const circumference = 2 * Math.PI * 80; // 502.65
        const offset = circumference * (1 - pct);
        const arc = document.getElementById('st-dial-progress-arc');
        if (arc) {
            arc.style.strokeDashoffset = offset;
        }
    },

    /**
     * 绑定交互与拖拽事件
     */
    bindEvents() {
        const self = this;
        const settings = CompressorState.getSettings();
        const ball = $('#st-compressor-ball');
        const card = $('#st-compressor-card');

        // 1. 点击悬浮球展开/收起面板
        ball.on('click', (e) => {
            if (ball.data('isDragging')) return;
            this.togglePanel();
        });

        // 2. 点击关闭按钮与移动端遮罩关闭
        $('#st-card-close-btn, #st-mobile-drawer-backdrop').on('click', () => {
            this.togglePanel(false);
        });

        // 3. 悬浮球自由拖拽定位（带侧边栏重力吸附 + 展开时固定禁用拖拽）
        this.makeDraggableWithSnap(ball[0]);

        // 4. 表单与圆形图标栏位组交互
        // 4.0 压缩球中心图标：常态切换模式 / 压缩中转换为中断中止
        $('#st_btn_toggle_mode').on('click mousedown touchstart', (e) => {
            e.stopPropagation();
        });

        $('#st_btn_toggle_mode').on('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            // 若当前正在压缩运行中，点击则触发【中断中止】
            if (CompressorState.isProcessing()) {
                CompressorState.setAborted(true);
                // 调用 SillyTavern 内置中止生成接口
                const ctx = SillyTavern.getContext();
                if (typeof ctx.stopGenerating === 'function') {
                    ctx.stopGenerating();
                } else if (typeof window.stopGenerating === 'function') {
                    window.stopGenerating();
                }
                self.updateStatus('已中断', false);
                toastr.warning('已中止当前正在进行的压缩提炼任务。', '上下文压缩');
                return;
            }

            // 常态：切换模式 (增量 / 全量)
            settings.compressMode = (settings.compressMode === 'full') ? 'incremental' : 'full';
            CompressorState.saveSettings();

            const isFull = settings.compressMode === 'full';
            const iconSvg = isFull ?
                `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>` :
                `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;

            $('#st-mode-icon').html(iconSvg);
            toastr.info(`已切换为: ${isFull ? '全量压缩模式' : '增量压缩模式'}`, '上下文压缩');
        });

        // 4.1 保留轮数弹窗切换与滑动控制
        $('#st_dock_btn_keep_rounds').on('click', (e) => {
            e.stopPropagation();
            $('#st_panel_auto_interval').slideUp(150);
            $('#st_panel_keep_rounds').slideToggle(200);
        });

        $('#st_compressor_keep_rounds').on('input', function () {
            const val = parseInt($(this).val(), 10);
            settings.keepRounds = val;
            $('#st_compressor_keep_rounds_val').text(`${val} 轮`);
            $('#st_popover_keep_val').text(`${val} 轮`);
            $('#st_dock_keep_rounds_badge').text(val);
            self.updateDialArc(val);
            CompressorState.saveSettings();
        });

        // 4.2 拦截截断圆形开关切换
        $('#st_dock_btn_enabled').on('click', function () {
            settings.enabled = !settings.enabled;
            $(this).toggleClass('active', settings.enabled);
            CompressorState.saveSettings();
            toastr.info(`智能截断已${settings.enabled ? '开启' : '关闭'}`, '上下文压缩');
        });

        // 4.3 自动压缩圆形开关与阈值控制
        $('#st_dock_btn_auto').on('click', function (e) {
            e.stopPropagation();
            settings.autoTrigger = !settings.autoTrigger;
            $(this).toggleClass('active', settings.autoTrigger);
            if (!settings.autoTrigger) {
                $('#st_panel_auto_interval').slideUp(150);
            }
            CompressorState.saveSettings();
            toastr.info(`自动压缩已${settings.autoTrigger ? '开启' : '关闭'}`, '上下文压缩');
        });

        // 右键或长按自动压缩按钮弹出阈值拖动条
        $('#st_dock_btn_auto').on('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            $('#st_panel_keep_rounds').slideUp(150);
            $('#st_panel_auto_interval').slideToggle(200);
        });

        // 增加双击展开自动阈值拖动条
        $('#st_dock_btn_auto').on('dblclick', (e) => {
            e.stopPropagation();
            $('#st_panel_keep_rounds').slideUp(150);
            $('#st_panel_auto_interval').slideToggle(200);
        });

        $('#st_compressor_interval').on('input', function () {
            const val = parseInt($(this).val(), 10);
            settings.autoTriggerInterval = val;
            $('#st_popover_interval_val').text(`${val} 轮`);
            CompressorState.saveSettings();
        });

        // 点击外部关闭圆形按钮弹出的面板
        $(document).on('click', (e) => {
            if (!$(e.target).closest('.st-dock-group-container').length) {
                $('#st_panel_keep_rounds, #st_panel_auto_interval').slideUp(150);
            }
        });

        // 4.4 打开窗口按键交互 (圆形图标栏与原有按键均支持)
        $('#st_dock_btn_modal, #st_btn_open_detail_modal').on('click', () => {
            $('#st_panel_keep_rounds, #st_panel_auto_interval').hide();
            self.openLargeModal();
        });

        // 巨大球形按键：立即执行压缩 (带 token 数值增长进度效果)
        $('#st_btn_giant_compress').on('click', async (e) => {
            // 如果点击的是顶部的模式切换按钮，则不触发压缩
            if ($(e.target).closest('#st_btn_toggle_mode').length) {
                return;
            }
            await self.executeCompressionWithGrowthEffect();
        });

        // 大弹窗关闭/取消
        $('#st_btn_close_large_modal, #st_btn_modal_cancel').on('click', () => {
            self.closeLargeModal();
        });

        // 点击遮罩外层关闭大弹窗
        $('#st-compressor-modal-overlay').on('click', (e) => {
            if (e.target.id === 'st-compressor-modal-overlay') {
                self.closeLargeModal();
            }
        });

        // 选项卡切换
        $('.st-modal-tab-btn').on('click', function () {
            const targetTab = $(this).data('tab');
            $('.st-modal-tab-btn').removeClass('active');
            $(this).addClass('active');

            $('.st-tab-pane').removeClass('active');
            $(`#st-tab-content-${targetTab}`).addClass('active');
        });

        // 恢复默认提示词
        $('#st_btn_modal_restore_prompt').on('click', () => {
            const defaultPrompt = ContextCompressor.getDefaultPrompt();
            $('#st_modal_compress_prompt').val(defaultPrompt);
            toastr.info('已还原默认压缩提示词模板（点击保存后生效）。', '上下文压缩');
        });

        // 大弹窗统一保存所有配置与微调内容
        $('#st_btn_modal_save_all').on('click', () => {
            const charState = $('#st_modal_char_state').val();
            const storySummary = $('#st_modal_story_summary').val();
            const customPrompt = $('#st_modal_compress_prompt').val();

            // 保存设置
            settings.customPrompt = customPrompt;
            CompressorState.saveSettings();

            // 保存提炼产物
            const tokens = ContextCompressor.estimateTokenCount(charState + '\n' + storySummary);
            CompressorState.saveSessionCompressionData({
                characterState: charState,
                storySummary: storySummary,
                compressedTokens: tokens
            });

            toastr.success('已保存配置与上下文成果！', '上下文压缩');
            self.renderSessionPreview();
            self.closeLargeModal();
        });

        this.renderSessionPreview();
    },

    /**
     * 打开全景大弹窗
     */
    openLargeModal() {
        const settings = CompressorState.getSettings();
        const sessionData = CompressorState.getSessionCompressionData() || {};

        $('#st_modal_char_state').val(sessionData.characterState || '');
        $('#st_modal_story_summary').val(sessionData.storySummary || '');
        $('#st_modal_compress_prompt').val(settings.customPrompt || ContextCompressor.getDefaultPrompt());

        const tokenCount = sessionData.compressedTokens || ContextCompressor.estimateTokenCount((sessionData.characterState || '') + '\n' + (sessionData.storySummary || ''));
        $('#st-modal-status-tokens').text(`${tokenCount} Tokens`);

        $('#st-compressor-modal-overlay').addClass('active');
    },

    /**
     * 关闭全景大弹窗
     */
    closeLargeModal() {
        $('#st-compressor-modal-overlay').removeClass('active');
    },

    /**
     * 智能计算展开方向，防止任何边界遮挡
     */
    adjustCardOrientation() {
        const ball = $('#st-compressor-ball');
        const card = $('#st-compressor-card');
        if (!ball.length || !card.length) return;

        const ballRect = ball[0].getBoundingClientRect();
        const cardWidth = 320;
        const cardHeight = 440;

        const hasLeftSpace = ballRect.left >= cardWidth;
        const hasTopSpace = ballRect.top >= cardHeight;
        const hasBottomSpace = (window.innerHeight - ballRect.bottom) >= cardHeight;

        let orientationClass = 'pos-top-left';

        if (!hasTopSpace && hasBottomSpace) {
            orientationClass = hasLeftSpace ? 'pos-bottom-left' : 'pos-bottom-right';
        } else {
            orientationClass = hasLeftSpace ? 'pos-top-left' : 'pos-top-right';
        }

        card.removeClass('pos-top-left pos-top-right pos-bottom-left pos-bottom-right')
            .addClass(orientationClass);
    },

    /**
     * 悬浮球拖拽逻辑：具备【侧边栏重力吸附 (Magnetic Snap)】与【展开固定锁 (Lock On Open)】
     */
    makeDraggableWithSnap(elm) {
        const self = this;
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let isDrag = false;
        let touchStartTime = 0;
        let touchStartPos = { x: 0, y: 0 };

        // 桌面端鼠标事件
        elm.onmousedown = dragMouseDown;

        // 移动端/触摸屏事件
        elm.addEventListener('touchstart', onTouchStart, { passive: false });
        elm.addEventListener('touchmove', onTouchMove, { passive: false });
        elm.addEventListener('touchend', onTouchEnd, { passive: false });

        function onTouchStart(e) {
            if (self._isOpen) return;
            const touch = e.touches[0];
            touchStartTime = Date.now();
            touchStartPos = { x: touch.clientX, y: touch.clientY };
            pos3 = touch.clientX;
            pos4 = touch.clientY;
            isDrag = false;
            $(elm).data('isDragging', false);

            const wrapper = $('#st-compressor-floating-wrapper');
            wrapper.removeClass('snapping');
        }

        function onTouchMove(e) {
            if (self._isOpen) return;
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - touchStartPos.x);
            const deltaY = Math.abs(touch.clientY - touchStartPos.y);

            if (deltaX > 6 || deltaY > 6) {
                isDrag = true;
                $(elm).data('isDragging', true);
                if (e.cancelable) e.preventDefault();
            }

            pos1 = pos3 - touch.clientX;
            pos2 = pos4 - touch.clientY;
            pos3 = touch.clientX;
            pos4 = touch.clientY;

            const wrapper = $('#st-compressor-floating-wrapper');
            const newTop = wrapper[0].offsetTop - pos2;
            const newLeft = wrapper[0].offsetLeft - pos1;

            wrapper.css({
                top: Math.max(12, Math.min(window.innerHeight - 60, newTop)) + 'px',
                left: Math.max(12, Math.min(window.innerWidth - 60, newLeft)) + 'px',
                right: 'auto',
                bottom: 'auto'
            });

            self.adjustCardOrientation();
        }

        function onTouchEnd(e) {
            const touchDuration = Date.now() - touchStartTime;
            if (isDrag) {
                self.snapToClosestEdge();
            } else if (touchDuration < 300) {
                // 触摸轻触展开事件 (Touch Tap to open/toggle)
                if (e.cancelable) e.preventDefault();
                self.togglePanel();
            }

            setTimeout(() => {
                $(elm).data('isDragging', false);
            }, 100);
        }

        function dragMouseDown(e) {
            e = e || window.event;
            if (e.button !== 0) return;

            // 【关键点】：当展开卡片时，禁止拖动，锁死浮球位置
            if (self._isOpen) {
                return;
            }

            const wrapper = $('#st-compressor-floating-wrapper');
            wrapper.removeClass('snapping'); // 拖动时移除平滑吸附类

            pos3 = e.clientX;
            pos4 = e.clientY;
            isDrag = false;
            $(elm).data('isDragging', false);

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            const deltaX = Math.abs(e.clientX - pos3);
            const deltaY = Math.abs(e.clientY - pos4);

            if (deltaX > 3 || deltaY > 3) {
                isDrag = true;
                $(elm).data('isDragging', true);
            }

            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            const wrapper = $('#st-compressor-floating-wrapper');
            const newTop = wrapper[0].offsetTop - pos2;
            const newLeft = wrapper[0].offsetLeft - pos1;

            wrapper.css({
                top: Math.max(12, Math.min(window.innerHeight - 60, newTop)) + 'px',
                left: Math.max(12, Math.min(window.innerWidth - 60, newLeft)) + 'px',
                right: 'auto',
                bottom: 'auto'
            });

            self.adjustCardOrientation();
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;

            // 触发【侧边重力吸附】
            if (isDrag) {
                self.snapToClosestEdge();
            }

            setTimeout(() => {
                $(elm).data('isDragging', false);
            }, 100);
        }
    },

    /**
     * 自动向左侧壁或右侧壁吸附
     */
    snapToClosestEdge() {
        const wrapper = $('#st-compressor-floating-wrapper');
        if (!wrapper.length) return;

        const rect = wrapper[0].getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const middle = screenWidth / 2;
        const ballCenter = rect.left + rect.width / 2;

        const snapPadding = 16; // 吸附边距
        wrapper.addClass('snapping'); // 开启弹性吸附过渡动画

        if (ballCenter >= middle) {
            // 吸附到右边缘
            wrapper.css({
                left: (screenWidth - rect.width - snapPadding) + 'px'
            }).removeClass('snapped-left').addClass('snapped-right');
        } else {
            // 吸附到左边缘
            wrapper.css({
                left: snapPadding + 'px'
            }).removeClass('snapped-right').addClass('snapped-left');
        }

        this.adjustCardOrientation();
    },

    /**
     * 打开/关闭卡片
     */
    togglePanel(forceState) {
        this._isOpen = forceState !== undefined ? forceState : !this._isOpen;
        const card = $('#st-compressor-card');
        const ball = $('#st-compressor-ball');
        const wrapper = $('#st-compressor-floating-wrapper');
        const backdrop = $('#st-mobile-drawer-backdrop');

        if (this._isOpen) {
            this.adjustCardOrientation();
            card.addClass('open');
            ball.addClass('active');
            backdrop.addClass('active');
            wrapper.addClass('locked'); // 锁定悬浮球
            this.renderSessionPreview();
        } else {
            card.removeClass('open');
            ball.removeClass('active');
            backdrop.removeClass('active');
            wrapper.removeClass('locked'); // 解除锁定
        }
    },

    /**
     * 状态更新
     */
    updateStatus(text, isBusy = false) {
        const badge = $('#st-status-badge');
        const dot = $('#st-status-dot');
        const halo = $('#st-ball-pulse');
        const orb = $('#st_btn_giant_compress');
        const modeBtn = $('#st_btn_toggle_mode');
        const modeIcon = $('#st-mode-icon');
        const settings = CompressorState.getSettings();

        badge.text(text);
        if (isBusy) {
            badge.addClass('busy');
            dot.addClass('busy');
            halo.addClass('busy');
            orb.addClass('busy');

            // 压缩运行中：将模式切换按键转换为纯橙红呼吸发光中断球
            modeBtn.addClass('abort-mode').attr('title', '点击中断当前压缩');
            modeIcon.empty(); // 纯橙红光球，无图标干扰
        } else {
            badge.removeClass('busy');
            dot.removeClass('busy');
            halo.removeClass('busy');
            orb.removeClass('busy');

            // 恢复模式切换按键状态
            modeBtn.removeClass('abort-mode').attr('title', '点击切换压缩模式 (增量 / 全量)');
            const isFull = settings.compressMode === 'full';
            const iconSvg = isFull ?
                `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>` :
                `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
            modeIcon.html(iconSvg);
        }
    },

    /**
     * 刷新会话统计与预览
     */
    renderSessionPreview() {
        const ctx = SillyTavern.getContext();
        const chat = ctx.chat || [];
        const sessionData = CompressorState.getSessionCompressionData() || {};

        const uncompressedRounds = CompressorState.getUncompressedRoundsCount();
        $('#st_stat_uncompressed_rounds').text(uncompressedRounds);

        // 巨大球形按键中心指标展示
        const lastIdx = sessionData.lastCompressedIndex || 0;
        let tokenCount = sessionData.compressedTokens;
        if (!tokenCount && (sessionData.characterState || sessionData.storySummary)) {
            tokenCount = ContextCompressor.estimateTokenCount((sessionData.characterState || '') + '\n' + (sessionData.storySummary || ''));
        }
        $('#st-orb-tokens-val').text(tokenCount || 0);
        $('#st-orb-floor-val').text(lastIdx);

        $('#st_preview_char_state').val(sessionData.characterState || '');
        $('#st_preview_story_summary').val(sessionData.storySummary || '');

        const settings = CompressorState.getSettings();
        this.updateDialArc(settings.keepRounds || 15);
    },

    /**
     * 执行压缩任务并伴随中心球 Token 数值动态增长拟物效果
     */
    async executeCompressionWithGrowthEffect() {
        if (CompressorState.isProcessing()) {
            toastr.warning('压缩已在进行中...', '上下文压缩');
            return;
        }

        const settings = CompressorState.getSettings();
        const isFullMode = settings.compressMode === 'full';
        const orbValEl = $('#st-orb-tokens-val');
        const orbBtn = $('#st_btn_giant_compress');
        let startVal = parseInt(orbValEl.text(), 10) || 0;

        // 全量模式下：立即将界面显示归零，表明彻底从头重构提炼
        if (isFullMode) {
            startVal = 0;
            orbValEl.text(0);
            $('#st-orb-floor-val').text(0);
        }

        // 启动纯外部光晕呼吸高亮（尺寸零缩放）
        orbBtn.addClass('compressing');

        // 执行真实压缩提炼
        const success = await executeContextCompression(true);

        if (success) {
            const sessionData = CompressorState.getSessionCompressionData() || {};
            const finalTokens = sessionData.compressedTokens || 320;

            // 全量模式从 0 滚增，增量模式从原有旧值平滑滚增
            this.animateTokenGrowth(startVal, finalTokens, 1300);
        }

        setTimeout(() => {
            orbBtn.removeClass('compressing');
        }, 1600);
    },

    /**
     * Token 数值动态增长动画
     */
    animateTokenGrowth(fromVal, toVal, duration = 1000) {
        const orbValEl = $('#st-orb-tokens-val');
        const startTime = performance.now();
        const diff = toVal - fromVal;

        orbValEl.addClass('token-growing');

        function updateStep(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);
            // 缓动曲线 easeOutCubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.round(fromVal + (diff * easeOut));

            orbValEl.text(currentVal);

            if (progress < 1) {
                requestAnimationFrame(updateStep);
            } else {
                orbValEl.text(toVal);
                setTimeout(() => {
                    orbValEl.removeClass('token-growing');
                }, 300);
            }
        }

        requestAnimationFrame(updateStep);
    }
};
