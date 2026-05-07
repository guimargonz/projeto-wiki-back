// server.js
require('dotenv').config(); // Carrega variáveis de ambiente primeiro
const express = require('express');
const cors = require('cors');
const path = require('path'); // Importa o módulo path
const db = require('./config/db'); // Importa a configuração do DB
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 5000; // Usa a porta do .env ou 5000 como padrão

// --- Middlewares ---
app.use(cors()); // Habilita CORS para todas as origens (ajuste em produção se necessário)
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições

// --- Servir Arquivos Estáticos (Imagens Uploaded) --- 
// Mapeia requisições para /uploads para servir arquivos da pasta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- Rotas ---
// Rota de Teste
app.get('/', (req, res) => {
    res.send('Bem-vindo à API da WikiFarm!');
});

// Monta as rotas de categorias
const categoryRoutes = require('./routes/categories');
app.use('/api/categories', categoryRoutes);

// Monta as rotas de artigos
const articleRoutes = require('./routes/articles');
app.use('/api/articles', articleRoutes);

// Monta as rotas de upload
const uploadRoutes = require('./routes/upload');
app.use('/api/upload-image', uploadRoutes);

// Monta as rotas de autenticação
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);


// --- Tratamento de Erros Melhorado (para desenvolvimento) ---
app.use((err, req, res, next) => {
    // Tratamento especial para erros do Multer
    // Agora 'multer' está definido e podemos usar 'multer.MulterError'
    if (err instanceof multer.MulterError) {
        console.error("Erro do Multer:", err);
        return res.status(400).json({ message: `Erro no upload: ${err.message}` });
    } else if (err && err.message?.includes('Tipo de arquivo inválido')) { // Usa optional chaining ?.
        console.error("Erro de tipo de arquivo:", err);
        return res.status(400).json({ message: err.message });
    } else if (err) { // Outros erros
        console.error(err.stack);
        // Evita enviar o stack trace detalhado em produção, mas ok para dev
        const statusCode = err.status || 500; // Usa status do erro se disponível
        const errorMessage = err.message || 'Algo deu errado no servidor.';
        return res.status(statusCode).json({
            error: {
                message: errorMessage,
                // details: err.message // Removido para simplificar, a msg principal já tem
            }
        });
    }
    next(); // Chama next apenas se não for um erro tratado aqui
});

// --- Iniciar o Servidor ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    // Verifica se a conexão com o DB foi estabelecida (a query no db.js já faz isso)
});