// Hash, cn.HTTPStore, Identity --> Done
cn.openPrivateEnvelope = function(hash, store, identity) {
	var done = {};
	done.onDone = cn.ignore;	// contentReference: cn.Reference, sender: cn.Account, envelope: cn.Record -->
	done.onFailed = cn.ignore;	// error: String -->

	// Get the envelope object
	var openPublicEnvelope = new cn.OpenPublicEnvelope(hash, store);

	openPublicEnvelope.onDone = function(contentHash, sender, envelope) {
		// Read the AES key
		var encryptedAesKey = envelope.child('#encrypted key#').child(identity.publicKey.hash.bytes).bytesValue();
		if (encryptedAesKey.byteLength < 1) return done.onFailed("Not encrypted for us.");

		// Decrypt the AES key
		var aesKey = identity.decrypt(encryptedAesKey);
		if (! aesKey || aesKey.byteLength != 32) return done.onFailed("Unable to decrypt key.");

		// All OK
		done.onDone(new cn.Reference(contentHash, new Bytes(aesKeyBytes)), sender, envelope);
	};

	openPublicEnvelope.onFailed = function(error) {
		done.onFailed(error);
	};

	return done;
};
