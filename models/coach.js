// grab the mongoose module
var mongoose = require('mongoose');

var CoachSchema = new mongoose.Schema({
  callLine       : String,
  callRatePerMin : { type: Number, default: 0.99 },
  textResponse   : String,
  messageLine	   : String,
  dequeueLine    : String,
});

// define our Coach model
// module.exports allows us to pass this to other files when it is called
module.exports = mongoose.model('Coach', CoachSchema);