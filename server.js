require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 4000;
const pgTypes = require("pg-types");
pgTypes.setTypeParser(1082, (val) => val);


// Configuração de CORS
const corsOptions = {
    origin: [
        "http://localhost:3000",
        "https://fenix.vercel.app",
        "https://fenix-three.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
};

// 🔎 Loga a origem das requisições (debug)
app.use((req, res, next) => {
    console.log("🔎 Origem:", req.headers.origin, "Método:", req.method);
    next();
});

// Aplica o CORS
app.use(cors(corsOptions));
// Middleware para JSON
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

// Rotas
app.get("/Batidas", async (req, res) => {
    try {
        const { colaborador, inicio, fim } = req.query;
        let query =`
            SELECT
                data,
                colaborador,
                batida_normal,
                batida_extra,
                meta,
                amostra,
                perdas,
                user_name
            FROM batidas
            WHERE 1=1
        `;
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
        const { data, colaborador, batida_normal, batida_extra, meta, amostra, perdas, user_name } = req.body;

        const query = `
            INSERT INTO batidas (data, colaborador, batida_normal, batida_extra, meta, amostra, perdas, user_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *;
        `;

        const values = [data, colaborador, batida_normal, batida_extra, meta, amostra, perdas, user_name];
        const result = await pool.query(query, values);

        res.status(201).json({
            message: "✅ Batida inserida com sucesso!",
            batida: result.rows[0],
        });
    } catch (error) {
        console.error("❌ Erro ao inserir batida:", error);
        res.status(500).json({ error: "Erro no servidor" });
    }
});

app.get("/Valvulas", async (req, res) => {
    try {
        const { colaborador, inicio, fim } = req.query;
        let query = `SELECT 
         data,
         colaborador,
         valvula_normal,
         valvula_exta
        FROM valvulas WHERE 1=1`;
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

app.post("/Valvulas", async (req, res) => {
    try {
        const { data, colaborador, valvula_normal, valvula_extra, user_name } = req.body;

        const query = `
            INSERT INTO valvulas (data, colaborador, valvula_normal, valvula_extra, user_name)
            VALUES ($1, $2, $3, $4, $5)
                RETURNING *;
        `;

        const values = [data, colaborador, valvula_normal, valvula_extra, user_name];
        const result = await pool.query(query, values);

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