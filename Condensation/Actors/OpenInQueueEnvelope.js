// TODO: This should be called openMessageEnvelope.
// cn.KeyPair, cn.AccountWithKey, Hash, Function --> Done
cn.openInQueueEnvelope = function(keyPair, accountWithKey, hash, mayEnvelopeReferToStoreUrl) {
	var done = {};
	done.onDone = cn.ignore;	// onDone(envelope: cn.Record, accountWithKey: cn.AccountWithKey, contentReference: cn.Reference)
	done.onInvalid = cn.ignore;	// onFailed(error: String)
	done.onFailed = cn.ignore;	// onFailed(error: String)

	// Get the envelope object
	var getOperation = accountWithKey.store.get(hash, keyPair);

	getOperation.onDone = function(bytes) {
		// Parse the record
		var envelope = cn.recordFromObject(cn.objectFromBytes(bytes));
		if (! envelope) {
			done.onInvalid('Not a record.');
			return;
		}

		// Read the store
		var signedRecord = envelope.child('#signed#');
		var storeRecord = signedRecord.child('#store#');
		if (storeRecord.children.length == 0) {
			done.onInvalid('Missing store.');
			return;
		}
		var storeUrl = storeRecord.textValue();
		if (mayEnvelopeReferToStoreUrl(accountWithKey, envelope, storeUrl)) {
			done.onInvalid('Prohibited store URL.');
			return;
		}
		var senderStore = Store.fromUrl(storeUrl);

		// Read the sender hash
		var senderHash = Hash.from(signedRecord.child(BC.sender).bytesValue());
		if (senderHash == null) {
			done.onInvalid('Missing sender hash.');
			return;
		}

		// Read the content hash
		contentHash = Hash.from(signedRecord.child(BC.content).bytesValue());
		if (contentHash == null) {
			done.onInvalid('Missing content hash.');
			return;
		}

		// Read the signature
		signature = envelope.child(BC.signature).bytesValue();
		if (signature.byteLength < 1) {
			done.onInvalid('Missing signature.');
			return;
		}

		// Read the AES key
		encryptedAesKey = envelope.child(BC.encrypted_key).child(keyPair.publicKey.hash.bytes).bytesValue();
		if (encryptedAesKey.byteLength < 1) {
			done.onInvalid('Not encrypted for us.');
			return;
		}

		// Retrieve the sender's public key
		if (senderHash.equals(accountWithKey.publicKey.hash)) onGetPublicKeyDone(accountWithKey.publicKey);
		else cn.publicKeyCache.get(keyPair, senderStore, senderHash, this);
	};

	getOperation.onNotFound = function() {
		done.onInvalid('Envelope object not found.');
	};

	getOperation.onFailed = function(error) {
		done.onFailed('Failed to retrieve the envelope object: ' + error);
	};

	var openPublicEnvelope = new cn.OpenPublicEnvelope(hash, store);

	openPublicEnvelope.onDone = function(contentHash, sender, envelope) {
		// Read the AES key
		var encryptedAesKey = envelope.child('#encrypted key#').child(identity.publicKey.hash.bytes).bytesValue();
		if (encryptedAesKey.byteLength < 1) return done.onFailed('Not encrypted for us.');

		// Decrypt the AES key
		var aesKey = identity.decrypt(encryptedAesKey);
		if (! aesKey || aesKey.byteLength != 32) return done.onFailed('Unable to decrypt key.');

		// All OK
		done.onDone(new cn.Reference(contentHash, new Bytes(aesKeyBytes)), sender, envelope);
	};

	openPublicEnvelope.onFailed = function(error) {
		done.onFailed(error);
	};

	return done;
};
