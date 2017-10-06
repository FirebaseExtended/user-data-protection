var sinon = require('sinon');
var sinonStubPromise = require('../index');
var AssertionError = require('chai').AssertionError;
var chai = require('chai');
var RSVP = require('rsvp');
var expect = chai.expect;
var assert = chai.assert;

sinonStubPromise(sinon);

describe('stubPromise', function() {
  var f, promise, resolveValue, rejectValue;
  beforeEach(function() {
    f = function() {};
    resolveValue = null;
    rejectValue = null;
    promise = sinon.stub().returnsPromise();
  });

  it('works without requiring explicit resolve or reject', function(done) {
    promise().then(f).catch(f).finally(f);
    done();
  });

  it('can resolve', function() {
    promise.resolves('resolve value');

    promise().then(function(arg) {
      resolveValue = arg;
    });

    expect(resolveValue).to.equal('resolve value');
  });

  it('can resolve multiple times with the same value', function() {
    var secondResolvedValue = null;
    promise.resolves('resolve value');

    promise().then(function(arg) {
      resolveValue = arg;
    });
    expect(resolveValue).to.equal('resolve value');

    promise().then(function(arg) {
      secondResolvedValue = arg;
    });
    expect(secondResolvedValue).to.equal('resolve value');
  });

  it('can resolve empty value', function() {
    promise.resolves();

    var resolved = false;
    promise().then(function() {
      resolved = true;
    });

    expect(resolved).to.be.true;
  });

  it('does not resolve without explicitly being resolved', function() {
    var resolved = false;

    promise().then(function() {
      resolved = true;
    });

    expect(resolved).to.be.false;
  });
  it('does resolve synchronously when explicitly resolved AFTER a then is added', function() {
    var resolved = false;

    promise().then(function() {
      resolved = true;
    });

    expect(resolved).to.be.false;
    promise.resolves();
    expect(resolved).to.be.true;
  });

  it('returns stub from resolves call', function(done) {
    var stub = promise.resolves();
    stub();
    done();
  });

  it('handles resolves when no explicit resolve handler is setup', function(done) {
    promise.resolves();
    promise().catch(f);
    done();
  });

  it('can reject via catch', function() {
    promise.rejects('reject value');

    promise().catch(function(arg) {
      rejectValue = arg;
    });

    expect(rejectValue).to.equal('reject value');
  });

  it('can reject via reject function ', function() {
    promise.rejects('reject value');

    promise().then(f, function(arg) {
      rejectValue = arg;
    });

    expect(rejectValue).to.equal('reject value');
  });

  it('can reject empty value', function() {
    promise.rejects();

    var rejected = false;
    promise().catch(function() {
      rejected = true;
    });

    expect(rejected).to.be.true;
  });

  it('does not reject without explicitly being rejected', function() {
    var rejected = false;

    promise().catch(function() {
      rejected = true;
    });

    expect(rejected).to.be.false;
  });
  it('can reject via catch synchronously when explicitly rejected AFTER a catch is added', function() {
    var rejected = false;

    promise().catch(function() {
      rejected = true;
    });

    expect(rejected).to.be.false;
    promise.rejects();
    expect(rejected).to.be.true;
  });
  it('can reject via a then reject function synchronously when explicitly rejected AFTER a then reject function is added', function() {
    var rejected = false;

    promise().then(f, function() {
      rejected = true;
    });

    expect(rejected).to.be.false;
    promise.rejects();
    expect(rejected).to.be.true;
  });

  it('returns stub from rejects call', function(done) {
    var stub = promise.rejects();
    stub();
    done();
  });

  it('handles rejects when no explicit reject handler is setup', function(done) {
    promise.rejects();
    promise().then(f);
    done();
  });

  it('respects resolve if resolve is last', function() {
    promise.rejects();
    promise.resolves();

    var rejectedCalled = false;
    promise().catch(function() {
      rejectedCalled = true;
    });

    expect(rejectedCalled).to.be.false;
  });

  it('respects reject if reject is last', function() {
    promise.resolves();
    promise.rejects();

    var resolveCalled = false;
    promise().then(function() {
      resolveCalled = true;
    });

    expect(resolveCalled).to.be.false;
  });

  it('does not invoke finally if promise is not resolved or rejected', function() {
    var finallyCalled = false;
    promise().finally(function() {
      finallyCalled = true;
    });

    expect(finallyCalled).to.be.false;
  });

  it('invokes finally when promise is resolved', function() {
    promise.resolves();

    var finallyCalled = false;
    promise().finally(function() {
      finallyCalled = true;
    });

    expect(finallyCalled).to.be.true;
  });

  it('invokes finally when promise is resolved after the finally is added', function() {
    var finallyCalled = false;
    promise().finally(function() {
      finallyCalled = true;
    });

    expect(finallyCalled).to.be.false;
    promise.resolves();
    expect(finallyCalled).to.be.true;
  });

  it('invokes finally when promise is rejected', function() {
    promise.rejects();

    var finallyCalled = false;
    promise().finally(function() {
      finallyCalled = true;
    });

    expect(finallyCalled).to.be.true;
  });

  it('invokes finally when promise is rejected after the finally is added', function() {
    var finallyCalled = false;
    promise().finally(function() {
      finallyCalled = true;
    });

    expect(finallyCalled).to.be.false;
    promise.rejects();
    expect(finallyCalled).to.be.true;
  });

  it('handles catches that succeed', function(done) {
    promise.rejects('an error');

    promise().then(f, function(e) {
      expect(e).to.equal('an error');
      return 'no error';
    }).then(function (d) {
      expect(d).to.equal('no error');
      done();
    })
  });

  it('handles catches that fail', function(done) {
    promise.rejects('an error');

    promise().then(f, function(e) {
      expect(e).to.equal('an error');
      throw new Error('another');
    }).then(function () {
      done(new Error("Promise did not throw"))
    }, function (e) {
      expect(e.message).to.equal('another');
      done();
    })
  });

  describe('chaining', function() {
    it('supports then chaining', function(done) {
      promise().then(f).then(f);
      done();
    });

    it('supports then chaining when resolving', function(done) {
      promise.resolves('foo');
      promise().then(f).then(f);
      done();
    });

    it('supports chaining catch after then', function(done) {
      promise().then(f).catch(f);
      done();
    });

    it('supports chaining then, catch, then', function(done) {
      promise().then(f).catch(f).then(f);
      done();
    });

    it('delegates resolution if onReject returns a promise', function(done) {
      promise.rejects('initial value');

      var fReturningPromise = function() {
        return new RSVP.Promise(function(resolve, reject) {
          resolve('promise value');
        });
      };

      promise().catch(fReturningPromise).then(function(innerValue) {
        expect(innerValue).to.eql('promise value');
        done();
      });
    });

    it('delegates resolution if onFulfill returns a promise', function(done) {
      promise.resolves('initial value');

      var fReturningPromise = function() {
        return new RSVP.Promise(function(resolve, reject) {
          resolve('promise value');
        });
      };

      promise().then(fReturningPromise).then(function(innerValue) {
        expect(innerValue).to.eql('promise value');
        done();
      });
    });

    it('returns intermediate values', function() {
      promise.resolves();

      var intermediateValue;
      promise().then(function() {
        return 'intermediate value';
      }).then(function(value) {
        intermediateValue = value;
      });

      expect(intermediateValue).to.eql('intermediate value');
    });

    it('returns undefined value if intermediate function return undefined', function(done) {
      promise.resolves();

      promise().then(function() {
        // a statement that doesn't return
      }).then(function(value) {
        expect(value).to.be.undefined;
        done();
      });
    });

    it('invokes chained catch if previous catch throws', function(done) {
      promise.rejects();
      promise().catch(function() {
        throw new Error('error1');
      }).catch(function(e) {
        expect(e.message).to.eql('error1');
        done();
      });
    });

    it('invokes catch if error thrown inside onFulfill', function(done) {
      promise.resolves();

      promise().then(function() {
        throw new Error('error');
      }).catch(function(error) {
        expect(error.message).to.eql('error');
        done();
      });
    });

    it('throws error if assertion error', function() {
      promise.resolves();

      function throwError() {
        throw new AssertionError();
      }

      expect(function() {
        promise().then(throwError)
      }).to.throw(AssertionError);
    });

    it('does not execute additional then blocks when an error is thrown', function(done) {
      promise.resolves();

      var callCount = 0;
      promise()
        .then(function() {
          throw new Error('Stop the insanity');
        })
        .then(function() {
          callCount++;
        })
        .catch(function(error) {
          expect(callCount).to.eql(0);
          expect(error.message).to.eql('Stop the insanity');
          done();
        });
    });

    it('does execute additional then blocks when an error has been caught', function(done) {
      promise.resolves();

      promise()
        .then(function() {
          throw new Error('Stop the insanity');
        })
        .catch(function(error) {
          expect(error.message).to.eql('Stop the insanity');
          return 'No more error';
        })
        .then(function (r) {
          expect(r).to.eql('No more error');
          done();
        });
    });
  });
});
