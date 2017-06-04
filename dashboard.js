'use strict'

var router  = require('express').Router(),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    mongoose = require("mongoose");
var mLabUrl = "mongodb://vipmsg:MatthewIs11@ds149511.mlab.com:49511/heroku_2fxn0t65";

//require models
var User    = require('./models/user');
var Coach   = require("./models/coach");

var flash        = require('connect-flash');
var cookieParser = require('cookie-parser');
var bodyParser   = require("body-parser");
var session      = require('express-session');
var MongoStore   = require('connect-mongo')(session);

router.use(cookieParser());
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.use(session({'secret': 'doomsday', resave: false, saveUninitialized: false,
                 'store': new MongoStore({mongooseConnection: mongoose.connection, 
                                          ttl: 3600})}));
router.use(flash());


passport.use(new LocalStrategy(
  function(username, password, done) {
    User.findOne({ username: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false);
      }
      user.comparePassword(password, done);
    });
  }
));
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
router.use(passport.initialize());
router.use(passport.session());

router.get('/login', function(req, res){
    res.render('login', {login: true});
})

router.post('/login', passport.authenticate('local', { 
    successRedirect: '/admin/dashboard',
    failureRedirect: 'login' 
}));
            
// All routes after this require authentication                
router.all('*', (req, res, next) => {
    if(req.user) return next();
    
    return res.redirect('/admin/login');
})

router.post('/new/user', function(req, res, next) {
    
    var user = new User({
        username: req.body.username,
        password: req.body.password,
        firstname: req.body.firstname,
        lastname: req.body.lastname
    })
    
    user.save(function(error) {
        if(error) return res.json(error);
        
        return res.redirect('/admin/dashboard');
    })
})

router.post('/new/coach', function(req, res, next) {
    var coach = new Coach({
       callLine: req.body.callLine,
       textResponse: req.body.textResponse,
       messageLine: req.body.messageLine,
       dequeueLine: req.body.dequeueLine
    });
    
    coach.save((error) => {
        if(error) req.flash('error', error.message);
        
        return res.redirect('/admin/dashboard');
    })
})

router.post('/edit/coach', function(req, res, next) {
    var id = req.body.id;
    var coach = {
       callLine: req.body.callLine,
       textResponse: req.body.textResponse,
       messageLine: req.body.messageLine,
       dequeueLine: req.body.dequeueLine
    };
    
    Coach.findByIdAndUpdate(id, coach).then((coach) => {
        return res.redirect('/admin/dashboard');
    }).catch((error) => {
        req.flash('error', error.message);
        return res.redirect('/admin/dashboard');
    })
});

router.post('/delete/coach', function(req, res, next) {
    var id = req.body.id;
    
    Coach.deleteOne({_id: id}).then((deleted) => {
        return res.redirect('/admin/dashboard');
    }).catch((error) => {
        req.flash('error', error.message);
        return res.redirect('/admin/dashboard');
    })
})

router.get('/dashboard', function(req, res, next) {
    var data = {};
    data.error = req.flash('error')[0];
    
    Promise.all([User.find({}).exec(), Coach.find({}).exec()]).then((result) => {
        data.users = result[0];
        data.coaches = result[1];
        return res.render("dashboard", data);
    })
    .catch((err) => {
        console.log("Dashboard Error",err);
        return res.render("dashboard");
    })
    
});

router.get('/logout', function(req, res){
    req.logout();
    return res.redirect('/admin/login');
})

module.exports = router;