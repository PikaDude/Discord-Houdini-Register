var config = require('../config.json');
var mysql = require('mysql');

var connection = mysql.createConnection(config.mysql);

connection.connect();

connection.query('CREATE TABLE IF NOT EXISTS discord_penguins ( \
    userID BIGINT, \
    penguinID INT, \
    PRIMARY KEY (userID) )', function (error, results, fields) {
    if (error) throw error;
    console.log(results);
});

connection.end();