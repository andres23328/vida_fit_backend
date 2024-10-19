const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const secretKey = 'mi_secreto_super_seguro';

router.post('/registrar', async (req, res) => {
    const {
        nombre,
        apellido,
        peso,
        estatura,
        fecha_nacimiento,
        genero,
        nivel_actividad,
        objetivo,
        frecuencia_ejercicios,
        correo // Asegúrate de recibir el correo en el body
    } = req.body;

    // Buscar el id_usuario en la tabla de login según el correo
    const selectQuery = 'SELECT id_usuarios FROM login WHERE correo = ?';
    db.query(selectQuery, [correo], (err, results) => {
        if (err) {
            console.error('Error al buscar el usuario:', err);
            return res.status(500).json({ message: 'Error al buscar el usuario' });
        }

        let id_usuario = null; // Inicializar id_usuario como null
        if (results.length > 0) {
            id_usuarios = results[0].id_usuarios; // Obtener el id_usuario si existe
        }

        // Calcular el IMC
        const heightInMeters = estatura / 100;  
        const imc = (peso / (heightInMeters * heightInMeters)).toFixed(2);

        // Calcular la Masa Corporal Magra según el género
        let masaCorporalMagra;
        if (genero === 'Masculino') {
            masaCorporalMagra = (0.407 * peso) + (0.267 * estatura) - 19.2;
        } else if (genero === 'Femenino') {
            masaCorporalMagra = (0.252 * peso) + (0.473 * estatura) - 48.3;
        } else {
            return res.status(400).json({ message: 'Género inválido' });
        }

        const porcentajeMasaCorporal = ((masaCorporalMagra / peso) * 100).toFixed(2);

        // Guardar los datos del usuario en la base de datos
        const query = `INSERT INTO usuarios (nombre, apellido, peso, estatura, fecha_nacimiento, genero, nivel_actividad, objetivo, frecuencia_ejercicios, masa_corporal, porcentaje_masa_corporal, imc, id_usuarios) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;


        db.query(query, [
            nombre,
            apellido,
            peso,
            estatura,
            fecha_nacimiento,
            genero,
            nivel_actividad,
            objetivo,
            frecuencia_ejercicios,
            masaCorporalMagra,
            porcentajeMasaCorporal,
            imc,
            id_usuarios // Insertar id_usuario, que puede ser null
        ], (err, result) => {
            if (err) {
                console.error('Error insertando datos:', err);
                return res.status(500).json({ message: 'Error al guardar los datos del usuario' });
            }
            res.status(201).json({ 
                message: 'Usuario registrado exitosamente!', 
                imc, 
                masaCorporalMagra, 
                porcentajeMasaCorporal,
                correo,
                id_usuarios // Puedes devolver el id_usuario si lo necesitas
            });
        });
    });
});





//Registrar usuario

// Ruta para registrar un usuario
router.post('/registrarusuario', async (req, res) => {
    console.log('Solicitud de registro recibida:', req.body);
    const { correo, contraseña, usuario } = req.body;

    // Verificar si ya existe un usuario con el correo dado
    const queryCheck = 'SELECT * FROM login WHERE correo = ?';
    db.query(queryCheck, [correo], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error al verificar el correo' });
        }
        if (results.length > 0) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        // Encriptar la contraseña antes de almacenarla
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        // Insertar nuevo usuario en la base de datos
        const queryInsert = 'INSERT INTO login (correo, contraseña, usuario) VALUES (?, ?, ?)';
        db.query(queryInsert, [correo, hashedPassword, usuario], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Error al registrar el usuario' });
            }
            res.status(201).json({ message: 'Usuario registrado exitosamente', user_id: result.insertId });
        });
    });
});


// Ruta para iniciar sesión
router.post('/iniciarsesion', async (req, res) => {
    const { correo, contraseña } = req.body;

    // Consultar si el usuario existe por correo
    const query = 'SELECT * FROM login WHERE correo = ?';
    db.query(query, [correo], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error al verificar el usuario' });
        }
        if (results.length === 0) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        const usuario = results[0];

        // Comparar la contraseña proporcionada con la contraseña almacenada en la base de datos (hash)
        const match = await bcrypt.compare(contraseña, usuario.contraseña);

        if (!match) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        // Generar el token JWT
        const token = jwt.sign(
            { user_id: usuario.id_usuarios, correo: usuario.correo }, // Payload del token
            secretKey, // Clave secreta
            { expiresIn: '1h' } // El token expira en 1 hora
        );

        // Responder con el token
        res.json({
            message: 'Inicio de sesión exitoso',
            token: token
        });
    });
});


router.get('/user', async (req, res) => {
    const { correo } = req.query; // Obtener el correo desde la URL
  
    // Comprueba si el correo fue proporcionado
    if (!correo) {
      return res.status(400).json({ message: 'Correo es requerido' });
    }
  
    // Primero, obtén el id_usuarios del login
    const queryLogin = 'SELECT id_usuarios FROM login WHERE correo = ?';
    
    db.query(queryLogin, [correo], async (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
  
      if (results.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
  
      // Ahora que tenemos el id_usuarios, obtenemos los detalles del usuario
      const idUsuario = results[0].id_usuarios;
      const queryUser = 'SELECT * FROM usuarios WHERE id_usuarios = ?';
      
      db.query(queryUser, [idUsuario], (err, userResults) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
  
        if (userResults.length > 0) {
          return res.json(userResults[0]); // Devuelve los datos del usuario
        } else {
          return res.status(404).json({ message: 'Usuario no encontrado' });
        }
      });
    });
  });
  
  




module.exports = router;
