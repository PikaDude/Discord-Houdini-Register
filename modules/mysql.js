var index = require('../index.js');
var mysql = require('mysql');

var connection = mysql.createConnection(index.config.mysql);

connection.connect();

exports.insertUser = function (user) {
    connection.query(`INSERT INTO discord_penguins (userID, penguinID) VALUES (${user.userID}, ${user.penguinID})`, function (error, results, fields) {
        if (error) console.error(error);
        console.log('The solution is: ', results[0].solution);
    });
}