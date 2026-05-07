// routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs =zám = require('fs'); // Importa o módulo fs
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// --- Configuração do Multer ---

// Cria a pasta 'uploads' se não existir
const uploadsDir = path.join(__dirname, '..', 'uploads'); // Caminho para a pasta uploads na raiz
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}


// Configuração de armazenamento (onde e como salvar os arquivos)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Define a pasta onde os arquivos serão salvos
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Define o nome do arquivo salvo (timestamp + nome original para evitar colisões)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Adiciona um extra random
        const extension = path.extname(file.originalname); // Pega a extensão original
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
        // Exemplo de nome: image-1678886500000-123456789.png
    }
});

// Filtro de arquivos (aceitar apenas imagens)
const fileFilter = (req, file, cb) => {
    // Verifica o mimetype (tipo do arquivo)
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Aceita o arquivo
    } else {
        cb(new Error('Tipo de arquivo inválido! Apenas imagens são permitidas.'), false); // Rejeita o arquivo
    }
};

// Cria a instância do multer com as configurações
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Limite de 5MB (opcional)
    }
});

// --- Rota de Upload ---

// POST /api/upload-image (quando montado no server.js)
// 'image' deve corresponder ao nome do campo no FormData do frontend
router.post('/', protect, upload.single('image'), uploadController.uploadImage);
//    ^      ^----------------------------------^ ^-----------------------------^
//    |      |        Middleware multer          |    Controller após upload
//    |      para processar UM       |
//    |      arquivo no campo 'image' |
//    |
//    Path base da rota de upload

module.exports = router;