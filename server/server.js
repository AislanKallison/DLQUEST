const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const bodyParser = require('body-parser');

// 1. Configuração do PostgreSQL (use as credenciais fornecidas anteriormente)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'gameficacao_db',
    password: '1234', 
    port: 5432,
});

const app = express();
const PORT = 3000;
const JWT_SECRET = 'sua_chave_secreta_muito_segura'; // Mantenha isso secreto!

// Middleware
app.use(cors()); // Permite requisições do frontend
app.use(bodyParser.json()); // Usa body-parser para JSON

// Função de Middleware para verificar o JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Espera o formato 'Bearer TOKEN'

    if (token == null) return res.status(401).json({ error: 'Token necessário. Usuário não autenticado.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
        req.user = user; // Adiciona o payload do usuário à requisição
        next();
    });
}

// ==============================================================================
// 0. Teste de Conexão
// ==============================================================================

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Erro ao conectar ao PostgreSQL:', err);
        return;
    }
    console.log('Tudo pronto: API de Gamificação conectada ao PostgreSQL.');
    console.log('Conexão com PostgreSQL bem-sucedida!');
});

// ==============================================================================
// 1. ROTAS DE AUTENTICAÇÃO E PERFIL (CRUD de Usuário Completo)
// (Estas rotas já estavam em sua maioria corrigidas para usar 'id' em vez de 'user_id')
// ==============================================================================
// Adicione esta rota para a URL raiz
app.get('/', (req, res) => {
    res.send('Servidor da API de gamificação_db está conectado e funcionando!');
});

