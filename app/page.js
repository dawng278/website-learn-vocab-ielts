'use client';

import { useEffect } from 'react';
import './globals.css';

export default function Home() {
  useEffect(() => {
    // === COPY OF THE ORIGINAL SCRIPT LOGIC ===
    let state = {
        tasks: [],
        currentTaskId: null,
        view: 'empty', // empty, quiz, dashboard, topics, mode-selector, learn, stats
        dashboardPage: 1,
        topicsPage: 1,
        selectedTopic: null,
        flashcardIndex: 0,
        history: {}, // { "YYYY-MM-DD": count }
        quizSession: {
            currentWord: null,
            isCorrectionMode: false,
            correctionCount: 0,
            history: [] // Dùng để chống lặp từ vừa xuất hiện
        }
    };

    let statsState = {
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear()
    };

    const STORAGE_KEY = 'vocab_mastery_data';

    // Export functions to window so onclick works
    window.loadDefaultTopics = loadDefaultTopics;
    window.createNewTask = createNewTask;
    window.handleImport = handleImport;
    window.showTopics = showTopics;
    window.showDashboard = showDashboard;
    window.showStats = showStats;
    window.exportData = exportData;
    window.deleteTask = deleteTask;
    window.selectTask = selectTask;
    window.startMode = startMode;
    window.flipCard = flipCard;
    window.nextFlashcard = nextFlashcard;
    window.prevFlashcard = prevFlashcard;
    window.changeMonth = changeMonth;
    window.resetProgress = resetProgress;
    window.renderDashboard = renderDashboard;
    window.renderTopics = renderTopics;
    window.switchView = switchView;

    function init() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            if (Array.isArray(data)) {
                state.tasks = data;
                state.history = {};
            } else {
                state.tasks = data.tasks || [];
                state.history = data.history || {};
            }
            
            state.tasks.forEach(t => {
                if (!t.learned) t.learned = [];
                if (!t.words) t.words = [];
            });
        }
        renderTaskList();

        // Thêm tính năng tự động tải mặc định nếu chưa có gì
        if (state.tasks.length === 0) {
            console.log("Empty state detected. Initializing default topics...");
            loadDefaultTopics();
        }
    }

    async function loadDefaultTopics() {
        try {
            const res = await fetch('/api/vocab');
            const data = await res.json();
            const topics = data.topics || [];
            
            if (topics.length === 0) {
                showToast("Không tìm thấy kho chủ đề mẫu!", 'error');
                return;
            }

            for (const topic of topics) {
                try {
                    const csvRes = await fetch(`/vocab/${topic.filename}`);
                    const text = await csvRes.text();
                    const words = parseCSV(text);
                    if (words.length > 0) {
                        addOrUpdateTask(topic.name, words, false, true);
                    }
                } catch (e) {
                    console.error("Failed to load topic file:", topic.filename);
                }
            }
            showToast(`Đã tải xong ${topics.length} chủ đề IELTS!`, 'success');
            renderTaskList();
        } catch (error) {
            console.error("API call failed:", error);
            showToast("Lỗi kết nối Server!", 'error');
        }
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            tasks: state.tasks,
            history: state.history
        }));
    }

    function renderTaskList() {
        const listEl = document.getElementById('task-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        state.tasks.forEach(task => {
            const total = task.words.length;
            const mastered = task.learned.length;
            const percent = total > 0 ? (mastered / total * 100) : 0;

            const item = document.createElement('div');
            item.className = `task-item ${state.currentTaskId === task.id ? 'active' : ''}`;
            item.onclick = () => selectTask(task.id);
            
            item.innerHTML = `
                <div class="task-name">${task.name}</div>
                <div class="task-meta">
                    <span>${mastered}/${total} từ</span>
                    <span>${Math.round(percent)}%</span>
                </div>
                <div class="progress-mini">
                    <div class="progress-bar-fill" style="width: ${percent}%"></div>
                </div>
                ${!task.isSystem ? `
                <button class="btn btn-danger btn-ghost delete-btn" onclick="window.deleteTask('${task.id}', event)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>` : `
                <div class="delete-btn" style="opacity: 0.5; cursor: not-allowed; font-size: 10px; color: var(--accent-green)">PINNED</div>
                `}
            `;
            listEl.appendChild(item);
        });
    }

    function createNewTask() {
        const name = prompt("Nhập tên Task mới:");
        if (name) {
            const wordsText = prompt("Nhập từ vựng định dạng: en, vi (mỗi từ 1 dòng)");
            if (wordsText) {
                const words = parseCSV(wordsText);
                if (words.length > 0) {
                    addOrUpdateTask(name, words);
                    showToast(`Đã tạo Task "${name}"!`, 'success');
                }
            }
        }
    }

    function deleteTask(id, e) {
        if (e) e.stopPropagation();
        const task = state.tasks.find(t => t.id === id);
        if (task && task.isSystem) {
            showToast("Đây là bài học hệ thống, không thể xóa!", 'error');
            return;
        }
        if (confirm("Xóa Task này?")) {
            state.tasks = state.tasks.filter(t => t.id !== id);
            saveData();
            renderTaskList();
            if (state.currentTaskId === id) switchView('empty');
            if (state.view === 'dashboard') renderDashboard(state.dashboardPage);
            if (state.view === 'topics') renderTopics();
            showToast("Đã xóa!", 'info');
        }
    }

    async function handleImport(input, type) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            if (type === 'json') {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    if (Array.isArray(jsonData)) {
                        jsonData.forEach(item => addOrUpdateTask(item.name, item.words, true));
                        renderTaskList();
                        showToast("Import thành công!", 'success');
                    }
                } catch (err) { showToast("Lỗi JSON!", 'error'); }
            } else {
                const words = parseCSV(e.target.result);
                if (words.length > 0) {
                    addOrUpdateTask(file.name.replace('.csv', ''), words);
                    showToast("Import CSV thành công!", 'success');
                }
            }
        };
        reader.readAsText(file);
        input.value = '';
    }

    function parseCSV(text) {
        return text.split('\n').map(line => {
            const p = line.split(',');
            return p.length >= 2 ? { en: p[0].trim(), vi: p[1].trim() } : null;
        }).filter(w => w !== null);
    }

    function addOrUpdateTask(name, newWords, autoSelect = true, isSystem = false) {
        const CHUNK_SIZE = 15;
        let relatedTasks = state.tasks.filter(t => t.name.toLowerCase() === name.toLowerCase() || t.name.toLowerCase().startsWith(name.toLowerCase() + " - part"));
        let allWords = [...newWords];
        let allLearned = [];
        if (relatedTasks.length > 0) {
            relatedTasks.forEach(t => {
                t.words.forEach(w => { if (!allWords.find(nw => nw.en.toLowerCase() === w.en.toLowerCase())) allWords.push(w); });
                allLearned = [...new Set([...allLearned, ...t.learned])];
            });
            state.tasks = state.tasks.filter(t => !relatedTasks.includes(t));
        }

        const totalParts = Math.ceil(allWords.length / CHUNK_SIZE);
        let firstId = null;
        for (let i = 0; i < allWords.length; i += CHUNK_SIZE) {
            const chunk = allWords.slice(i, i + CHUNK_SIZE);
            const partNum = Math.floor(i / CHUNK_SIZE) + 1;
            const partName = totalParts > 1 ? `${name} - Part ${partNum}` : name;
            const taskLearned = allLearned.filter(en => chunk.some(w => w.en.toLowerCase() === en.toLowerCase()));
            const newId = 'task_' + Date.now() + '_' + i;
            if (!firstId) firstId = newId;
            state.tasks.push({ id: newId, name: partName, words: chunk, learned: taskLearned, isSystem: isSystem });
        }
        saveData();
        renderTaskList();
        if (autoSelect && firstId) selectTask(firstId);
    }

    function selectTask(id) {
        state.currentTaskId = id;
        const task = state.tasks.find(t => t.id === id);
        document.getElementById('mode-task-title').innerText = task.name;
        switchView('mode-selector');
        renderTaskList();
    }

    function switchView(viewName) {
        state.view = viewName;
        const views = ['empty-state', 'quiz-container', 'dashboard-view', 'topics-view', 'mode-selector', 'flashcard-view', 'stats-view'];
        views.forEach(v => {
            const el = document.getElementById(v);
            if (el) el.style.display = 'none';
        });

        const current = {
            'empty': 'empty-state', 'quiz': 'quiz-container', 'dashboard': 'dashboard-view',
            'topics': 'topics-view', 'mode-selector': 'mode-selector', 'learn': 'flashcard-view', 'stats': 'stats-view'
        }[viewName];
        
        const target = document.getElementById(current);
        if (target) target.style.display = (viewName === 'dashboard' || viewName === 'topics' || viewName === 'stats' || viewName === 'learn' ? 'flex' : 'block');

        if (viewName === 'dashboard') renderDashboard(state.dashboardPage);
        if (viewName === 'topics') renderTopics(state.topicsPage);
        if (viewName === 'stats') renderStats();
    }

    function startMode(mode) {
        if (mode === 'learn') {
            state.flashcardIndex = 0;
            switchView('learn');
            renderFlashcard();
        } else {
            switchView('quiz');
            checkMasteryState();
        }
    }

    function renderFlashcard() {
        const task = state.tasks.find(t => t.id === state.currentTaskId);
        const word = task.words[state.flashcardIndex];
        document.getElementById('fc-stats').innerText = `Từ số ${state.flashcardIndex + 1} / ${task.words.length}`;
        document.getElementById('card-en').innerText = word.en;
        document.getElementById('card-vi').innerText = word.vi;
        document.getElementById('flashcard').classList.remove('is-flipped');
    }

    function flipCard() { document.getElementById('flashcard').classList.toggle('is-flipped'); }
    function nextFlashcard() {
        const task = state.tasks.find(t => t.id === state.currentTaskId);
        if (state.flashcardIndex < task.words.length - 1) { state.flashcardIndex++; renderFlashcard(); }
    }
    function prevFlashcard() { if (state.flashcardIndex > 0) { state.flashcardIndex--; renderFlashcard(); } }

    function renderStats() {
        const total = state.tasks.reduce((s, t) => s + t.words.length, 0);
        const learned = state.tasks.reduce((s, t) => s + t.learned.length, 0);
        document.getElementById('stat-total-words').innerText = total;
        document.getElementById('stat-learned-words').innerText = learned;
        document.getElementById('stat-percent').innerText = (total > 0 ? Math.round(learned/total*100) : 0) + '%';
        document.getElementById('stat-days-active').innerText = Object.keys(state.history).length;
        renderCalendar();
    }

    function renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const labels = Array.from(grid.querySelectorAll('.calendar-day-label'));
        grid.innerHTML = '';
        labels.forEach(l => grid.appendChild(l));
        const m = statsState.currentMonth, y = statsState.currentYear;
        const first = new Date(y, m, 1).getDay();
        const offset = first === 0 ? 6 : first - 1;
        const days = new Date(y, m + 1, 0).getDate();
        for (let i = 0; i < offset; i++) { const d = document.createElement('div'); d.className = 'calendar-day empty'; grid.appendChild(d); }
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        for (let d = 1; d <= days; d++) {
            const dStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const count = state.history[dStr] || 0;
            const div = document.createElement('div');
            div.className = `calendar-day ${count > 0 ? 'has-data' : ''} ${dStr === todayStr ? 'today' : ''}`;
            div.innerHTML = `<span>${d}</span>${count > 0 ? `<div class="count">+${count}</div>` : ''}`;
            grid.appendChild(div);
        }
    }

    function changeMonth(delta) {
        statsState.currentMonth += delta;
        if (statsState.currentMonth > 11) { statsState.currentMonth = 0; statsState.currentYear++; }
        else if (statsState.currentMonth < 0) { statsState.currentMonth = 11; statsState.currentYear--; }
        renderCalendar();
    }

    function renderDashboard(page = 1) {
        state.dashboardPage = page;
        const grid = document.getElementById('dashboard-grid');
        const search = document.getElementById('dashboard-search').value.toLowerCase();
        const filtered = state.tasks.filter(t => t.name.toLowerCase().includes(search));
        const ITEMS = 15;
        const total = Math.ceil(filtered.length / ITEMS);
        grid.innerHTML = '';
        filtered.slice((page-1)*ITEMS, page*ITEMS).forEach(t => {
            const p = Math.round(t.learned.length / t.words.length * 100);
            const card = document.createElement('div');
            card.className = 'dashboard-card';
            card.innerHTML = `<h3>${t.name}</h3><div class="task-meta"><span>${t.learned.length}/${t.words.length} từ</span><span>${p}%</span></div><div class="progress-mini"><div class="progress-bar-fill" style="width: ${p}%"></div></div><div style="display:flex;gap:10px;margin-top:auto">
                <button class="btn btn-primary" style="flex:1" onclick="window.selectTask('${t.id}')">Ôn tập</button>
                ${!t.isSystem ? `<button class="btn btn-secondary" onclick="window.deleteTask('${t.id}', event)">Xóa</button>` : `<span style="font-size: 10px; color: var(--accent-green); display: flex; align-items: center">Hệ thống</span>`}
            </div>`;
            grid.appendChild(card);
        });
        renderPagination(document.getElementById('dashboard-pagination'), page, total, renderDashboard);
    }

    function renderTopics(page = 1) {
        state.topicsPage = page;
        const grid = document.getElementById('topics-grid');
        const map = {};
        state.tasks.forEach(t => {
            const base = t.name.split(' - Part')[0].trim();
            if (!map[base]) map[base] = { name: base, count: 0, learned: 0, total: 0 };
            map[base].count++; map[base].total += t.words.length; map[base].learned += t.learned.length;
        });
        const list = Object.values(map);
        const ITEMS = 15;
        const total = Math.ceil(list.length / ITEMS);
        grid.innerHTML = '';
        list.slice((page-1)*ITEMS, page*ITEMS).forEach(topic => {
            const p = Math.round(topic.learned / topic.total * 100);
            const card = document.createElement('div');
            card.className = 'topic-card';
            card.onclick = () => renderTopicDetail(topic.name);
            card.innerHTML = `<div class="topic-badge">${topic.count} PHẦN</div><h3>${topic.name}</h3><p style="color:var(--text-dim)">${topic.total} từ</p><p style="margin-top:10px;font-weight:700;color:${p===100?'var(--accent-green)':'var(--primary)'}">${p}% HOÀN THÀNH</p>`;
            grid.appendChild(card);
        });
        renderPagination(document.getElementById('topics-pagination'), page, total, renderTopics);
    }

    function renderTopicDetail(name) {
        document.getElementById('topics-main').style.display = 'none';
        document.getElementById('topic-detail').style.display = 'flex';
        document.getElementById('selected-topic-name').innerText = name;
        const grid = document.getElementById('topic-tasks-grid');
        grid.innerHTML = '';
        state.tasks.filter(t => t.name.toLowerCase().includes(name.toLowerCase())).forEach(t => {
            const p = Math.round(t.learned.length / t.words.length * 100);
            const card = document.createElement('div');
            card.className = 'dashboard-card';
            card.innerHTML = `<h3>${t.name}</h3><div class="task-meta"><span>${t.learned.length}/${t.words.length} từ</span><span>${p}%</span></div><div class="progress-mini"><div class="progress-bar-fill" style="width: ${p}%"></div></div><button class="btn btn-primary" onclick="window.selectTask('${t.id}')">Ôn tập phần này</button>`;
            grid.appendChild(card);
        });
    }

    function renderPagination(container, current, total, onClick) {
        container.innerHTML = '';
        if (total <= 1) return;
        for (let i = 1; i <= total; i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === current ? 'active' : ''}`;
            btn.innerText = i; btn.onclick = () => onClick(i);
            container.appendChild(btn);
        }
    }

    function checkMasteryState() {
        const t = state.tasks.find(t => t.id === state.currentTaskId);
        if (t.learned.length >= t.words.length) { document.getElementById('quiz-card').style.display = 'none'; document.getElementById('mastered-view').style.display = 'block'; }
        else { document.getElementById('quiz-card').style.display = 'block'; document.getElementById('mastered-view').style.display = 'none'; nextQuestion(); }
    }

    function nextQuestion() {
        const t = state.tasks.find(t => t.id === state.currentTaskId);
        const rem = t.words.filter(w => !t.learned.includes(w.en.toLowerCase()));
        if (rem.length === 0) { checkMasteryState(); return; }
        const word = rem[Math.floor(Math.random() * rem.length)];
        state.quizSession.currentWord = word;
        state.quizSession.isCorrectionMode = false;
        document.getElementById('vi-word').innerText = word.vi;
        document.getElementById('vocab-input').value = '';
        document.getElementById('correction-mode').style.display = 'none';
        document.getElementById('learned-count').innerText = t.learned.length;
        document.getElementById('total-count').innerText = t.words.length;
        document.getElementById('current-task-title').innerText = t.name;
        document.getElementById('vocab-input').focus();
    }

    function processAnswer() {
        const val = document.getElementById('vocab-input').value.trim().toLowerCase();
        const cor = state.quizSession.currentWord.en.toLowerCase();
        const t = state.tasks.find(t => t.id === state.currentTaskId);
        if (state.quizSession.isCorrectionMode) {
            if (val === cor) { state.quizSession.correctionCount++; document.getElementById('vocab-input').value = ''; updateCorrectionUI(); if (state.quizSession.correctionCount >= 3) nextQuestion(); }
        } else {
            if (val === cor) {
                if (!t.learned.includes(cor)) { t.learned.push(cor); const today = new Date().toISOString().split('T')[0]; state.history[today] = (state.history[today] || 0) + 1; }
                document.getElementById('vocab-input').className = 'vocab-input success'; setTimeout(nextQuestion, 500); saveData(); renderTaskList();
            } else {
                state.quizSession.isCorrectionMode = true; state.quizSession.correctionCount = 0;
                document.getElementById('target-en').innerText = cor;
                document.getElementById('correction-mode').style.display = 'block';
                document.getElementById('vocab-input').value = ''; updateCorrectionUI();
            }
        }
    }

    function updateCorrectionUI() {
        document.getElementById('correction-step').innerText = state.quizSession.correctionCount;
        for (let i = 1; i <= 3; i++) document.getElementById(`dot-${i}`).className = `dot ${i <= state.quizSession.correctionCount ? 'filled' : ''}`;
    }

    function resetProgress() {
        const t = state.tasks.find(t => t.id === state.currentTaskId);
        t.learned = []; saveData(); renderTaskList(); checkMasteryState();
    }

    function exportData() {
        const blob = new Blob([JSON.stringify({tasks: state.tasks, history: state.history}, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'vocab_data.json'; a.click();
    }

    function showTopics() { switchView('topics'); }
    function showDashboard() { switchView('dashboard'); }
    function showStats() { switchView('stats'); }

    // Start
    init();

    const input = document.getElementById('vocab-input');
    if (input) input.onkeypress = (e) => { if (e.key === 'Enter') processAnswer(); };

  }, []);

  return (
    <>
      <aside id="sidebar">
        <div className="sidebar-header">
            <div className="logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <span>Mastery</span>
            </div>
            <div className="action-btns">
                <button className="btn btn-primary" onClick={() => window.createNewTask()}>+ Task</button>
                <button className="btn btn-secondary" onClick={() => document.getElementById('csv-input').click()}>Import CSV</button>
            </div>
            <input type="file" id="csv-input" accept=".csv" onChange={(e) => window.handleImport(e.target, 'csv')} />
            <input type="file" id="json-input" accept=".json" onChange={(e) => window.handleImport(e.target, 'json')} />
            <button className="btn btn-ghost" style={{width:'100%', marginTop:'10px'}} onClick={() => document.getElementById('json-input').click()}>Import JSON</button>
        </div>

        <div className="sidebar-nav">
            <button className="btn btn-secondary" style={{width:'100%', justifyContent: 'flex-start', marginBottom: '8px', color: 'var(--accent-green)'}} onClick={() => window.loadDefaultTopics()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Tải Kho đề mẫu (33)
            </button>
            <button className="btn btn-secondary" style={{width:'100%', justifyContent: 'flex-start', marginBottom: '8px'}} onClick={() => window.showTopics()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                Chủ đề (Topics)
            </button>
            <button className="btn btn-secondary" style={{width:'100%', justifyContent: 'flex-start', marginBottom: '8px'}} onClick={() => window.showDashboard()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                Tất cả Task
            </button>
            <button className="btn btn-secondary" style={{width:'100%', justifyContent: 'flex-start'}} onClick={() => window.showStats()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                Thống kê (Stats)
            </button>
        </div>

        <div className="task-list" id="task-list"></div>

        <div style={{padding: '16px', borderTop: '1px solid var(--border)'}}>
            <button className="btn btn-secondary" style={{width:'100%'}} onClick={() => window.exportData()}>Export Data</button>
        </div>
      </aside>

      <main id="main-content">
        <div id="empty-state" className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <h2>Bắt đầu hành trình ngôn ngữ của bạn</h2>
            <p style={{color: 'var(--text-dim)', maxWidth: '400px', marginTop: '12px'}}>Hãy chọn một Task từ danh sách bên trái hoặc đợi kho chủ đề mặc định được tải.</p>
        </div>

        <div id="quiz-container">
            <div className="stats-header">
                <div>
                    <h2 id="current-task-title">Task Name</h2>
                    <p id="task-info" style={{color: 'var(--text-dim)', fontSize: '0.85rem'}}></p>
                </div>
                <div className="score-pill">
                    <span id="learned-count">0</span> / <span id="total-count">0</span> [Đã thuộc]
                </div>
            </div>

            <div className="quiz-card" id="quiz-card">
                <p id="label-prompt" style={{fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px'}}>Dịch sang tiếng Anh</p>
                <div className="vi-meaning" id="vi-word">...</div>
                <div className="input-group">
                    <input type="text" id="vocab-input" className="vocab-input" autoComplete="off" placeholder="Gõ từ tại đây..." />
                    <div id="feedback-msg" className="feedback-msg"></div>
                </div>
                <div id="correction-mode" className="correction-mode">
                    <p style={{marginBottom: '15px', color: 'var(--text-dim)', fontSize: '0.85rem'}}>NHẬP SAI! Vui lòng gõ lại <span id="target-en" style={{color: 'white', fontWeight: '700'}}></span> 3 lần:</p>
                    <div className="correction-counter">
                        <div className="dot" id="dot-1"></div>
                        <div className="dot" id="dot-2"></div>
                        <div className="dot" id="dot-3"></div>
                        <span id="correction-step">0</span> / 3
                    </div>
                </div>
            </div>

            <div id="mastered-view" className="mastered-view">
                <span className="confetti-icon">🎉</span>
                <h2>Tuyệt vời!</h2>
                <p style={{color: 'var(--text-dim)', marginBottom: '30px'}}>Bạn đã hoàn thành 100% Task này.</p>
                <button className="btn btn-primary" style={{margin: 'auto', padding: '12px 24px'}} onClick={() => window.resetProgress()}>Bắt đầu lại</button>
            </div>
        </div>

        <div id="mode-selector">
            <h1 id="mode-task-title" style={{marginBottom: '50px', fontSize: '2.5rem'}}>Chọn chế độ</h1>
            <div className="mode-container">
                <div className="mode-option" onClick={() => window.startMode('learn')}>
                    <span className="mode-icon">📖</span>
                    <h3>Học từ mới</h3>
                    <p>Flashcard thông minh.</p>
                </div>
                <div className="mode-option" onClick={() => window.startMode('test')}>
                    <span className="mode-icon">⚔️</span>
                    <h3>Ôn tập</h3>
                    <p>Thử thách gõ chính xác.</p>
                </div>
            </div>
            <button className="btn btn-ghost" style={{marginTop: '40px'}} onClick={() => window.showDashboard()}>Quay lại</button>
        </div>

        <div id="flashcard-view">
            <div className="back-nav" onClick={() => window.switchView('mode-selector')} style={{alignSelf: 'flex-start'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Quay lại
            </div>
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%'}}>
                <p id="fc-stats" style={{color: 'var(--text-dim)', marginBottom: '20px', fontWeight: '600'}}>Từ số 1 / 15</p>
                <div className="scene">
                    <div className="card" id="flashcard" onClick={() => window.flipCard()}>
                        <div className="card-face card-face-front" id="card-en">Word</div>
                        <div className="card-face card-face-back" id="card-vi">Nghĩa</div>
                    </div>
                </div>
                <div style={{display: 'flex', gap: '20px'}}>
                    <button className="btn btn-secondary" style={{padding: '12px 30px'}} onClick={() => window.prevFlashcard()}>Trước</button>
                    <button className="btn btn-primary" style={{padding: '12px 30px'}} onClick={() => window.nextFlashcard()}>Kế tiếp</button>
                </div>
            </div>
        </div>

        <div id="dashboard-view">
            <div className="dashboard-header">
                <div><h1>Bảng điều khiển</h1></div>
                <div className="search-wrap">
                    <input type="text" id="dashboard-search" placeholder="Tìm kiếm..." className="btn-secondary" style={{padding: '10px 20px', borderRadius: '100px', outline: 'none', width: '250px'}} onInput={() => window.renderDashboard(1)} />
                </div>
            </div>
            <div className="task-grid" id="dashboard-grid"></div>
            <div className="pagination" id="dashboard-pagination"></div>
        </div>

        <div id="topics-view">
            <div id="topics-main" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                <h1 style={{marginBottom: '30px', fontSize: '2.5rem'}}>📚 Kho chủ đề IELTS</h1>
                <div id="topics-grid" className="task-grid"></div>
                <div id="topics-pagination" className="pagination"></div>
            </div>
            <div id="topic-detail" style={{display: 'none', flex: 1, flexDirection: 'column'}}>
                <div className="back-nav" onClick={() => window.showTopics()}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    Quay lại
                </div>
                <h2 id="selected-topic-name" style={{marginBottom: '30px', fontSize: '2rem'}}>Topic</h2>
                <div id="topic-tasks-grid" className="task-grid"></div>
            </div>
        </div>

        <div id="stats-view">
            <h1 style={{marginBottom: '30px', fontSize: '2.5rem'}}>📊 Thống kê</h1>
            <div className="stats-grid">
                <div className="stat-card"><h4>Tổng số từ</h4><div id="stat-total-words" className="value">0</div></div>
                <div className="stat-card"><h4>Từ đã thuộc</h4><div id="stat-learned-words" className="value">0</div></div>
                <div className="stat-card"><h4>Phần trăm</h4><div id="stat-percent" className="value">0%</div></div>
                <div className="stat-card"><h4>Ngày học</h4><div id="stat-days-active" className="value">0</div></div>
            </div>
            <div className="calendar-container">
                <div className="calendar-header">
                    <h3 id="calendar-month-year">...</h3>
                    <div className="calendar-controls">
                        <button className="btn btn-secondary" onClick={() => window.changeMonth(-1)}>◀</button>
                        <button className="btn btn-secondary" onClick={() => window.changeMonth(1)}>▶</button>
                    </div>
                </div>
                <div className="calendar-grid" id="calendar-grid">
                    <div className="calendar-day-label">T2</div><div className="calendar-day-label">T3</div><div className="calendar-day-label">T4</div><div className="calendar-day-label">T5</div><div className="calendar-day-label">T6</div><div className="calendar-day-label">T7</div><div className="calendar-day-label">CN</div>
                </div>
            </div>
        </div>

        <div id="toast-container"></div>
      </main>
    </>
  );
}
