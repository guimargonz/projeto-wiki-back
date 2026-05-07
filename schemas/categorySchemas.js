// schemas/categorySchemas.js
const Joi = require('joi');

// Schema para criar uma categoria (POST)
const createCategorySchema = Joi.object({
    name: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.base': `"Nome" deve ser um texto`,
            'string.empty': `"Nome" não pode ser vazio`,
            'string.min': `"Nome" deve ter no mínimo {#limit} caracteres`,
            'string.max': `"Nome" deve ter no máximo {#limit} caracteres`,
            'any.required': `"Nome" é um campo obrigatório`
        }),
    slug: Joi.string()
        .max(150)
        .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) // Padrão básico para slugs (letras minúsculas, números, hífens)
        .required()
        .messages({
            'string.base': `"Slug" deve ser um texto`,
            'string.empty': `"Slug" não pode ser vazio`,
            'string.max': `"Slug" deve ter no máximo {#limit} caracteres`,
            'string.pattern.base': `"Slug" deve conter apenas letras minúsculas, números e hífens (ex: minha-categoria-legal)`,
            'any.required': `"Slug" é um campo obrigatório`
        }),
    icon_url: Joi.string()
        .uri({ scheme: ['http', 'https'] }) // Valida se é uma URL http ou https
        .allow(null, '') // Permite que seja nulo ou vazio (opcional)
        .messages({
            'string.base': `"URL do Ícone" deve ser um texto`,
            'string.uri': `"URL do Ícone" deve ser uma URL válida (http ou https)`
        })
}).options({ stripUnknown: true }); // Remove campos não definidos no schema

// Schema para atualizar uma categoria (PUT) - Mesmo do criar para PUT (todos campos necessários)
const updateCategorySchema = createCategorySchema;

// Schema para validar o ID da categoria nos parâmetros da rota (ex: /api/categories/:id)
const categoryIdSchema = Joi.object({
    id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': `"ID" deve ser um número`,
            'number.integer': `"ID" deve ser um número inteiro`,
            'number.positive': `"ID" deve ser um número positivo`,
            'any.required': `"ID" é um parâmetro obrigatório`
        })
});

module.exports = {
    createCategorySchema,
    updateCategorySchema,
    categoryIdSchema,
};