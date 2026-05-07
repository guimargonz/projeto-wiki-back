const { Pool } = require('pg');
require('dotenv').config(); // Carrega variáveis do .env

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Testa a conexão
pool.query('SELECT NOW()')
    .then(res => {
        console.log('Conectado ao banco de dados PostgreSQL em:', res.rows[0].now);
    })
    .catch(err => {
        console.error('Erro ao conectar ao banco de dados:', err.stack);
    });

module.exports = {
    async query(text, params) {
        try {
            const res = await pool.query(text, params);
            return res;
        } catch (err) {
            console.error('Erro executando query', { text, params }, err.stack);
            throw err; // Re-lança o erro para ser tratado pelo chamador
        }
    },
    pool: pool, // Exporta o pool se precisar de transações, etc.
};