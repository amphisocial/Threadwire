const mongoose = require('mongoose');

const salesOrderSchema = new mongoose.Schema({
  ordernumber: String,
  program: String,
  partnumber: String,
  shipping_status: String,
  order_status: String,
  amount: Number,
  quantity: Number,
  location: String,
  dueDate: Date,
  shipping_date: Date,
  status: String,
  customer_name: String,
  linenumber: Number,
  blockerTag: {type: Number},
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

module.exports = mongoose.model('SalesOrder', salesOrderSchema);

