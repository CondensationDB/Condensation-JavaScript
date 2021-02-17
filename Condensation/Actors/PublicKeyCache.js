// *** Cache of public keys ***
// This is merely to avoid reloading public keys for each signature verification.

var publicKeyCache = new PublicKeyCache();

function PublicKeyCache() {
	var byHashHex = {};

	// Hash, cn.HTTPStore --> Done
	this.get = function(hash, store) {
		var done = {};
		done.onDone = cn.ignore;	// PublicKey -->
		done.onFailed = cn.ignore;	// -->

		// Reuse a cached key
		var hashHex = hash.hex();
		var publicKey = byHashHex[hashHex];
		if (publicKey) {
			publicKey.lastAccess = new Date().getTime();
			setTimeout(function() { done.onDone(publicKey); });
			return done;
		}

		// Download the key from the store
		var get = store.get(hash);

		get.onDone = function(bytes) {
			var publicKey = cn.publicKeyFromObject(cn.objectFromBytes(bytes));
			if (! publicKey) return done.onFailed();

			publicKey.lastAccess = new Date().getTime();
			byHashHex[hashHex] = publicKey;
			done.onDone(publicKey);
		}

		get.onFailed = function() { done.onFailed(); };

		return done;
	};

	this.deleteOldKeys = function() {
		// Delete entries that have not been used for 10 minutes
		var threshold = new Date().getTime() - 10 * 60 * 1000;
		for (var hashHex in byHashHex)
			if (byHashHex[hashHex].lastAccess < threshold)
				delete byHashHex[hashHex];
	};
}
