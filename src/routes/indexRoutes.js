const express = require('express');
const router = express.Router();
const seguimientoController = require('../controllers/seguimientoController');

// Página principal
router.get('/', seguimientoController.index);

module.exports = router;

