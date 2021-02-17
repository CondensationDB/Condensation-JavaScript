// Sends a message.

// TODO: The message sending organization (and partly the implementation) has greatly changed. See "messaging" in the Java implementation.
// TODO: The former "in-queue" box is now called "messages".

// cn.Record, Array --> Done
identity.sendMessageSingleRecord = function(record, recipients) {
	return identity.sendMessageRecord(reference, new cn.CommitPool(), recipients);
};

// cn.Record, cn.CommitPool, Array --> Done
identity.sendMessageRecord = function(record, commitPool, recipients) {
	var done = createSendMessageHandlers();
	var createEncryptedObject = record.createEncryptedObject();

	createEncryptedObject.onDone = function(reference, object) {
		commitPool.addObject(reference.hash, object);
		identity.sendMessage(reference, commitPool, recipients);
	};

	return done;
};

// Sends a message to a set of recipients. The message object (referenced by reference) must either be present in commitPool or already exist on the send store.
// cn.Reference, cn.CommitPool, Array --> Done
identity.sendMessageReference = function(reference, commitPool, recipients) {
	var done = createSendMessageHandlers();
	sendMessage(reference, commitPool, recipients, done);
	return done;
}

function createSendMessageHandlers() {
	var done = {};
	done.onReady = cn.ignore;			// onReady(boxEntry: cn.BoxEntry)
	done.onFailed = cn.ignore;			// onFailed()
	done.onRecipientDone = cn.ignore;	// onRecipientDone(peer: cn.Peer, account: cn.Account)
	done.onRecipientFailed = cn.ignore;	// onRecipientFailed(peer: cn.Peer)
	done.onDone = cn.ignore;			// onDone(succeededPeers: Array[cn.Peer], failedPeers: Array[cn.Peer], boxEntry: cn.BoxEntry)
	return done;
}

// cn.Reference, cn.CommitPool, Array, Done -->
function sendMessage(reference, commitPool, recipients, done) {
	// Prepare the messaging accounts
	var messagingAccounts = identity.messagingAccountsSnapshot();

	// Prepare the send store
	var store = identity.sendStore();
	if (! store) {
		setTimeout(function() { done.onFailed(); }, 0);
		return done;
	}

	// Prepare the recipients
	var allSent = new cn.TaskGroup();
	var recipientStates = [];
	for (var i = 0; i < peers.length; i++)
		recipientStates.push(new RecipientState(peers[i]));

	// Prepare the in-queue removals
	var inQueueRemovals = [];
	for (var hashHex in commitPool.mergedHashes)
		inQueueRemovals.push(new cn.BoxRemoval(identity.publicKey.hash, 'in-queue', commitPool.mergedHashes[hashHex]));

	// Add our own public key to the object pool
	commitPool.addObject(identity.publicKey.hash, identity.publicKey.object);

	// Create an envelope
	var createEnvelope = new cn.CreatePrivateEnvelope(identity, reference);
	for (var i = 0; i < messagingAccounts.length; i++) {
		var messagingAccount = messagingAccounts[i];
		if (! messagingAccount.isActive() && ! messagingAccount.isEntrusted()) continue;
		createEnvelope.add(messagingAccount);
	}

	for (var i = 0; i < recipientStates.length; i++) {
		var state = recipientStates[i];
		for (var n = 0; n < state.accounts.length; n++) createEnvelope.add(state.accounts[n]);
		for (var n = 0; n < state.entrustedAccounts.length; n++) createEnvelope.add(state.entrustedAccounts[n]);
	}

	createEnvelope.create();

	createEnvelope.onDone = function(envelope, addedRecipients) {
		var envelopeObject = envelope.toObject();
		var envelopeHash = envelopeObject.calculateHash();
		commitPool.addObject(envelopeHash, envelopeObject);
		var envelopeBoxEntry = new BoxEntry(envelopeHash);

		var putTree = new PutTree(store, identity, commitPool, envelopeHash);

		putTree.onDone = function() {
			done.onSendMessageReady(envelopeBoxEntry);

			// Put it onto at least one account of each peer
			for (var i = 0; i < recipientStates.length; i++) {
				var state = recipientStates[i];
				state.send();
			}

			// After that, we are done
			allSent.then(function() {
				// Notify the listener about succeeded and failed peers
				var succeededPeers = [];
				var failedPeers = [];

				for (var i = 0; i < recipientStates.length; i++) {
					var state = recipientStates[i];
					if (state.successful) succeededPeers.push(state.recipient);
					else failedPeers.push(state.recipient);
				}

				done.onSendMessageDone(succeededPeers, failedPeers, envelopeBoxEntry);
				if (failedPeers.length > 0) return;

				// If all recipients succeeded, remove hashes from in-queues, but ignore errors
				if (inQueueRemovals.length <= 0) return;
				for (var i = 0; i < messagingAccounts.length; i++) {
					messagingAccount = messagingAccounts[i];
					if (! messagingAccount.isNative) continue;
					if (! messagingAccount.isActive()) continue;
					messagingAccount.account.store.modify([], inQueueRemovals, identity);
				}
			});
		};

		putTree.onFailed = function() {
			done.onFailed();
		};
	};

	// Processing of a single recipient.
	function RecipientState(recipient) {
		var accounts = recipient.recipientActiveAccounts();
		var entrustedAccounts = recipient.recipientEntrustedAccounts();
		var currentAccount = null;
		var successful = false;
		allSent.await();

		function send() {
			tryNext();
		}

		function tryNext() {
			// All tried: give up
			if (accounts.length < 1) {
				done.onRecipientFailed(recipient);
				allSent.done();
				return;
			}

			// Don't use accounts for which we did not find the public key
			var currentAccount = accounts.shift();
			if (!addedRecipients.contains(currentAccount.hash)) {
				tryNext();
				return;
			}

			// Try adding an in-queue entry
			var modify = currentAccount.store.modify([new cn.BoxAddition(currentAccount.hash, 'in-queue', envelopeBoxEntry)], [], identity);

			modify.onDone = function() {
				successful = true;
				done.onRecipientDone(recipient, currentAccount);
				allSent.done();
			};

			modify.onFailed = function() {
				tryNext();
			};
		}
	}
};
