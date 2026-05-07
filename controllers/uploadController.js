// controllers/uploadController.js
const path = require('path');
const url = require('url');

const uploadController = {
    uploadImage: (req, res, next) => {
        if (!req.file) {
            // Se nenhum arquivo foi enviado ou houve um erro no multer (ex: filtro rejeitou)
            return res.status(400).json({ message: 'Nenhum arquivo de imagem válido enviado ou erro no upload.' });
        }

        try {
            let imageUrl;

            // Primeiro tenta usar a variável de ambiente BACKEND_PUBLIC_URL (método preferido)
            const backendBaseUrl = process.env.BACKEND_PUBLIC_URL;
            
            if (backendBaseUrl) {
                // Se a variável de ambiente está definida, use-a para construir a URL
                imageUrl = new URL(`/uploads/${req.file.filename}`, backendBaseUrl).toString();
                console.log(`Usando BACKEND_PUBLIC_URL: ${backendBaseUrl}`);
            } else {
                // Método alternativo: construir URL a partir do request (fallback)
                console.warn("AVISO: Variável BACKEND_PUBLIC_URL não definida, usando request para determinar URL.");
                const host = req.get('host');
                const protocol = req.protocol; // http ou https
                
                // Garante que não haja barras duplicadas
                const imagePath = `/uploads/${req.file.filename}`.replace('//', '/');
                imageUrl = `${protocol}://${host}${imagePath}`;
            }

            console.log(`Imagem ${req.file.filename} enviada com sucesso. URL: ${imageUrl}`);

            // Retorna a URL da imagem para o frontend
            res.status(200).json({ imageUrl: imageUrl });

        } catch (error) {
            console.error("Erro ao processar upload no controller:", error);
            // Usa next se disponível, caso contrário retorna erro 500
            if (typeof next === 'function') {
                next(error);
            } else {
                res.status(500).json({ message: 'Erro interno ao processar a imagem após o upload.' });
            }
        }
    },
};

module.exports = uploadController;