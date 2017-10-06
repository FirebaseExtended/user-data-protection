**This library is an early alpha release. Expect and please report bugs.**

##TOC
- [Project Overview](#overview)
- [How to use these functions in your Firebase app](#use)
- [How to work on this project](#contribute)

## <a name="overview"></a> Project Overview

Compliance with privacy regulations requires that developers ensure that a
user's data is deleted when they delete their account.

This library, created by [Dan Zhang](https://github.com/horseno), contains a
FirebaseCloud Function triggered by account deletion. It wipes out all the data
in the Firebase Realtime Database that belongs to the user that was deleted.

To determine what data should be deleted, the Cloud Function analyzes the app's
Security Rules, and identifies any data that can only be written by a particular
user.

For example, when a user authenticates, we write save personal data of the form:

```
/functions-project-12345
    /users
        $uid : "Some user data"
```

And when the user delete their account a Function will trigger and automatically
delete the corresponding user data in the realtime database.

This library also includes a simple [demo app](public) showing how the Function
works.

The instructions below explain how to *use* this library. If you want
to *contribute* to the library, or are just curious about how it is
built, please see the overview [Design Doc](doc/design.md), the
detailed explanation of [Auto Rules
Extraction](doc/auto_rules_extraction.md), and the [contribution
guidelines](CONTRIBUTING.md)

#### Implementation overview

See [`functions/wipeout.js`](functions/wipeout.js) for the data cleanup code.

When a user deletes their account, their data in the database will be deleted
automatically according to `Wipeout Rules` that can either be

- specified in the local file
[`functions/wipeout_config.json`](functions/wipeout_conifg.json) or, if the file
doesn't exist or doesn't contain a valid configuration object,
- inferred from the Realtime Database authorization Rules.

Don't modify the `WIPEOUT_CONFIG` object in `functions/index.js` unless you know
the code well.

Developer confirmation of the Wipeout Rules is needed before the function begins
removing user data; see step 9 in [Deploy and test](#test) for details.

Dependencies for this library are listed in
[`functions/package.json`](functions/package.json).


#### <a name="test/"> Deploy and test

This sample comes with a Function and web-based UI for testing the function.
To configure it:

 1. Create a Firebase Project using the
  [Firebase Console](https://console.firebase.google.com).
 1. Enable Google Auth. In the Firebase Console open the
  **Authentication** section > **SIGN IN METHOD** tab
  you need to enable the **Google** Sign-in Provider and click **SAVE**.
 1. Clone or download this repo and open the `user-data-cleanup` directory.
 1. You must have the Firebase CLI installed. If you don't have it install it
  with `npm install -g firebase-tools` and then configure it with
  `firebase login`.
 1. Configure the CLI locally by using `firebase use --add` and select
 your project in the list.
 1. Install dependencies locally by running: `cd functions; npm install; cd -`
 1. Run local tests using `cd functions; npm test`
 1. Deploy your project using `firebase deploy`, anbd note the showWipeoutConfig
    URL printed out.
 1. Visit the showWipeoutConfig URL in a browser and Initialized the library for
    this database by clicking the "INITIALIZE" button.
 1. Go to the showWipeoutConfig URL again to verify the wipeout rules. The
  webpage will show the source of these wipeout rules, either loaded from local
  config or generated from security rules.
1. The format of wipeout rules are described in the next section. If the rules
  are correct, click the "CONFIRM DEPLOYMENT" button, or else change the local
  configuration file
  [functions/wipeout_config.json](functions/wipeout_conifg.json) and redeploy.
  **Note a developer confirmation is required after every deployment.**
 1. Open the app using `firebase open hosting:site`, this will open a browser.
 1. Sign in using Google Sign-In and delete the account using
  the provided button. You can check at each step of the way if the data
  has been deleted using the Firebase console.

#### Understanding the wipeout rules

The path string can use variable `$WIPEOUT_UID` which will be replaced by UID of
the deleted user account when triggered.

The Wipeout Rules are a `JSON` object with the top-level key "wipeout" the value
of a list of JSON objects, each describing a pattern of user data storage. When
a user account is deleted, the library goes through every Wipeout Rule to remove
any data with these patterns for that user. A single config rule may have four
fields:
*   `path`: Mandatory field. A String indicating a location of user data.
  * A path can include place holder variables `#WIPEOUT_UID` which will be
    replaced by `auth.uid` at execution time.
  * It can also include free variables which start with `$`.
  * A simple example `path` is `/users/#WIPEOUT_UID`, and an example `path`
    field for a chat app is `/chat/$room`.
*   `authVar`: Optional field. A List of data references. Besides the locations
    marked by `#WIPEOUT_UID` in `path`, `authVar` is a list of values, or data
    references which should equal to the authentication uid.
    * For example, the
    previous chat app example could also specify `authVar: ['val(rules,chat,
    $room,creator)']`.
    * This will restrict the free variable `$room` to the set of chat rooms
    created by the user who just deleted the account because it requires
    data at `/chat/$room/creator` to be `auth.uid`.
    * See data reference below for format details.
*   `condition`: Optional field. A String. Any additional restriction on the
    path which is not related to authentication.
    * Logic `&&` and `||` supported.
    * Free variables are not supported.
    * For example, `#WIPTOUT_UID !== someID && val(rules,user,#WIPEOUT_UID,
    createYear) > 2016` would only allow the user data to be removed if the
    data was created after 2016.
*   `except`: Optional field. This is a subpath of data to not be deleted, meant
    for data that doesn't belong to a single user, and shouldn't be removed on
    account deletion.
    * For example, shared data under a user data folder. Currently only subpaths
    which are one level deeper than its parent path is supported. In the example
    `except` for `/chat/$room/` is `/chat/$room/members`, which there could be
    reasons to preserve.

Data reference: A String representing the value or existence of data at a
location in the database. The String format is a call of `val()` or `exists()`,
and the list of arguments stands for the path to the location. The root of the
path is always 'rules'. e.g. `val(rules,chat,$room,creator)` stands for the
value at location `/chat/$room/creator`.

At execution time, a config will go through the following process to get a set
of materialized absolute paths in the database:
1.  Swap `#WIPEOUT_UID` place holder with `auth.uid` of deleted account.
1.  Evaluate condition, filter out any config with a false condition.
1.  Evaluate authVar, retrieve values for variables in path.
1.  Evaluate any exception clauses.
1.  Remove any remaining trailing free variables since they represent wildcard
    values in paths. After the removal, any path that still contains a free
    variable is not supported for deletion and will be ignored.

After these steps, we're left with a list of concrete data paths to delete. The
library deletes the data and records the paths to the deleted data with a
timestamp at `/wipeout/history/#WIPEOUT_UID` in the realtime database.


## <a name="use"></a> How to add this library to your existing Firebase project
The following instructions are the instructions to install both the wipeout
library and the demo app that lives in the `public/` folder.

#### If you're creating a new project:
- [ ] Consider structuring your data to make the Wipeout Rules easier to write
and therefore more reliable. For example, nest personal data under the `$uid`
login token, and store group data such as members of a chat room, or users that
have stared a post, outside a user-specific key.
- [ ] Initialize Firebase Functions (instructions [here]()).

Then Continue with the rules for existing projects.

#### To add this to existing projects:
- [ ] And add this to your `functions/index.js` file:

  ```js
  'use strict';

  const admin = require('firebase-admin');

  admin.initializeApp(functions.config().firebase);
  const wipeout = require('./wipeout');

  const WIPEOUT_CONFIG = {
      'credential': admin.credential.applicationDefault(),
      'db': admin.database(),
      'serverValue': admin.database.ServerValue,
      'users': functions.auth.user(),
      'DB_URL': functions.config().firebase.databaseURL,
    };

  wipeout.initialize(WIPEOUT_CONFIG);

  /** expose cleanupUserDat as Cloud Function */
  exports.cleanupUserData = wipeout.cleanupUserData();

  /** expose showWipeoutConfig as Cloud Function */
  exports.showWipeoutConfig = wipeout.showWipeoutConfig();

  /** Cloud Function that adds demo data to app for a user. */
  exports.addDataDemo = functions.https.onRequest((req, res) => {
    if (req.method === 'POST') {
      const body = JSON.parse(req.body);
      if (typeof body.ref === 'undefined' || typeof body.content !== 'object') {
        return Promise.reject('Needs ref and content field to add demo data');
      }
      return admin.database().ref(body.ref).set(body.content)
          .then(() => res.send('data added'));
    }
  });
  ```
- [ ] Add these dependencies to the `functions/package.json` file
  ```json
  {
    "name": "user-data-cleanup-functions",
    "description": "Delete user data from the datastore upon account deletion",
    "dependencies": {
      "deepcopy": "^0.6.3",
      "ejs": "^2.5.7",
      "firebase-admin": "^4.1.1",
      "firebase-functions": "^0.5.1",
      "jsep": "^0.3.0",
      "request": "^2.81.0",
      "request-promise": "^4.2.1",
      "strip-json-comments": "^2.0.1"
    },
    "scripts": {
      "test": "NODE_ENV=TEST mocha test/index_spec.js",
      "start": "node wipeout_init.js"
    },
    "devDependencies": {
      "chai": "<=3.5",
      "chai-as-promised": "^6.0.0",
      "mocha": "^3.4.2",
      "sinon": "^2.3.2",
      "sinon-stub-promise": "^4.0.0"
    }
  }
  ```
- [ ] Run `cd function; npm install; cd -` to install new modules into the
  `node_modules` folder
- [ ] Add the following to the `firebase.json` file:
  ```json
  {
    "database": {
      "rules": "database.rules.json"
    },
    "hosting": {
      "public": "public",
      "rewrites": [
        {"source": "/addDataDemo", "function": "addDataDemo"}
      ]
    }
  }
  ```
- [ ] Copy all the files in the `functions/` folder except `index.js`,
  `package.json`, and `package-lock.json`:
  - [ ] `access.js`
  - [ ] `common.js`
  - [ ] `eval_ref.js`
  - [ ] `expression.js`
  - [ ] `index.js`
  - [ ] `parse_rule.js`
  - [ ] `template_confirm.ejs`
  - [ ] `template.ejs`
  - [ ] `wipeout.js`


- [ ] Copy the `public/` folder into the app

- [ ] Deploy the new functions: `functions deploy`
- [ ] Follow the instructions in the the command line to initialize and confirm
      the wipeout rules
