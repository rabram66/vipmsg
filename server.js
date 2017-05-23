//This code works
var http = require('http');

//var twilio = require('twilio');

var accountSid = 'AC6001bf5017425188638dab046f7cd77c';
var authToken = "7a33bc48906e82662ab1d66ebcb20b91";

var twilio = require('twilio');
var client = require('twilio')(accountSid, authToken);

var stripe = require('stripe')('sk_live_iWRrm7HN6sgf7P0tsQnmX5wO');
var express = require('express');
var mongodb = require('mongodb');
var app = express()

var MongoClient = mongodb.MongoClient;

function digitize(input)
{
    var output= "";
    for (var i = 0; i < input.length; i++)
    {
        var char = input.substring(i, i+1);
        output = output+" "+char;
        
    }
    return output.trim();
}

app.all('/agent', function (req, res) {
     var twiml = new twilio.TwimlResponse();  
     console.log("Attending to user");
     console.log(req.query);
     twiml.dial({}, function() {
        this.queue('onhold');
     })
    .redirect();
     
    res.writeHead(200, {'Content-Type':'text/xml'});
    res.end(twiml.toString());
});


app.all('/', function (req, res) {
    var twiml = new twilio.TwimlResponse();
    //Create TwiML response
    twiml.gather('/');
    twiml.say("Thanks for callin Coach ka year. I will try to get him on the line. When he answers, you will be charged 99 Cents per minute for the duration of the conversation");

    twiml.say("Please enter your debit card number followed by the hash key.");
    twiml.gather({action: "/set-card-number", method: "GET", timeout: 30, }); 
    console.log(twiml.toString());
    res.writeHead(200, {'Content-Type':'text/xml'});
    res.end(twiml.toString());
    
});
app.all('/set-card-number', function (req, res) {
 var twiml = new twilio.TwimlResponse();  
    //Create TwiML response
    
    console.log(req.query);
        
    var callSid = req.query.CallSid;
    var cc = req.query.Digits;

    twiml.say("You entered");
    twiml.say(digitize(cc));
    twiml.say("Thanks");
    MongoClient.connect("mongodb://vipmsg:MatthewIs11@ds149511.mlab.com:49511/heroku_2fxn0t65", function(err, db) {
        
     if(err) { return console.dir(err); }

    var collection = db.collection('cards');
    var doc = {'sid':callSid , 'number' : cc};
    collection.insert(doc);

    twiml.say("Please enter your expiration date followed by the hash key");
    twiml.gather({action: "/set-expiry", method: "GET"
    , timeout: 30}); 

    res.writeHead(200, {'Content-Type':'text/xml'});
    res.end(twiml.toString());});
    
});
app.all('/set-expiry', function (req, res) {
     var twiml = new twilio.TwimlResponse();  

 console.log(req.query);
        
    var callSid = req.query.CallSid;
    var expiry = req.query.Digits;

    twiml.say("You entered");
    twiml.say(digitize(expiry));
    twiml.say("Thanks");
    MongoClient.connect("mongodb://vipmsg:MatthewIs11@ds149511.mlab.com:49511/heroku_2fxn0t65", function(err, db) {
     if(err) { return console.dir(err); }

    var collection = db.collection('cards');
    var doc = {'expiry': expiry};
    
    collection.update({sid : callSid}, {$set : doc});

    twiml.say("Please enter your CVV -- thats the last 3 digits on the back of your card.");
    twiml.gather({action: "/set-cvv", method: "GET"
    , timeout: 30}); 

    res.writeHead(200, {'Content-Type':'text/xml'});
    res.end(twiml.toString());});
    
});
app.all('/set-cvv', function (req, res) {
     var twiml = new twilio.TwimlResponse();  

 console.log(req.query);
        
    var callSid = req.query.CallSid;
    var cvv = req.query.Digits;

    twiml.say("You entered");
    twiml.say(digitize(cvv));
    twiml.say("Nice security code.");
    MongoClient.connect("mongodb://vipmsg:MatthewIs11@ds149511.mlab.com:49511/heroku_2fxn0t65", function(err, db) {
     if(err) { return console.dir(err); }

    var collection = db.collection('cards');
    var doc = {'cvv': cvv};
    collection.update({sid : callSid}, {$set : doc});

    twiml.say("Alright we are processing your payment now.");
    
   collection.find({sid : callSid}).toArray(function(err, results) {

            var result = results[0];
            
            console.log(results);
            
            stripe.charges.create({
              amount: 100,
              currency: "usd",
              capture: true,
              'card': {
                'number' : result.number,
                'exp_month' : result.expiry.substring(0, 2),
                'exp_year': result.expiry.substring(2, 4),
                'cvc' : result.cvv
              },            
                description: "Charge test"
              }, function(err, charge) {
                    
                    if(err){
                      console.log(err);
                      twiml.say(err.message);
                      twiml.say("Please try again..");
                      twiml.say("Please enter your debit card number followed by the hash key.");
                      twiml.gather({action: "/set-card-number", method: "GET", timeout: 30, }); 
                      res.writeHead(200, {'Content-Type':'text/xml'});
                      return res.end(twiml.toString());
                                          }
                    else {
                       console.log(charge);
                      twiml.say("Your payment has been processed. Please hold until your party is reached");
  
                      client.messages.create({ 
                          to: "+13365871215", 
                          from: "+16782039844", 
                          body: "You have a call waiting at VIPMSG, dial 678-257-3959 to pick up", 
                       }, function(err, message) { 
                          console.log(message.sid); 
                      });
   
                      twiml.enqueue("onhold", {waitUrl:"http://vipmsg.me/ads.xml"});
   
                    //   twiml.dial({action: "/session-ended", method: "GET", timeout: 30, }, function() {
                    //       this.number('+16784278679');
                    //       this.queue('onhold');
                    //   }).redirect(); 
                      console.log(twiml.toString());
  
                      res.writeHead(200, {'Content-Type':'text/xml'});
                      res.end(twiml.toString());
                      
                    } 
        });
   });
  });
})

