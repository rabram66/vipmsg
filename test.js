var stripe = require('stripe')('sk_test_2dAdUl21nkddoorgXip4IlFa');

console.log("charging test card");

// Retrieve
var MongoClient = require('mongodb').MongoClient;
  MongoClient.connect("mongodb://localhost:27017/exampleDb", function(err, db) {
     if(err) { return console.dir(err); }

    var collection = db.collection('cards');
    
    var callSid = 'test';
    collection.insert({sid : callSid});
    
    var doc = {'cvv': 10};
    collection.update({sid : callSid}, doc);


    //twiml.say("Alright we are processing your payment now.");
   
   collection.find({sid : callSid}).toArray(function(err, results) {
        console.log(results[0]);
   });
    
  });
   
