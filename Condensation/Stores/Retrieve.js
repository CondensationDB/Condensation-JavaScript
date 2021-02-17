// Retrieves an object from any store.
// Hash, Array --> Done
cn.retrieve = function(hash, stores) {
	var done = {};
	done.onDone = cn.ignore;		// onDone(object, store)
	done.onFailed = cn.ignore;		// onFailed()

	// Try with the first store
	var doneUrl = {};
	tryNext();
	return done;

	function tryNext() {
		// Get the next store that we have not tried yet
		while (true) {
			if (stores.length == 0) return done.onFailed();
			var store = stores.shift();
			if (! doneUrl[store.url]) break;
		}

		// Use that store
		doneUrl[store.url] = true;
		var get = store.get(hash);

		get.onDone = function(bytes) {
			var object = cn.objectFromBytes(bytes);
			if (! object) return tryNext();
			done.onDone(object, store);
		};

		get.onNotFound = tryNext;
		get.onFailed = tryNext;
	}
};

// Retrieves an object from any store, and decrypts it.
// cn.Reference, Array --> Done
cn.retrieveAndDecrypt = function(reference, stores) {
	var done = {};
	done.onDone = cn.ignore;		// onDone(object, store)
	done.onFailed = cn.ignore;		// onFailed()

	var retrieve = cn.retrieve(reference.hash, stores);

	retrieve.onDone = function(object, store) {
		var crypt = aes.cryptAsynchronously(object.data, reference.key);
		crypt.onDone = function() { done.onDone(object, store); };
	}

	retrieve.onFailed = function() { done.onFailed(); };
	return done;
};

// Retrieves an object from any store, decrypts and parses it as a Record.
// cn.Reference, Array --> Done
cn.retrieveAndDecryptRecord = function(reference, stores) {
	var done = {};
	done.onDone = cn.ignore;		// onDone(record, object, store)
	done.onFailed = cn.ignore;		// onFailed()

	var retrieve = cn.retrieve(reference.hash, stores);

	retrieve.onDone = function(object, store) {
		var crypt = aes.cryptAsynchronously(object.data, reference.key);
		crypt.onDone = function() {
			// TODO: for large objects, we could parse the record asynchronously
			var record = cn.recordFromObject(object);
			if (record) done.onDone(record, object, store);
			else done.onFailed();
		};
	}

	retrieve.onFailed = function() { done.onFailed(); };
	return done;
};