app.all('/session-ended', function(req, res) {
    console.log("User Session Call has ended"); 
    console.log("Query", req.query);
})

app.all('/call-ended', function(req, res) {
    console.log("User Call has ended")
    console.log("Query:", req.query);
    var callStatus = req.query.CallStatus;
    if(callStatus == "completed") {
        console.log("User session call just ended");
        console.log("Call duration is:", req.query.CallDuration);
        var duration = req.query.CallDuration;
        var callSid  = req.query.CallSid;
        var amount = Math.ceil(duration/60) * 99;
        MongoClient.connect("mongodb://vipmsg:MatthewIs11@ds149511.mlab.com:49511/heroku_2fxn0t65", function(err, db) {
            if(err) { return console.dir(err); }
            
            db.collection('cards').findOne({sid: callSid}, function(err, card){
                if(err) { return console.dir(err); }
                
                stripe.charges.create({
                    amount: amount,
                    currency: "usd",
                    capture: true,
                    'card': {
                        'number' : card.number,
                        'exp_month' : card.expiry.substring(0, 2),
                        'exp_year': card.expiry.substring(2, 4),
                        'cvc' : card.cvv
                    },            
                description: "Call Session Charge"
              }, function(err, charge) {
                    
                    if(err){
                      console.log(err);
                      return res.end("Error");
                                          }
                    else {
                       console.log(charge);
  
                      client.messages.create({ 
                          to: "+13365871215", 
                          from: "+16786078044", 
                          body: "Client has been charged: $" + (amount/99), 
                       }, function(err, message) { 
                          console.log(message.sid); 
                      });
                    } 
                });
            })
        })
        
    }
    else{
        return res.end("Done");
    }
})

app.listen(process.env.PORT, function () {
  console.log('Example app listening on port '+process.env.PORT)
})
