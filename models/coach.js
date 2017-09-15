// grab the mongoose module
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var CoachSchema = new mongoose.Schema({
  name           : String,
  imageURL       : String,
  bio            : String,
  callLine       : String,
  callRatePerMin : { type: Number, default: 0.99 },
  textResponse   : String,
  messageLine	   : String,
  dequeueLine    : String,
  username       : String,
  password       : String,
  isAvailable    : Boolean
});

CoachSchema.pre('save', function (next){
  var coach = this;
  if(!coach.isModified('password')) return next();
  
  bcrypt.genSalt(10, function(error, salt){
    if(error) return next(error);
    
    bcrypt.hash(coach.password, salt, null,function (error, hash){
      if(error) return next(salt);
      
      coach.password = hash;
      next();
    });
  });
});

CoachSchema.methods.comparePassword = function (candidatePassword, cb){
  bcrypt.compare(candidatePassword, this.password, (error, isMatch) => {
    if(error) return cb(error);
    if(isMatch) return cb(null, this);
    
    return cb(null, isMatch);
  });
}

// define our Coach model
// module.exports allows us to pass this to other files when it is called
module.exports = mongoose.model('Coach', CoachSchema);