//This code works
var http = require('http');

//var twilio = require('twilio');

var accountSid = 'AC6001bf5017425188638dab046f7cd77c';
var authToken = "7a33bc48906e82662ab1d66ebcb20b91";

var twilio = require('twilio');
var client = require('twilio')(accountSid, authToken);

var stripe = require('stripe')('sk_test_2dAdUl21nkddoorgXip4IlFa');
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
    twiml.say("Thanks for dialing VIP Messenger. I will try to get ray on the line. When he answers, you will be charged 99 cents per minute for the duration of the conversation");

    twiml.say("Please enter your debit card number followed by the hash key.");
    twiml.gather({action: "/set-card-number", method: "GET", timeout: 30, }); 

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
    MongoClient.connect("mongodb://localhost:27017/exampleDb", function(err, db) {
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
    MongoClient.connect("mongodb://localhost:27017/exampleDb", function(err, db) {
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
    MongoClient.connect("mongodb://localhost:27017/exampleDb", function(err, db) {
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
                
                    console.log(err);
                    console.log(charge);
 twiml.say("Your payment has been processed. Please hold until your party is reached");

client.messages.create({ 
    to: "+16784278679", 
    from: "+16786078044", 
    body: "You have a call waiting at VIPMSG, dial 678-257-3959 to pick up", 
 }, function(err, message) { 
    console.log(message.sid); 
});
 
  twiml.enqueue("onhold", {waitUrl:"http://vipmsg.me/ads.xml"});
 
      twiml.dial("+16784278679", function() {
           this.queue('onhold');
                    }).redirect(); 
console.log(twiml.toString());

                 res.writeHead(200, {'Content-Type':'text/xml'});
                res.end(twiml.toString());});
        });
   });
});

app.listen(process.env.PORT, function () {
  console.log('Example app listening on port '+process.env.PORT)
})
