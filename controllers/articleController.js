// controllers/articleController.js

const db = require('../config/db'); // Importa a configuração do banco de dados

const articleController = {
    /**
     * Busca todos os artigos, com opções de filtragem e busca.
     * Query Params:
     *  - categoryId (number): Filtra por ID da categoria.
     *  - categorySlug (string): Filtra por slug da categoria.
     *  - authorId (any): Filtra por ID do autor.
     *  - search (string): Busca por termo no título e/ou conteúdo (case-insensitive).
     */
    getAllArticles: async (req, res, next) => {

        // Extrai parâmetros da query string
        const { categoryId, categorySlug, authorId, search } = req.query;

        let queryParams = []; // Array para guardar os valores dos parâmetros da query SQL
        let whereClauses = []; // Array para guardar as condições da cláusula WHERE

        // --- Lógica de Filtragem ---

        // 1. Filtro por Categoria (Slug ou ID)
        //    Prioriza slug se ambos forem fornecidos (improvável, mas define uma ordem)
        if (categorySlug) {
            whereClauses.push(`c.slug = $${queryParams.length + 1}`); // Filtra pelo slug da categoria JOINED
            queryParams.push(categorySlug);
        } else if (categoryId) { // Só usa categoryId se categorySlug não for fornecido
            // Validação básica: verifica se é um número inteiro positivo
            if (!/^\d+$/.test(categoryId)) {
                return res.status(400).json({ message: 'categoryId inválido. Deve ser um número inteiro positivo.' });
            }
            // Adiciona a condição e o parâmetro correspondente
            whereClauses.push(`a.category_id = $${queryParams.length + 1}`);
            queryParams.push(parseInt(categoryId, 10));
        }

        // 2. Filtro por Autor (authorId)
        if (authorId) {
            // Adicione validação mais específica se necessário (ex: UUID, número)
            // if (!/^\d+$/.test(authorId)) { return res.status(400).json({ message: 'authorId inválido.' }); }
            // Adiciona a condição e o parâmetro correspondente
            whereClauses.push(`a.author_id = $${queryParams.length + 1}`);
            queryParams.push(authorId); // O tipo pode variar (string/número), ajuste a validação/parse se necessário
        }

        // 3. Filtro por Termo de Busca (search)
        if (search && search.trim() !== '') {
            const searchTerm = `%${search.trim()}%`; // Adiciona wildcards para busca parcial (LIKE/ILIKE)
            // Adiciona condição para buscar no título E/OU conteúdo (ILIKE é case-insensitive no PostgreSQL)
            // Escolha UMA das opções abaixo:

            // Opção A: Buscar apenas no título (melhor performance padrão)
            whereClauses.push(`a.title ILIKE $${queryParams.length + 1}`);
            queryParams.push(searchTerm);

            // Opção B: Buscar no título OU no conteúdo (pode ser mais lento sem índices full-text)
            // whereClauses.push(`(a.title ILIKE $${queryParams.length + 1} OR a.content ILIKE $${queryParams.length + 1})`);
            // queryParams.push(searchTerm); // O mesmo parâmetro é usado para ambas as condições ILIKE
        }

        // --- Fim: Lógica de Filtragem ---

        // Constrói a cláusula WHERE final, se houver filtros
        let whereClause = '';
        if (whereClauses.length > 0) {
            whereClause = `WHERE ${whereClauses.join(' AND ')}`; // Junta múltiplas condições com AND
        }

        try {
            // Constrói a query SQL final com JOIN users
            const queryText = `
                SELECT
                    a.id,
                    a.title,
                    a.slug,
                    a.created_at,
                    a.updated_at,
                    a.category_id,
                    c.name as category_name,
                    c.slug as category_slug,
                    c.icon_url as category_icon_url,
                    a.author_id,
                    u.displayName as author_name
                FROM articles a
                LEFT JOIN categories c ON a.category_id = c.id
                LEFT JOIN users u ON a.author_id = u.id
                ${whereClause}
                ORDER BY a.updated_at DESC
            `;

            // Log para debug
            console.log('Executando busca com query (JOIN users):', queryText);
            console.log('Parâmetros:', queryParams);

            // Executa a query no banco de dados com os parâmetros seguros
            const result = await db.query(queryText, queryParams);

            // Retorna os resultados encontrados
            return res.status(200).json(result.rows);

        } catch (error) {
            console.error("Erro ao buscar artigos no controller:", error);
            // Passa o erro para o middleware de erro global (se configurado)
            return next(error);
        }
    },

    /**
     * Busca um único artigo pelo seu ID.
     */
    getArticleById: async (req, res, next) => {
        const id = req.params.id; // Extrai o ID do artigo dos parâmetros da rota

        // Validação básica do ID (se for numérico)
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({ message: 'ID de artigo inválido.' });
        }

        try {
            // Query para buscar o artigo específico e dados da categoria associada
            const result = await db.query(`
                SELECT
                    a.id,
                    a.title,
                    a.slug,
                    a.content,
                    a.created_at,
                    a.updated_at,
                    a.category_id,
                    a.author_id,
                    c.name as category_name,
                    c.slug as category_slug,
                    c.icon_url as category_icon_url,
                    u.displayName as author_name
                FROM articles a
                LEFT JOIN categories c ON a.category_id = c.id
                LEFT JOIN users u ON a.author_id = u.id
                WHERE a.id = $1
            `, [id]); // Passa o ID como parâmetro seguro

            // Verifica se o artigo foi encontrado
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Artigo não encontrado' });
            }

            // Retorna o artigo encontrado (o primeiro e único resultado)
            return res.status(200).json(result.rows[0]);

        } catch (error) {
            console.error("Erro ao buscar artigo por ID no controller:", error);
            return next(error);
        }
    },

    /**
     * Cria um novo artigo. Requer autenticação.
     */
    createArticle: async (req, res, next) => {
        const { category_id, title, slug, content } = req.body; // Extrai dados do corpo da requisição

        // Obtém o ID do autor a partir do objeto `req.user` injetado pelo middleware de autenticação
        const authorId = req.user?.userId;

        // Validação dos dados recebidos
        if (!authorId) {
            // Esta verificação é uma segurança extra, o middleware protect já deve garantir
            return res.status(401).json({ message: 'Usuário não autenticado ou ID do autor não encontrado.' });
        }
        if (!category_id || !title || !slug || !content) {
            return res.status(400).json({ message: 'Campos obrigatórios: category_id, title, slug, content.' });
        }
        // Adicionar mais validações se necessário (ex: tamanho do título, formato do slug)

        try {
            // Insere o novo artigo no banco de dados
            const result = await db.query(
                `INSERT INTO articles (category_id, title, slug, content, author_id)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`, // Retorna todos os campos do artigo recém-criado
                [category_id, title, slug, content, authorId]
            );


        } catch (error) {
            console.error("Erro ao criar artigo no controller:", error);
            // Tratar erros específicos do DB (ex: slug duplicado) se necessário
            // if (error.code === '23505' && error.constraint === 'articles_slug_key') {
            //     return res.status(409).json({ message: 'Este slug já está em uso.' });
            // }
            return next(error);
        }
    },

    /**
     * Atualiza um artigo existente. Requer autenticação.
     */
    updateArticle: async (req, res, next) => {
        const id = req.params.id; // ID do artigo a ser atualizado
        const { category_id, title, slug, content } = req.body; // Novos dados
        const editorId = req.user?.userId; // ID do usuário que está tentando editar

        // Validação dos dados
        if (!editorId) {
            return res.status(401).json({ message: 'Usuário não autenticado.' });
        }
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({ message: 'ID de artigo inválido.' });
        }
        if (!category_id || !title || !slug || !content) {
            return res.status(400).json({ message: 'Campos obrigatórios: category_id, title, slug, content.' });
        }

        try {
            // Atualiza o artigo no banco de dados
            // Nota: A coluna 'updated_at' é atualizada automaticamente pelo CURRENT_TIMESTAMP
            const result = await db.query(
                `UPDATE articles
                 SET category_id = $1, title = $2, slug = $3, content = $4, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $5
                 -- Opcional: Adicionar verificação de autor
                 -- AND author_id = $6
                 RETURNING *`, // Retorna o artigo atualizado
                [category_id, title, slug, content, id /*, editorId */] // Descomente editorId se adicionar a verificação de autor no WHERE
            );

            // Verifica se algum registro foi atualizado (se o artigo existe e pertence ao autor, se aplicável)
            if (result.rows.length === 0) {
                // Pode ser que o artigo não exista ou o usuário não tenha permissão (se a verificação de autor for adicionada)
                return res.status(404).json({ message: 'Artigo não encontrado ou permissão negada para atualização.' });
            }

            // Retorna o artigo atualizado
            return res.status(200).json(result.rows[0]);

        } catch (error) {
            console.error("Erro ao atualizar artigo no controller:", error);
            // Tratar erros específicos do DB (ex: slug duplicado em outra linha) se necessário
            // if (error.code === '23505' && error.constraint === 'articles_slug_key') {
            //     return res.status(409).json({ message: 'Este slug já está em uso por outro artigo.' });
            // }
            return next(error);
        }
    },

    /**
     * Deleta um artigo. Requer autenticação.
     * TODO: Adicionar verificação se o usuário logado é o autor ou tem permissão.
     */
    deleteArticle: async (req, res, next) => {
        const id = req.params.id; // ID do artigo a ser deletado
        const deleterId = req.user?.userId; // ID do usuário que está tentando deletar

        // Validação
        if (!deleterId) {
            return res.status(401).json({ message: 'Usuário não autenticado.' });
        }
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({ message: 'ID de artigo inválido.' });
        }

        try {
            // Deleta o artigo do banco de dados
            const result = await db.query(
                `DELETE FROM articles
                 WHERE id = $1
                 -- Opcional: Adicionar verificação de autor
                 -- AND author_id = $2
                 RETURNING *`, // Retorna o artigo que foi deletado (opcional)
                [id /*, deleterId */] // Descomente deleterId se adicionar a verificação no WHERE
            );

            // Verifica se algum registro foi deletado
            if (result.rows.length === 0) {
                // Pode ser que o artigo não exista ou o usuário não tenha permissão
                return res.status(404).json({ message: 'Artigo não encontrado ou permissão negada para deletar.' });
            }

            // Retorna uma mensagem de sucesso (e opcionalmente o artigo deletado)
            return res.status(200).json({ message: 'Artigo deletado com sucesso.', deletedArticle: result.rows[0] });
            // Alternativa: Retornar status 204 No Content sem corpo de resposta
            // return res.status(204).send();

        } catch (error) {
            console.error("Erro ao deletar artigo no controller:", error);
            return next(error);
        }
    },
};

module.exports = articleController;