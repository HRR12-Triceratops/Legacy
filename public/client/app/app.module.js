angular.module('booklist.services', [])

  .factory('Books', ['$http', '$rootScope', function ($http, $rootScope){
    var getBooks = function(){
     var apiURL = '/books';
     // Seperate API calls when user is signed in vs not signed in.
     // Allows use of user information to return user reactions when signed in.
     if ($rootScope.signedIn) {
       apiURL = '/books/signedin';
     }
     return $http({
       method: 'GET',
       url: apiURL
     })
     .then(function(resp){
       return resp.data;
     }, function(error){
       console.log(error);
       return error;
     });
    };

    var getProfile = function () {
      return $http({
        method: 'GET',
        url: '/profile'
      })
      .then(function (resp) {
        return resp.data;
      })
      .catch(function (error) {
        console.error(error);
        return error;
      });
    };

    var postBook = function (book, authorName, reaction){
      return $http({
        method: 'POST',
        url: '/users/books',
        data: {book: book, author: {name: authorName}, reaction: reaction}
      })
      .then(function(resp) {
        return resp.data;
      }, function(error) {
        console.log(error);
        return error;
      });
    };

    var queryAmazon = function (query) {
      var queryString = '?';
      if (query.title) {
        queryString += '&title=' + query.title;
      }
      if (query.authorName) {
        queryString += '&authorName=' + query.authorName;
      }
      return $http({
        method: 'GET',
        url: '/amazon/' + queryString,
      })
      .then(function (resp) {
        return resp;
      })
      .catch(function (error) {
        return error;
      });
    };

    return {
      getProfile: getProfile,
      getBooks: getBooks,
      postBook: postBook,
      queryAmazon: queryAmazon
    };
  }])
  .run(['$rootScope', function ($rootScope){

    // Stores reaction verbiage for easy changing
    $rootScope.reactions = {
      1: 'Hate it',
      2: 'Dislike it',
      3: 'Decent',
      4: 'Like it',
      5: 'Love it'
    };

    // Stores Math on rootScope to be used in angular HTML atributes
    // ie. Math.round can be used as $scope.round
    $rootScope.Math = window.Math;

    // Takes in a string and returns a code that between 0 and (codes - 1)
    // Only works when codes <= 10
    $rootScope.hash = function (string, codes) {
      var code = string.charCodeAt(Math.floor(string.length/2));
      code = code - Math.floor(code/10) * 10;
      code = code.toString(codes);
      code = parseInt(code.charAt(code.length - 1));
      return code;
    };

    // Stores blankCover image paths (at least 1, no greater than 10)
    $rootScope.blankCovers = ['/assets/img/black_cover_small.jpg', '/assets/img/red_cover_small.jpg'];

  }])
  // Used for adding image to amazonResult when available
  .directive('amazonThumbnail', function () {
    return {
      restrict: 'A',
      link: function ($scope, element, attrs) {
        var imageSet;
        if (!$scope.result.ImageSets) {
          return;
        }
        $scope.result.ImageSets[0].ImageSet.forEach(function (checkSet, index) {
          if (checkSet.$ === 'primary' || !imageSet && index === $scope.result.ImageSets[0].ImageSet.length - 1) {
            imageSet = checkSet;
          }
        });

        if (imageSet) {
          var imageUrl;
          if (imageSet.MediumImage) {
            imageUrl = imageSet.MediumImage[0].URL[0];
          }
          if (!imageUrl && imageSet.SmallImage) {
            imageUrl = imageSet.SmallImage[0].URL[0];
          }
          if (!imageUrl && imageSet.ThumbnailImage) {
            imageUrl = imageSet.ThumbnailImage[0].URL[0];
          }
          $(element).append('<img class="col s2 result-thumb" src="' + imageUrl + '"></img>');
        }
      }
    };
  });
