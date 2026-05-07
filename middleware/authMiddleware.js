// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    // 1. Verifica se o header Authorization existe e começa com "Bearer"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 2. Extrai o token (remove "Bearer " da string)
            token = req.headers.authorization.split(' ')[1];

            // 3. Verifica e decodifica o token usando o segredo
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 4. Anexa os dados do usuário decodificado ao objeto req
            //    (Excluindo dados sensíveis, se houver)
            //    Isso permite que as rotas protegidas acessem req.user
            req.user = decoded; // decoded conterá { userId, username, displayName, iat, exp }

            // 5. Chama o próximo middleware ou handler da rota
            next();

        } catch (error) {
            console.error('Erro na verificação do token:', error.message);
            // Trata erros comuns de JWT
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Token inválido.' });
            } else if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expirado.' });
            } else {
                // Outros erros
                return res.status(401).json({ message: 'Não autorizado, falha no token.' });
            }
        }
    }

    // 6. Se não houver token no header ou não estiver no formato correto
    if (!token) {
        return res.status(401).json({ message: 'Não autorizado, nenhum token fornecido.' });
    }
};

const authorize = (...roles) => { // Ex: authorize('admin', 'editor')
    return (req, res, next) => {
        // Assume que req.user foi preenchido pelo middleware 'protect'
        // e que req.user contém uma propriedade 'roles' (que viria do payload do JWT)
        if (!req.user || !req.user.roles || !roles.some(role => req.user.roles.includes(role))) {
            // Usuário não tem a role necessária
            return res.status(403).json({ message: 'Acesso proibido: Role insuficiente.' });
        }
        next(); // Usuário tem a role, permite acesso
    };
};


module.exports = { protect, authorize }; // Exporta o middleware