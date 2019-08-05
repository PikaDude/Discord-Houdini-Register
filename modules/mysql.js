var index = require('../index.js');
var mysql = require('mysql');
var md5 = require('md5');
var twinBcrypt = require('twin-bcrypt');

var connection = mysql.createConnection(index.config.mysql);

connection.connect();

// Old versions of this program accidentally stored user id's as bigints. The following function checks what data type user id's are stored in, and if they're bigints it will change them to strings.
connection.query("SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'discord_penguins' AND COLUMN_NAME = 'userID'", function (error, results) {
    if (error) throw error;
    if (results[0].DATA_TYPE == 'bigint') {
        connection.query(`ALTER TABLE discord_penguins MODIFY userID varchar(20)`, function (error) {
            if (error) throw error;
            else console.log("Successfully migrated table from older version.");
        });
    }
});

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

exports.getPenguinUsernameDiscord = function (id) {
    return new Promise(resolve => {
        try {
            connection.query(`SELECT penguinID FROM discord_penguins WHERE userID = '${id}'`, function (error, results) {
                if (error) {
                    resolve({ error: error });
                    console.error(error);
                }
                else {
                    connection.query(`SELECT Username FROM penguin WHERE ID = '${results[0].penguinID}'`, function (error, results) {
                        if (error) {
                            resolve({ error: error });
                            console.error(error);
                        } else {
                            resolve(results[0].Username);
                        }
                    });
                }
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

exports.updatePassword = function (userID, password) {
    return new Promise(resolve => {
        try {
            var hashedPassword = md5(password).toUpperCase();
            var staticKey = "houdini";
            var flashClientHash = getLoginHash(hashedPassword, staticKey);
            twinBcrypt.hash(flashClientHash, 12, null, function (hash) {
                connection.query(`SELECT penguinID FROM discord_penguins WHERE userID = '${userID}'`, function (error, results) {
                    if (error) {
                        resolve({ error: error });
                        console.error(error);
                    } else {
                        connection.query(`UPDATE penguin SET Password = '${hash}' WHERE ID = '${results[0].penguinID}'`, function (error) {
                            if (error) {
                                resolve({ error: error });
                                console.error(error);
                            } else {
                                resolve('Success');
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