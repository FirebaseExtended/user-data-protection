# sinon-stub-promise
[![Build Status](https://travis-ci.org/substantial/sinon-stub-promise.svg?branch=master)](https://travis-ci.org/substantial/sinon-stub-promise)

This is a little package that makes testing of promises easier when stubbing
with [Sinon.JS](http://sinonjs.org/). This library ensures stubbed promises are
evaluated synchronously, so that no special async tricks are required for
testing.

## Installation

Install with npm: `npm install --save-dev sinon-stub-promise`

In node, you can initialize with sinon:

```javascript
var sinon = require('sinon');
var sinonStubPromise = require('sinon-stub-promise');
sinonStubPromise(sinon);
```

Or in the browser, you can just include
`node_modules/sinon-stub-promise/index.js` (assumes sinon is available on
window object).

## Example

```javascript
// Code under test
function doSomethingWithAPromise(promise, object) {
  promise()
    .then(function(value) {
      // resolves
      object.resolved = value
    })
    .catch(function(value) {
      // rejects
      object.rejected = value
    });
}

// Test
describe('stubbing a promise', function() {
  var promise;

  beforeEach(function() {
    promise = sinon.stub().returnsPromise();
  });

  it('can resolve', function() {
    promise.resolves('resolve value')

    var testObject = {};
    doSomethingWithAPromise(promise, testObject);
    expect(testObject.resolved).to.eql('resolve value');
  });

  it('can reject', function() {
    promise.rejects('reject value')

    var testObject = {};
    doSomethingWithAPromise(promise, testObject);
    expect(testObject.rejected).to.eql('reject value');
  });
}
```

## Why?

We wanted a nice synchronous way of stubbing out promises while testing, and
the existing solution,
[sinon-as-promised](https://www.npmjs.com/package/sinon-as-promised), uses a
promise under the hood to achieve the stubbing. The issue with this, is that
the promise is evaluated asynchronously, so the test code has to deal with that
by delaying the assertion until the promise has a chance to run.

Additionally, sinon-as-promised requires you to call either `stub.resolves()`
or `stub.rejects()` before it will setup the stub as a "thenable" object (one
that has `then` and `catch` on it). The trouble with this is that if you are
testing conditional branches (e.g. test what happens when promise succeeds,
then test what happens when promise fails), you have to either resolve or
reject the promise for the code under test to pass.

## Usage with Karma

In order to use this with the [Karma](http://karma-runner.github.io/) test runner
you can either add `node_modules/sinon-stub-promise/index.js` to `files` in your config or, alternatively, use the
[karma-sinon-stub-promise](https://github.com/alexweber/karma-sinon-stub-promise) plugin.

## Stability?

This is not a [Promises/A+](https://promisesaplus.com/) compliant library. We
built it to support how we are currently using promises. There is a test suite
that will grow over time as we identify any short comings of this library.

## To Do

* Allow for chaining with `withArgs`. Ideally we could do things like `sinon.stub().withArgs(42).resolves('value')`.
