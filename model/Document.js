const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const documentSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  isFavourite: {
    type: Boolean,
    default: false
  },
  imageURL: {
    type: String
  },
  fileURL: {
    type: String
  },
  audioURL: {
    type: String
  },
  textURL: {
    type: String
  },
  status: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("document", documentSchema);
