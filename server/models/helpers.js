var db = require(__dirname + '/../../db/db.js');
var models = require('./models.js');
var Promise = require('bluebird');

var findOrCreate = function (Model, attributes) {

  return new Promise (function (resolve, reject) {
    Model.forge(attributes).fetch()
    .then(function (model) {
      if (!model) {
        model = new Model(attributes);
      }
      model.save()
      .then(function () {
        resolve(model);
      })
      .catch(function (error) {
        reject(error);
      });
    })
    .catch(function (error) {
      reject(error);
    });

  });

};

var addBook = function (author, book, reaction, user, success, fail) {

  findOrCreate(models.Author, author)
    .then(function (author) {
      book.author_id = author.get('id');
      findOrCreate(models.Book, book)
      .then(function (book) {
        models.User.forge(user)
          .fetch()
          .then( function (user) {
            findOrCreate(models.Read, {
              user_id: user.get('id'),
              book_id: book.get('id')
            })
            .then( function (read) {
              read.set('reaction', reaction);
              read.save()
                .then(function () {
                  var resData = (JSON.stringify({
                    book: {
                      title: book.get('title'),
                      id: book.get('id')
                    },
                    author: {
                      id: book.get('id'),
                      name: author.get('name')
                    },
                    reaction: read.get('reaction')
                  }));
                  success(resData);
                });
            });
          });

      })
      .catch(function (error) {
        fail(error);
      });
    })
    .catch(function (error) {
      fail(error);
    });
};

// Returns books in descending order of average reaction
var getBooks = function (list, limit, success, fail) {
  db.knex.select('books.*', 'authors.name')
  .where('books_users.reaction', '>', 0)
  .avg('books_users.reaction as avgReaction')
  .from('books')
  .limit(limit)
  .orderBy('avgReaction', 'desc')
  .innerJoin('books_users', 'books.id', 'books_users.book_id')
  .groupBy('books.id')
  .innerJoin('authors', 'books.author_id', 'authors.id')
    .then(function (books) {
      books.forEach(function (book) {
        var authorName = book.name;
        delete book.name;
        book.author = {};
        book.author.name = authorName;
      });
      success(books);
    })
    .catch(fail);
};

// Returns books in descending order of average reaction
var deleteBook = function (bookTitle, user, success, fail) {
  
  var user_id = 
  db.knex('users')
  .select('users.id')
  .where('users.amz_auth_id', user.amz_auth_id);

  var book_title = 
  db.knex('books')
  .select('books.id')
  .where('books.title', bookTitle);

  // Select and delete book based on user_id and bookTitle.
  db.knex('books_users')
  .innerJoin('books', 'books_users.book_id', 'books.id')
  .where('books_users.book_id', book_title)
  .andWhere('books_users.user_id', user_id)   
  .del()                              
    .then(function (result) {
      console.log(result);
      success(200);
    })
    .catch(fail);
};

// Deletes all entries in both book lists for current user.
var emptyBookLists = function (list, user, success, fail) {
 
  // Use amz_auth_id to get users.id.
  var user_id = 
  db.knex('users')
  .select('users.id')
  .where('users.amz_auth_id', user.amz_auth_id);

  // Delete all records for user in books_users.
  
  // Empty read list:
  if (list === 'read') {
    db.knex('books_users')
    .innerJoin('users', 'books_users.user_id', 'users.id') 
    .where('books_users.user_id', user_id)
    .andWhere('books_users.reaction', '0')
    .del() 
    .then(function (results) {
      success(results);
    }).catch(fail);

  // Empty book list:
  } else if (list === 'book') {
     db.knex('books_users')
    .innerJoin('users', 'books_users.user_id', 'users.id') 
    .where('books_users.user_id', user_id)
    .andWhere('books_users.reaction', '>', '0') 
    .del() 
    .then(function (results) {
      success(results);
    }).catch(fail);
  }
};

// Returns all books that have been read
// Includes user's reaction if user's reaction exists
var getBooksSignedIn = function (list, limit, user, success, fail) {
  findOrCreate(models.User, user)
    .then(function (user) {
      db.knex.select('books.*', 'authors.name')
      .where('books_users.reaction', '>', 0)
      .avg('books_users.reaction as avgReaction')
      .from('books')
      .limit(limit)
      .orderBy('avgReaction', 'desc')
      .innerJoin('books_users', 'books.id', 'books_users.book_id')
      .whereNot('books_users.user_id', user.get('id'))
      .groupBy('books.id')
      .innerJoin('authors', 'books.author_id', 'authors.id')
      .then(function (books) {
        db.knex.select('books.*', 'authors.name')
        .from('books')
        .limit(limit)
        .innerJoin('books_users', 'books.id', 'books_users.book_id')
        .where('books_users.user_id', user.get('id'))
        .select('books_users.reaction as reaction')
        .groupBy('books.id')
        .innerJoin('authors', 'books.author_id', 'authors.id')
          .then(function (userBooks) {
            var uniqueBooks = [];
            books.forEach(function (book) {
              var unique = true;
              userBooks.forEach(function (userBook) {
                if (book.id === userBook.id) {
                  unique = false;
                  // Stores avgReaction to userBook becasue
                  // avgReaction not saved when usersBooks lookup occurs
                  userBook.avgReaction = book.avgReaction;
                }
              });
              if (unique) {
                uniqueBooks.push(book);
              }
            });
            books = uniqueBooks.concat(userBooks);
            books.forEach(function (book) {
              var authorName = book.name;
              delete book.name;
              book.author = {};
              book.author.name = authorName;
              // Stores user reaction as avgReaction if there is no avgReaction
              if (!book.avgReaction) {
                book.avgReaction = book.reaction;
              }
            });
            // Sorts by avgReaction in descending order
            books.sort(function (a, b) {
              return b.avgReaction - a.avgReaction;
            });
          success(books);
        });
      });
    });
};

