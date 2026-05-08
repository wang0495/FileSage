/**
 * FileSage - 智能文件管家
 * 前端交互逻辑
 */

(function () {
    'use strict';

    // ========== 状态管理 ==========
    const state = {
        currentPage: 'dashboard',
        currentCategory: '',
        currentSort: 'time',
        currentOrder: 'desc',
        currentView: 'grid',
        searchQuery: '',
        files: [],
        stats: null,
        deleteTarget: null,
    };

    // ========== DOM 引用 ==========
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const DOM = {
        // 侧边栏
        sidebar: $('#sidebar'),
        menuToggle: $('#menuToggle'),
        navItems: $$('.nav-item'),
        categoryItems: $$('.category-item'),

        // 顶部栏
        searchInput: $('#searchInput'),
        searchClear: $('#searchClear'),
        themeToggle: $('#themeToggle'),
        refreshBtn: $('#refreshBtn'),
        uploadTrigger: $('#uploadTrigger'),

        // 页面
        pages: $$('.page'),
        fileGrid: $('#fileGrid'),
        filesEmpty: $('#filesEmpty'),
        fileLoader: $('#fileLoader'),

        // 仪表盘
        statTotalFiles: $('#statTotalFiles'),
        statTotalSize: $('#statTotalSize'),
        statImageCount: $('#statImageCount'),
        statDocCount: $('#statDocCount'),
        pieChart: $('#pieChart'),
        pieCenterValue: $('#pieCenterValue'),
        pieLegend: $('#pieLegend'),
        barChart: $('#barChart'),
        recentList: $('#recentList'),
        storageFill: $('#storageFill'),
        storageText: $('#storageText'),

        // 分类计数
        countAll: $('#countAll'),
        countImage: $('#countImage'),
        countDocument: $('#countDocument'),
        countVideo: $('#countVideo'),
        countAudio: $('#countAudio'),
        countCode: $('#countCode'),
        countArchive: $('#countArchive'),
        countOther: $('#countOther'),

        // 上传
        uploadZone: $('#uploadZone'),
        fileInput: $('#fileInput'),
        uploadProgressList: $('#uploadProgressList'),

        // 排序
        sortBtn: $('#sortBtn'),
        sortMenu: $('#sortMenu'),
        sortOptions: $$('.sort-option'),
        viewBtns: $$('.view-btn'),

        // 模态框
        previewModal: $('#previewModal'),
        previewTitle: $('#previewTitle'),
        previewBody: $('#previewBody'),
        previewClose: $('#previewClose'),
        previewDownload: $('#previewDownload'),
        deleteModal: $('#deleteModal'),
        deleteFileName: $('#deleteFileName'),
        deleteCancel: $('#deleteCancel'),
        deleteConfirm: $('#deleteConfirm'),

        // Toast
        toastContainer: $('#toastContainer'),
    };

    // ========== 粒子背景 ==========
    function initParticles() {
        const canvas = $('#particleCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let particles = [];
        let animationId;

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        function createParticles() {
            particles = [];
            const count = Math.floor((canvas.width * canvas.height) / 15000);
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    radius: Math.random() * 1.5 + 0.5,
                    opacity: Math.random() * 0.5 + 0.1,
                });
            }
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            const lineColor = isDark ? '168, 85, 247' : '168, 85, 247';
            const dotColor = isDark ? '168, 85, 247' : '120, 60, 200';

            particles.forEach((p, i) => {
                // 更新位置
                p.x += p.vx;
                p.y += p.vy;

                // 边界反弹
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                // 画点
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${dotColor}, ${p.opacity})`;
                ctx.fill();

                // 连线
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(${lineColor}, ${0.08 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            });

            animationId = requestAnimationFrame(draw);
        }

        resize();
        createParticles();
        draw();

        window.addEventListener('resize', () => {
            resize();
            createParticles();
        });
    }

    // ========== Toast 通知 ==========
    function showToast(message, type = 'info') {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle',
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
        DOM.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ========== 波纹效果 ==========
    function addRipple(e, element) {
        const rect = element.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        element.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }

    // ========== API 请求 ==========
    async function api(url, options = {}) {
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '请求失败');
            }
            return data;
        } catch (error) {
            showToast(error.message, 'error');
            throw error;
        }
    }

    // ========== 页面切换 ==========
    function switchPage(page) {
        state.currentPage = page;

        DOM.pages.forEach((p) => p.classList.remove('active'));
        DOM.navItems.forEach((n) => n.classList.remove('active'));

        const pageMap = { dashboard: 'pageDashboard', files: 'pageFiles', upload: 'pageUpload' };
        const target = $(`#${pageMap[page]}`);
        if (target) target.classList.add('active');

        DOM.navItems.forEach((n) => {
            if (n.dataset.page === page) n.classList.add('active');
        });

        // 关闭移动端侧边栏
        DOM.sidebar.classList.remove('open');
        removeOverlay();

        // 加载数据
        if (page === 'dashboard') loadStats();
        if (page === 'files') loadFiles();
    }

    // ========== 侧边栏遮罩 ==========
    function addOverlay() {
        if ($('.sidebar-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay show';
        overlay.addEventListener('click', () => {
            DOM.sidebar.classList.remove('open');
            removeOverlay();
        });
        document.body.appendChild(overlay);
    }

    function removeOverlay() {
        const overlay = $('.sidebar-overlay');
        if (overlay) overlay.remove();
    }

    // ========== 加载文件列表 ==========
    async function loadFiles() {
        DOM.fileLoader.style.display = 'flex';
        DOM.fileGrid.style.display = 'none';

        try {
            const params = new URLSearchParams();
            if (state.currentCategory) params.set('category', state.currentCategory);
            if (state.searchQuery) params.set('search', state.searchQuery);
            if (state.currentSort) params.set('sort', state.currentSort);
            if (state.currentOrder) params.set('order', state.currentOrder);

            const data = await api(`/api/files?${params.toString()}`);
            state.files = data.files;
            renderFiles();
        } catch (e) {
            // 错误已在 api() 中处理
        } finally {
            DOM.fileLoader.style.display = 'none';
            DOM.fileGrid.style.display = '';
        }
    }

    // ========== 渲染文件列表 ==========
    function renderFiles() {
        if (state.files.length === 0) {
            DOM.fileGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>${state.searchQuery ? '未找到匹配的文件' : '暂无文件'}</p>
                    <span>${state.searchQuery ? '尝试其他搜索关键词' : '拖拽文件到此处或点击上传按钮'}</span>
                </div>
            `;
            return;
        }

        DOM.fileGrid.innerHTML = state.files.map((file, index) => `
            <div class="file-card" data-filename="${escapeHtml(file.filename)}" style="animation-delay: ${index * 0.05}s">
                <div class="file-card-actions">
                    <button class="file-action-btn preview-btn" data-filename="${escapeHtml(file.filename)}" title="预览">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="file-action-btn delete-btn" data-filename="${escapeHtml(file.filename)}" data-name="${escapeHtml(file.original_name)}" title="删除">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <div class="file-card-icon" style="background: ${file.category_color}15; color: ${file.category_color}; border: 1px solid ${file.category_color}30;">
                    <i class="fas ${file.category_icon}"></i>
                </div>
                <div class="file-card-name" title="${escapeHtml(file.original_name)}">${escapeHtml(file.original_name)}</div>
                <div class="file-card-meta">
                    <span class="file-card-info"><i class="fas fa-tag"></i>${file.category_label}</span>
                    <span class="file-card-info"><i class="fas fa-hdd"></i>${file.size_formatted}</span>
                    <span class="file-card-info"><i class="fas fa-clock"></i>${file.upload_time}</span>
                </div>
            </div>
        `).join('');

        // 绑定事件
        DOM.fileGrid.querySelectorAll('.file-card').forEach((card) => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.file-action-btn')) return;
                const filename = card.dataset.filename;
                openPreview(filename);
            });
        });

        DOM.fileGrid.querySelectorAll('.preview-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openPreview(btn.dataset.filename);
            });
        });

        DOM.fileGrid.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDeleteModal(btn.dataset.filename, btn.dataset.name);
            });
        });
    }

    // ========== 加载统计信息 ==========
    async function loadStats() {
        try {
            const data = await api('/api/stats');
            state.stats = data;
            renderStats(data);
        } catch (e) {
            // 错误已在 api() 中处理
        }
    }

    // ========== 渲染统计信息 ==========
    function renderStats(stats) {
        // 基本统计
        DOM.statTotalFiles.textContent = stats.total_files;
        DOM.statTotalSize.textContent = stats.total_size_formatted;

        const imageCount = (stats.categories.image && stats.categories.image.count) || 0;
        const docCount = (stats.categories.document && stats.categories.document.count) || 0;
        DOM.statImageCount.textContent = imageCount;
        DOM.statDocCount.textContent = docCount;

        // 分类计数
        DOM.countAll.textContent = stats.total_files;
        DOM.countImage.textContent = imageCount;
        DOM.countDocument.textContent = docCount;
        DOM.countVideo.textContent = (stats.categories.video && stats.categories.video.count) || 0;
        DOM.countAudio.textContent = (stats.categories.audio && stats.categories.audio.count) || 0;
        DOM.countCode.textContent = (stats.categories.code && stats.categories.code.count) || 0;
        DOM.countArchive.textContent = (stats.categories.archive && stats.categories.archive.count) || 0;
        DOM.countOther.textContent = (stats.categories.other && stats.categories.other.count) || 0;

        // 存储信息
        const maxSize = 1024 * 1024 * 1024; // 1GB
        const usagePercent = Math.min((stats.total_size / maxSize) * 100, 100);
        DOM.storageFill.style.width = usagePercent + '%';
        DOM.storageText.textContent = `${stats.total_size_formatted} 已使用`;

        // 饼图
        renderPieChart(stats);

        // 进度条
        renderBarChart(stats);

        // 最近上传
        renderRecentFiles(stats.recent_files);
    }

    // ========== 渲染饼图 ==========
    function renderPieChart(stats) {
        const categories = Object.values(stats.categories);
        DOM.pieCenterValue.textContent = stats.total_files;

        if (categories.length === 0) {
            DOM.pieChart.style.background = 'var(--bg-tertiary)';
            DOM.pieLegend.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">暂无数据</span>';
            return;
        }

        // 构建 conic-gradient
        let gradientParts = [];
        let currentAngle = 0;

        categories.forEach((cat) => {
            const angle = (cat.percentage / 100) * 360;
            gradientParts.push(`${cat.color} ${currentAngle}deg ${currentAngle + angle}deg`);
            currentAngle += angle;
        });

        DOM.pieChart.style.background = `conic-gradient(${gradientParts.join(', ')})`;

        // 图例
        DOM.pieLegend.innerHTML = categories.map((cat) => `
            <div class="legend-item">
                <span class="legend-dot" style="background: ${cat.color};"></span>
                <span class="legend-label">${cat.label}</span>
                <span class="legend-value">${cat.count} (${cat.percentage}%)</span>
            </div>
        `).join('');
    }

    // ========== 渲染进度条 ==========
    function renderBarChart(stats) {
        const categories = Object.values(stats.categories);

        if (categories.length === 0) {
            DOM.barChart.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">暂无数据</span>';
            return;
        }

        const maxCount = Math.max(...categories.map((c) => c.count));

        DOM.barChart.innerHTML = categories.map((cat) => `
            <div class="bar-item">
                <div class="bar-header">
                    <span class="bar-label"><i class="fas ${cat.icon}" style="color: ${cat.color};"></i> ${cat.label}</span>
                    <span class="bar-value">${cat.count} 个文件 / ${cat.size_formatted}</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${(cat.count / maxCount) * 100}%; background: ${cat.color};"></div>
                </div>
            </div>
        `).join('');
    }

    // ========== 渲染最近上传 ==========
    function renderRecentFiles(files) {
        if (!files || files.length === 0) {
            DOM.recentList.innerHTML = `
                <div class="empty-state" style="padding: 30px;">
                    <i class="fas fa-inbox"></i>
                    <p>暂无文件</p>
                </div>
            `;
            return;
        }

        DOM.recentList.innerHTML = files.map((file) => `
            <div class="recent-item" data-filename="${escapeHtml(file.filename)}">
                <div class="recent-icon" style="background: ${file.category_color}15; color: ${file.category_color};">
                    <i class="fas ${file.category_icon}"></i>
                </div>
                <div class="recent-info">
                    <div class="recent-name" title="${escapeHtml(file.original_name)}">${escapeHtml(file.original_name)}</div>
                    <div class="recent-meta">
                        <span><i class="fas fa-hdd"></i> ${file.size_formatted}</span>
                        <span><i class="fas fa-clock"></i> ${file.upload_time}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // 绑定点击预览
        DOM.recentList.querySelectorAll('.recent-item').forEach((item) => {
            item.addEventListener('click', () => {
                openPreview(item.dataset.filename);
            });
        });
    }

    // ========== 文件上传 ==========
    function uploadFiles(files) {
        if (!files || files.length === 0) return;

        Array.from(files).forEach((file) => {
            uploadSingleFile(file);
        });
    }

    function uploadSingleFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        // 创建进度条
        const progressItem = document.createElement('div');
        progressItem.className = 'upload-progress-item';
        progressItem.innerHTML = `
            <div class="upload-progress-header">
                <span class="upload-progress-name">${escapeHtml(file.name)}</span>
                <span class="upload-progress-status uploading">上传中...</span>
            </div>
            <div class="upload-progress-bar">
                <div class="upload-progress-fill"></div>
            </div>
        `;
        DOM.uploadProgressList.prepend(progressItem);

        const fill = progressItem.querySelector('.upload-progress-fill');
        const status = progressItem.querySelector('.upload-progress-status');

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                fill.style.width = percent + '%';
                status.textContent = `${percent}%`;
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 201) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    fill.style.width = '100%';
                    status.textContent = '上传成功';
                    status.className = 'upload-progress-status success';
                    showToast(`${data.file.original_name} 上传成功`, 'success');
                } catch (e) {
                    status.textContent = '上传成功';
                    status.className = 'upload-progress-status success';
                    showToast('文件上传成功', 'success');
                }
            } else {
                try {
                    const data = JSON.parse(xhr.responseText);
                    status.textContent = data.error || '上传失败';
                } catch (e) {
                    status.textContent = '上传失败';
                }
                status.className = 'upload-progress-status error';
                fill.style.background = 'var(--accent-red)';
                showToast('文件上传失败', 'error');
            }

            // 刷新数据
            loadStats();
            if (state.currentPage === 'files') loadFiles();
        });

        xhr.addEventListener('error', () => {
            status.textContent = '网络错误';
            status.className = 'upload-progress-status error';
            fill.style.background = 'var(--accent-red)';
            showToast('网络错误，上传失败', 'error');
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
    }

    // ========== 文件预览 ==========
    async function openPreview(filename) {
        DOM.previewTitle.textContent = '加载中...';
        DOM.previewBody.innerHTML = '<div class="loader"><div class="loader-spinner"></div><span>加载中...</span></div>';
        DOM.previewModal.classList.add('show');
        DOM.previewDownload.onclick = () => {
            window.open(`/uploads/${filename}`, '_blank');
        };

        try {
            const response = await fetch(`/api/files/${filename}/preview`);
            const contentType = response.headers.get('Content-Type') || '';

            if (contentType.startsWith('image/')) {
                // 图片预览
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                DOM.previewTitle.textContent = filename;
                DOM.previewBody.innerHTML = `<img class="preview-image" src="${url}" alt="${escapeHtml(filename)}">`;
            } else {
                // JSON 预览
                const data = await response.json();
                if (data.error) {
                    DOM.previewTitle.textContent = filename;
                    DOM.previewBody.innerHTML = `
                        <div class="preview-binary">
                            <i class="fas fa-exclamation-triangle" style="color: var(--accent-orange);"></i>
                            <p>${escapeHtml(data.error)}</p>
                        </div>
                    `;
                    return;
                }

                DOM.previewTitle.textContent = data.filename || filename;

                if (data.type === 'text') {
                    DOM.previewBody.innerHTML = `<pre class="preview-text">${escapeHtml(data.content)}</pre>`;
                } else if (data.type === 'video') {
                    DOM.previewBody.innerHTML = `
                        <video class="preview-video" controls autoplay>
                            <source src="${data.url}" type="${data.mime_type}">
                            您的浏览器不支持视频播放
                        </video>
                    `;
                } else if (data.type === 'audio') {
                    DOM.previewBody.innerHTML = `
                        <div style="padding: 40px; text-align: center;">
                            <i class="fas fa-music" style="font-size: 3rem; color: var(--accent-purple); margin-bottom: 20px; display: block;"></i>
                            <audio class="preview-audio" controls autoplay style="width: 100%;">
                                <source src="${data.url}" type="${data.mime_type}">
                                您的浏览器不支持音频播放
                            </audio>
                        </div>
                    `;
                } else {
                    // 二进制文件
                    DOM.previewBody.innerHTML = `
                        <div class="preview-binary">
                            <i class="fas fa-file"></i>
                            <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">${escapeHtml(data.filename || filename)}</p>
                            <p>类型: ${escapeHtml(data.category_label || '未知')}</p>
                            <p>大小: ${escapeHtml(data.size_formatted || '未知')}</p>
                            <p style="margin-top: 16px; color: var(--text-muted);">此文件类型暂不支持在线预览</p>
                            <button class="btn btn-ghost" style="margin-top: 16px;" onclick="window.open('/uploads/${filename}', '_blank')">
                                <i class="fas fa-download"></i> 下载文件
                            </button>
                        </div>
                    `;
                }
            }
        } catch (error) {
            DOM.previewTitle.textContent = '预览失败';
            DOM.previewBody.innerHTML = `
                <div class="preview-binary">
                    <i class="fas fa-exclamation-triangle" style="color: var(--accent-red);"></i>
                    <p>加载预览失败: ${escapeHtml(error.message)}</p>
                </div>
            `;
        }
    }

    function closePreview() {
        DOM.previewModal.classList.remove('show');
        // 停止视频/音频
        const video = DOM.previewBody.querySelector('video');
        const audio = DOM.previewBody.querySelector('audio');
        if (video) video.pause();
        if (audio) audio.pause();
    }

    // ========== 删除确认 ==========
    function openDeleteModal(filename, displayName) {
        state.deleteTarget = filename;
        DOM.deleteFileName.textContent = displayName || filename;
        DOM.deleteModal.classList.add('show');
    }

    function closeDeleteModal() {
        DOM.deleteModal.classList.remove('show');
        state.deleteTarget = null;
    }

    async function confirmDelete() {
        if (!state.deleteTarget) return;

        const filename = state.deleteTarget;
        closeDeleteModal();

        try {
            await api(`/api/files/${filename}`, { method: 'DELETE' });
            showToast('文件删除成功', 'success');
            loadStats();
            if (state.currentPage === 'files') loadFiles();
        } catch (e) {
            // 错误已在 api() 中处理
        }
    }

    // ========== 主题切换 ==========
    function toggleTheme() {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('filesage-theme', next);

        const icon = DOM.themeToggle.querySelector('i');
        icon.className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }

    function loadTheme() {
        const saved = localStorage.getItem('filesage-theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
            const icon = DOM.themeToggle.querySelector('i');
            icon.className = saved === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    // ========== 工具函数 ==========
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ========== 拖拽上传 ==========
    function initDragDrop() {
        const zone = DOM.uploadZone;

        ['dragenter', 'dragover'].forEach((event) => {
            zone.addEventListener(event, (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach((event) => {
            zone.addEventListener(event, (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.remove('drag-over');
            });
        });

        zone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            uploadFiles(files);
        });

        zone.addEventListener('click', () => {
            DOM.fileInput.click();
        });

        DOM.fileInput.addEventListener('change', () => {
            uploadFiles(DOM.fileInput.files);
            DOM.fileInput.value = '';
        });

        // 全局拖拽（文件管理页面）
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.target.closest('.upload-zone')) return;
            if (e.dataTransfer.files.length > 0) {
                uploadFiles(e.dataTransfer.files);
                showToast('检测到文件拖入，开始上传', 'info');
            }
        });
    }

    // ========== 事件绑定 ==========
    function bindEvents() {
        // 导航
        DOM.navItems.forEach((item) => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchPage(item.dataset.page);
            });
        });

        // 分类筛选
        DOM.categoryItems.forEach((item) => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                DOM.categoryItems.forEach((c) => c.classList.remove('active'));
                item.classList.add('active');
                state.currentCategory = item.dataset.category;

                // 切换到文件管理页面
                if (state.currentPage !== 'files') {
                    switchPage('files');
                } else {
                    loadFiles();
                }
            });
        });

        // 搜索
        let searchTimer;
        DOM.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            const value = DOM.searchInput.value.trim();
            DOM.searchClear.style.display = value ? 'flex' : 'none';

            searchTimer = setTimeout(() => {
                state.searchQuery = value;
                if (state.currentPage === 'files') {
                    loadFiles();
                } else {
                    switchPage('files');
                }
            }, 300);
        });

        DOM.searchClear.addEventListener('click', () => {
            DOM.searchInput.value = '';
            DOM.searchClear.style.display = 'none';
            state.searchQuery = '';
            if (state.currentPage === 'files') loadFiles();
        });

        // 主题切换
        DOM.themeToggle.addEventListener('click', (e) => {
            addRipple(e, DOM.themeToggle);
            toggleTheme();
        });

        // 刷新
        DOM.refreshBtn.addEventListener('click', (e) => {
            addRipple(e, DOM.refreshBtn);
            DOM.refreshBtn.querySelector('i').style.animation = 'spin 0.6s ease';
            setTimeout(() => {
                DOM.refreshBtn.querySelector('i').style.animation = '';
            }, 600);
            loadStats();
            if (state.currentPage === 'files') loadFiles();
        });

        // 上传按钮
        DOM.uploadTrigger.addEventListener('click', (e) => {
            addRipple(e, DOM.uploadTrigger);
            switchPage('upload');
        });

        // 菜单切换（移动端）
        DOM.menuToggle.addEventListener('click', () => {
            DOM.sidebar.classList.toggle('open');
            if (DOM.sidebar.classList.contains('open')) {
                addOverlay();
            } else {
                removeOverlay();
            }
        });

        // 排序
        DOM.sortBtn.addEventListener('click', () => {
            DOM.sortMenu.classList.toggle('show');
        });

        DOM.sortOptions.forEach((option) => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                DOM.sortOptions.forEach((o) => o.classList.remove('active'));
                option.classList.add('active');
                state.currentSort = option.dataset.sort;
                state.currentOrder = option.dataset.order;
                DOM.sortMenu.classList.remove('show');
                loadFiles();
            });
        });

        // 点击其他区域关闭排序菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sort-dropdown')) {
                DOM.sortMenu.classList.remove('show');
            }
        });

        // 视图切换
        DOM.viewBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                DOM.viewBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentView = btn.dataset.view;

                if (state.currentView === 'list') {
                    DOM.fileGrid.classList.add('list-view');
                } else {
                    DOM.fileGrid.classList.remove('list-view');
                }
            });
        });

        // 预览模态框
        DOM.previewClose.addEventListener('click', closePreview);
        DOM.previewModal.addEventListener('click', (e) => {
            if (e.target === DOM.previewModal) closePreview();
        });

        // 删除模态框
        DOM.deleteCancel.addEventListener('click', closeDeleteModal);
        DOM.deleteConfirm.addEventListener('click', confirmDelete);
        DOM.deleteModal.addEventListener('click', (e) => {
            if (e.target === DOM.deleteModal) closeDeleteModal();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closePreview();
                closeDeleteModal();
            }
            // Ctrl+K 聚焦搜索
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                DOM.searchInput.focus();
            }
        });

        // 按钮波纹效果
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn, .upload-trigger, .nav-item, .category-item');
            if (btn) addRipple(e, btn);
        });
    }

    // ========== 初始化 ==========
    function init() {
        loadTheme();
        initParticles();
        initDragDrop();
        bindEvents();
        loadStats();
    }

    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
