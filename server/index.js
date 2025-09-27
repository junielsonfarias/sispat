// Backend mínimo para SISPAT
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'API SISPAT funcionando!' });
});

app.listen(PORT, () => {
  console.log(`Servidor backend SISPAT rodando na porta ${PORT}`);
});
