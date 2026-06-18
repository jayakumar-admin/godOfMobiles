// index.js
const app = require("./app"); // Removed the curly braces {}
const functions = require('firebase-functions');

exports.api = functions.https.onRequest(app);
