require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pgTypes = require("pg-types");
const {response} = require("express");

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "chave-secreta-forte";
pgTypes.setTypeParser(1082, (val) => val);

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
    console.log("👉", req.method, req.url, "| Origin:", req.headers.origin);
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
    ssl: {
        rejectUnauthorized: false
    }
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
        //const senhaCriptografada = await bcrypt.hash(senha, 10);
        if (result.rows.length === 0) {
            return res.status(401).json({ erro: "Usuário não encontrado" });
        }
        const usuario = result.rows[0];

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
                user_name,
                npedido
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
        const { data, colaborador, batida_normal, batida_extra, meta, amostra, perdas, user_name, nPedido } = req.body;

        const query = `
            INSERT INTO batidas (data, colaborador, batida_normal, batida_extra, meta, amostra, perdas, user_name,npedido)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9)
                RETURNING *;
        `;

        const values = [data, colaborador, batida_normal, batida_extra, meta, amostra, perdas, user_name,nPedido];
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

//busca receitas tintas

app.get("/Tons", autenticarToken, async (req, res) => {
    try {
        const { nome } = req.query;

        const query = `
            SELECT nome, codigo, data_criacao
            FROM cores_tons
            WHERE nome LIKE $1
            ORDER BY data_criacao DESC
        `;

        const result = await pool.query(query, [`%${nome}%`]);

        res.json(result.rows);
    } catch (e) {
        console.error("Erro ao consultar o banco:", e);
        res.status(500).send("Erro no servidor");
    }
});

app.get("/Receitas",autenticarToken,async (req,res) => {
    try{
        const { codigo } = req.query;

        const query = `
            SELECT
                cp.nome,
                r.unidade,
                r.quantidade
            FROM receitas r
                     INNER JOIN cores_primarias cp ON cp.id = r.id_cor
                     INNER JOIN cores_tons ct ON ct.id = r.id_tom
            WHERE ct.codigo = $1
            ORDER BY r.id DESC
        `;

        const result = await pool.query(query, [codigo]);

        res.json(result.rows);
    }catch (e) {
        console.error("Erro ao consultar o banco:", e);
        res.status(500).send("Erro no servidor");
    }
});

//cadastro das receitas

app.post("/CadastroTons", autenticarToken, async (req,res) =>{
    try{
        const {nome,codigo,data_criacao} = req.body;

        const query = `
        insert into cores_tons (nome,codigo,data_criacao) values 
        ($1,$2,$3) returning * ;
        `;
        const values = [nome,codigo,data_criacao];
        const result = await pool.query(query, values);

        res.status(201).json({
            message: "✅ Ton cadastrado com sucesso!",
            Ton: result.rows[0],
        });

    }catch (e) {
        console.error("Erro ao consultar o banco:", e);
        res.status(500).send("Erro no servidor");
    }
});

app.post("/CadastroReceitas", autenticarToken, async (req,res) =>{
    try{
        const {nome,codigo,id_tom,id_cor,unidade,quantidade} = req.body;

        const query = `
            insert into receitas (nome,codigo,id_tom,id_cor,unidade, quantidade) values 
        ($1,$2,$3, $4, $5, $6) returning * ;
        `;
        const values = [nome,codigo,id_tom,id_cor,unidade,quantidade];
        const result = await pool.query(query, values);

        res.status(201).json({
            message: "✅ Receita cadastrada com sucesso!",
            Receita: result.rows[0],
        });

    }catch (e) {
        console.error("Erro ao consultar o banco:", e);
        res.status(500).send("Erro no servidor");
    }
});

app.post("/Pedidos", autenticarToken, async (req, res) =>{
    const client = await pool.connect();
        try{
            const {cliente_nome, data_emissao, data_entrega, tipo_pedido, valvula, promotor, silk, quantidade_batidas,
                estoque, arte, vendedor, status, comissao, tipopagamento, tipofrete, endereco, cidade, cep, transportadora, data_ultima_alteracao, usuario,itens} = req.body;

            if (!itens || itens.length === 0) {
                return res.status(400).json({
                    message: "O pedido deve conter ao menos um item"
                });
            }

            await client.query("BEGIN");

            const pedidoQuery = `
                insert into pedidos
                (cliente_nome, data_emissao, data_entrega, tipo_pedido, valvula, promotor, silk, quantidade_batidas, estoque, arte, vendedor, status, comissao, tipopagamento, tipofrete, endereco, cidade, cep, transportadora, data_ultima_alteracao, usuario)
                VALUES( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,$14,$15,$16,$17,$18,$19,$20,$21)
                    RETURNING id`;


            const pedidoValues=[cliente_nome, data_emissao, data_entrega, tipo_pedido, valvula, promotor, silk, quantidade_batidas, estoque, arte, vendedor,
                status, comissao, tipopagamento, tipofrete, endereco, cidade, cep, transportadora, data_ultima_alteracao, usuario];
            const pedidoResult = await client.query(pedidoQuery, pedidoValues);

            const pedidoId = pedidoResult.rows[0].id;

            const itemQuery = `
            insert into itens(id_pedido, data_registro, descricao, preco, tipounidade, quantidade)
            values($1,$2,$3,$4,$5,$6)`;


            for (const item of itens) {
                const itemValues = [
                    pedidoId,
                    data_emissao,
                    item.descricao,
                    item.preco,
                    item.tipoUnidade,
                    item.quantidade
                ];

                await client.query(itemQuery, itemValues);
            }
            await client.query("COMMIT");


            res.status(201).json({
                message: "✅ Pedido e itens cadastrados com sucesso!"
            });


        }catch (error) {
            await client.query("ROLLBACK");

            console.error("Erro ao cadastrar pedido:", error);

            res.status(500).json({
                message: "❌ Erro ao cadastrar pedido",
                error: error.message
            });
        } finally {
            client.release();
        }
});

app.get("/ListaPedidos", autenticarToken, async (req, res) => {
    try{
        const { dataInicial, dataFinal, dataEntrega, cidade, cliente } = req.query;

        let query = `SELECT * FROM pedidos WHERE 1=1`;
        const values =[];
        let count = 1;
        if(dataInicial && dataFinal){
            query += ` and data_emissao between $${count} and $${count +1}`;
            values.push(dataInicial,dataFinal);
            count += 2;
        }
        if(dataEntrega){
            query += ` and data_entrega = $${count}`;
            values.push(dataEntrega);
            count++;
        }

        if(cliente){
            query += ` and cliente_nome ILIKE $${count}`;
            values.push(`%${cliente}%`);
            count++;
        }
        if(cidade){
            query += ` and cidade ILIKE $${count}`;
            values.push(cidade);
            count++;
        }
        const result = await pool.query(query,values);

        res.json(result.rows);
    }catch (e) {
        console.error("Erro ao consultar o banco:", e);
        e.status(500).json({ erro: e.message, stack: e.stack });
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