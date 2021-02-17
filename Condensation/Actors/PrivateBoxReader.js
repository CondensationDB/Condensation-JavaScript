// *** Private Box Reader ***
// This is where private data is saved.

// Function --> new
keyPair.PrivateBoxReader = function(handler) {
	var privateBoxReader = this;
	var recentHashes = new RecentHashes();
	var reading = 0;

	// TODO: Using recentHashes here is a bit dangerous. If reading the corresponding tree fails (e.g. temporary store failure), we don't consider it for quite some time, potentially for the lifetime of this reader. Ideally, the handler should tell us
	// - whether processing was successful, and the hash can be marked as read
	// - whether processing failed, and the hash should be brought up again, e.g. after an exponentially increasing timeout

	// Returns whether a read operation is currently ongoing.
	privateBoxReader.isReading = function() { return reading; };

	// Reads all private boxes, and calls the handler for each new entry.
	privateBoxReader.read = function(accountWithKey) {
		publicKeyCache.deleteOldKeys();		// TODO: this should not be here
		recentHashes.shrink();

		// Keep track that a reading operation is ongoing
		reading += 1;
		var taskGroup = new cn.TaskGroup();

		// List all private boxes
		for (var i = 0; i < identity.storageAccounts.length; i++)
			processAccount(identity.storageAccounts[i]);

		// Processes an account.
		function processAccount(account) {
			taskGroup.await();
			var list = account.store.list(account.hash, 'private');

			list.onDone = function(boxEntries) {
				if (boxEntries.length == 0) return;

				// Process every item
				for (var i = 0; i < boxEntries.length; i++) {
					var boxEntry = boxEntries[i];
					if (recentHashes.remember(boxEntry.hash)) continue;
					handler(account, boxEntry);
				}

				taskGroup.done();
			};

			list.onFailed = function(errorCode) {
				taskGroup.done();
			};
		}

		// All accounts have been processed.
		taskGroup.then(function() { reading -= 1; });
	};
}
