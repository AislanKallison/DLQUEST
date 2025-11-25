// ===== DADOS E ESTADO =====
let missions = [];
let userStats = {
    sequence: 0,
    completionRate: 0,
    totalPoints: 0,
    conquests: 0,
    level: 1,
    experience: 0
};
let user = {
    name: 'João da Silva',
    email: 'joao@example.com',
    avatar: 'JD'
};

const API_BASE = 'http://localhost:3000/api';
let isSubmitting = false; // Flag para prevenir múltiplos submits

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', async function() {
    await loadDataFromServer();
    initializeEventListeners();
    updateDate();
    renderDashboard();
    renderMissions();
    renderProfile();
    setInterval(updateDate, 60000);
});

// ===== CONEXÃO COM SERVIDOR =====
async function loadDataFromServer() {
    try {
        const [missionsRes, statsRes, userRes] = await Promise.all([
            fetch(`${API_BASE}/missions`),
            fetch(`${API_BASE}/stats`),
            fetch(`${API_BASE}/user`)
        ]);
        if (missionsRes.ok) missions = await missionsRes.json();
        if (statsRes.ok) userStats = await statsRes.json();
        if (userRes.ok) user = await userRes.json();
        updateStats(); // Garantir que stats reflitam missions carregadas
    } catch (error) {
        console.error('Erro ao carregar dados do servidor:', error);
    }
}

let saveTimeout; // Para debounce
async function saveDataToServer() {
    clearTimeout(saveTimeout); // Cancela saves pendentes
    saveTimeout = setTimeout(async () => {
        try {
            await Promise.all([
                fetch(`${API_BASE}/missions`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(missions)
                }),
                fetch(`${API_BASE}/stats`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userStats)
                }),
                fetch(`${API_BASE}/user`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(user)
                })
            ]);
        } catch (error) {
            console.error('Erro ao salvar dados no servidor:', error);
        }
    }, 500); // Debounce de 500ms
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Navegação
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const screenName = this.dataset.screen;
            switchScreen(screenName);
        });
    });

    // Formulário de missão
    document.getElementById('missionForm').addEventListener('submit', addMission);

    // Botões de ação
    document.getElementById('addMissionBtn').addEventListener('click', function() {
        switchScreen('missions');
    });

    document.getElementById('viewAllBtn').addEventListener('click', function() {
        switchScreen('missions');
    });

    // Filtros de missão
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderMissionsList(this.dataset.filter);
        });
    });

    // Modal
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('modalDeleteBtn').addEventListener('click', deleteMissionFromModal);

    // Perfil
    document.getElementById('clearDataBtn').addEventListener('click', clearAllData);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// ===== NAVEGAÇÃO =====
function switchScreen(screenName) {
    // Remover active de todas as telas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Remover active de todos os nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Adicionar active à tela e nav item selecionados
    document.getElementById(screenName).classList.add('active');
    document.querySelector(`[data-screen="${screenName}"]`).classList.add('active');

    // Atualizar título
    const titles = {
        'dashboard': 'Dashboard',
        'missions': 'Missões',
        'profile': 'Perfil'
    };
    document.getElementById('screenTitle').textContent = titles[screenName];
}

