var path = require('path');
var public = path.resolve('public') + '/';
var helpers = require(path.resolve('server/models/helpers'));
var Author = require(path.resolve('server/models/models')).Author;
var Book = require(path.resolve('server/models/models')).Book;
var amazon = require('amazon-product-api');
var url = require('url');
var expressjwt = require('express-jwt');
var jwt = require('jsonwebtoken');

var jwtCheck = expressjwt({
  secret: new Buffer(process.env.AUTH_SECRET, 'base64'),
  audience: process.env.AUTH_ID
});

// Routes to require authorization
var authRoutes = [
  '/signin',
  '/users/books',
  '/profile',
  '/books/signedin'
];

var routes = [
  {
    path: '/',
    get: function(req, res) {
      res.sendFile(public + 'client/index.html');
    }
  },
  {
    path: '/signin',
    post: function(req, res) {
      helpers.saveProfile(req.user.sub, function (user) {
        res.statusCode = 201;
        res.send(user);
      }, function (error) {
        res.sendStatus(409);
      });
    }
  },
  {
    path: '/users/books',
    post: function (req, res) {
      var author = req.body.author;
      var book = req.body.book;
      var reaction = req.body.reaction;
      var user = {
        amz_auth_id: req.user.sub
      };
      if (!author || !book) {
        res.sendStatus(409);
      } else {
        helpers.addBook(author, book, reaction, user,
          function(data) {
            res.statusCode = 201;
            res.send(data);
          }, function(error) {
            console.error(error);
            res.sendStatus(409);
          });
      }
    }
  },
  {
    path: '/users/books/deleteBook',
    post: function(req, res){
      var bookTitle = req.body.title;
      console.log('routes.js bookTitle', bookTitle);
      var user = {
        amz_auth_id: req.user.sub
      };
      if (!bookTitle) {
        res.sendStatus(409);
      } else {
        helpers.deleteBook(bookTitle, user, 
          function(data){
            res.statusCode = 200;
            res.send(data);
          }, function(error){
            console.error(error);
            res.sendStatus(409);
          });
      }
    },
  },
  {
    path: '/books',
    get: function (req, res) {
      var limit = req.param('limit');
      var list = req.param('list');
      helpers.getBooks(list, limit, function (books) {
        res.json(books);
      }, function (error) {
        console.error(error);
        res.sendStatus(409);
      });
    }
  },
  {
    path: '/books/signedin',
    get: function (req, res) {
      var limit = req.param('limit');
      var list = req.param('list');
      var user = { amz_auth_id: req.user.sub };
      helpers.getBooksSignedIn(list, limit, user, function (books) {
        res.json(books);
      }, function (error) {
        console.error(error);
        res.sendStatus(409);
      });
    }
  },
  // From amazon-product-api
  {
    path: '/amazon',
    get: function (req, res) {
      var url_parts = url.parse(req.url, true);
      var query = url_parts.query;
      var client = amazon.createClient({
        awsId: process.env.AWS_ACCESS_KEY_ID,
        awsSecret: process.env.AWS_SECRET_KEY,
        awsTag: process.env.AWS_ASSOCIATES_ID
      });
      client.itemSearch({
        searchIndex: 'Books',
        keywords: query.title,
        author: query.authorName || '',
        responseGroup: 'ItemAttributes,Images'
      })
      .then(function (results) {
        res.send(results);
      })
      .catch(function (error) {
        console.log(JSON.stringify(error));
        res.send(error);
      });
    }
  },
  {
    path: '/profile',
    get: function (req, res) {
      var profile = {};
      var id = req.param('id');
      if (id) {
        profile.id = id;
      } else {
        profile.amz_auth_id = req.user.sub;
      }
      helpers.getProfile(profile, function (books) {
        res.json(books);
      }, function (error) {
        console.log(error);
        res.sendStatus(409);
      });
    }
  },
  {
    path: '*',
    get: function (req, res) {
      res.redirect('/');
    }
  },
];

module.exports = function (app, express) {
  app.use(express.static(public + '/client'));


  // block unathorized access to authRoutes
  authRoutes.forEach(function (route){
    app.use(route, jwtCheck);
  });

  routes.forEach(function (route){
    for (var key in route) {
      if (key === 'path') { continue; }
      app[key](route.path, route[key]);
    }
  });
};
