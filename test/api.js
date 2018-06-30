let chai = require('chai');
let chaiHttp = require('chai-http');
let app =  require('../app');

let should = chai.should();

chai.use(chaiHttp);
//Our parent block
describe('Stellar API', () => {
    // beforeEach((done) => { //Before each test we empty the database
    //   console.log('before')
    // });

  /*
  * Test the /GET route
  */
  describe('/GET book', () => {
      it('it should GET network info', (done) => {
        chai.request(app)
            .get('/api/network')
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                console.log('network used: ', res.body.currentNetworkUrl)
                console.log('network : ', res.body)
              done();
            });
      });
      it('it should GET balance for account', (done) => {
        var requester = chai.request(app).keepOpen()

        Promise.all([
          requester.get('/api/network'),
          requester.get('/api/get-balance/GAQOXRMYFJQYE4JZG254MW62GUVPVQOES3RFC4PUX6NWYJ4YL7XTZY3J'),
        ])
        .then(responses => {
          // console.log('res t', typeof responses);
          // console.log('res', Array.isArray(responses));
          // console.log('res', responses[0].body);
          // console.log('res', responses[1].body);
          responses.should.be.a('array')
          responses[0].body.should.be.a('object')
          responses[1].body.should.be.a('object')
          return done();
        })
        .then(() => requester.close())
      });
  });

});