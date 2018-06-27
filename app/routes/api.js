var api = require('../controllers/api');
var express = require('express');
var router = express.Router();

/**
 * Router options
 * 1 : router.get('/', controller.test);
 * 2 : 
 * router.route('/')
 * .get(controller.test)
 * .post(controller.getOwner)
 */

/**
 * API
 */
// Basic
router.route('/')
.get(api.getTest)
.post(api.postTest)

router.get('/network', api.networkInfo);
router.get('/generate-seed', api.generateSeed);
router.get('/get-balance/:publicKey', api.getBalance);
router.get('/transaction/:transactionHash', api.getTransaction);
router.post('/create-friendbot-account/:publicKey', api.createFriendBotAccount);
router.post('/create-account', api.createAccount);
router.post('/payment', api.payment);

module.exports = router;