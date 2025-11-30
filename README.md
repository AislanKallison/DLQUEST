# DLQUEST

Um projeto de sistema Web + servidor backend focado em gamificação do dia a dia, ajudando o usuário a organizar tarefas de forma divertida e motivadora.

## 🚀 Visão geral

O DLQUEST (Daily Quest) é uma plataforma que transforma sua rotina em um jogo.
Nele, você pode cadastrar atividades, marcar como concluídas, acompanhar seu progresso e ganhar recompensas — como um sistema similar ao “foguinhos do TikTok”, além de streaks, níveis, e desafios diários.

A proposta é unir produtividade + gamificação, fazendo com que o usuário se mantenha motivado enquanto organiza suas tarefas.

Ele consiste em duas partes principais:

-   **Front‑end** (`/front`) --- interface web construída com HTML, CSS
    e JavaScript.\
-   **Servidor** (`/server`) --- backend responsável por ...
    *(autenticação, API, banco de dados, lógica de negócio, etc.)*.\
-   **Project / assets** (`/project`, `/assets`) --- recursos, imagens,
    dados, configuração, etc.

## 📁 Estrutura do repositório

    /.vscode
    /assets
    /front
    /project
    /server
    README.md

-   `.vscode` --- configurações do editor/IDE.\
-   `assets` --- arquivos estáticos (imagens, ícones, etc.).\
-   `front` --- código da interface web.\
-   `server` --- código do servidor/back‑end.\
-   `project` --- outros artefatos, documentação, dados ou scripts de
    build.\
-   `README.md` --- este arquivo.

## 🧰 Pré‑requisitos

-   Node.js\
-   npm ou yarn\
-   Outros requisitos específicos...

## 🔧 Instalação & execução

1.  Clone o repositório:

        git clone https://github.com/AislanKallison/DLQUEST.git
        cd DLQUEST

2.  Instale dependências no servidor:

        cd server
        npm init -y
        npm install express cors pg jsonwebtoken bcrypt body-parser

3.  Inicie o servidor:

        cd ../server
        npm start

6.  Inicie o front‑end:

        cd ../front
        npm run dev

7.  Acesse `http://localhost:3000`.

## 📚 Funcionalidades

-   Autenticação\
-   Interface responsiva\
-   API REST\
-   Banco de dados\
-   Sistema de permissões\
-   Outros módulos...

## 🧠 Tecnologias utilizadas

-   Front-end: HTML, CSS, JS\
-   Back-end: Node.js, Express\
-   Banco de dados: PostgreSQL

## ✅ Como contribuir

1.  Faça um fork\
2.  Crie uma branch\
3.  Commit\
4.  Push\
5.  Pull Request