// ===== FORMULÁRIO E CRUD =====
async function addMission(e) {
    e.preventDefault();
    if (isSubmitting) return; // Previne múltiplos

    const title = document.getElementById('missionTitle').value.trim();
    const description = document.getElementById('missionDescription').value.trim();
    const category = document.getElementById('missionCategory').value;
    const reward = parseInt(document.getElementById('missionReward').value);
    const status = document.getElementById('missionStatus').value;
    const time = document.getElementById('missionTime').value;

    if (!title || !category || isNaN(reward)) {
        showSuccessMessage('Preencha título, categoria e recompensa válidos!');
        return;
    }

    // Verifica duplicata recente (título + categoria nos últimos 5 min)
    const now = new Date();
    const recentDuplicate = missions.find(m => 
        m.title === title && 
        m.category === category && 
        now - new Date(m.createdAt) < 5 * 60 * 1000
    );
    if (recentDuplicate) {
        showSuccessMessage('Missão similar já adicionada recentemente! Edite-a se precisar.');
        return;
    }

    isSubmitting = true;
    const submitBtn = document.querySelector('#missionForm button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Adicionando...';
    submitBtn.disabled = true;

    const newMission = {
        id: Date.now(),
        title,
        description,
        category,
        reward,
        status,
        time: time || new Date().getHours().toString().padStart(2, '0') + ':' + new Date().getMinutes().toString().padStart(2, '0'),
        createdAt: new Date().toISOString()
    };

    missions.push(newMission);
    updateStats();
    await saveDataToServer();

    // Limpar formulário
    document.getElementById('missionForm').reset();

    // Reabilitar
    isSubmitting = false;
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;

    // Mostrar mensagem de sucesso
    showSuccessMessage('Missão adicionada com sucesso!');

    // Atualizar renderizações
    renderDashboard();
    renderMissions();
    renderProfile();
}

async function toggleMissionStatus(id) {
    const mission = missions.find(m => m.id === id);
    if (mission) {
        mission.status = mission.status === 'Concluído' ? 'Pendente' : 'Concluído';
        if (mission.status === 'Concluído') {
            mission.time = new Date().getHours().toString().padStart(2, '0') + ':' + new Date().getMinutes().toString().padStart(2, '0');
        }
        updateStats();
        await saveDataToServer();
        renderDashboard();
        renderMissions();
        renderProfile();
    }
}

async function deleteMission(id) {
    missions = missions.filter(m => m.id !== id);
    updateStats();
    await saveDataToServer();
    renderDashboard();
    renderMissions();
    renderProfile();
    showSuccessMessage('Missão deletada com sucesso!');
}

function deleteMissionFromModal() {
    const id = parseInt(document.getElementById('modalDeleteBtn').dataset.missionId);
    deleteMission(id);
    closeModal();
}

// ===== ATUALIZAR ESTATÍSTICAS =====
function updateStats() {
    const completedCount = missions.filter(m => m.status === 'Concluído').length;
    const totalMissions = missions.length;

    userStats.completionRate = totalMissions > 0 ? Math.round((completedCount / totalMissions) * 100) : 0;
    userStats.sequence = completedCount > 0 ? completedCount * 10 + 2 : 0;
    userStats.conquests = Math.floor(completedCount / 2);
    userStats.totalPoints = missions.reduce((sum, m) => {
        return m.status === 'Concluído' ? sum + m.reward : sum;
    }, 0);
}

// ===== RENDERIZAÇÃO - DASHBOARD =====
function renderDashboard() {
    // Atualizar informações do usuário
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userLevel').textContent = `Nível ${userStats.level}`;
    document.getElementById('userCardName').textContent = user.name;
    document.getElementById('userCardLevel').textContent = `Nível ${userStats.level} - ${userStats.experience}/500 XP`;
    document.getElementById('userAvatar').textContent = user.avatar;
    document.getElementById('userCardAvatar').textContent = user.avatar;

    // Atualizar estatísticas
    document.getElementById('statSequence').textContent = userStats.sequence;
    document.getElementById('statCompletion').textContent = userStats.completionRate + '%';
    document.getElementById('statPoints').textContent = userStats.totalPoints.toLocaleString('pt-BR');
    document.getElementById('statConquests').textContent = userStats.conquests;

    // Renderizar missões recentes
    const recentMissions = missions.slice(-3).reverse();
    const container = document.getElementById('recentMissionsContainer');

    if (recentMissions.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Nenhuma missão adicionada ainda</p></div>';
        return;
    }

    container.innerHTML = recentMissions.map(mission => `
        <div class="mission-item ${mission.status === 'Concluído' ? 'completed' : 'pending'}" onclick="openMissionModal(${mission.id})">
            <div class="mission-checkbox ${mission.status === 'Concluído' ? 'checked' : ''}" onclick="event.stopPropagation(); toggleMissionStatus(${mission.id})">
                ${mission.status === 'Concluído' ? '✓' : ''}
            </div>
            <div class="mission-content">
                <div class="mission-title">${mission.title}</div>
                <div class="mission-description">${mission.category}</div>
            </div>
            <div class="mission-reward ${mission.status === 'Concluído' ? 'completed' : ''}">
                +${mission.reward}
            </div>
        </div>
    `).join('');
}

// ===== RENDERIZAÇÃO - MISSÕES =====
function renderMissions() {
    renderMissionsList('all');
}

function renderMissionsList(filter = 'all') {
    const container = document.getElementById('allMissionsContainer');
    let filteredMissions = missions;

    if (filter !== 'all') {
        filteredMissions = missions.filter(m => m.status === filter);
    }

    if (filteredMissions.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Nenhuma missão encontrada</p></div>';
        return;
    }

    container.innerHTML = filteredMissions.map(mission => `
        <div class="mission-item ${mission.status === 'Concluído' ? 'completed' : 'pending'}" onclick="openMissionModal(${mission.id})">
            <div class="mission-checkbox ${mission.status === 'Concluído' ? 'checked' : ''}" onclick="event.stopPropagation(); toggleMissionStatus(${mission.id})">
                ${mission.status === 'Concluído' ? '✓' : ''}
            </div>
            <div class="mission-content">
                <div class="mission-title">${mission.title}</div>
                <div class="mission-description">${mission.description}</div>
            </div>
            <div class="mission-reward ${mission.status === 'Concluído' ? 'completed' : ''}">
                +${mission.reward}
            </div>
        </div>
    `).join('');
}

// ===== RENDERIZAÇÃO - PERFIL =====
function renderProfile() {
    document.getElementById('profileAvatar').textContent = user.avatar;
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileLevel').textContent = `Nível ${userStats.level} - ${userStats.experience}/500 XP`;

    const completedCount = missions.filter(m => m.status === 'Concluído').length;
    document.getElementById('profileTotalMissions').textContent = missions.length;
    document.getElementById('profileCompletedMissions').textContent = completedCount;
    document.getElementById('profileTotalPoints').textContent = userStats.totalPoints;
    document.getElementById('profileCompletionRate').textContent = userStats.completionRate + '%';
}

// ===== MODAL =====
function openMissionModal(id) {
    const mission = missions.find(m => m.id === id);
    if (!mission) return;

    const modal = document.getElementById('missionModal');
    const details = document.getElementById('modalMissionDetails');

    details.innerHTML = `
        <h3>${mission.title}</h3>
        <p><strong>Categoria:</strong> ${mission.category}</p>
        <p><strong>Descrição:</strong> ${mission.description}</p>
        <p><strong>Status:</strong> <span style="color: ${mission.status === 'Concluído' ? '#10b981' : '#f59e0b'}">${mission.status}</span></p>
        <p><strong>Pontos de Recompensa:</strong> ${mission.reward}</p>
        <p><strong>Criada em:</strong> ${new Date(mission.createdAt).toLocaleDateString('pt-BR')}</p>
    `;

    document.getElementById('modalDeleteBtn').dataset.missionId = id;
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('missionModal').classList.remove('active');
}

// ===== UTILIDADES =====
function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date().toLocaleDateString('pt-BR', options);
    document.getElementById('currentDate').textContent = date;
}

function showSuccessMessage(message) {
    const msgElement = document.getElementById('successMessage');
    msgElement.textContent = '✓ ' + message;
    msgElement.classList.add('show');

    setTimeout(() => {
        msgElement.classList.remove('show');
    }, 3000);
}

async function clearAllData() {
    if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
        missions = [];
        userStats = {
            sequence: 0,
            completionRate: 0,
            totalPoints: 0,
            conquests: 0,
            level: 1,
            experience: 0
        };
        await saveDataToServer();
        renderDashboard();
        renderMissions();
        renderProfile();
        showSuccessMessage('Dados limpos com sucesso!');
    }
}

function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        alert('Você foi desconectado. Redirecionando para a página de login...');
        // Aqui você poderia redirecionar para uma página de login
        // window.location.href = '/login';
    }
}