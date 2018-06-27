var stringify = require('json-stringify-safe');
var StellarService = require('../services/Stellar.js');
const stellar = new StellarService();

module.exports = {
  getTest: function (req, res, next) {
    res.send("API!")
  },
  postTest: function (req, res, next) {
    res.send(req.body);
  },
  networkInfo: function (req, res, next) {
    res.send({ network: stellar.network })
  },
  generateSeed: function (req, res, next) {
    res.send(stellar.generateSeed());
  },
  createFriendBotAccount: function (req, res, next) {
    let obj = new Object();
    obj.params = req.params;
    let publicKey = req.params.publicKey;
    stellar.createFriendBotAccount(publicKey)
      .then(function (account) {
        obj.account = account;
        res.send(obj)
      }).catch((error) => {
        console.log('error: ', error)
        obj.error = error;
        res.status(404).send(obj).end();
      });
  },
  createAccount: function (req, res, next) {
    let obj = new Object();
    obj.body = req.body;
    let secretSeed = req.body.secretSeed;
    let startingBalance = req.body.startingBalance;
    let destinationPublicKey = req.body.destinationPublicKey;

    try {
      if (secretSeed === "" || secretSeed === null || secretSeed === undefined) {
        throw "missing seed needed for creating, signing and sending transaction"
      }
      if (startingBalance === "" || startingBalance === null) {
        throw "missing starting balance"
      }
      stellar.createAccount(secretSeed, startingBalance, destinationPublicKey)
        .then(function (tx) {
          obj.success = tx;
          res.send(obj)
        })
        .catch((error) => {
          console.log('error: ', error)
          obj.error = JSON.parse(stringify(error));
          res.status(404).send(obj).end();
        });

    } catch (error) {
      console.log('catch error', error)
      obj.error = error;
      res.status(404).send(obj).end();
    }
  },
  getBalance: function (req, res, next) {
    let obj = new Object();
    obj.params = req.params;
    obj.balances = new Array();
    let publicKey = req.params.publicKey;

    stellar.getBalance(publicKey)
      .then(function (account) {
        // console.log('account:', account)
        account.balances.forEach(function (balance) {
          obj.balances.push(balance);
        });
        res.send(obj)
      }).catch((error) => {
        console.log('error: ', error)
        obj.error = error;
        res.status(404).send(obj).end();
      });
  },
  payment: function (req, res, next) {
    let obj = new Object();
    obj.body = req.body;
    let secretSeed = req.body.secretSeed;
    let amount = req.body.amount;
    let destinationPublicKey = req.body.destinationPublicKey;

    try {
      if (secretSeed === "" || secretSeed === null || secretSeed === undefined) {
        throw "missing seed needed for creating, signing and sending transaction"
      }
      if (amount === "" || amount === null || amount === undefined) {
        throw "missing amount"
      }
      if (destinationPublicKey === "" || destinationPublicKey === null || destinationPublicKey === undefined) {
        throw "missing destination public key"
      }
      stellar.payment(secretSeed, amount, destinationPublicKey)
        .then(function (tx) {
          obj.success = tx;
          res.send(obj)
        })
        .catch((error) => {
          console.log('error: ', error)
          obj.error = JSON.parse(stringify(error));
          res.status(404).send(obj).end();
        });

    } catch (error) {
      console.log('catch error', error)
      obj.error = error;
      res.status(404).send(obj).end();
    }
  },
  getTransaction: function (req, res, next) {
    let obj = new Object();
    obj.params = req.params;
    let transactionHash = req.params.transactionHash;

    console.log('transactionHash',transactionHash)

    try {
      stellar.getTransaction(transactionHash)
        .then(function (tx) {
          obj.success = tx;
          res.send(obj)
        })
        .catch((error) => {
          console.log('error: ', error)
          obj.error = JSON.parse(stringify(error));
          res.status(404).send(obj).end();
        });

    } catch (error) {
      console.log('catch error', error)
      obj.error = error;
      res.status(404).send(obj).end();
    }
  },
}