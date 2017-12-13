// grab the mongoose module
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var UserSchema = new mongoose.Schema({
  firstname  : String,
  lastname   : String,
  username	 : String,
  password   : String,
  email      : String
});

UserSchema.pre('save', function (next){
  var user = this;
  if(!user.isModified('password')) return next();
  
  bcrypt.genSalt(10, function(error, salt){
    if(error) return next(error);
    
    bcrypt.hash(user.password, salt, null,function (error, hash){
      if(error) return next(salt);
      
      user.password = hash;
      next();
    });
  });
});

UserSchema.methods.comparePassword = function (candidatePassword, cb){
  bcrypt.compare(candidatePassword, this.password, (error, isMatch) => {
    if(error) return cb(error);
    if(isMatch) return cb(null, this);
    
    return cb(null, isMatch);
  });
}


// define our Admin User model
// module.exports allows us to pass this to other files when it is called
module.exports = mongoose.model('User', UserSchema);