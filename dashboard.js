'use strict'

var router  = require('express').Router(),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    mongoose = require("mongoose");
var _    = require('lodash');
//var mLabUrl = "mongodb://vipmsg:MatthewIs11@ds161873.mlab.com:61873/heroku_pb8gktr9";
//var mLabUrl = "mongodb://vipmsg:MatthewIs11@ds149511.mlab.com:49511/heroku_2fxn0t65";

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


passport.use('admin-local', new LocalStrategy(
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

passport.use('coach-local', new LocalStrategy(
  function(username, password, done) {
    console.log("Using coach local password");
    Coach.findOne({ username: username }, function (err, coach) {
      if (err) { return done(err); }
      if (!coach) {
        return done(null, false);
      }
      coach.comparePassword(password, done);
    });
  }
));

passport.serializeUser(function(user, done) {
    var type = _.isEmpty(user.callLine) ? 'admin' : 'coach';
    var key = {
        id: user.id,
        type: type
    }
    done(null, key);
});

passport.deserializeUser(function(key, done) {
    let Model = key.type === "admin" ? User : Coach;
    Model.findById(key.id, function(err, user) {
        done(err, user);
    });
});


router.use(passport.initialize());
router.use(passport.session());

module.exports = function (io) {
    router.get('/login', function(req, res){
        res.render('login', {login: true});
    });

    router.post('/login', passport.authenticate('admin-local', { 
        successRedirect: '/admin/dashboard',
        failureRedirect: 'login' 
    }));
    
    router.get('/coach/login', function(req, res){
        res.render('login2', {login: true});
    });
    
    router.post('/coach/login', passport.authenticate('coach-local', { 
        successRedirect: '/admin/coach/home',
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
           name: req.body.name,
           callLine: req.body.callLine,
           callRatePerMin: req.body.callRatePerMin,
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
        var id = (Array.isArray(req.body.id)) ? req.body.id[1] : req.body.id;
        var redirectUrl = req.user.callLine ? '/admin/coach/home' : '/admin/dashboard';
        Coach.findById(id)
        .then((coach) => {
            coach.name = req.body.name,
            coach.callLine = req.body.callLine;
            coach.callRatePerMin = (req.body.callRatePerMin) ? req.body.callRatePerMin : coach.callRatePerMin;
            coach.textResponse = (req.body.textResponse) ? req.body.textResponse : coach.textResponse;
            coach.messageLine = req.body.messageLine;
            coach.dequeueLine = (req.body.dequeueLine) ? req.body.dequeueLine : coach.dequeueLine;
            coach.username = (req.body.username) ? req.body.username : coach.username;
            coach.img_URL = (req.body.img_URL) ? req.body.img_URL : coach.img_URL;
            coach.about = req.body.about
            if(req.body.password2) coach.password = req.body.password2;
            return coach.save();
        })
        .then((coach) => {
            return res.redirect(redirectUrl);
        })
        .catch((error) => {
            req.flash('error', error.message);
            return res.redirect(redirectUrl);
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
    
    router.get('/coach/home', function(req, res, next) {
        var data = {};
        
        Coach.findById(req.user.id).exec().then((coach) => {
            data.coach = coach;
            return res.render("coach-dashboard", data);
        })
        .catch((err) => {
            console.log("Coach dashboard Error",err);
            return res.render("coach-dashboard");
        })
        
    });
    
    router.get('/coach/home/:coach_id', function(req, res, next) {
        var data = {};
        
        Coach.findById(req.params.coach_id).exec().then((coach) => {
            data.coach = coach;
            return res.render("coach-dashboard", data);
        })
        .catch((err) => {
            console.log("Coach dashboard Error",err);
            return res.render("coach-dashboard");
        })
        
    });
    
    router.post('/coach/change_availability', function(req, res, next) {
        console.log(req.body.isAvailable)
        var availability = req.body.isAvailable ? true : false;
        var update = {isAvailable: availability};
        Coach.findByIdAndUpdate(req.user.id, {'$set': update}).exec().
        then((coach) => {
            var data = {
                message: "Availability changed"
            };
            io.emit('availability_change', {
                id: req.user.id,
                availability: availability
            });
            return res.json(data);
        })
        .catch((err) => {
            var data = {
                message: "Issue changing availability",
                error: err.message
            };
            return res.status(500).json(data);
        })
        
    });
    
    router.get('/logout', function(req, res){
        var redirectUrl = req.user.callLine ? '/admin/coach/login' : '/admin/login';
        req.logout();
        return res.redirect(redirectUrl);
    })
    
    return router;
}