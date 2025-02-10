const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customer_number: String,
  customer_name: String,
  location: String,
  contact_name: String,
  address: String,
});

module.exports = mongoose.model('Customer', customerSchema);

