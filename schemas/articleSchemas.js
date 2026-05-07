// schemas/articleSchemas.js
const Joi = require('joi');

// Schema para criar um artigo (POST)
const createArticleSchema = Joi.object({
    category_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': `"ID da Categoria" deve ser um número`,
            'number.integer': `"ID da Categoria" deve ser um número inteiro`,
            'number.positive': `"ID da Categoria" deve ser um número positivo`,
            'any.required': `"ID da Categoria" é um campo obrigatório`
        }),
    title: Joi.string()
        .min(5)
        .max(255)
        .required()
        .messages({
            'string.base': `"Título" deve ser um texto`,
            'string.empty': `"Título" não pode ser vazio`,
            'string.min': `"Título" deve ter no mínimo {#limit} caracteres`,
            'string.max': `"Título" deve ter no máximo {#limit} caracteres`,
            'any.required': `"Título" é um campo obrigatório`
        }),
    slug: Joi.string()
        .max(255)
        .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .required()
        .messages({
            'string.base': `"Slug" deve ser um texto`,
            'string.empty': `"Slug" não pode ser vazio`,
            'string.max': `"Slug" deve ter no máximo {#limit} caracteres`,
            'string.pattern.base': `"Slug" deve conter apenas letras minúsculas, números e hífens`,
            'any.required': `"Slug" é um campo obrigatório`
        }),
    content: Joi.string()
        .min(10) // Define um mínimo para o conteúdo
        .required()
        .messages({
            'string.base': `"Conteúdo" deve ser um texto`,
            'string.empty': `"Conteúdo" não pode ser vazio`,
            'string.min': `"Conteúdo" deve ter no mínimo {#limit} caracteres`,
            'any.required': `"Conteúdo" é um campo obrigatório`
        }),
    // author_id não vem do body, vem do req.user (middleware auth)
}).options({ stripUnknown: true });

// Schema para atualizar um artigo (PUT) - Mesmo do criar para PUT
const updateArticleSchema = createArticleSchema;

// Schema para validar o ID do artigo nos parâmetros da rota
const articleIdSchema = Joi.object({
    id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({ 'number.base': `"ID" deve ser um número`,
            'number.integer': `"ID" deve ser um número inteiro`,
            'number.positive': `"ID" deve ser um número positivo`,
            'any.required': `"ID" é um parâmetro obrigatório` })
});

// Schema para validar os query params de busca
const articleQuerySchema = Joi.object({
    categoryId: Joi.number().integer().positive().allow(null, ''), // Permite nulo/vazio também
    // --- ADICIONADO categorySlug ---
    categorySlug: Joi.string()
        .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) // Mesmo padrão dos outros slugs
        .allow(null, ''), // Permite não ser enviado
    // ------------------------------
    authorId: Joi.alternatives().try(Joi.number().integer(), Joi.string()).allow(null, ''), // Permite nulo/vazio
    search: Joi.string().max(100).allow(null, ''), // Permite nulo/vazio
    // page: Joi.number().integer().positive().default(1),
    // limit: Joi.number().integer().positive().max(100).default(10),
}).options({
    stripUnknown: false, 
    stripUnknown: true
});

module.exports = {
    createArticleSchema,
    updateArticleSchema,
    articleIdSchema,
    articleQuerySchema, // Exporta o schema atualizado
};