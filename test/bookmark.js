"use strict";
process.env.NODE_ENV = 'test';

var should = require('should'),
  assert = require('assert'),
  BookmarkService = require('./sut-require')('../lib/bookmark').BookmarkService,
  mongoose = require('mongoose');

describe("BookmarkService", function() {

  var bsc = null,
    requestFixture = {
      domainX: {
        domainName: 'test.readin.no',
        user: {
          _id: null,
          id: '',
          email: ''
        }
      },
      domainY: {
        domainName: 'another.readin.no',
        user: {
          _id: null,
          id: '',
          email: ''
        }
      }
    },
    userFixture = {
      loggedin: {
        email: 'dummyA@readin.no',
        _id: mongoose.Types.ObjectId(),
        id: mongoose.Types.ObjectId().toString()
      },
      outsider: {
        email: 'dummyB@readin.no',
        _id: mongoose.Types.ObjectId(),
        id: mongoose.Types.ObjectId().toString()
      }
    },
    defaultDomain,
    loggedInUser,
    bookmarks;



  before(function(done) {
    var dbURI = "mongodb://localhost:27017/test_bookmarks";
    bsc = new BookmarkService(dbURI);

    //Storage
    bookmarks = [];

    //Setting default user on default domain
    defaultDomain = requestFixture.domainX;
    loggedInUser = userFixture.loggedin;
    defaultDomain.user = loggedInUser;

    done();
  });

  after(function(done) {
    console.log("\n == CLEANUP test_ db == ");

    if(! process.env.NODE_ENV == 'test' ) {
      throw new Error("NOT IN TEST MODE");
    }

    var dbURI = "mongodb://localhost:27017/test_bookmarks",
      conn = mongoose.createConnection(dbURI);

    var Bookmark = require('./sut-require')('../lib/model/bookmark-model')(conn);
    Bookmark.remove(done);
  });

  it("create should fail", function(done) {
    var failingBody = {
      urlFragFree: 'some/url',
      domainName: defaultDomain.domainName
      },
      params = {
        userId: loggedInUser._id,
        validShareSet: defaultDomain.validShareSet
      };

    bsc.createBookmark(failingBody, params, {
      MODEL_ERR: function(err) {
        err.should.not.be.null;
        done();
      },
      DEFAULT: function(res) {
      }
    });
  });


  it("create should be ok", function(done) {
    var body = {
        urlFragFree: 'some/url',
        urlFrag: 'id42',
        domainName: defaultDomain.domainName,
        title: 'Chapter 1.2'
      },
      params = {
        userId: loggedInUser._id,
        validShareSet: defaultDomain.validShareSet
      };

    bsc.createBookmark(body, params, {
      MODEL_ERR: function(err) {
        should.not.exist(err);
      },
      DEFAULT: function(res) {
        assert.notDeepEqual(res, {});
        bookmarks[res.data.encURI] = res;
        done();
      }
    });
  });

  it("create duplicate should not be ok", function(done) {
    var body = {
        urlFragFree: 'some/url',
        urlFrag: 'id42',
        domainName: defaultDomain.domainName,
        title: 'Chapter 1.2'
      },
      params = {
        userId: loggedInUser._id,
        validShareSet: defaultDomain.validShareSet
      };

    bsc.createBookmark(body, params, {
      MODEL_ERR: function(err) {
        err.should.not.be.null;
        done();
      },
      DEFAULT: function(res) {

      }
    });
  });

  it("create should be ok with set created date", function(done) {
    var body = {
        urlFragFree: 'some/url3',
        urlFrag: 'id423',
        domainName: defaultDomain.domainName,
        title: 'Chapter 1.2',
        created: 'Thu Jan 10 2015 14:00:40 GMT+0200 (CEST)'
      },
      params = {
        userId: loggedInUser._id,
        validShareSet: defaultDomain.validShareSet
      };

    bsc.createBookmark(body, params, {
      MODEL_ERR: function(err) {
        should.not.exist(err);
      },
      DEFAULT: function(res) {
        assert.notDeepEqual(res, {});
        bookmarks[res.data.encURI] = res;
        done();
      }
    });
  });

  it("find should fail in model with invalid objectid", function(done) {
    bsc.findSingleBookmark('dfdf', userFixture.outsider._id, {
      MODEL_ERR: function(err) {
        err.should.not.be.null;
        done();
      },
      NOT_FOUND: function() {

      },
      DEFAULT: function(res) {
      }
    });
  });

  it("find should not return Bookmark created by different user", function(done) {
    var url = encodeURIComponent("some/url#id42");

    bsc.findSingleBookmark(bookmarks[url].data.id, userFixture.outsider._id, {
      MODEL_ERR: function(err) {
        should.not.exist(err);
      },
      NOT_FOUND: function() {
        done();
      },
      DEFAULT: function(res) {
      }
    });
  });

  it("find should return Bookmark created by user", function(done) {
    var url = encodeURIComponent("some/url#id42");

    bsc.findSingleBookmark(bookmarks[url].data.id, loggedInUser._id, {
      MODEL_ERR: function(err) {
        should.not.exist(err);
      },
      NOT_FOUND: function() {
      },
      DEFAULT: function(res) {
        assert.notDeepEqual(res, {});
        res.data.id.should.equal(bookmarks[url].data.id);
        done();
      }
    });
  });

  it("overview should fail in model", function (done) {
    var encHref = encodeURIComponent("some/url"),
      params = {
        userId: 'svada',
        domainName: defaultDomain.domainName
      };

    bsc.overview(encHref, params, {
      MODEL_ERR: function(err) {
        err.should.not.be.null;
        done();
      },
      DEFAULT: function(res) {

      }
    });
  });

  it("overview should send empty result", function(done) {
    var encHref = encodeURIComponent("some/url"),
      params = {
        userId: userFixture.outsider._id,
        domainName: defaultDomain.domainName
      };

    bsc.overview(encHref, params, {
      MODEL_ERR: function(err) {
        should.not.exist(err);
      },
      DEFAULT: function(res) {
        res.data.totalCount.should.equal(0);
        done();
      }
    });
  });

  it("overview should contain Bookmark", function(done) {
    var encHref = encodeURIComponent("some/url"),
      params = {
        userId: loggedInUser._id.toString(),
        domainName: defaultDomain.domainName
      };

    bsc.overview(encHref, params, {
      MODEL_ERR: function(err) {
        should.not.exist(err);
      },
      DEFAULT: function(res) {
        res.data.totalCount.should.equal(1);
        done();
      }
    });
  });

  it("search should fail in model", function(done) {
    var params = {
      userId: 'svada',
      domainName: defaultDomain.domainName
    };

    bsc.searchBookmarks({}, params, {
      MODEL_ERR: function(err) {
        err.should.not.be.null;
        done();
      },
      DEFAULT: function(result) {
      }
    });
  });

  it("search should return empty result", function(done) {
    var params = {
        userId: userFixture.outsider._id,
        domainName: defaultDomain.domainName
      },
      query = {

      };


    bsc.searchBookmarks(query, params, {
      MODEL_ERR: function(err) {
      },
      DEFAULT: function(result) {
        result.embeds.bookmarks.length.should.equal(0);
        done();
      }
    });
  });

  it("search should return result", function(done) {
    var params = {
        userId: loggedInUser._id,
        domainName: defaultDomain.domainName
      },
      query = {

      };


    bsc.searchBookmarks(query, params, {
      MODEL_ERR: function(err) {
      },
      DEFAULT: function(result) {
        result.embeds.bookmarks.length.should.equal(2);
        done();
      }
    });
  });

  it("search should return result with paging", function(done) {
    var params = {
        userId: loggedInUser._id,
        domainName: defaultDomain.domainName
      },
      query = {
        page: 1,
        max: 1
      };


    bsc.searchBookmarks(query, params, {
      MODEL_ERR: function(err) {
      },
      DEFAULT: function(result) {
        result.embeds.bookmarks.length.should.equal(1);
        done();
      }
    });
  });


  it("trash should fail in model", function(done) {
    bsc.trashBookmark("svada", loggedInUser._id, {
      MODEL_ERR: function(err) {
        err.should.not.be.null;
        done();
      },
      NOT_FOUND: function() {
      },
      DEFAULT: function(res) {
      }
    });
  });


  it("trash should fail when wrong user", function(done) {
    var url = encodeURIComponent("some/url#id42"),
      bookmarkId = bookmarks[url].data.id;

    bsc.trashBookmark(bookmarkId, userFixture.outsider._id, {
      MODEL_ERR: function(err) {
        should.not.exist(err);
      },
      NOT_FOUND: function() {
        done();
      },
      DEFAULT: function(res) {
      }
    });
  });

  it("trash should be ok", function(done) {
    var url = encodeURIComponent("some/url#id42"),
      bookmarkId = bookmarks[url].data.id;

    bsc.trashBookmark(bookmarkId, loggedInUser._id, {
      MODEL_ERR: function(err) {
        should.not.exist(err);
      },
      NOT_FOUND: function() {
      },
      DEFAULT: function(res) {
        assert.notDeepEqual(res, {});
        res.data.deleted.should.be.ok;
        done();
      }
    });
  });

  it("search should return result with filter=deleted", function(done) {
    var params = {
        userId: loggedInUser._id,
        domainName: defaultDomain.domainName
      },
      query = {
        page: 1,
        filter: "deleted"
      };


    bsc.searchBookmarks(query, params, {
      MODEL_ERR: function(err) {
      },
      DEFAULT: function(result) {
        result.embeds.bookmarks.length.should.equal(1);
        done();
      }
    });
  });


  it("delete should fail in model", function(done) {
    bsc.deleteTrashedBookmark("svada", loggedInUser._id, {
      MODEL_ERR: function(err) {
        err.should.not.be.null;
        done();
      },
      NOT_FOUND: function() {
      },
      DELETED: function() {
      }
    });
  });

  it("delete should fail when wrong user", function(done) {
    var url = encodeURIComponent("some/url#id42"),
      bookmarkId = bookmarks[url].data.id;

    bsc.deleteTrashedBookmark(bookmarkId, userFixture.outsider._id, {
      MODEL_ERR: function(err) {
        should.not.exist(err);
      },
      NOT_FOUND: function() {
        done();
      },
      DELETED: function() {
      }
    });
  });

  it("delete should be ok", function(done) {
    var url = encodeURIComponent("some/url#id42"),
      bookmarkId = bookmarks[url].data.id;

    bsc.deleteTrashedBookmark(bookmarkId, loggedInUser._id, {
      MODEL_ERR: function(err) {
        should.not.exist(err);
      },
      NOT_FOUND: function() {
      },
      DELETED: function() {
        done();
      }
    });
  });

  it("delete user annots should fail in model", function(done) {
    bsc.deleteUserBookmarks("svada", defaultDomain.domainName, {
      MODEL_ERR: function(err) {
        err.should.not.be.null;
        done();
      },
      DELETED: function() {
      }
    });
  });

  it("delete user annots should be ok", function(done) {
    bsc.deleteUserBookmarks(loggedInUser._id, defaultDomain.domainName, {
      MODEL_ERR: function(err) {
        should.not.exist(err);
      },
      DELETED: function() {
        done();
      }
    });
  });

  it("connection should fail", function(done) {
    var failingBody = { },
      params = { };

    var failingDBURI = "mongodb://localhost:27018/test_bookmarks";
    var failingBSC = new BookmarkService(failingDBURI);

    failingBSC.createBookmark(failingBody, params, {
      MODEL_ERR: function(err) {
        err.should.not.be.null;
        done();
      },
      DEFAULT: function(res) {
      }
    });
  });

  it("connection close should be ok", function(done) {
    try {
      bsc.close();
      done()
    } catch(err) {
      done(err)
    }
  });

});
