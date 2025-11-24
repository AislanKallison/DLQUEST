/**
 * Variáveis de Configuração
 * A URL base para a comunicação com o servidor Node.js.
 * É essencial que seu servidor Node.js esteja rodando em http://localhost:3000.
 */
const API_URL = 'http://localhost:3000/api';

/**
 * Função utilitária para exibir mensagens de status na tela (sucesso/erro).
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de mensagem ('success' ou 'error').
 */
function showMessage(message, type = 'error') {
    const messageContainer = document.getElementById('message-container');
    if (messageContainer) {
        // Remove classes anteriores e exibe o container
        messageContainer.textContent = message;
        messageContainer.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
        
        if (type === 'success') {
            messageContainer.classList.add('bg-green-100', 'text-green-800');
        } else {
            messageContainer.classList.add('bg-red-100', 'text-red-800');
        }
        
        // Exibe a mensagem por 5 segundos
        messageContainer.classList.remove('hidden');

        setTimeout(() => {
            messageContainer.classList.add('hidden');
        }, 5000);
    }
}

/**
 * Lógica de Cadastro (Signup)
 * 1. Coleta os dados do formulário.
 * 2. Envia para a rota /api/register do servidor Node.js.
 * 3. Em caso de sucesso (response.ok), redireciona para login.html.
 */
function handleSignup() {
    const form = document.getElementById('signup-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. Coletar dados e Validar Senhas
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password !== confirmPassword) {
                showMessage('As senhas não coincidem.', 'error');
                return;
            }

            // Desabilitar botão e mostrar loading
            const registerButton = document.querySelector('#signup-form button[type="submit"]');
            registerButton.disabled = true;
            registerButton.textContent = 'Cadastrando...';

            try {
                // 2. Enviar dados para o Backend (server.js)
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();
                
                // 3. Verificar Sucesso
                if (response.ok) {
                    // SUCESSO NO CADASTRO (CÓDIGO 200/201)
                    showMessage('Cadastro realizado com sucesso! Redirecionando para a tela de login...', 'success');
                    
                    // REDIRECIONAMENTO PRINCIPAL PARA login.html
                    setTimeout(() => {
                        window.location.href = 'login.html'; 
                    }, 2000); 

                } else {
                    // ERRO REPORTADO PELO SERVIDOR (CÓDIGO 4xx/5xx)
                    // Usa a mensagem de erro do servidor, se disponível.
                    showMessage(data.message || `Falha no cadastro. Status HTTP: ${response.status}. Verifique o console do servidor.`, 'error');
                }

            } catch (error) {
                // ERRO DE REDE/CONEXÃO (FALHA NO FETCH)
                console.error('Erro ao conectar com o servidor Node.js:', error);
                showMessage('ERRO de Conexão: Não foi possível conectar ao servidor. Verifique se o Node.js está ativo em http://localhost:3000.', 'error');
            } finally {
                // Restaurar o botão
                registerButton.disabled = false;
                registerButton.textContent = 'Cadastrar';
            }
        });
    }
}


/**
 * Lógica de Login (Login)
 * Mantida para completude, mas o foco é no cadastro.
 */
function handleLogin() {
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const loginButton = document.querySelector('#login-form button[type="submit"]');
            loginButton.disabled = true;
            loginButton.textContent = 'Entrando...';

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('authToken', data.token); 
                    showMessage('Login bem-sucedido! Redirecionando para o painel...', 'success');
                    
                    setTimeout(() => {
                        window.location.href = 'dashboard.html'; 
                    }, 1000); 

                } else {
                    showMessage(data.message || 'Credenciais inválidas. Tente novamente.', 'error');
                }

            } catch (error) {
                console.error('Erro ao conectar com o servidor Node.js:', error);
                showMessage('ERRO de Conexão: Verifique se o servidor Node.js está ativo em http://localhost:3000.', 'error');
            } finally {
                loginButton.disabled = false;
                loginButton.textContent = 'Entrar';
            }
        });
    }
}


// Inicializa a lógica correta baseada na página atual
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se estamos na página de cadastro (signup.html)
    if (document.getElementById('signup-form')) {
        handleSignup();
    }
    // Verifica se estamos na página de login (login.html)
    if (document.getElementById('login-form')) {
        handleLogin();
    }
});