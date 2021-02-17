// *** A RSA public key ***

// Uint32Array, Uint32Array --> new
this.PublicKey = function(e, n) {
	// Uint8Array --> Uint8Array
	function publicCrypt(input) {
		return modPowSmall(input, e, n);
	};

	// Uint8Array, Uint8Array --> Boolean
	this.verify = function(digest, signature) {
		var pss = publicCrypt(rsa.fromBytes(signature));
		var pssBytes = rsa.toBytes(pss, 256);
		return verifyPSS(digest, pssBytes);
	};

	// Uint8Array --> Uint8Array
	this.encrypt = function(message) {
		var oaep = encodeOAEP(message);
		var encrypted = publicCrypt(rsa.fromBytes(oaep));
		return rsa.toBytes(encrypted, 256);
	};

	// --> CondensationObject
	this.toObject = function() {
		var record = new cn.Record();
		record.add('#e#').add(rsa.toBytes(e, 4));
		record.add('#n#').add(rsa.toBytes(n, 256));
		return record.toObject();
	};
};
