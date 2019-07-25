var index = require('../index.js');
var mysql = require('mysql');
var md5 = require('md5');
var twinBcrypt = require('twin-bcrypt');

var connection = mysql.createConnection(index.config.mysql);

connection.connect();

exports.checkUsername = function (username) {
    return new Promise(resolve => {
        try {
            connection.query(`SELECT Username FROM penguin WHERE Username = '${username}'`, function (error, results) {
                if (error) {
                    resolve({ error: error });
                    console.error(error);
                }
                else resolve(results);
            });
        } catch (error) {
            console.error(error);
            resolve({ error: error });
        }
    });
}

exports.checkIfAccountUsed = function (id) {
    return new Promise(resolve => {
        try {
            connection.query(`SELECT userID FROM discord_penguins WHERE userID = '${id}'`, function (error, results) {
                if (error) {
                    resolve({ error: error });
                    console.error(error);
                }
                else resolve(results);
            });
        } catch (error) {
            console.error(error);
            resolve({ error: error });
        }
    });
}

exports.insertUser = function (username, password, color, userID) {
    return new Promise(resolve => {
        try {
            var hashedPassword = md5(password).toUpperCase();
            var staticKey = "houdini";
            var flashClientHash = getLoginHash(hashedPassword, staticKey);
            twinBcrypt.hash(flashClientHash, 12, null, function (hash) {
                connection.query(`INSERT INTO penguin (ID, Username, Nickname, Approval, Password, Email, Active, Color) VALUES (NULL, '${username}', '${username}', '1', '${hash}', '', '1', '${color}')`, function (error, results) {
                    if (error) {
                        resolve({ error: error });
                        console.error(error);
                    } else {
                        connection.query(`INSERT INTO discord_penguins (userID, penguinID) VALUES ('${userID}', '${results.insertId}')`, function (error) {
                            if (error) {
                                resolve({ error: error });
                                console.error(error);
                            } else {
                                connection.query(`INSERT INTO inventory (PenguinID, ItemID) VALUES ('${results.insertId}', '${color}')`, function (error) {
                                    if (error) {
                                        resolve({ error: error });
                                        console.error(error);
                                    } else {
                                        connection.query(`INSERT INTO igloo (ID, PenguinID) VALUES (NULL, '${results.insertId}')`, function (error) {
                                            if (error) {
                                                resolve({ error: error });
                                                console.error(error);
                                            } else {
                                                connection.query(`INSERT INTO postcard (ID, SenderID, RecipientID, Type) VALUES (NULL, NULL, '${results.insertId}', '125')`, function (error) {
                                                    if (error) {
                                                        resolve({ error: error });
                                                        console.error(error);
                                                    } else {
                                                        resolve('Success');
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            });
        } catch (error) {
            console.error(error);
            resolve({ error: error });
        }
    });
}

function encryptPassword(password, MD5) {
    if (MD5 != false) {
        password = md5(password);
    }
    var hash = password.substr(16, 16) + password.substr(0, 16);
    return hash;
}

function getLoginHash(password, staticKey) {
    var hash = encryptPassword(password, false);
    hash += staticKey;
    hash += 'Y(02.>\'H}t":E1';
    hash = encryptPassword(hash);
    return hash;
}