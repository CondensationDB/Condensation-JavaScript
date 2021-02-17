// *** Reading in-queue boxes of an identity ***

// TODO: This is now MessageBoxReader.

// The handler is usually called once for each box entry.
// Identity, Function --> new
cn.InQueueReader = function(identity, handler) {
	var reader = this;
	var mergedHashes = new MergedHashes();
	var readInterval = 0;
	var nextCheckAfter = 0;
	var removingHashes = false;

	function check() {
		reader.removeHashesNow();
		nextCheckAfter -= 1000;
		if (nextCheckAfter > 1000) return;
		reader.readNow();
	}

	this.readNow = function() {
		publicKeyCache.deleteOldKeys();

		readInterval += 1000;
		nextCheckAfter = Math.min(120 * 1000, readInterval);

		// Check the in-queues of all accounts
		for (var i = 0; i < identity.messagingAccounts.length; i++)
			processAccount(identity.messagingAccounts[i]);
	}

	function processAccount(account) {
		account.store.list(account.hash, 'in-queue', processList);

		function processList(items) {
			if (items == null || items.length == 0) return;

			// Process every item
			for (var i = 0; i < items.length; i++)
				handler(account, items[i]);
		}
	}

	this.removeHashesNow = function() {
		if (removingHashes) return;
		var snapshot = mergedHashes.snapshot();
		if (snapshot.length == 0) return;
		removingHashes = true;

		// Prepare the removals
		var boxRemovals = [];
		for (var i = 0; i < snapshot.length; i++)
			boxRemovals.push(new cn.BoxRemoval(identity.hash, 'in-queue', snapshot[i]));

		// Remove the hashes from all native stores
		var tasks = new cn.TaskGroup();
		for (var i = 0; i < identity.messagingAccounts.length; i++) {
			var account = identity.messagingAccounts[i];
			if (! account.isNative) continue;

			tasks.await();
			var modify = account.store.modify([], boxRemovals, identity);
			modify.onDone = tasks.done;
			modify.onFailed = tasks.done;
		}

		tasks.then(function() {
			mergedHashes.remove(snapshot);
			removingHashes = false;
		});
	}

	// Reads all in-queue every now and then.
	// The read frequency is increased whenever a new message is received, and decreased when no message is received.
	this.readRegularly = function() {
		readInterval = 0;
		nextCheckAfter = 0;
		setInterval(check, 1000);
	};

	// Decreases the read interval to 1 second for the next few ms milliseconds. After that, the interval gradually goes up to 2 minutes. Call this if you expect a message, or if you just received a message and expect to receive more.
	this.expectingMessage = function(ms) {
		readInterval = -ms | 0;
		nextCheckAfter = 0;
	};

	// Removes a hash (of a processed messages) from all native in-queues.
	this.removeHash = function(hash) {
		mergedHashes.add(hash);
	};
}
