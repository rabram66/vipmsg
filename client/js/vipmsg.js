var app = angular.module('vipMsg',[]);

app.config(['$compileProvider', function ($compileProvider) {
    $compileProvider.urlSanitizationWhitelist(/^tel:/);
}]);

app.controller('ChatController',['$scope',function($scope){
    var socket = io.connect();

    $scope.coaches = [];
    $scope.getAvailability = function(coach) {
      return coach.isAvailable ? 'Available' : 'Unavailable';
    };
    
    $scope.formatNumber = function(number) {
      return `(${number.substring(2,5)}) ${number.substring(5, 8)} ${number.substring(8)}`;
      //+17185147780
      //(718) 555-1212
    };
    
    $scope.activateNumber = function(number) {
      return `tel:${number}`;
      //+17185147780
      //tel:+17185147780
    };
    
    fetch('/coaches')
      .then( function (response) {
        console.log("res:",response.ok);
        return response.json();
      })
      .then( function (coaches) {
        $scope.coaches = coaches;
        $scope.$apply();
      })
      .catch( function (err) {
        console.log(err);
      });

    socket.on('availability_change', function (change) {
      console.log(change);
      var coach = $scope.coaches.find(function(coach){
        return coach._id === change.id; 
      });
      coach.isAvailable = change.availability;
      $scope.$apply();
    });
}]);
