const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Registro
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const newUser = new User({ username, password });
        await newUser.save();
        res.status(201).json({ message: "Usuario creado con éxito" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Credenciales Maestras de Agustín
    if (username === "Agus_rtn" && password === "Maragus2417") {
        return res.json({
            token: "admin-secret-token",
            user: { username: "Agus_rtn", role: "admin" }
        });
    }

    // Lógica para usuarios normales (aquí buscarías en la DB)
    res.status(401).json({ message: "Credenciales incorrectas" });
});

module.exports = router;