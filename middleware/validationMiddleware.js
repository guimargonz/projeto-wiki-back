// middleware/validationMiddleware.js
const Joi = require('joi');

/**
 * Cria um middleware Express para validar dados da requisição usando um schema Joi.
 * @param {Joi.Schema} schema O schema Joi para validar.
 * @param {('body'|'params'|'query')} property A propriedade do objeto `req` a ser validada ('body', 'params', ou 'query').
 * @returns Middleware Express
 */
const validateRequest = (schema, property = 'body') => {
    return (req, res, next) => {
        const dataToValidate = req[property]; // Pega os dados (req.body, req.params ou req.query)

        // Valida os dados
        // abortEarly: false -> retorna todos os erros, não apenas o primeiro
        const { error, value } = schema.validate(dataToValidate, { abortEarly: false });

        if (error) {
            // Se houver erro de validação
            // Mapeia os detalhes do erro para uma lista de mensagens
            const errorMessages = error.details.map(detail => detail.message);
            console.error(`Erro de Validação [${property}]:`, errorMessages); // Loga os erros

            // Retorna erro 400 Bad Request com as mensagens
            return res.status(400).json({
                message: `Erro de validação nos dados de ${property}.`,
                errors: errorMessages
            });
        }

        req[property] = value;

        // Passa para o próximo middleware ou handler da rota
        next();
    };
};

module.exports = validateRequest;