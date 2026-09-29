const STORAGE_KEY = 'dailyTaskPlanner';
const STREAK_KEY = 'dailyTaskPlannerStreak';
const POINTS_KEY = 'dailyTaskPlannerPoints';
const PETS_KEY = 'dailyTaskPlannerPets';
const ACTIVE_PET_KEY = 'dailyTaskPlannerActivePet';

let tasks = [];
let points = 0;
let pets = [];
let activePet = null;
let currentFilter = 'all';
let searchQuery = '';
let lastMouseX = 0;
let lastMouseY = 0;
let mouseSpeed = 0;
let petMood = 'neutral';
let heartThrottle = 0;
let angryThrottle = 0;

const PET_ROSTER = [
    { name: 'Mike', species: 'German Shepherd', emoji: '\u{1F436}', rate: 96, theme: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', label: 'Neutral Warm Amber' },
    { name: 'Gray Amura', species: 'Fenrir', emoji: '\u{1F43A}', rate: 50, theme: '#64748b', glow: 'rgba(100, 116, 139, 0.5)', label: 'Slate Gray Glowing Aura' },
    { name: 'Blue Silviya', species: 'Gryphon', emoji: '\u{1F985}', rate: 45, theme: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)', label: 'Sapphire Blue Crystal Glow' },
    { name: 'Orange Valmura', species: 'Phoenix', emoji: '\u{1F525}', rate: 2, theme: '#f97316', glow: 'rgba(249, 115, 22, 0.5)', label: 'Fiery Orange Radiance' },
    { name: 'Red Ddraig', species: 'Dragon', emoji: '\u{1F409}', rate: 1, theme: '#dc2626', glow: 'rgba(220, 38, 38, 0.5)', label: 'Legendary Crimson Red Flame Aura' }
];

const POINTS_MAP = { Low: 10, Medium: 25, High: 50 };
const EVOLUTION_STAGES = [
    { threshold: 0, label: 'Stage 1 - Baby', scale: 1 },
    { threshold: 500, label: 'Stage 2 - Teen', scale: 1.3 },
    { threshold: 1500, label: 'Stage 3 - Adult', scale: 1.6 }
];

function loadState() {
    try {
        tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        points = parseInt(localStorage.getItem(POINTS_KEY)) || 0;
        pets = JSON.parse(localStorage.getItem(PETS_KEY)) || [];
        activePet = JSON.parse(localStorage.getItem(ACTIVE_PET_KEY)) || null;
    } catch (e) {
        tasks = []; points = 0; pets = []; activePet = null;
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    localStorage.setItem(POINTS_KEY, points.toString());
    localStorage.setItem(PETS_KEY, JSON.stringify(pets));
    localStorage.setItem(ACTIVE_PET_KEY, JSON.stringify(activePet));
}

function loadStreak() {
    try {
        const data = JSON.parse(localStorage.getItem(STREAK_KEY));
        if (!data) return { count: 0, lastDate: null };
        const today = new Date().toDateString();
        if (data.lastDate === today) return data;
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (data.lastDate === yesterday) return data;
        return { count: 0, lastDate: null };
    } catch (e) { return { count: 0, lastDate: null }; }
}

function saveStreak(count, date) {
    localStorage.setItem(STREAK_KEY, JSON.stringify({ count, lastDate: date }));
}

function updateStreak() {
    const streak = loadStreak();
    const today = new Date().toDateString();
    if (streak.lastDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const newCount = streak.lastDate === yesterday ? streak.count + 1 : 1;
        saveStreak(newCount, today);
        document.getElementById('streakCount').textContent = newCount;
    } else {
        document.getElementById('streakCount').textContent = streak.count;
    }
    updateHatchButton();
}

function updateHatchButton() {
    const streak = loadStreak();
    const btn = document.getElementById('hatchBtn');
    const req = document.getElementById('hatchRequirement');
    if (streak.count >= 10) {
        btn.disabled = false;
        req.textContent = 'You can hatch an egg! Click the button above.';
        req.style.color = '#10b981';
    } else {
        btn.disabled = true;
        req.textContent = `Reach a 10-day streak to hatch an egg! (${streak.count}/10)`;
        req.style.color = '';
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getFilteredTasks() {
    let filtered = tasks;
    if (currentFilter === 'pending') filtered = filtered.filter(t => !t.completed);
    if (currentFilter === 'completed') filtered = filtered.filter(t => t.completed);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(t => t.title.toLowerCase().includes(q));
    }
    return filtered;
}

function updateCounts() {
    document.getElementById('countAll').textContent = tasks.length;
    document.getElementById('countPending').textContent = tasks.filter(t => !t.completed).length;
    document.getElementById('countCompleted').textContent = tasks.filter(t => t.completed).length;
}

function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('progressText').textContent = pct + '%';
    if (pct === 100 && total > 0) fireConfetti();
}

function updatePointsDisplay() {
    const el = document.getElementById('pointsCount');
    el.textContent = points;
    el.style.transform = 'scale(1.3)';
    setTimeout(() => { el.style.transform = 'scale(1)'; }, 200);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function spawnPointsPopup(x, y, pts) {
    const popup = document.createElement('div');
    popup.className = 'points-popup';
    popup.textContent = `+${pts} PTS!`;
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    document.getElementById('pointsPopupContainer').appendChild(popup);
    setTimeout(() => popup.remove(), 1200);
}

function addTask() {
    const input = document.getElementById('taskInput');
    const title = input.value.trim();
    if (!title) {
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
        showToast('Please enter a task!', 'error');
        return;
    }
    const alarmVal = document.getElementById('alarmInput').value;
    const task = {
        id: generateId(),
        title,
        priority: document.getElementById('prioritySelect').value,
        category: document.getElementById('categorySelect').value,
        completed: false,
        createdAt: new Date().toISOString(),
        alarm: alarmVal ? new Date(alarmVal).toISOString() : null,
        completedAt: null
    };
    tasks.unshift(task);
    saveState();
    input.value = '';
    document.getElementById('alarmInput').value = '';
    render();
    showToast('Task added successfully!', 'success');
    if (task.alarm) showToast('Alarm set for ' + formatAlarm(task.alarm), 'info');
}

function deleteTask(id) {
    const el = document.querySelector(`[data-task-id="${id}"]`);
    if (el) {
        el.classList.add('removing');
        setTimeout(() => {
            tasks = tasks.filter(t => t.id !== id);
            saveState();
            render();
            showToast('Task removed!', 'info');
        }, 450);
    }
}

function toggleTask(id, checkboxEl) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        if (task.completed) {
            const pts = POINTS_MAP[task.priority] || 10;
            points += pts;
            saveState();
            updatePointsDisplay();
            const rect = checkboxEl.getBoundingClientRect();
            spawnPointsPopup(rect.left, rect.top - 10, pts);
        }
        saveState();
        render();
        if (task.completed) {
            showToast(`Task completed at ${formatDate(task.completedAt)}!`, 'success');
        }
    }
}

function startEdit(id) {
    const el = document.querySelector(`[data-task-id="${id}"]`);
    if (!el) return;
    const content = el.querySelector('.task-content');
    const title = tasks.find(t => t.id === id).title;
    content.innerHTML = `
        <input type="text" class="edit-input" value="${title.replace(/"/g, '&quot;')}" maxlength="200">
        <div class="edit-actions mt-2">
            <button class="task-btn save-edit" title="Save"><i class="fas fa-check" style="color:var(--success)"></i></button>
            <button class="task-btn cancel-edit" title="Cancel"><i class="fas fa-times" style="color:var(--danger)"></i></button>
        </div>
    `;
    const editInput = content.querySelector('.edit-input');
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);
    content.querySelector('.save-edit').addEventListener('click', () => saveEdit(id));
    content.querySelector('.cancel-edit').addEventListener('click', () => render());
    editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEdit(id);
        if (e.key === 'Escape') render();
    });
}

