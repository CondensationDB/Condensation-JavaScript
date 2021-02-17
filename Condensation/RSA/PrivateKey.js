// *** A RSA private key ***

// Uint32Array, Uint32Array, Uint32Array --> new
this.PrivateKey = function(e, p, q) {
	// Base parameters
	this.e = e;
	this.p = p;
	this.q = q;

	// Derive the RSA key parameters
	var n = product(p, q);
	var p1 = decremented(p);
	var q1 = decremented(q);
	var phi = product(p1, q1);
	var d = moduloInverse(e, phi);
	var dp = remainder(d, p1);
	var dq = remainder(d, q1);
	var pInv = moduloInverse(p, q);
	var qInv = moduloInverse(q, p);

	// rsa big integer --> rsa big integer
	function privateCrypt(input) {
		// mP = ((input mod p) ^ dP)) mod p
		// mQ = ((input mod q) ^ dQ)) mod q
		var mP = modPowBig(remainder(input, p), dp, p).result();
		var mQ = modPowBig(remainder(input, q), dq, q).result();

		// h = qInv * (mP - mQ) mod p
		// m = mQ + h * q
		if (compare(mP, mQ) > 0) {
			var h = remainder(product(difference(mP, mQ), qInv), p);
			return sumProduct(mQ, h, q);
		} else {
			var h = remainder(product(difference(mQ, mP), pInv), q);
			return sumProduct(mP, h, p);
		}
	};

	// Uint8Array --> Uint8Array [byteLength == 256]
	this.sign = function(digest) {
		var pss = generatePSS(digest);
		var signature = privateCrypt(rsa.fromBytes(pss));
		var signatureBytes = rsa.toBytes(signature, 256);
		return signatureBytes;
	};

	/*
	// Uint8Array, Uint8Array --> Boolean
	this.verify = function(digest, signature) {
		var pss = publicCrypt(bytes2BigInt(signature));
		return verifyPSS(digest, rsa.toBytes(pss, 256));
	};

	// Uint8Array --> Uint8Array
	this.encrypt = function(message) {
		var oaep = encodeOAEP(message);
		var encrypted = publicCrypt(bytes2BigInt(oaep));
		return rsa.toBytes(encrypted, 256);
	};
	*/

	// Uint8Array --> Uint8Array
	this.decrypt = function(encrypted) {
		var oaep = privateCrypt(rsa.fromBytes(encrypted));
		return decodeOAEP(rsa.toBytes(oaep, 256));
	};

	this.createPublicKey = function() { return new rsa.PublicKey(e, n); }
};
