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
  processing: {
    type: Boolean,
    default: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("document", documentSchema);