function saveEdit(id) {
    const el = document.querySelector(`[data-task-id="${id}"] .edit-input`);
    if (!el) return;
    const newTitle = el.value.trim();
    if (!newTitle) { showToast('Task cannot be empty!', 'error'); return; }
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.title = newTitle;
        saveState();
        render();
        showToast('Task updated!', 'success');
    }
}

function render() {
    const list = document.getElementById('taskList');
    const empty = document.getElementById('emptyState');
    const filtered = getFilteredTasks();
    list.innerHTML = '';
    empty.style.display = filtered.length === 0 ? 'block' : 'none';
    filtered.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.setAttribute('data-task-id', task.id);
        li.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <div class="task-content">
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-meta">
                    <span class="task-badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
                    <span class="task-badge badge-${task.category.toLowerCase()}">${task.category}</span>
                    ${task.alarm ? `<span class="task-badge badge-alarm"><i class="fas fa-bell me-1"></i>${formatAlarm(task.alarm)}</span>` : ''}
                </div>
                <div class="task-dates">
                    <span><i class="fas fa-play me-1"></i>Started: ${formatDate(task.createdAt)}</span>
                    ${task.completedAt ? `<span><i class="fas fa-flag-checkered me-1"></i>Finished: ${formatDate(task.completedAt)}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-btn edit" title="Edit"><i class="fas fa-pen"></i></button>
                <button class="task-btn delete" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        `;
        li.querySelector('.task-checkbox').addEventListener('change', (e) => toggleTask(task.id, e.target));
        li.querySelector('.edit').addEventListener('click', () => startEdit(task.id));
        li.querySelector('.delete').addEventListener('click', () => deleteTask(task.id));
        li.querySelector('.task-title').addEventListener('dblclick', () => startEdit(task.id));
        list.appendChild(li);
    });
    updateCounts();
    updateProgress();
}

