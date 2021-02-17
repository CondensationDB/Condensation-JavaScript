#! /usr/bin/env node
'use strict';

const fs = require('fs');
const cds = require('./condensation-nodejs.js');
console.log(cds.version);

// Create a simple record
var record = new cds.Record();
record.addText('Hello world.');
var answer = record.addText('answer-to-everything');
answer.addInteger(42);

record.addText('date').addInteger(new Date().getTime());
for (var i = 0; i < 10; i++)
	record.addText('2^' + i).addInteger(Math.pow(2, i));

// Write to file
var object = record.toObject();
fs.writeFileSync('test-record', object.toBytes());

// Write encrypted to file
var key = cds.randomBytes(32);
var encryptedObject = record.toEncryptedObject(key);
fs.writeFileSync('test-record-encrypted', encryptedObject.toBytes());
console.log('Hash of encrypted object: ' + encryptedObject.calculateHash().hex());

// Show the user what to do
console.log('Display with');
console.log('  cds show record ./test-record');
console.log('  cds show record ./test-record-encrypted decrypted with ' + cds.hexFromBytes(key));
