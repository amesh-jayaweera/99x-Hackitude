const bcrypt = require("bcrypt");
const fetch = require("node-fetch");
const CryptoJS = require("crypto-js");

let _db;

function init(db) {
  _db = db;
}

const knex_db = require('../db/db-config')

function getUserByEmailAndPassword(email, password) {
  const sql1 = `SELECT id, name, email, password FROM users WHERE email = ?`;
  let usableEmail = email;

  return new Promise((resolve,reject) => {
    let isHash = false;
    knex_db.raw(sql1, [email])
    .then(async (user) => {
      if (user.length === 0) {
        usableEmail = CryptoJS.HmacSHA1(email, "Hacktitude_SECRET_KEY");
        // usableEmail = CryptoJS.AES.encrypt(email, "Hacktitude_SECRET_KEY").toString();
        isHash = true;
      }

      let sql;
      if(isHash) {
        sql = `SELECT id, name, email, password FROM users WHERE search_q= ?`;
      } else {
        sql = `SELECT id, name, email, password FROM users WHERE email= ?`;
      }
  
      knex_db.raw(sql, [usableEmail])
          .then((data) => {
            if (bcrypt.compareSync(password, data[0].password)) {
              resolve(data[0]);
            } else {
              reject("User authentication failed");
            }
          })
          .catch((error) => {
            reject("User authentication failed");
          })
    })
    .catch((error) => {
      reject(error)
    })
  })
}

function getUserById(id) {
  const sql = `SELECT id, name, email, password FROM users WHERE id = ?`;

  return new Promise((resolve, reject) => {
    knex_db.raw(sql, [id])
      .then((user) => {
        resolve(user[0])
      })
      .catch((error) => {
        reject(error)
      })
  });
}

function signUpUser(name, email, passwordOne, passwordTwo) {

  const sql1 = `SELECT id, name, email, password FROM users WHERE email = ?`;

  return new Promise(async (resolve, reject) => {
    const data = {};

    if (
      name.length < 1 ||
      email.length < 1 ||
      passwordOne.length < 1 ||
      passwordTwo.length < 1
    ) {
      data.error = "values missing";
      reject(data);
    } else {
      knex_db.raw(sql1, [email])
        .then(async (user) => {
          if (!(user[0] == undefined)) {
            data.error = "Already Registered";
            reject(data)
          } else {
            if (passwordOne != passwordTwo) {
              data.error = "Passwords Mismatch";
              reject(data)
            } else {
              const hashPassword = await bcrypt.hash(passwordTwo, 10);
              const hashEmail = CryptoJS.AES.encrypt(email, "Hacktitude_SECRET_KEY").toString();
              const searchKey = CryptoJS.HmacSHA1(email, "Hacktitude_SECRET_KEY");
              const sql = `INSERT INTO users(id, name, email, password, country_currency, search_q) VALUES(NULL,?,?,?,?, ?)`;
              knex_db.raw(sql, [name, hashEmail, hashPassword,"LKR", searchKey])
                .then(() => {
                  resolve();
                })
                .catch((error) => {
                  reject(error)
                })
            }
          }
        })
        .catch((error) => {
          reject(error)
        })
    }
  });
}

function getUserCountryFlag(id) {
  const sql = `SELECT country_currency FROM users WHERE id = ?`;

  return new Promise((resolve, reject) => {
    knex_db.raw(sql, [id])
      .then(async (user) => {

        const url = `https://restcountries.com/v2/currency/${user[0].country_currency}`

        const response = await fetch(url);
        const data = await response.json();

        resolve(data[0].flag)
      })
      .catch((error) => {
        reject(error)
      })
  });
}

function getUserCurrency(id) {
  const sql = `SELECT country_currency FROM users WHERE id = ?`;
  return new Promise((resolve, reject) => {
    knex_db.raw(sql, [id])
        .then(async (countryCurrency) => {
          resolve(countryCurrency[0]['country_currency'])
        })
        .catch((error) => {
          reject(error)
        })
  });
}

module.exports = {
  getUserCurrency,
  getUserByEmailAndPassword,
  getUserById,
  signUpUser,
  init,
  getUserCountryFlag
};