function renderPet() {
    const egg = document.getElementById('petEgg');
    const info = document.getElementById('petInfo');
    const evoFill = document.getElementById('evolutionFill');
    const evoText = document.getElementById('evolutionText');

    if (activePet) {
        const stage = getEvolutionStage();
        egg.innerHTML = `<span style="font-size:${3 * stage.scale}rem">${activePet.emoji}</span>`;
        egg.className = 'pet-egg';
        info.innerHTML = `<div class="pet-name">${activePet.name}</div><div class="pet-stage">${activePet.species} | ${stage.label}</div>`;
        const nextStage = EVOLUTION_STAGES.find(s => s.threshold > points);
        const prevStage = [...EVOLUTION_STAGES].reverse().find(s => s.threshold <= points) || EVOLUTION_STAGES[0];
        if (nextStage) {
            const pct = ((points - prevStage.threshold) / (nextStage.threshold - prevStage.threshold)) * 100;
            evoFill.style.width = Math.min(pct, 100) + '%';
            evoText.textContent = `${stage.label} (${points}/${nextStage.threshold} PTS)`;
        } else {
            evoFill.style.width = '100%';
            evoText.textContent = `${stage.label} (MAX)`;
        }
    } else {
        egg.innerHTML = '<i class="fas fa-egg"></i>';
        egg.className = 'pet-egg';
        info.innerHTML = '<div class="pet-name">No Pet Yet</div><div class="pet-stage">Hatch an egg to get started!</div>';
        evoFill.style.width = '0%';
        evoText.textContent = 'No Pet';
    }
}

function getEvolutionStage() {
    if (points >= 1500) return EVOLUTION_STAGES[2];
    if (points >= 500) return EVOLUTION_STAGES[1];
    return EVOLUTION_STAGES[0];
}

function hatchEgg() {
    const streak = loadStreak();
    if (streak.count < 10) {
        showToast('You need a 10-day streak to hatch!', 'error');
        return;
    }
    const roll = Math.random() * 100;
    let cumulative = 0;
    let selectedPet = PET_ROSTER[0];
    for (const pet of PET_ROSTER) {
        cumulative += pet.rate;
        if (roll <= cumulative) { selectedPet = pet; break; }
    }
    const newPet = { ...selectedPet, id: generateId(), hatchedAt: new Date().toISOString() };
    pets.push(newPet);
    activePet = newPet;
    saveState();
    renderPet();
    showPetModal(newPet);
    fireConfetti();
}

