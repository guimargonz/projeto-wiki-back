// routes/categories.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validationMiddleware'); // Importa o middleware
const { createCategorySchema, updateCategorySchema, categoryIdSchema } = require('../schemas/categorySchemas'); // Importa os schemas

// Rotas Públicas
router.get('/', categoryController.getAllCategories);
// Valida o parâmetro :id
router.get('/:id', validateRequest(categoryIdSchema, 'params'), categoryController.getCategoryById);

// Rotas Protegidas
// Valida o body antes de criar
router.post('/', protect, validateRequest(createCategorySchema, 'body'), categoryController.createCategory);
// Valida o :id (params) E o body antes de atualizar
router.put('/:id', protect, validateRequest(categoryIdSchema, 'params'), validateRequest(updateCategorySchema, 'body'), categoryController.updateCategory);
// Valida o :id (params) antes de deletar
router.delete('/:id', protect, validateRequest(categoryIdSchema, 'params'), categoryController.deleteCategory);

module.exports = router;