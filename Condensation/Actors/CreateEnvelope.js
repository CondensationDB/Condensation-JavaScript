// *** Envelope construction ***

cn.createPublicEnvelope = function(identity, hash) {
	var envelope = new cn.Record();
	envelope.add('#content#').addHash(hash);
	envelope.add('#signatures#').add(identity.signHash(hash), identity.publicKey.hash);
	return envelope;
};

cn.CreatePrivateEnvelope = function(identity, reference) {
	var createPrivateEnvelope = this;
	createPrivateEnvelope.onDone = cn.ignore;
	var tasks = new cn.TaskGroup();

	// Create the envelope
	var envelope = new cn.Record();
	//envelope.add('#content#').add(reference.key, reference.hash);		// add the plain key for testing
	envelope.add('#content#').addHash(reference.hash);

	// Sign
	envelope.add('#signatures#').add(identity.signHash(reference.hash), identity.publicKey.hash);

	// Add recipients
	var triedAccounts = {};
	var addedRecipients = {};
	var encryptedKey = envelope.add('#encrypted key#');

	createPrivateEnvelope.add = function(account) {
		var hashHex = account.hash.hex();
		if (addedRecipients[hashHex]) return;
		if (triedAccounts[account.url]) return;
		triedAccounts[account.url] = true;

		// Native public key
		if (cn.equalHashes(account.hash, identity.publicKey.hash)) {
			encryptedKey.add(account.hash.bytes).add(identity.publicKey.encrypt(key));
			addedRecipients[hashHex] = true;
			return;
		}

		// Other public key
		tasks.await();
		var getPublicKey = publicKeyCache.get(account.hash, account.store);

		getPublicKey.onDone = function(publicKey) {
			if (addedRecipients[hashHex]) return;
			encryptedKey.add(account.hash.bytes).add(publicKey.encrypt(key));
			addedRecipients[hashHex] = true;
			tasks.done();
		};

		getPublicKey.onFailed = function() {
			tasks.done();
		};
	};

	createPrivateEnvelope.create = function() {
		tasks.then(function() { createPrivateEnvelope.onDone(envelope, addedRecipients); });
	};
};
