require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: "https://fenix.vercel.app", // URL do frontend no Vercel
    methods: ["GET","POST","PUT","DELETE"],
    credentials: true
}));
app.use(express.json());

// Conexão com Postgres
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: Number(process.env.DB_PORT) || 5432,
    ssl: { rejectUnauthorized: false },
});

// Rota de batidas
app.get("/Batidas", async (req, res) => {
    try {
        const { colaborador, inicio, fim } = req.query;

        let query = "SELECT * FROM batidas WHERE 1=1";
        const values = [];
        let count = 1;

        if (colaborador) {
            query += ` AND colaborador ILIKE $${count}`;
            values.push(`%${colaborador}%`);
            count++;
        }

        if (inicio && fim) {
            query += ` AND data BETWEEN $${count} AND $${count + 1}`;
            values.push(inicio, fim);
            count += 2;
        } else if (inicio) {
            query += ` AND data >= $${count}`;
            values.push(inicio);
            count++;
        } else if (fim) {
            query += ` AND data <= $${count}`;
            values.push(fim);
            count++;
        }

        query += ` ORDER BY data DESC`;

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (e) {
        console.error("Erro ao consultar o banco:", e);
        res.status(500).send("Erro no servidor");
    }
});

app.post("/Batidas", async (req, res) => {
    try {
        // Pega os dados do corpo da requisição
        const { data, colaborador, batida_normal, batida_extra, meta, amostra, perdas, user_name } = req.body;

        // Monta a query de insert
        const query = `
            INSERT INTO batidas (data, colaborador, batida_normal, batida_extra, meta, amostra, perdas, user_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *;
        `;

        // Passa os valores recebidos para a query
        const values = [data, colaborador, batida_normal, batida_extra, meta, amostra, perdas, user_name];

        // Executa no banco
        const result = await pool.query(query, values);

        // Retorna sucesso
        res.status(201).json({
            message: "✅ Batida inserida com sucesso!",
            batida: result.rows[0],
        });

    } catch (error) {
        console.error("❌ Erro ao inserir batida:", error);
        res.status(500).json({ error: "Erro no servidor" });
    }
});


app.listen(PORT, () => {
    console.log(`🚀 API rodando em http://localhost:${PORT}`);
});
