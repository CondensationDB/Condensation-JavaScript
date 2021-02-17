// Saves a new version of the data.
// Call put to upload the objects. To finalize the operation, call commit with a reference to the root object.
// cn.Reference, cn.CommitPool --> Done
identity.saveData = function(reference, commitPool) {
	var done = {};
	done.onDone = cn.ignore;	// envelopeHash: Hash -->
	done.onFailed = cn.ignore;	// -->

	// Prepare
	var store = identity.saveStore();
	if (! store) {
		setTimeout(function() { done.onFailed(); }, 0);
		return done;
	}

	var storageAccounts = identity.storageAccountsSnapshot();
	var messagingAccounts = identity.messagingAccountsSnapshot();

	// Prepare the removals
	var removals = [];
	var inQueueRemovals = [];
	for (var hashHex in commitPool.mergedHashes) {
		var hash = commitPool.mergedHashes[hashHex];
		removals.push(new cn.BoxRemoval(identity.publicKey.hash, 'private', hash));
		removals.push(new cn.BoxRemoval(identity.publicKey.hash, 'in-queue', hash));
		inQueueRemovals.push(new cn.BoxRemoval(identity.publicKey.hash, 'in-queue', hash));
	}

	// Create the envelope
	var createEnvelope = new cn.CreatePrivateEnvelope(identity, reference);
	for (var i = 0; i < storageAccounts.length; i++) {
		var storageAccount = storageAccounts[i];
		if (! storageAccount.isActive() && ! storageAccount.isEntrusted()) continue;
		createEnvelope.add(storageAccount.account);
	}
	createEnvelope.create();

	createEnvelope.onDone = function(envelope, addedRecipients) {
		// Prepare the envelope
		var envelopeObject = envelope.toObject();
		var envelopeHash = envelopeObject.calculateHash();
		commitPool.addObject(envelopeHash, envelopeObject);

		// Prepare the addition
		var addition = new cn.BoxAddition(identity.hash, 'private', new cn.BoxEntry(envelopeHash));

		// Put the tree
		var putTree = cn.putTree(store, identity, commitPool, envelopeHash);

		putTree.onDone = function() {
			// Modify the private box
			var modify = store.modify([addition], removals, identity);

			modify.onDone = function() {
				// Remove merged hashes from in-queues, but ignore errors
				for (var i = 0; i < messagingAccounts.length; i++) {
					var messagingAccount = messagingAccounts[i];
					if (! messagingAccount.isNative) continue;
					if (! messagingAccount.isActive()) continue;
					messagingAccount.account.store.modify([], inQueueRemovals, identity);
				}

				saveData.onDone(addition.boxEntry.hash);
			};

			modify.onFailed = function() {
				done.onFailed();
			};
		};

		putTree.onFailed = function() {
			done.onFailed();
		};
	};

	return done;
};
