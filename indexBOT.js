import express from "express";
import axios from "axios";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rota para processar mensagens
app.post("/mensagem", async (req, res) => {
  try {
    const { mensagem, empresaId, bairroId } = req.body;

    // 1. Buscar taxa na sua API
    const taxaResponse = await axios.get(
      `https://chatbot-wame.onrender.com/taxa/${empresaId}/${bairroId}`
    );
    const taxaData = taxaResponse.data;

    // 2. Montar prompt com a informação real
    const prompt = `
    O usuário perguntou: "${mensagem}"
    Dados atuais:
    - Empresa: ${taxaData.empresaId}
    - Bairro: ${taxaData.bairro}
    - Taxa de entrega: R$${taxaData.taxa}

    Responda de forma educada e natural informando a taxa ao usuário.
    `;

    // 3. Chamar ChatGPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // ou gpt-3.5-turbo
      messages: [
        { role: "system", content: "Você é um atendente de entregas." },
        { role: "user", content: prompt },
      ],
    });

    const resposta = completion.choices[0].message.content;

    // 4. Retornar resposta ao usuário
    res.json({ resposta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao processar a mensagem" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
