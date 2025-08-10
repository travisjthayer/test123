require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, filename, mimetype, size } = req.file;
    const documentTypeId = req.body.documentTypeId ? parseInt(req.body.documentTypeId) : null;
    const documentTitle = req.body.documentTitle || null;
    
    const query = `
      INSERT INTO files_new (original_name, stored_name, mime_type, size, document_type_id, "DocumentTitle", upload_date)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;
    
    const values = [originalname, filename, mimetype, size, documentTypeId, documentTitle];
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      file: result.rows[0]
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.get('/api/files', async (req, res) => {
  try {
    const query = `
      SELECT 
        f.*,
        dt."TypeName" as document_type_name
      FROM files_new f
      LEFT JOIN "vlex_DocumentType" dt ON f.document_type_id = dt."DocumentTypeID"
      ORDER BY f.upload_date DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

app.get('/api/document-types', async (req, res) => {
  try {
    const query = 'SELECT "DocumentTypeID", "TypeName" FROM "vlex_DocumentType" ORDER BY "TypeName"';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ error: 'Failed to fetch document types' });
  }
});

app.get('/api/view/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, uploadDir, filename);
  
  if (fs.existsSync(filepath)) {
    // Let browser handle the file display based on content type
    res.sendFile(filepath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, uploadDir, filename);
  
  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.delete('/api/files/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    const selectQuery = 'SELECT stored_name FROM files_new WHERE id = $1';
    const selectResult = await pool.query(selectQuery, [fileId]);
    
    if (selectResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const filename = selectResult.rows[0].stored_name;
    const filepath = path.join(__dirname, uploadDir, filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    
    const deleteQuery = 'DELETE FROM files_new WHERE id = $1';
    await pool.query(deleteQuery, [fileId]);
    
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Server is accessible on public IP at port ${PORT}`);
  }
});