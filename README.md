# IanqTour

![IanqTour Logo](https://example.com/ianqtour-logo.png) <!-- Substitua pela URL do seu logo, se tiver -->

## Visão Geral

IanqTour é uma plataforma moderna e intuitiva para gerenciamento e reserva de excursões e aventuras. Desenvolvida com foco na experiência do usuário e na eficiência operacional, a aplicação permite que os usuários explorem próximas aventuras, gerenciem seus ingressos e que os administradores controlem excursões, ônibus e reservas de forma simplificada.

## Funcionalidades

### Para Usuários:

*   **Exploração de Excursões:** Navegue por uma lista de próximas aventuras com detalhes como destino, data, preço e vagas disponíveis.
*   **Gerenciamento de Ingressos:** Consulte suas reservas e baixe seus ingressos informando seu CPF.
*   **Reserva Simplificada:** Processo de reserva de excursões fácil e rápido.
*   **Design Responsivo:** Experiência otimizada em dispositivos móveis e desktop.

### Para Administradores:

*   **Gerenciamento de Excursões:** Adicione, edite e remova excursões, incluindo detalhes como nome, destino, data, preço, imagem e assentos disponíveis.
*   **Gerenciamento de Ônibus:** Controle a frota de ônibus e sua capacidade.
*   **Gerenciamento de Reservas:** Visualize e gerencie todas as reservas feitas pelos usuários.

## Tecnologias Utilizadas

*   **Frontend:**
    *   React.js: Biblioteca JavaScript para construção de interfaces de usuário.
    *   Vite: Ferramenta de build rápido para projetos web.
    *   Tailwind CSS: Framework CSS utilitário para estilização rápida e responsiva.
    *   Framer Motion: Biblioteca para animações fluidas e interativas.
    *   React Router DOM: Para roteamento de páginas na aplicação.
    *   Shadcn/ui: Componentes de UI acessíveis e personalizáveis.
*   **Backend/Banco de Dados:**
    *   Supabase: Backend-as-a-Service (BaaS) de código aberto, oferecendo banco de dados PostgreSQL, autenticação, armazenamento e APIs em tempo real.

## Como Configurar o Projeto Localmente

Siga estas instruções para ter uma cópia do projeto rodando em sua máquina local para desenvolvimento e testes.

### Pré-requisitos

Certifique-se de ter o Node.js (versão 18 ou superior) e o npm (ou Yarn) instalados em sua máquina.

*   [Node.js](https://nodejs.org/)
*   [npm](https://www.npmjs.com/)

### Instalação

1.  **Clone o repositório:**

    ```bash
    git clone https://github.com/ianqtour/ianqtours.git
    cd ianqtours
    ```

2.  **Instale as dependências:**

    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Configuração do Supabase:**

    *   Crie um projeto no [Supabase](https://supabase.com/).
    *   Obtenha sua `SUPABASE_URL` e `SUPABASE_ANON_KEY` nas configurações do projeto (Settings -> API).
    *   Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis de ambiente:

        ```
        VITE_SUPABASE_URL="SUA_SUPABASE_URL"
        VITE_SUPABASE_ANON_KEY="SUA_SUPABASE_ANON_KEY"
        ```

    *   Configure seu banco de dados Supabase com as tabelas necessárias para excursões, reservas, etc. (Você pode usar os scripts SQL fornecidos no projeto, se houver, ou criar manualmente).

### Rodando a Aplicação

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
# ou
yarn dev
```

A aplicação estará disponível em `http://localhost:5173` (ou outra porta, se 5173 estiver em uso).

## Contribuição

Contribuições são bem-vindas! Se você deseja contribuir, por favor, siga estes passos:

1.  Faça um fork do repositório.
2.  Crie uma nova branch (`git checkout -b feature/sua-feature`).
3.  Faça suas alterações e commit (`git commit -m 'feat: Adiciona nova funcionalidade X'`).
4.  Envie para a branch (`git push origin feature/sua-feature`).
5.  Abra um Pull Request.

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes. <!-- Crie um arquivo LICENSE se ainda não tiver um -->

## Contato

Para dúvidas ou sugestões, entre em contato com:

*   **IanqTour** - ianq@ddinsights.com.br
*   **GitHub:** [ianqtour](https://github.com/ianqtour)