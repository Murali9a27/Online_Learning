// config/db.js
require("dotenv").config()
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',       // Use your MySQL username
    password: process.env.PASSWORD||'', // Use your MySQL password
    database: 'learning_platform'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL Database.');
});

module.exports = connection;