var saveProfile = function (profile, success, fail) {
  findOrCreate(models.User, {amz_auth_id: profile})
    .then(function (user) {
      success(user);
    })
    .catch( function (error) {
      fail(error);
    });
};

// Returns profile information and all books belonging to that profile
var getProfile = function (profile, success, fail) {
  var key = 'amz_auth_id';
  var value = profile.amz_auth_id;
  if (profile.user_id) {
    key = 'id';
    value = profile.user_id;
  }
  var attributes = {};
  attributes[key] = value;
  findOrCreate(models.User, attributes)
    .then(function (user) {
      if (user) {
        db.knex.select('books.*', 'authors.name')
          .avg('books_users.reaction as avgReaction')
          .from('books')
          .orderBy('id', 'asc')
          .innerJoin('books_users', 'books.id', 'books_users.book_id')
          .where('books_users.user_id', user.get('id'))
          .select('books_users.reaction as reaction')
          .groupBy('books.id')
          .innerJoin('authors', 'books.author_id', 'authors.id')
            .then(function (books) {
              books.forEach(function (book) {
                var authorName = book.name;
                delete book.name;
                book.author = {};
                book.author.name = authorName;
              });
              success({books: books});
            });
      } else {
        throw 'no user found';
      }
    });
};

var insertEmail = function(amzId, email, success, fail) {
  db.knex.select('email')
    .from('users')
    .where('amz_auth_id', amzId)
      .then(function (res) {
        if (res[0].email === null) {
          db.knex('users')
            .where('amz_auth_id', amzId)
            .update({ email: email })
              .then(function (res) {
                success(res);
              })
              .catch(function (err) {
                fail(err);
              });
        } else {
          success('User email already exists');
        }
      })
      .catch(function (err) {
        fail(err);
      });
};

var getUsersBooks = function(email, success, fail) {
  var book_ids = [];
  var bookIdReactions = {};
  var bookIdAuthors = {
    author_ids: []
  };
  // query for user IDs using user email
  db.knex.select('id')
    .from('users')
    .where('email', email)
      .then(function (data) {
        // query for book IDs and reactions using user IDs
        db.knex.select('book_id', 'reaction')
          .from('books_users')
          .where('user_id', data[0].id)
            .then(function (res) {
              res.forEach(function (obj) {
                book_ids.push(obj.book_id);
                bookIdReactions[obj.book_id] = obj.reaction;
              });
              // query for books using book IDs
              db.knex.select()
                .from('books')
                .whereIn('id', book_ids)
                  .then(function (books) {
                    books.forEach(function (book) {
                      if (bookIdReactions[book.id] !== undefined) {
                        book.reaction = bookIdReactions[book.id];
                      }
                      book.author = {};
                      bookIdAuthors[book.id] = book.author_id;
                      bookIdAuthors.author_ids.push(book.author_id);
                    });
                    // query for authors of books
                    db.knex.select('name', 'id')
                      .from('authors')
                      .whereIn('id', bookIdAuthors.author_ids)
                        .then(function (authors) {
                          success({ books: books, authors: authors });
                        })
                        .catch(function (err) {
                          console.error(err);
                        })
                  }).catch(function (err) {
                    console.error(err);
                  });
            })
            .catch(function (err) {
              console.error(err);
            });
      })
      .catch(function (err) {
        fail(err);
      });
};

var updateBookReaction = function (reaction, bookId, success, fail) {
  db.knex('books_users')
    .where('book_id', bookId)
    .update({ reaction: reaction })
      .then(function (res) {
        success(res);
      })
      .catch(function (err) {
        fail(err);
      });
};

module.exports = {
  updateBookReaction: updateBookReaction,
  insertEmail: insertEmail,
  getUsersBooks: getUsersBooks,
  findOrCreate: findOrCreate,
  addBook: addBook,
  getBooks: getBooks,
  getBooksSignedIn: getBooksSignedIn,
  saveProfile: saveProfile,
  getProfile: getProfile,
  deleteBook: deleteBook,
  emptyBookLists: emptyBookLists
};
