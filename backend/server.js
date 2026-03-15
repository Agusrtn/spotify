const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas
app.use('/api/auth', authRoutes);

// Ruta de prueba
app.get('/', (req, res) => res.send('API de Spotify clon funcionando'));

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));