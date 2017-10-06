function buildThenable() {
  return {
    onFulfilled: [],
    onRejected: [],
    onFinally: [],
    then: function(onFulfill, onReject) {
      try {
        if (this.resolved && !this.rejected) {
          var returned = onFulfill(this.resolveValue);

          // promise returned, return that for next handler in chain
          if (returned && returned.then) {
            return returned;
          }

          // update resolve value for next promise in chain
          if (returned !== undefined) {
            this.resolveValue = returned;
          }

          return this;
        }
      } catch(error) {
        if (error.constructor.name.match(/AssertionError/)) {
          throw error;
        }
        this.rejectValue = error;
        this.rejected = true;
      }

      if (this.rejected && onReject) {
        return this.catch(onReject);
      }
      if (!this.rejected && onFulfill) {
        this.onFulfilled.push(onFulfill);
      }
      if (!this.resolved && onReject) {
        this.onRejected.push(onReject);
      }
      return this;
    },

    catch: function(onReject) {
      if (this.rejected) {
        try {
          const value = onReject(this.rejectValue);

          if (value && value.then) {
            return value;
          }
 
          this.resolved = true;
          this.rejected = false;
          this.resolveValue = value;
          this.rejectValue = undefined;
        } catch (e) {
          this.rejectValue = e;
        }
        return this;
      }
      if (!this.resolved) {
        this.onRejected.push(onReject);
      }
      return this;
    },

    finally: function(callback) {
      if (this.resolved || this.rejected) {
        callback();
        return;
      }
      this.onFinally.push(callback);
    }
  };
}

function setup(sinon) {
  function resolves(value) {
    this.thenable.resolved = true;
    this.thenable.rejected = false;
    this.thenable.resolveValue = value;
    this.thenable.onFulfilled
      .concat(this.thenable.onFinally)
      .forEach(function(callback) {
        callback(value);
    });
    return this;
  }

  function rejects(value) {
    this.thenable.rejected = true;
    this.thenable.resolved = false;
    this.thenable.rejectValue = value;
    this.thenable.onRejected
      .concat(this.thenable.onFinally)
      .forEach(function(callback) {
        callback(value);
    });
    return this;
  }

  sinon.stub.returnsPromise = function() {
    this.resolves = resolves;
    this.rejects = rejects;

    var thenable = buildThenable();
    this.thenable = thenable;
    this.returns(thenable);

    return this;
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = setup;
} else if (typeof window !== 'undefined') {
  if(typeof window.sinon !== 'undefined') setup(window.sinon);
} else {
  if(typeof this.sinon !== 'undefined') setup(this.sinon);
}
