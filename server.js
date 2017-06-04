//This code works
var http = require('http');
var path = require('path');
var _    = require('lodash');

var accountSid = 'AC6001bf5017425188638dab046f7cd77c';
var authToken = "7a33bc48906e82662ab1d66ebcb20b91";

//mongodb and mongoose config
var mLabUrl = "mongodb://vipmsg:MatthewIs11@ds149511.mlab.com:49511/heroku_2fxn0t65";
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var mongoose = require('mongoose');
mongoose.connect(mLabUrl);

var twilio = require('twilio');
var client = require('twilio')(accountSid, authToken);

//var stripe = require('stripe')('sk_live_iWRrm7HN6sgf7P0tsQnmX5wO'); //Live aaccount
var stripe = require('stripe')('sk_test_wSTkE9RipdMRufwEoG6vPPj4'); //test account

var express      = require('express');
var app          = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'client')));

//require models
var User    = require('./models/user');
var Coach   = require("./models/coach");

//add dashboard route
var dashboard = require("./dashboard");
app.use('/admin', dashboard);

function digitize(input) {
    var output = "";
    for (var i = 0; i < input.length; i++) {
        var char = input.substring(i, i + 1);
        output = output + " " + char;

    }
    return output.trim();
}

//Endpoint that connects user with caller in queue
app.all('/agent', function(req, res) {
    var twiml = new twilio.TwimlResponse();
    console.log("Attending to user");
    console.log(req.query);
    agentDequeue(req.query.Caller).then((dequeueName) => {
        
        twiml.dial({}, function() {
            this.queue(dequeueName, {
                url: '/leaving-queue',
                method: 'GET'
            });
        })
        .redirect();
        
        res.writeHead(200, {
            'Content-Type': 'text/xml'
        });
        return res.end(twiml.toString());    
    }).catch((error) => {
        twiml.say(error.message);
        twiml.say("Unable to join queue");
        console.log("Agent deque Error response: ",twiml.toString());
        res.writeHead(200, {
            'Content-Type': 'text/xml'
        });
        res.end(twiml.toString());    
    });

    
});


app.all('/', function(req, res) {
    var twiml = new twilio.TwimlResponse();
    //Create TwiML response
    getPhoneResponse(req, twiml);
    twiml.say("Please enter your debit card number followed by the hash key.");
    twiml.gather({
        action: "/set-card-number",
        method: "GET",
        timeout: 30,
    });
    console.log(twiml.toString());
    res.writeHead(200, {
        'Content-Type': 'text/xml'
    });
    res.end(twiml.toString());
});

app.all('/set-card-number', function(req, res) {
    var twiml = new twilio.TwimlResponse();
    //Create TwiML response
    console.log(req.query);
    var callSid = req.query.CallSid;
    var cc = req.query.Digits;
   
    twiml.say("You entered");
    twiml.say(digitize(cc));
    twiml.say("Thanks");
    MongoClient.connect(mLabUrl, function(err, db) {
        if (err) {
            return console.dir(err);
        }
        var collection = db.collection('cards');
        var doc = {
            'sid': callSid,
            'number': cc
        };
        collection.insert(doc);

        twiml.say("Please enter your expiration date followed by the hash key");
        twiml.gather({
            action: "/set-expiry",
            method: "GET",
            timeout: 30
        });

        res.writeHead(200, {
            'Content-Type': 'text/xml'
        });
        res.end(twiml.toString());
    });

});

app.all('/set-expiry', function(req, res) {
    var twiml = new twilio.TwimlResponse();

    console.log(req.query);

    var callSid = req.query.CallSid;
    var expiry = req.query.Digits;

    twiml.say("You entered");
    twiml.say(digitize(expiry));
    twiml.say("Thanks");
    MongoClient.connect(mLabUrl, function(err, db) {
        if (err) {
            return console.dir(err);
        }

        var collection = db.collection('cards');
        var doc = {
            'expiry': expiry
        };

        collection.update({
            sid: callSid
        }, {
            $set: doc
        });

        twiml.say("Please enter your CVV, followed by pound sign -- thats the 3 digits on the back of your card.");
        twiml.gather({
            action: "/set-cvv",
            method: "GET",
            timeout: 30
        });

        res.writeHead(200, {
            'Content-Type': 'text/xml'
        });
        res.end(twiml.toString());
    });

});

app.all('/set-cvv', function(req, res) {
    var twiml = new twilio.TwimlResponse();

    console.log(req.query);

    var callSid = req.query.CallSid;
    var cvv = req.query.Digits;

    twiml.say("You entered");
    twiml.say(digitize(cvv));
    twiml.say("Thank You");
    MongoClient.connect(mLabUrl, function(err, db) {
        if (err) {
            return console.dir(err);
        }

        var collection = db.collection('cards');
        var doc = {
            'cvv': cvv
        };
        collection.update({
            sid: callSid
        }, {
            $set: doc
        });

        twiml.say("Alright we are processing your payment now.");

        collection.find({
            sid: callSid
        }).toArray(function(err, results) {

            var result = results[0];

            console.log(results);

            stripe.charges.create({
                amount: 100,
                currency: "usd",
                capture: true,
                'card': {
                    'number': result.number,
                    'exp_month': result.expiry.substring(0, 2),
                    'exp_year': result.expiry.substring(2, 4),
                    'cvc': result.cvv
                },
                description: "Charge for first minute"
            }, function(err, charge) {

                if (err) {
                    console.log(err);
                    twiml.say(err.message);
                    twiml.say("Please try again..");
                    twiml.say("Please enter your debit card number followed by the hash key.");
                    twiml.gather({
                        action: "/set-card-number",
                        method: "GET",
                        timeout: 30,
                    });
                    res.writeHead(200, {
                        'Content-Type': 'text/xml'
                    });
                    return res.end(twiml.toString());
                }
                else {
                    console.log(charge);
                    twiml.say("Your payment has been processed. Please hold until your party is reached");
                    Coach.findOne({callLine: req.query.Called}).then((coach) => {
                        
                        sendAgentMessage(req, coach);
                        addToQueue(req, twiml);    
                        console.log(twiml.toString());
                        res.writeHead(200, {
                            'Content-Type': 'text/xml'
                        });
                        return res.end(twiml.toString());
                    }).catch((error) => {
                        twiml.say("No coach available");
                        console.log(twiml.toString());
                        res.writeHead(200, {
                            'Content-Type': 'text/xml'
                        });
                        return res.end(twiml.toString());
                    });

                }
            });
        });
    });
});

