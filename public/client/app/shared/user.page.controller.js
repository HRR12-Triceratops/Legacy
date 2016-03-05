angular.module('booklist.user', [])

.controller('UserController', ['$scope', 'Books','$rootScope', '$timeout', '$location', '$http', 'auth', function($scope, Books, $rootScope, $timeout, $location, $http, auth){
  $scope.user = {};
  $scope.books = [];
  $scope.path = $location.path();

  $scope.auth = auth;
  $scope.firstName = $scope.auth.profile.name.split(' ')[0];

  // Loading spinner is hidden when false
  $scope.submitting = false;

  $scope.bookTemplate = 'app/shared/book.entry.html';

  $scope.bookTitle = '';
  $scope.authorName = '';
  $scope.publicationYear = '';
  $scope.amz_url = '';
  $scope.publisher = '';
  $scope.ISBN = '';
  $scope.reaction = undefined;
  $scope.high_res_image = '';
  $scope.medium_image = '';
  $scope.small_image = '';
  $scope.thumbnail_image = '';

  $scope.amazonResults = [];

  $scope.addToReadingList = function () {
    $scope.reaction = 0;
  };

  $scope.deleteBookFromList = function (bookTitle){
    console.log('bookTitle: ', bookTitle)
    console.log('deleteBookFromList has been called in user.page!');
    return $http({
      method: 'post',
      url: '/users/books/deleteBook',
      data: { title: bookTitle }
    })
    .then(function(resp) {
      return resp.data;
    }, function(error) {
      console.log(error);
      return error;
    });
  };

  $scope.setReaction = function ($event, reaction) {
    var $target = $($event.currentTarget);
    $('.reaction-buttons').find('.selected').removeClass('selected');
    if ($scope.reaction === reaction) {
      // Removes user reaction if reaction clicked already selected
      $scope.reaction = undefined;
    } else {
      $target.addClass('selected');
      $scope.reaction = reaction;
    }
  };

  $scope.scrollToTop = function (e) {
    $target = $(e.target);
    if ($target.hasClass('active')) {
      $('.book-collection:not([display="none"])').animate({
        scrollTop: 0
      }, '500', 'swing');
    }
  };

  $scope.updateReaction = function (book) {
    // Converts slider scale of 0-100 to 1-5
    book.reaction = book.reactionSlider/25 + 1;
    Books.postBook({
      title: book.title,
      ISBN: book.ISBN,
      publisher: book.publisher,
      high_res_image: book.high_res_image,
      large_image: book.large_image,
      medium_image: book.medium_image,
      small_image: book.small_image,
      thumbnail_image: book.thumbnail_image
    }, book.author.name, book.reaction);
  };

  $scope.initialize = function () {
    $scope.resetProfile();
    $('.add-book').on('click', function (e) {
      var $target = $(e.target);
      // If on mobile, does not auto-focus title field because keyboard would not appear when auto-focused
      if (!$target.hasClass('active') &&
        !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Timeouts setting focus until after enter animation completes
        setTimeout(function () {
          $('#title').focus();
        }, 250);
      }
    });
  };

  // Refreshes profile each time profile is loaded
  $scope.resetProfile = function () {
    Books.getProfile()
    .then(function (resp) {
      if (resp.books) {
        $scope.books = resp.books;
        $scope.books.forEach(function (book) {
          book.reactionSlider = (book.reaction - 1) * 25;
        });
      }
    })
    .catch(function (error) {
      console.error(error);
    });
  };

  // Loads potential amazon matches to title/author in 'add book' form
  $scope.checkAmazon = function () {
    $scope.bookTitle = $scope.bookTitle || '';
    $scope.authorName = $scope.authorName || '';
    var title = $scope.bookTitle.trim();
    var authorName = $scope.authorName.trim();
    if (title.length || authorName.length) {
      // Shows spinner during checkAmazon
      $scope.submitting = true;
      Books.queryAmazon({title: title, authorName: authorName})
      .then(function (results) {
        console.log(results);
        if (results.data[0] && !results.data[0].Error) {
          $scope.amazonResults = results.data;
        } else {
          $scope.amazonResults = [];
        }
        $('.amazon-results').scrollTop(0);
        $scope.submitting = false;

      })
      .catch(function (error) {
        $scope.submitting = false;
      });
    } else {
      $scope.amazonResults = [];
    }
  };

  var timer;
  // Sets a timer on ngChange of author and/or title. This helps limit number of Amazon API requests
  $scope.searchTimer = function () {
    // Waits until there is a pause in typing of 400 ms before querying Amazon
    $timeout.cancel(timer);
    timer = $timeout($scope.checkAmazon, 400);
  };

  // Triggered when an Amazon result is clicked
  // Stores relevant information returned from Amazon to scope variables
  $scope.selectAmazonResult = function (result) {
    if (result.ItemAttributes[0].Title) {
      $scope.bookTitle = result.ItemAttributes[0].Title[0];
    }
    if (result.ItemAttributes[0].Author) {
      $scope.authorName = result.ItemAttributes[0].Author[0];
    }
    if (result.ItemAttributes[0].PublicationDate) {
      $scope.publicationYear = result.ItemAttributes[0].PublicationDate[0].split('-')[0];
    }
    if (result.ItemAttributes[0].Publisher) {
      $scope.publisher = result.ItemAttributes[0].Publisher[0];
    }
    if (result.DetailPageURL) {
      // convert url to affiliate id taged link
      $scope.amz_url = result.DetailPageURL[0].split('%')[0] + "?camp=1789&creative=9325&linkCode=ur2&tag=rdr0a-20";
    }
    if (result.ItemAttributes[0].ISBN) {
      $scope.ISBN = result.ItemAttributes[0].ISBN[0];
    }

    // Sets local imageSet to first imageSet provided by Amazon
    var imageSet = result.ImageSets[0].ImageSet[0];

    // Loops through imageSets provided by Amazon
    for (var i = 1; i < result.ImageSets[0].ImageSet.length; i++) {
      var checkSet = result.ImageSets[0].ImageSet[i];
      // Sets local imageSet to primary imageSet if primary is specified by Amazon
      if (checkSet.$.Category === 'primary') {
        imageSet = checkSet;
        break;
      }
    }
    if (imageSet) {
      if (imageSet.HiResImage) {
        $scope.high_res_image = imageSet.HiResImage[0].URL[0];
      }
      if (imageSet.LargeImage) {
        $scope.large_image = imageSet.LargeImage[0].URL[0];
      }
      if (imageSet.MediumImage) {
        $scope.medium_image = imageSet.MediumImage[0].URL[0];

      }
      if (imageSet.SmallImage) {
        $scope.small_image = imageSet.SmallImage[0].URL[0];

      }
      if (imageSet.ThumbnailImage) {
        $scope.thumbnail_image = imageSet.ThumbnailImage[0].URL[0];
      }
    }

    $scope.amazonResults = [];

    $('label[for="author"]').addClass('active');
    $('label[for="title"]').addClass('active');
    $('body').animate({
      scrollTop: $('.greet').offset().top,
      duration: 1750
    });
  };

  $scope.addBook = function() {
    Books.postBook({
      title: $scope.bookTitle,
      ISBN: $scope.ISBN,
      publisher: $scope.publisher,
      high_res_image: $scope.high_res_image,
      large_image: $scope.large_image,
      medium_image: $scope.medium_image,
      small_image: $scope.small_image,
      thumbnail_image: $scope.thumbnail_image,
      amz_url: $scope.amz_url
    }, $scope.authorName, $scope.reaction)
    .then(function(resp){
      if (resp.book && resp.author) {
        var book = resp.book;
        book.author = {};
        book.ISBN = $scope.ISBN;
        book.author.name = resp.author.name;
        book.reaction = $scope.reaction;
        book.reactionSlider = (book.reaction - 1) * 25;
        book.high_res_image = $scope.high_res_image;
        book.large_image = $scope.large_image;
        book.medium_image = $scope.medium_image;
        book.small_image = $scope.small_image;
        book.thumbnail_image = $scope.thumbnail_image;
        book.amz_rul = $scope.amz_url;
        $scope.clearBookInfo();
        $scope.resetProfile();
        Materialize.toast('Book added!', 1750);
      }
    })
    .catch(function(error){
      console.error(error);
      return;
    });
  };

  // Resets 'add book' form when book successfuly added
  $scope.clearBookInfo = function () {
    $scope.bookTitle = '';
    $scope.authorName = '';
    $scope.reaction = undefined;
    $scope.clearAmazonInfo();
    $('.reactions').find('.selected').removeClass('selected');
  };

  // Resets scope variables saved from Amazon result when title or author is changed
  $scope.clearAmazonInfo = function () {
    $scope.publicationYear = '';
    $scope.amz_url = '';
    $scope.publisher = '';
    $scope.high_res_image = '';
    $scope.ISBN = '';
    $scope.large_image = '';
    $scope.medium_image = '';
    $scope.small_image = '';
    $scope.thumbnail_image = '';
  };

  // Used for filtering front page of profile to not show books in to-read list
  $scope.filterReactions = function (element) {
    return element.reaction > 0;
  };

  $scope.initialize();
}]);
