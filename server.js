require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pgTypes = require("pg-types");

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "chave-secreta-forte";
pgTypes.setTypeParser(1082, (val) => val);

// ⚠️ Mover essas linhas para o topo!
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
app.use(cors(corsOptions));
app.use(express.json());


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

//login
app.post("/Login", async (req, res) =>{

    const {login,senha} = req.body;
    if (!login || !senha) {
        return res.status(400).json({ erro: "Login e senha são obrigatórios" });
    }
    try{
        const query = "SELECT * FROM usuarios WHERE nome = $1";
        const result = await pool.query(query, [login]);

        if (result.rows.length === 0) {
            return res.status(401).json({ erro: "Usuário não encontrado" });
        }
        const usuario = result.rows[0];
        //const senhaCriptografada = await bcrypt.hash(senha, 10); encriptando senha
        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({ erro: "Senha incorreta" });
        }
        const token = jwt.sign(
            { id: usuario.id, nome: usuario.nome, email: usuario.email },
            JWT_SECRET,
            { expiresIn: "1h" }
        );
        res.json({ token, nome: usuario.nome });
    }
    catch (error){
        console.error("Erro no login:", error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }

})

app.get("/Batidas",autenticarToken, async (req, res) => {
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

app.post("/Batidas",autenticarToken, async (req, res) => {
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

app.get("/Valvulas",autenticarToken, async (req, res) => {
    try {
        const { colaborador, inicio, fim } = req.query;
        let query = `SELECT 
         data,
         colaborador,
         valvula_normal,
         valvula_extra
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

app.post("/Valvulas", autenticarToken, async (req, res) => {
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
            message: "✅ Valvula inserida com sucesso!",
            batida: result.rows[0],
        });
    } catch (error) {
        console.error("❌ Erro ao inserir valvulas:", error);
        res.status(500).json({ error: "Erro no servidor" });
    }
});

//promotor

app.get("/Promotor",autenticarToken, async (req, res) => {
    try {
        const { colaborador, inicio, fim } = req.query;
        let query = `SELECT 
         data,
         colaborador,
         promotor_normal,
         promotor_extra
        FROM promotor WHERE 1=1`;
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

app.post("/Promotor", autenticarToken, async (req, res) => {
    try {
        const { data, colaborador, promotor_normal, promotor_extra, user_name } = req.body;

        const query = `
            INSERT INTO promotor (data, colaborador, promotor_normal, promotor_extra, user_name)
            VALUES ($1, $2, $3, $4, $5)
                RETURNING *;
        `;

        const values = [data, colaborador, promotor_normal, promotor_extra, user_name];
        const result = await pool.query(query, values);

        res.status(201).json({
            message: "✅ Batida Promotor inserida com sucesso!",
            batida: result.rows[0],
        });
    } catch (error) {
        console.error("❌ Erro ao inserir batidas Promotor:", error);
        res.status(500).json({ error: "Erro no servidor" });
    }
});

function autenticarToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ erro: "Token não fornecido" });

    jwt.verify(token, JWT_SECRET, (err, usuario) => {
        if (err) return res.status(403).json({ erro: "Token inválido ou expirado" });
        req.usuario = usuario;
        next();
    });
}

app.listen(PORT, () => {
    console.log(`🚀 API rodando em http://localhost:${PORT}`);
});