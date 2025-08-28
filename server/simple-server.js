import cors from 'cors'
import express from 'express'

const app = express()
const PORT = 3002

// Middleware
app.use(cors())
app.use(express.json())

// Rota de teste
app.get('/test', (req, res) => {
  res.json({ message: 'Servidor funcionando!' })
})

// Rota de teste para municipalities
app.get('/api/municipalities/public', (req, res) => {
  res.json([
    {
      id: '85dd1cad-8e51-4e18-a7ff-bce1ec94e615',
      name: 'Município Teste',
      state: 'PA'
    }
  ])
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor simples rodando na porta ${PORT}`)
  console.log(`🌐 URL: http://localhost:${PORT}`)
  console.log(`📋 Teste: http://localhost:${PORT}/test`)
  console.log(`🏛️  Municipalities: http://localhost:${PORT}/api/municipalities/public`)
})
