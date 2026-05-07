// controllers/authController.js
const ldap = require('ldapjs');
const jwt = require('jsonwebtoken');

// Função auxiliar para criar o cliente LDAP (pode ser movida para um config/ldap.js)
function createLdapClient() {

    // Verifica se a URL do LDAP está definida, senão retorna null ou lança erro
    if (!process.env.LDAP_URL) {

        return null;
    }

    const client = ldap.createClient({
        url: process.env.LDAP_URL,
        reconnect: true // Tenta reconectar automaticamente
    });

    // Tratamento básico de erros de conexão (pode ser aprimorado)
    client.on('error', (err) => {
        console.error('Erro no cliente LDAP:', err);
    });
    client.on('connectError', (err) => {
        console.error('Erro de CONEXÃO LDAP:', err);
    });
    client.on('timeout', (err) => {
        console.error('Timeout no cliente LDAP:', err);
    });
    client.on('end', () => {

    });
    client.on('connect', () => {

    });

    return client;
}


const authController = {
    login: async (req, res, next) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
        }


        // --- MODO DE DESENVOLVIMENTO ---
        // Busca as credenciais DEV do .env ou usa padrões 'dev'/'devpass'
        const DEV_USER = process.env.DEV_LOGIN_USER || 'usuario.teste';
        const DEV_PASSWORD = process.env.DEV_LOGIN_PASSWORD || '123456789';

        // Verifica se as credenciais correspondem às de desenvolvimento
        if (username === DEV_USER && password === DEV_PASSWORD) {

            // Cria um payload JWT fake para o usuário dev
            const devUserProfile = {
                userId: 1, // ID Fixo para dev
                username: DEV_USER,
                displayName: 'Usuário DEV',
                // Adicione roles se precisar testar autorização (exemplo)
                // roles: ['admin', 'editor']
            };

            // Assina o Token (usa as mesmas configs de JWT do .env)
            try {
                const token = jwt.sign(
                    devUserProfile,
                    process.env.JWT_SECRET,
                    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } // Adiciona fallback para expiresIn
                );

                // Envia o Token para o Frontend
                return res.status(200).json({
                    message: 'Login de Desenvolvimento bem-sucedido!',
                    token: token,
                    user: devUserProfile
                });
            } catch (jwtError) {
                console.error("Erro ao gerar token JWT para usuário DEV:", jwtError);
                return res.status(500).json({ message: "Erro interno ao gerar token de desenvolvimento." });
            }
        }
        // --- FIM MODO DE DESENVOLVIMENTO ---


        // --- LÓGICA LDAP ORIGINAL (Executa se não for usuário DEV) ---

        const client = createLdapClient();


        let userDN = '';



//Construindo o DN com base no atributo e search base 
        userDN = `${process.env.LDAP_USERNAME_ATTRIBUTE}=${username},${process.env.LDAP_SEARCH_BASE}`;


        client.bind(userDN, password, (err) => {
            if (err) {
                console.error(`Erro no bind LDAP para ${userDN}:`, err);
                client.unbind(); // Garante que o cliente seja desvinculado

                // Verifica tipos comuns de erro de bind
                if (err.name === 'InvalidCredentialsError') {
                    return res.status(401).json({ message: 'Credenciais inválidas.' });
                } else if (err.name === 'NoSuchObjectError') {
                    return res.status(401).json({ message: 'Usuário não encontrado.' });
                } else {
                    // Outro erro (conexão, configuração, etc.)
                    return res.status(500).json({ message: 'Erro no servidor durante a autenticação LDAP.' });
                }
            }

            // --- Bind bem-sucedido ---

            // (Nome completo, email, grupos, etc.) - Exemplo básico:
            const searchOptions = {
                filter: `(${process.env.LDAP_USERNAME_ATTRIBUTE}=${username})`, // Filtro para encontrar o usuário
                scope: 'sub', // Busca na subárvore a partir da base
                attributes: ['dn', 'cn', 'sn', 'givenName', 'mail', 'sAMAccountName', 'memberOf'] // Atributos a retornar
            };

            client.search(process.env.LDAP_SEARCH_BASE, searchOptions, (searchErr, searchRes) => {
                if (searchErr) {
                    console.error('Erro na busca LDAP:', searchErr);
                    client.unbind();
                    // Não impede o login, mas loga o erro
                    // Poderia retornar erro 500 se as infos fossem essenciais
                }

                let userProfile = { username: username, ldapDN: userDN }; // Mínimo

                searchRes.on('searchEntry', (entry) => {
                    // Pega os atributos encontrados e adiciona ao perfil
                    userProfile = {
                        ...userProfile,
                        userId: entry.object.sAMAccountName || username, // Usa sAMAccountName como ID ou o próprio username
                        displayName: entry.object.cn || entry.object.givenName || username,
                        email: entry.object.mail,
                        memberOf: entry.object.memberOf // Lista de grupos (DNs)
                    };
                });

                searchRes.on('error', (errEmitido) => {
                    console.error('Erro durante busca LDAP:', errEmitido.message);
                    // Continua mesmo com erro na busca por enquanto
                });

                searchRes.on('end', (result) => {
                    client.unbind(); // Desvincula o cliente LDAP após a busca

                    if (!entryFound) {
                        userProfile.userId = username; // Usa username como ID se não encontrado
                        userProfile.displayName = username;
                    }

                    // --- Criar o Payload do JWT ---
                    // Inclua apenas informações essenciais e não sensíveis
                    const jwtPayload = {
                        userId: userProfile.userId, // Usando o ID definido acima
                        username: userProfile.username,
                        displayName: userProfile.displayName,
                        // Adicione outros dados se necessário (ex: roles extraídos de memberOf)
                    };

                    // --- Assinar o Token ---
                    try {
                        const token = jwt.sign(
                            jwtPayload,
                            process.env.JWT_SECRET,
                            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } // Fallback
                        );
                        // Envia o Token
                        return res.status(200).json({ message: 'Login bem-sucedido!', token: token, user: jwtPayload });
                    } catch (jwtError) {
                        console.error("Erro ao gerar token JWT para usuário LDAP:", jwtError);
                        return res.status(500).json({ message: "Erro interno ao gerar token." });
                    }
                });
            }); // Fim client.search

        }); // Fim client.bind
    },

    // Poderíamos ter outras funções aqui (ex: verifyToken, getUserProfile, etc.)
};

module.exports = authController;