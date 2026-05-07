// controllers/categoryController.js

const db = require('../config/db'); // Importa a configuração do banco de dados

const categoryController = {
    getAllCategories: async (req, res, next) => {
        try {
            const result = await db.query('SELECT id, name, slug, icon_url FROM categories ORDER BY name ASC');
            return res.status(200).json(result.rows);
        } catch (error) {
            console.error("Erro ao buscar categorias no controller:", error);
            return next(error);
        }
    },

    getCategoryById: async (req, res, next) => {
        const id = req.params.id; // Extrai o ID dos parâmetros da URL

        // Validação básica do ID (se for numérico) - Adicionado
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({ message: 'ID de categoria inválido.' });
        }

        try {
            const result = await db.query('SELECT id, name, slug, icon_url FROM categories WHERE id = $1', [id]);

            if (result.rows.length === 0) {
                // Categoria não encontrada
                return res.status(404).json({ message: 'Categoria não encontrada' });
            }

            // Categoria encontrada
            return res.status(200).json(result.rows[0]);

        } catch (error) {
            console.error("Erro ao buscar categoria por ID no controller:", error);
            return next(error);
        }
    },

    createCategory: async (req, res, next) => {
        const { name, slug, icon_url } = req.body; // Extrai name, slug, icon_url do corpo da requisição

        // Validação básica (pode ser melhorada com bibliotecas de validação como Joi/Zod)
        if (!name || !slug) {
            return res.status(400).json({ message: 'Nome e Slug da categoria são obrigatórios.' });
        }
        // Adicionar validação para formato do slug, tamanho dos campos, etc., se necessário.

        try {
            const result = await db.query(
                'INSERT INTO categories (name, slug, icon_url) VALUES ($1, $2, $3) RETURNING *', // RETURNING * para retornar a categoria criada
                [name, slug, icon_url] // Valores para os placeholders
            );

            // Categoria criada com sucesso
            return res.status(201).json(result.rows[0]); // Retorna a nova categoria criada (primeira linha do resultado) com status 201 Created

        } catch (error) {
            console.error("Erro ao criar categoria no controller:", error);
            // Tratar erros específicos do DB (ex: slug duplicado) se necessário
            if (error.code === '23505' && error.constraint === 'categories_slug_key') { // Assumindo que a constraint unique no slug se chama 'categories_slug_key'
                return res.status(409).json({ message: 'Este slug já está em uso por outra categoria.' });
            }
            return next(error); // Passa outros erros para o handler global
        }
    },

    updateCategory: async (req, res, next) => {
        const id = req.params.id; // Extrai o ID da categoria a ser atualizada da URL
        const { name, slug, icon_url } = req.body; // Extrai os dados atualizados do corpo da requisição

        // Validação básica do ID (se for numérico) - Adicionado
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({ message: 'ID de categoria inválido.' });
        }
        // Validação dos dados do corpo
        if (!name || !slug) {
            return res.status(400).json({ message: 'Nome e Slug da categoria são obrigatórios para atualização.' });
        }
        // Adicionar mais validações se necessário.

        try {
            const result = await db.query(
                'UPDATE categories SET name = $1, slug = $2, icon_url = $3 WHERE id = $4 RETURNING *', // UPDATE query
                [name, slug, icon_url, id] // Valores para os placeholders
            );

            if (result.rows.length === 0) {
                // Categoria não encontrada para atualizar
                return res.status(404).json({ message: 'Categoria não encontrada para atualização.' });
            }

            // Categoria atualizada com sucesso
            return res.status(200).json(result.rows[0]); // Retorna a categoria atualizada

        } catch (error) {
            console.error("Erro ao atualizar categoria no controller:", error);
            // Tratar erros específicos do DB (ex: slug duplicado em outra linha) se necessário
            if (error.code === '23505' && error.constraint === 'categories_slug_key') {
                return res.status(409).json({ message: 'Este slug já está em uso por outra categoria.' });
            }
            return next(error);
        }
    },

    deleteCategory: async (req, res, next) => {
        const id = req.params.id; // Extrai o ID da categoria a ser deletada da URL

        // Validação básica do ID (se for numérico) - Adicionado
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({ message: 'ID de categoria inválido.' });
        }

        // TODO: Considerar verificação de dependência: Impedir exclusão se houver artigos associados?
        // Exemplo: Verificar se existem artigos com esta category_id antes de deletar.
        // const checkArticles = await db.query('SELECT 1 FROM articles WHERE category_id = $1 LIMIT 1', [id]);
        // if (checkArticles.rows.length > 0) {
        //     return res.status(409).json({ message: 'Não é possível deletar a categoria, pois existem artigos associados a ela.' });
        // }

        try {
            const result = await db.query(
                'DELETE FROM categories WHERE id = $1 RETURNING *', // DELETE query com RETURNING *
                [id] // Valor para o placeholder
            );

            if (result.rows.length === 0) {
                // Categoria não encontrada para deletar
                return res.status(404).json({ message: 'Categoria não encontrada para deletar.' });
            }

            // Categoria deletada com sucesso
            return res.status(200).json({ message: 'Categoria deletada com sucesso.', deletedCategory: result.rows[0] });
            // Alternativa: Retornar status 204 No Content sem corpo
            // return res.status(204).send();

        } catch (error) {
            console.error("Erro ao deletar categoria no controller:", error);
            // Tratar erros de FK se a exclusão for bloqueada pelo DB
            if (error.code === '23503') { // Código de erro para Foreign Key Violation
                return res.status(409).json({ message: 'Não é possível deletar a categoria, pois está sendo referenciada (ex: por artigos).' });
            }
            return next(error);
        }
    },

    // O comentário 'As outras funções CRUD...' era redundante pois já estavam todas abaixo dele. Removido.
};

module.exports = categoryController;