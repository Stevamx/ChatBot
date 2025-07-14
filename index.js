const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);


const app = express();
app.use(cors());
app.use(express.json());

// Inicializa o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://jipafaz-8e7ba-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Rota para buscar taxa por empresa e bairro
app.get('/taxa/:empresaId/:bairroId', async (req, res) => {
  const { empresaId, bairroId } = req.params;

  try {
    const ref = db.ref(`TABELAS/${empresaId}/${bairroId}`);
    const snapshot = await ref.once('value');
    const taxaInfo = snapshot.val();

    if (!taxaInfo) {
      return res.status(404).json({ error: 'Bairro não encontrado para essa empresa' });
    }

    res.json({
      empresaId,
      bairroId,
      bairro: taxaInfo.BAIRRO || null,
      taxa: taxaInfo.TAXA?.replace(/"/g, '') || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