app.all('/session-ended', function(req, res) {
    console.log("User Session Call has ended");
    console.log("Query", req.query);
})

app.all('/leaving-queue', function(req, res) {
    console.log("Query", req.query);
    
    var twiml = new twilio.TwimlResponse();
    var callSid = req.query.CallSid;
    var timeSpent = req.query.QueueTime;
    console.log("Caller: ", callSid, " spent ", timeSpent, " in the queue, leaving");
    
    MongoClient.connect(mLabUrl, function(err, db) {
        if(err) {
            twiml.say("Issue encountered");
            res.writeHead(200, {
                'Content-Type': 'text/xml'
            });
            return res.end(twiml.toString());
        }
        
        var doc = {
            callSid: callSid,
            queueTime: timeSpent
        }
        db.collection('calls').insert(doc);
        
        twiml.say("You are about to be connected.");
        res.writeHead(200, {
            'Content-Type': 'text/xml'
        });
        return res.end(twiml.toString());
    })
})

app.all('/call-ended', function(req, res) {
    console.log("User Call has ended")
    console.log("Query:", req.query);
    var callStatus = req.query.CallStatus;
    if (callStatus == "completed") {
        console.log("User session call just ended");
        console.log("Total Call duration is:", req.query.CallDuration);
        var duration = req.query.CallDuration;
        var callSid = req.query.CallSid;

        MongoClient.connect(mLabUrl, function(err, db) {
            if (err) {
                console.dir(err);
                return res.end("Error");
            }
            
            db.collection('calls').findOne({
                
            }, function(err, call){
                if(err || call === null) return res.end("Issue retrieving call details");
                
                db.collection('cards').findOne({
                    sid: callSid
                }, function(err, card) {
                    if (err || card === null) {
                        console.dir(err);
                        return res.end("Error");
                    }
                    
                    var sessionDuration = duration - call.queueTime;
                    var amount = Math.ceil(sessionDuration / 60) * 99;
                    var minutes = Math.ceil(sessionDuration / 60)
                    stripe.charges.create({
                        amount: amount,
                        currency: "usd",
                        capture: true,
                        'card': {
                            'number': card.number,
                            'exp_month': card.expiry.substring(0, 2),
                            'exp_year': card.expiry.substring(2, 4),
                            'cvc': card.cvv
                        },
                        description: "Call Session Charge"
                    }, function(err, charge) {
    
                        if (err) {
                            console.log(err);
                            return res.end("Error");
                        }
                        else {
                            console.log(charge);
    
                            client.messages.create({
                                to: "+16784278679",
                                from: "+16786078044",
                                body: "Your last call lasted " + minutes + " minutes",
                                //body: "Client has been charged: $" + (amount/99), 
                            }, function(err, message) {
                                console.log(message.sid);
                                res.end("Done");
                            });
                            
                            var callerMsg = "How was your call? Click here to tell us https://form.jotform.com/71504518100140"
                            client.messages.create({
                                to: req.query.Caller,
                                from: req.query.Called,
                                body: callerMsg,
                            }, function(err, message) {
                                console.log(message.sid);
                                res.end("Done");
                            });
                        }
                    });
                })  
            })
        })

    }
    else {
        return res.end("Done");
    }
})

app.listen(process.env.PORT, function() {
    console.log('Example app listening on port ' + process.env.PORT);
});

function getPhoneResponse(request, twiml, coach) {
    if(coach) return twiml.say(coach.textResponse);
    else return twiml.say("Thanks for callin Stacey J. When she answers, you will be charged 99 Cents per minute for the duration of the conversation");
}

function sendAgentMessage(request, coach) {
    var phoneNumber = request.query.Called;
    var fromNumber  = request.query.Caller;
    var defaultLine = "+17735800444";
    var to;
    if (coach){
        to = coach.messageLine;
    }
    else{
        to = defaultLine;
    }

    client.messages.create({
        to: to,
        from: "+16782039844",
        body: "You have a call from "+fromNumber+" waiting at VIPMSG, dial 678-257-3959 to pick up.",
    }, function(err, message) {
        if (err) return console.log(err);
        console.log(message.sid);
    });
}

function addToQueue(request, twiml) {
    var phoneNumber = request.query.Called;
    var queueName = "onhold-" + phoneNumber;
    console.log("Sending call to queue:", queueName)
    twiml.enqueue(queueName, {
        waitUrl: "http://vipmsg.me/ads.xml"
    });
}

function agentDequeue(caller) {
    //phoneNumber is the users phone. 
    var phoneNumber = caller;
    var dequeueName;
    var defaultDequeue = "onhold-+16782039844";
    return Coach.findOne({dequeueLine: phoneNumber}).then((coach) => {
        if(_.isEmpty(coach)) dequeueName = defaultDequeue;
        else dequeueName = "onhold-"+coach.callLine;
        
        console.log("Agent calling with ", phoneNumber, " is about to join queue:", dequeueName);
        return dequeueName;
    });
    

}