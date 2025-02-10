const mongoose = require("mongoose");

const partSchema = new mongoose.Schema({
  partnumber: { type: String, required: true },
  revision: { type: String, required: true },
  description: { type: String, required: true },
  unit_price: { type: Number },
  type: { type: String},
  category: { type: String},
  datecreated: { type: Date, default: Date.now },
  datemodified: { type: Date, default: Date.now },
  createdby: { type: String },
  lastmodifier: { type: String },
  blockerTag: { type: Number },
  isbom: { type: Boolean, default: false },
  customattribute1: { type: String },
  customattribute2: { type: String },
  customattribute3: { type: String },
  customattribute4: { type: String },
  customattribute5: { type: String },
  customattribute6: { type: String },
  customattribute7: { type: String },
  customattribute8: { type: String },
  customattribute9: { type: String },
  customattribute10: { type: String },
});

partSchema.index({ partnumber: 1, revision: 1 }, { unique: true });

module.exports = mongoose.model("Part", partSchema);

