import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import axios from "axios";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Verificação de variáveis obrigatórias
if (!process.env.FIREBASE_SERVICE_ACCOUNT || !process.env.OPENAI_API_KEY) {
  console.error("❌ ERRO: Verifique se as variáveis FIREBASE_SERVICE_ACCOUNT e OPENAI_API_KEY estão definidas no .env");
  process.exit(1);
}

// ✅ Inicializa Firebase Admin com a chave do ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
// Corrige as quebras de linha para o formato PEM válido
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://jipafaz-8e7ba-default-rtdb.firebaseio.com/",
});

const db = admin.database();

// ✅ Inicializa OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Rota para buscar taxa por empresa e bairro
app.get("/taxa/:empresaId/:bairroId", async (req, res) => {
  const { empresaId, bairroId } = req.params;

  try {
    const ref = db.ref(`TABELAS/${empresaId}/${bairroId}`);
    const snapshot = await ref.once("value");
    const taxaInfo = snapshot.val();

    if (!taxaInfo) {
      return res.status(404).json({ error: "Bairro não encontrado para essa empresa" });
    }

    res.json({
      empresaId,
      bairroId,
      bairro: taxaInfo.BAIRRO || null,
      taxa: taxaInfo.TAXA?.replace(/"/g, "") || null,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar taxa:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// ✅ Rota para processar mensagens com OpenAI
app.post("/mensagem", async (req, res) => {
  try {
    const { mensagem, empresaId, bairroId } = req.body;

    if (!mensagem || !empresaId || !bairroId) {
      return res.status(400).json({ error: "Campos obrigatórios: mensagem, empresaId e bairroId" });
    }

    // 🔥 Se estiver na nuvem, usar a URL pública, senão localhost
    const apiBaseURL =
      process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;

    const taxaResponse = await axios.get(`${apiBaseURL}/taxa/${empresaId}/${bairroId}`);
    const taxaData = taxaResponse.data;

    // Montar prompt
    const prompt = `
    O usuário perguntou: "${mensagem}"
    Dados atuais:
    - Empresa: ${taxaData.empresaId}
    - Bairro: ${taxaData.bairro}
    - Taxa de entrega: R$${taxaData.taxa}

    Responda de forma educada e natural informando a taxa ao usuário.
    `;

    // Chamar OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Você é um atendente de entregas." },
        { role: "user", content: prompt },
      ],
    });

    const resposta = completion.choices[0].message.content;

    res.json({ resposta });
  } catch (error) {
    console.error("❌ Erro no processamento da mensagem:", error);
    res.status(500).json({ erro: "Erro ao processar a mensagem" });
  }
});

// ✅ Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
