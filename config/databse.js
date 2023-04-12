const mysql = require('mysql');

const sql = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "ktln"
})

sql.connect((error) => {
    if(error) throw error;
    console.log("Database connected!");
});

module.exports = sql; 