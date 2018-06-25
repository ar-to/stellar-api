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
router.get('/get-balance/:address', api.getBalance);

module.exports = router;