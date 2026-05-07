// routes/articles.js
const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validationMiddleware'); // Importa o middleware
const { createArticleSchema, updateArticleSchema, articleIdSchema, articleQuerySchema } = require('../schemas/articleSchemas'); // Importa os schemas

// Rotas Públicas
// Valida os query params (categoryId, authorId, search)
router.get('/', validateRequest(articleQuerySchema, 'query'), articleController.getAllArticles);
// Valida o parâmetro :id
router.get('/:id', validateRequest(articleIdSchema, 'params'), articleController.getArticleById);

// Rotas Protegidas
// Valida o body antes de criar
router.post('/', protect, validateRequest(createArticleSchema, 'body'), articleController.createArticle);
// Valida o :id (params) E o body antes de atualizar
router.put('/:id', protect, validateRequest(articleIdSchema, 'params'), validateRequest(updateArticleSchema, 'body'), articleController.updateArticle);
// Valida o :id (params) antes de deletar
router.delete('/:id', protect, validateRequest(articleIdSchema, 'params'), articleController.deleteArticle);

module.exports = router;