const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('./app');
const mongoose = require('mongoose');

chai.use(chaiHttp);
const should = chai.should();

// Add your model again (or import from separate file)
const planetSchema = new mongoose.Schema({
  id: Number,
  name: String
});
const planetModel = mongoose.model('Planet', planetSchema);

describe('Planets API Suite', () => {
  // Insert test data before running tests
  before(async () => {
    await planetModel.deleteMany({});
    await planetModel.create({ id: 8, name: 'Neptune' });
  });

  // Clean up after tests
  after(async () => {
    await planetModel.deleteMany({});
    await mongoose.connection.close();
  });

  it('should fetch a planet named Neptune', (done) => {
    const payload = { id: 8 };

    chai.request(app)
      .post('/planet')
      .send(payload)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.have.property('id').eql(8);
        res.body.should.have.property('name').eql('Neptune');
        done();
      });
  });
});

