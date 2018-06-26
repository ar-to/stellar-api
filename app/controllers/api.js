// const horizon = require('../helpers/horizon.js');
// var request = require('request');
// var StellarSdk = require('stellar-sdk');
// const server = new StellarSdk.Server('http://0.0.0.0:8000', {allowHttp: true});
// StellarSdk.Network.useTestNetwork()

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
    res.send({network: stellar.network})
  },
  generateSeed: function (req, res, next) {
    res.send(stellar.generateSeed());
  },
  createFriendBotAccount: function (req, res, next) {
    let obj = new Object();
    obj.params = req.params;
    let publicKey = req.params.publicKey;
    stellar.createFriendBotAccount(publicKey)
    .then(function(account) {
      obj.account = account;
      res.send(obj)
    }).catch((error) => {
      console.log('error: ',error)
      obj.error = error;
      res.send(obj);
    });
  },
  getBalance: function (req, res, next) {
    let obj = new Object();
    obj.params = req.params;
    obj.balances = new Array();
    let publicKey = req.params.publicKey;

    stellar.getBalance(publicKey)
    .then(function(account) {
      // console.log('account:', account)
      account.balances.forEach(function(balance) {
        obj.balances.push(balance);
      });
      res.send(obj)
    }).catch((error) => {
      console.log('error: ',error)
      res.send({"error": error});
    });
  },
}