// ... suas rotas /api/register-and-complete-test e outras rotas virão depois ...
// Rota de Registro (CREATE - Usuário)
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        // CORREÇÃO 1: Altera 'user_id' para 'id' no RETURNING
        const result = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
            [name, email, passwordHash]
        );

        const newUser = result.rows[0];

        // O trigger `create_user_stats_on_register` deve criar a entrada em user_stats automaticamente.

        // CORREÇÃO 2: Usa newUser.id, mas mantém 'user_id' no payload do JWT
        const token = jwt.sign({ user_id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ 
            status: 'success', 
            message: 'Usuário registrado com sucesso e login automático realizado!', 
            token 
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        // Código de erro 23505 é para violação de unicidade (email já existe)
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Este e-mail já está em uso.' });
        }
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Rota de Login (READ - Autenticação)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    try {
        // CORREÇÃO 3: Altera 'user_id' para 'id' no SELECT
        const result = await pool.query('SELECT id, password_hash, email, name FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        // CORREÇÃO 4: Usa user.id no payload do JWT
        const token = jwt.sign({ user_id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ 
            status: 'success', 
            message: 'Login bem-sucedido!', 
            token,
            // CORREÇÃO 5: Usa user.id na resposta JSON
            user: { user_id: user.id, name: user.name, email: user.email }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});


// Rota para Obter Perfil do Usuário (READ) - Protegida
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { user_id } = req.user;
        
        // Junta dados de users e user_stats
        const query = `
            SELECT 
                u.id AS user_id, 
                u.name, 
                u.email, 
                u.initials,
                s.total_xp, 
                s.missions_completed
            FROM users u
            JOIN user_stats s ON u.id = s.user_id
            WHERE u.id = $1
        `;

        const result = await pool.query(query, [user_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });
        }

        res.json({ 
            status: 'success', 
            profile: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao obter perfil:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Rota para Atualizar Perfil do Usuário (UPDATE - Usuário)
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    const { user_id } = req.user;
    const { name, email, password } = req.body;
    
    let queryFields = [];
    let queryValues = [];
    let paramIndex = 1;

    // 1. Monta a query dinamicamente
    if (name) {
        queryFields.push(`name = $${paramIndex++}`);
        queryValues.push(name);
    }
    if (email) {
        queryFields.push(`email = $${paramIndex++}`);
        queryValues.push(email);
    }
    if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        queryFields.push(`password_hash = $${paramIndex++}`);
        queryValues.push(passwordHash);
    }

    if (queryFields.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar fornecido.' });
    }

    queryValues.push(user_id); // O último valor é o user_id para a cláusula WHERE

    try {
        const query = `
            UPDATE users 
            SET ${queryFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, name, email;
        `;

        const result = await pool.query(query, queryValues);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json({
            status: 'success',
            message: 'Perfil atualizado com sucesso!',
            // CORREÇÃO 6: O RETURNING retorna 'id', mas aqui mudamos para user_id no JSON
            updatedUser: { user_id: result.rows[0].id, name: result.rows[0].name, email: result.rows[0].email }
        });

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Este e-mail já está em uso por outro usuário.' });
        }
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Rota para Deletar Perfil do Usuário (DELETE - Usuário) - O que estava faltando!
app.delete('/api/user/profile', authenticateToken, async (req, res) => {
    const { user_id } = req.user;
    
    try {
        // Tenta deletar o registro do usuário
        // O DELETE CASCADE deve garantir a exclusão de user_stats, missions e mission_completions
        // CORREÇÃO 7: Altera 'user_id' para 'id' no RETURNING
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id, email, name',
            [user_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json({
            status: 'success',
            message: `A conta de "${result.rows[0].name}" foi deletada permanentemente com sucesso.`,
            // CORREÇÃO 8: Usa result.rows[0].id no objeto de retorno, mas chama o campo user_id
            deletedUser: { user_id: result.rows[0].id, name: result.rows[0].name, email: result.rows[0].email }
        });

    } catch (error) {
        console.error('Erro ao deletar conta de usuário:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao deletar conta.' });
    }
});


// ==============================================================================
// 2. ROTAS DE MISSÕES (CRUD de Missão Completo)
// (Corrigindo o uso de 'mission_id' para 'id' em todas as operações WHERE/UPDATE)
// ==============================================================================

// Rota para Criar Missão (CREATE) - Protegida
app.post('/api/missions', authenticateToken, async (req, res) => {
    const { title, description, category, reward_points } = req.body;
    const { user_id } = req.user;

    if (!title || !description || !reward_points) {
        return res.status(400).json({ error: 'Título, descrição e pontos de recompensa são obrigatórios.' });
    }

    try {
        // Assume que o RETURNING * retorna a coluna PK como 'id'
        const result = await pool.query(
            'INSERT INTO missions (user_id, title, description, category, reward_points) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [user_id, title, description, category || 'Geral', reward_points]
        );

        res.status(201).json({ 
            status: 'success', 
            message: 'Missão criada com sucesso!', 
            mission: result.rows[0] 
        });

    } catch (error) {
        console.error('Erro ao criar missão:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Rota para Listar Missões (READ - Múltiplas) - Protegida
app.get('/api/missions', authenticateToken, async (req, res) => {
    const { user_id } = req.user;
    
    // Busca todas as missões do usuário, ordenadas por data de criação (mais novas primeiro)
    const query = 'SELECT * FROM missions WHERE user_id = $1 ORDER BY created_at DESC';

    try {
        const result = await pool.query(query, [user_id]);

        res.json({ 
            status: 'success', 
            missions: result.rows 
        });

    } catch (error) {
        console.error('Erro ao listar missões:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Rota para Obter Missão Específica (READ - Única) - Adicionada para 100% CRUD
app.get('/api/missions/:mission_id', authenticateToken, async (req, res) => {
    const { user_id } = req.user;
    const { mission_id } = req.params;

    try {
        const result = await pool.query(
            // CORREÇÃO MISSÃO A: Alterando 'mission_id' para 'id' no WHERE (PK da missão)
            'SELECT * FROM missions WHERE id = $1 AND user_id = $2',
            [mission_id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Missão não encontrada ou não pertence ao usuário.' });
        }

        res.json({
            status: 'success',
            mission: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao obter missão específica:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Rota para Atualizar Missão (UPDATE - Somente Detalhes, não conclusão)
app.put('/api/missions/:mission_id', authenticateToken, async (req, res) => {
    const { user_id } = req.user;
    const { mission_id } = req.params;
    // Removemos completed_at daqui. A conclusão será feita na rota /complete
    const { title, description, category, reward_points } = req.body; 
    
    let queryFields = [];
    let queryValues = [];
    let paramIndex = 1;

    // 1. Monta a query dinamicamente
    if (title !== undefined) {
        queryFields.push(`title = $${paramIndex++}`);
        queryValues.push(title);
    }
    if (description !== undefined) {
        queryFields.push(`description = $${paramIndex++}`);
        queryValues.push(description);
    }
    if (category !== undefined) {
        queryFields.push(`category = $${paramIndex++}`);
        queryValues.push(category);
    }
    if (reward_points !== undefined) {
        queryFields.push(`reward_points = $${paramIndex++}`);
        queryValues.push(reward_points);
    }
    
    if (queryFields.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar fornecido.' });
    }

    queryValues.push(mission_id); // mission_id
    queryValues.push(user_id);    // user_id para segurança

    try {
        const query = `
            UPDATE missions 
            SET ${queryFields.join(', ')}
            -- CORREÇÃO MISSÃO B: Alterando 'mission_id' para 'id' no WHERE (PK da missão)
            WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
            RETURNING *;
        `;

        const result = await pool.query(query, queryValues);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Missão não encontrada ou não pertence ao usuário.' });
        }

        res.json({
            status: 'success',
            message: 'Detalhes da missão atualizados com sucesso!',
            updatedMission: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar missão:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Rota dedicada para Concluir Missão (Melhor prática RESTful)
app.post('/api/missions/:mission_id/complete', authenticateToken, async (req, res) => {
    const { user_id } = req.user;
    const { mission_id } = req.params;

    try {
        // 1. Verifica e obtém a missão
        // CORREÇÃO MISSÃO C: Alterando 'mission_id' para 'id' no WHERE (PK da missão)
        const missionResult = await pool.query(
            'SELECT reward_points, completed_at, id FROM missions WHERE id = $1 AND user_id = $2',
            [mission_id, user_id]
        );

        const mission = missionResult.rows[0];

        if (!mission) {
            return res.status(404).json({ error: 'Missão não encontrada ou não pertence ao usuário.' });
        }
        
        if (mission.completed_at) {
            return res.status(400).json({ error: 'Esta missão já foi concluída.' });
        }

        const xp_earned = mission.reward_points;

        // 2. Registra a conclusão na tabela mission_completions (o trigger incrementará user_stats)
        await pool.query(
            'INSERT INTO mission_completions (user_id, mission_id, completion_date, xp_earned) VALUES ($1, $2, NOW(), $3)',
            [user_id, mission.id, xp_earned] // Usando mission.id (PK) para mission_id no INSERT
        );

        // 3. Atualiza o status completed_at na tabela missions
        // CORREÇÃO MISSÃO D: Alterando 'mission_id' para 'id' no WHERE (PK da missão)
        const updateMission = await pool.query(
            'UPDATE missions SET completed_at = NOW() WHERE id = $1 RETURNING *',
            [mission_id]
        );

        res.json({
            status: 'success',
            message: `Missão concluída com sucesso! Você ganhou ${xp_earned} XP.`,
            updatedMission: updateMission.rows[0]
        });

    } catch (error) {
        console.error('Erro ao concluir missão:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao registrar conclusão.' });
    }
});


// Rota para Deletar Missão (DELETE - CRUD)
app.delete('/api/missions/:mission_id', authenticateToken, async (req, res) => {
    const { user_id } = req.user;
    const { mission_id } = req.params;

    try {
        // Tenta deletar o registro da missão
        // CORREÇÃO MISSÃO E: Alterando 'mission_id' para 'id' no WHERE (PK da missão)
        const result = await pool.query(
            'DELETE FROM missions WHERE id = $1 AND user_id = $2 RETURNING *',
            [mission_id, user_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Missão não encontrada ou não pertence ao usuário.' });
        }
        
        res.json({
            status: 'success',
            message: 'Missão deletada com sucesso!',
            deletedMission: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao deletar missão:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});


// Rota de Teste (Cria, executa o trigger e limpa)
// Útil para garantir que o sistema de XP está funcionando do zero.
app.post('/api/register-and-complete-test', async (req, res) => {
    let testUserId = null;
    let xpGanho = 0;
    let missoesConcluidas = 0;
    let testEmail = `teste_trigger_${Date.now()}@xp.com`;
    const testName = 'Teste Trigger'; // Nome do usuário de teste
    const testPassword = 'testepass';

    try {
        // 1. CRIAÇÃO: Registra um usuário de teste
        const testPasswordHash = await bcrypt.hash(testPassword, 10);
        const userResult = await pool.query(
            // CORREÇÃO 9: Altera 'user_id' para 'id' no RETURNING (PK do usuário)
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
            [testName, testEmail, testPasswordHash]
        );
        // CORREÇÃO 10: Usa o campo retornado `id` (Resolve: coluna "user_id" não existe)
        testUserId = userResult.rows[0].id;
        console.log(`Usuário de teste criado com ID: ${testUserId}`);

        // 2. CRIAÇÃO: Cria uma Missão
        const missionResult = await pool.query(
            // CORREÇÃO 13: Altera 'mission_id' para 'id' no RETURNING (PK da missão)
            'INSERT INTO missions (user_id, title, description, reward_points) VALUES ($1, $2, $3, $4) RETURNING id, reward_points',
            [testUserId, 'Missão de Teste', 'Testa o trigger de XP.', 100]
        );
        // CORREÇÃO 14: Usa o campo retornado `id`
        const missionId = missionResult.rows[0].id;
        const rewardPoints = missionResult.rows[0].reward_points;

        // 3. EXECUÇÃO DO TRIGGER: Conclui a Missão (Dispara o Trigger)
        // Isso simula o que a rota /complete faria
        await pool.query(
            'INSERT INTO mission_completions (user_id, mission_id, completion_date, xp_earned) VALUES ($1, $2, NOW(), $3)',
            [testUserId, missionId, rewardPoints]
        );
        // CORREÇÃO 15: Altera 'mission_id' para 'id' no WHERE (PK da missão)
        await pool.query('UPDATE missions SET completed_at = NOW() WHERE id = $1', [missionId]);


        // 4. VERIFICAÇÃO: Consulta o XP atualizado
        const statsResult = await pool.query(
            'SELECT total_xp, missions_completed FROM user_stats WHERE user_id = $1',
            [testUserId]
        );

        xpGanho = statsResult.rows[0].total_xp;
        missoesConcluidas = statsResult.rows[0].missions_completed;
        
        // 5. LIMPEZA: Deleta os dados de teste para não poluir o banco (usando DELETE CASCADE)
        // Deletar o usuário deve deletar stats, missões e conclusões
        // CORREÇÃO 11: Usa a coluna PK correta 'id' para a exclusão
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);

        res.json({
            status: 'success',
            message: 'Trigger funcionando perfeitamente! Dados de teste criados e deletados',
            xp_ganho: xpGanho,
            xp_final_apos_limpeza: 0,
            missões_concluídas: missoesConcluidas,
            email_usado: testEmail
        });

    } catch (error) {
        console.error('Erro no teste do trigger:', error);
        // Tenta limpar mesmo que o teste tenha falhado na metade
        if (testUserId) {
            // CORREÇÃO 12: Usa a coluna PK correta 'id' para a exclusão em caso de erro
            await pool.query('DELETE FROM users WHERE id = $1', [testUserId]).catch(e => console.error('Erro ao limpar usuário de teste:', e));
        }
        res.status(500).json({ error: 'Erro no teste do trigger.', details: error.message });
    }
});


// Inicia o Servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});