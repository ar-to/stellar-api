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
  getBalance: function (req, res, next) {
    let obj = new Object();
    obj.params = req.params;
    obj.balances = new Array();
    let addressRequested = req.params.address;

    stellar.getBalance(addressRequested)
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