function showPetModal(pet) {
    const overlay = document.getElementById('petModalOverlay');
    const glow = document.getElementById('petModalGlow');
    const title = document.getElementById('petModalTitle');
    const emoji = document.getElementById('petModalEmoji');
    const name = document.getElementById('petModalName');
    const rarity = document.getElementById('petModalRarity');

    glow.style.background = `radial-gradient(circle, ${pet.glow}, transparent 70%)`;
    title.textContent = 'Congratulations!';
    title.style.color = pet.theme;
    emoji.textContent = pet.emoji;
    name.textContent = `${pet.name} - ${pet.species}`;
    name.style.color = pet.theme;
    rarity.textContent = `Rarity: ${pet.label}`;

    overlay.classList.add('active');
    document.getElementById('collectPetBtn').onclick = () => {
        overlay.classList.remove('active');
        showToast(`${pet.name} has been added to your collection!`, 'success');
    };
}

function fireConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15 - 5,
            size: Math.random() * 6 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1,
            decay: Math.random() * 0.015 + 0.01,
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 10
        });
    }
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach(p => {
            if (p.life <= 0) return;
            alive = true;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3;
            p.life -= p.decay;
            p.rotation += p.rotSpeed;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        });
        if (alive) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    animate();
}

function checkAlarms() {
    const now = Date.now();
    tasks.forEach(task => {
        if (task.alarm && !task.completed) {
            const alarmTime = new Date(task.alarm).getTime();
            if (now >= alarmTime && now - alarmTime < 1000) {
                triggerAlarm(task);
            }
        }
    });
}

function triggerAlarm(task) {
    showToast(`ALARM: "${task.title}" is due now!`, 'error');
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Task Alarm', { body: `"${task.title}" is due now!` });
    }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

function trackMouseMovement(e) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    const speed = Math.sqrt(dx * dx + dy * dy);
    mouseSpeed = mouseSpeed * 0.8 + speed * 0.2;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    const egg = document.getElementById('petEgg');
    if (!egg || egg.querySelector('i')) return;

    const rect = egg.getBoundingClientRect();
    const isOver = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!isOver) {
        if (petMood !== 'neutral') { petMood = 'neutral'; egg.className = 'pet-egg'; }
        return;
    }

    const now = Date.now();
    if (mouseSpeed > 30) {
        petMood = 'angry';
        egg.className = 'pet-egg angry';
        if (now - angryThrottle > 300) {
            angryThrottle = now;
            spawnAngryParticle(e.clientX, e.clientY);
        }
    } else {
        petMood = 'love';
        egg.className = 'pet-egg love';
        if (now - heartThrottle > 500) {
            heartThrottle = now;
            spawnHeartParticle(e.clientX, e.clientY);
        }
    }
}

function spawnHeartParticle(x, y) {
    const el = document.createElement('div');
    el.className = 'heart-particle';
    el.textContent = '\u2764\uFE0F';
    el.style.left = (x + (Math.random() - 0.5) * 40) + 'px';
    el.style.top = (y - 20) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

function spawnAngryParticle(x, y) {
    const el = document.createElement('div');
    el.className = 'angry-particle';
    el.textContent = '\u{1F4A2}';
    el.style.left = (x + (Math.random() - 0.5) * 30) + 'px';
    el.style.top = (y - 15) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(iso) {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatAlarm(iso) {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function updateDateTime() {
    const now = new Date();
    const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', dateOpts);
    document.getElementById('liveClock').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

document.getElementById('addTaskBtn').addEventListener('click', addTask);
document.getElementById('taskInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
document.getElementById('searchInput').addEventListener('input', (e) => { searchQuery = e.target.value; render(); });
document.getElementById('hatchBtn').addEventListener('click', hatchEgg);
document.addEventListener('mousemove', trackMouseMovement);
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
    });
});

if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

loadState();
render();
renderPet();
updateStreak();
updatePointsDisplay();
updateDateTime();
setInterval(updateDateTime, 1000);
setInterval(checkAlarms, 1000);
