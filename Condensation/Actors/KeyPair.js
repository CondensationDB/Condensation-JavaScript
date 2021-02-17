// *** Key Pair ***
// The key pair is stored in the browser's local store or session store.

function KeyPair(publicKey, rsaPrivateKey) {
	var keyPair = this;
	keyPair.rsaPrivateKey = rsaPrivateKey;
	keyPair.publicKey = publicKey;

	// *** Private key interface
	keyPair.signHash = function(hash) { return rsaPrivateKey.sign(hash.bytes); };
	keyPair.decrypt = function(message) { return rsaPrivateKey.decrypt(message); };

	// *** Public key interface
	keyPair.encrypt = function(message) { return publicKey.encrypt(message); };
	keyPair.verifyHash = function(hash, signature) { return publicKey.verifyHash(hash, signature); };

	// *** Reading private data

	INCLUDE PrivateBoxReader.js

	// *** Saving private data

	INCLUDE SaveData.js

	// *** Sending messages

	INCLUDE SendMessage.js

	// *** Announcing the identity

	INCLUDE AnnounceCard.js

	// Upload my public key to all my stores.
	keyPair.uploadPublicKey = function(store) {
		store.put(keyPair.publicKey.hash, keyPair.publicKey.object, keyPair);
	};

	// *** Serialization

	// Serializes the keyPair.into a record which can be reloaded using "cn.keyPair.romRecord". Note that the returned record contains the private key, and should therefore be handled with the appropriate care.
	keyPair.toRecord = function() {
		var record = new cn.Record();
		record.add('#public key object#').add(publicKey.object.toBytes());
		var rsaKeyRecord = record.add('#rsa key#');
		rsaKeyRecord.add('#e#').add(rsa.toBytes(rsaPrivateKey.e, 4));
		rsaKeyRecord.add('#p#').add(rsa.toBytes(rsaPrivateKey.p, 128));
		rsaKeyRecord.add('#q#').add(rsa.toBytes(rsaPrivateKey.q, 128));
		return record;
	};

	// Serializes the keyPair.into a hex string which can be stored to local or session storage, and reloaded using "cn.keyPair.romHex". Note that the returned hex string contains the private key, and should therefore be handled with the appropriate care.
	keyPair.toHex = function() {
		var object = keyPair.toRecord().toObject();
		return cn.hexFromBytes(object.header) + cn.hexFromBytes(object.data);
	};
};

// String? --> KeyPair
cn.keyPairFromHex = function(hex) {
	if (! hex) return;
	return cn.keyPairFromRecord(cn.recordFromObject(cn.objectFromBytes(cn.bytesFromHex(hex))));
};

// (cn.Record --> KeyPair?) | (null --> null)
cn.keyPairFromRecord = function(record) {
	if (! record) return;
	var publicKey = cn.publicKeyFromObject(cn.objectFromBytes(record.child('#public key object#').bytesValue()));
	if (! publicKey) return;

	var rsaKeyRecord = record.child('#rsa key#');
	var e = rsa.fromBytes(rsaKeyRecord.child('#e#').bytesValue());
	var p = rsa.fromBytes(rsaKeyRecord.child('#p#').bytesValue());
	var q = rsa.fromBytes(rsaKeyRecord.child('#q#').bytesValue());
	var rsaPrivateKey = new rsa.PrivateKey(e, p, q);

	return new KeyPair(publicKey, rsaPrivateKey);
};

cn.generateKeyPairAsync = function() {
	var done = {};
	done.onDone = cn.ignore;	// Identity -->
	rsa.generateKeyAsync(keyReady);
	return done;

	function keyReady(e, p, q, n) {
		var rsaPrivateKey = new rsa.PrivateKey(e, p, q);
		var rsaPublicKey = rsaPrivateKey.createPublicKey();
		var publicKey = new PublicKey(rsaPublicKey.toObject(), rsaPublicKey);
		done.onDone(new Identity(publicKey, rsaPrivateKey));
	}
};
