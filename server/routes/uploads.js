import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Apply authentication to all routes
router.use(authenticateToken)

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads'
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + '-' + uniqueSuffix + ext)
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de arquivo não permitido'), false)
    }
  }
})

// Upload single file
router.post('/single', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    }

    const fileUrl = `/uploads/${req.file.filename}`
    
    res.json({
      message: 'Arquivo enviado com sucesso',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Erro ao fazer upload do arquivo' })
  }
})

// Upload multiple files
router.post('/multiple', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    }

    const files = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype
    }))
    
    res.json({
      message: 'Arquivos enviados com sucesso',
      files: files
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Erro ao fazer upload dos arquivos' })
  }
})

// Delete file
router.delete('/:filename', (req, res) => {
  try {
    const { filename } = req.params
    const uploadPath = process.env.UPLOAD_PATH || './uploads'
    const filePath = path.join(uploadPath, filename)

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      res.json({ message: 'Arquivo excluído com sucesso' })
    } else {
      res.status(404).json({ error: 'Arquivo não encontrado' })
    }
  } catch (error) {
    console.error('Delete file error:', error)
    res.status(500).json({ error: 'Erro ao excluir arquivo' })
  }
})

// Get file info
router.get('/:filename', (req, res) => {
  try {
    const { filename } = req.params
    const uploadPath = process.env.UPLOAD_PATH || './uploads'
    const filePath = path.join(uploadPath, filename)

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      res.json({
        filename: filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `/uploads/${filename}`
      })
    } else {
      res.status(404).json({ error: 'Arquivo não encontrado' })
    }
  } catch (error) {
    console.error('Get file info error:', error)
    res.status(500).json({ error: 'Erro ao obter informações do arquivo' })
  }
})

export default router
