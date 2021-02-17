// Hash, cn.HTTPStore --> Done
cn.openPublicEnvelope = function(hash, store) {
	var done = {};
	done.onDone = cn.ignore;	// onDone(contentHash: Hash, sender: cn.Account, envelope: cn.Record)
	done.onFailed = cn.ignore;	// onFailed(error: String)

	// Get the envelope object
	var get = store.get(hash);

	get.onDone = function(bytes) {
		// Parse the record
		var envelope = cn.recordFromObject(cn.objectFromBytes(bytes));
		if (! envelope) return done.onFailed('Not a record.');

		// Read the content hash
		var contentHash = envelope.child('#content#').hashValue();
		if (! contentHash) return done.onFailed('No content hash.');

		// Retrieve the sender's public key
		var senderRecord = envelope.child('#signatures#').firstChild();
		if (! senderRecord.hash) finish();
		var getPublicKey = publicKeyCache.get(senderRecord.hash, store);

		getPublicKey.onDone = function(publicKey) {
			// Verify the signature
			if (! publicKey.verifyHash(contentHash, senderRecord.bytes)) return done.onFailed('Invalid sender signature.');

			// All OK
			var sender = new cn.Account(store, senderRecord.hash);
			done.onDone(contentHash, sender, envelope);
		};

		getPublicKey.onNotFound = function() {
			done.onFailed('Sender\'s public key not found.');
		};

		getPublicKey.onFailed = function(error) {
			done.onFailed('Failed to get sender\'s public key: ' + error);
		};
	}

	get.onNotFound = function() {
		done.onFailed('Envelope object not found.');
	};

	get.onFailed = function(error) {
		done.onFailed('Failed to retrieve the envelope object: ' + error);
	};

	return done;
};
