// *** Message queue ***
// Unprocessed messages are stored as node of a data tree.

// Identity, Selector --> new
cn.MessageQueue = function(identity, selector) {
	var messageQueue = this;
	messageQueue.onMessage = cn.ignore;
	messageQueue.selector = selector;
	messageQueue.inQueueReader = new cn.InQueueReader(identity, processInQueueEntry);

	function processInQueueEntry(account, boxEntry) {
		var messageSelector = selector.child(cn.slice(boxEntry.hash.bytes, 0, 16));

		if (messageSelector.revision() == 0) {
			// Start a new message
			var message = new cn.Record();
			message.add('#received#').addInteger(new Date().getTime());
			message.add('#hash#').add(boxEntry.hash.bytes);
			messageSelector.update(message);

			// Trigger the InQueueReader
			messageQueue.inQueueReader.expectingMessage(0);
		} else {
			// If the message has been processed before, there is nothing to do
			if (! messageSelector.isSet()) return;
		}

		// Add the store
		var storeUrl = boxEntry.storeUrl == null ? account.store.url : boxEntry.storeUrl;
		var storeUrlHash = cn.hashForBytes(cn.bytesFromText(storeUrl));
		var storeSelector = messageSelector.child('#stores#').child(cn.slice(storeUrlHash.bytes, 0, 16));
		if (! storeSelector.isSet()) storeSelector.setText(storeUrl);

		// Remove the message from the in-queue as soon as the data has been saved
		selector.addMergedHash(boxEntry.hash);

		// Process the message
		processMessage(messageSelector);
	}

	function processMessage(messageSelector) {
		// If the message is old, delete it
		var now = new Date().getTime();
		var record = messageSelector.record();
		var received = record.child('#received#').integerValue();
		if (now - received > 10 * 86400 * 1000) return messageQueue.removeMessage(messageSelector);

		// If we have tried recently, give up
		var triedSelector = messageSelector.child('#tried#');
		var tried = triedSelector.integerValue();
		if (now - tried < tried - received) return;
		triedSelector.setInteger(now);

		// If the message is ready, pass it to the handler
		var dataSelector = messageSelector.child('#data#');
		if (dataSelector.isSet()) return callHandler();

		// Prepare the list of stores
		var storeUrlSelectors = messageSelector.child('#stores#').children();

		// Try loading the message from all indicated stores
		var hash = cn.hashFromBytes(record.child('#hash#').bytesValue());
		if (hash == null) return;

		tryNext();

		function tryNext() {
			// Take the next store
			if (! storeUrlSelectors.length) return;
			var store = cn.storeFromUrl(storeUrlSelectors.shift().textValue());
			var open = cn.openPrivateEnvelope(hash, store, identity);

			open.onDone = function(contentReference, sender, envelope) {
				// Get the content
				var retrieve = cn.retrieveAndDecrypt(contentReference, [store]);

				retrieve.onDone = function(object, store) {
					// Parse the message record
					var content = cn.recordFromObject(object);
					if (content == null) return tryNext();

					// Store everything
					var dataRecord = new cn.Record();
					dataRecord.add('#store#').addText(store.url);
					dataRecord.add('#senders#').addText(sender.store.url, sender.hash);
					dataRecord.add('#content#').addRecords(content.children);
					dataSelector.update(dataRecord);

					// Call the message handler
					return callHandler();
				}

				retrieve.onFailed = tryNext;
			}

			open.onFailed = tryNext;
		}

		function callHandler() {
			if (messageQueue.onMessage(new ReceivedMessage(messageSelector))) messageQueue.removeMessage(messageSelector);
		}
	}

	messageQueue.removeMessage = function(messageSelector) {
		messageSelector.clear();
		ensureMessageDeletion(messageSelector);
	};

	messageQueue.processOpenMessages = function() {
		var children = selector.children();
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			if (child.isSet()) processMessage(child);
			else ensureMessageDeletion(child);
		}
	};

	function ensureMessageDeletion(selector) {
		if (selector.child('#tried#').isSet()) selector.child('#tried#').clear();
		if (selector.child('#data#').isSet()) selector.child('#data#').clear();
		var children = selector.child('#stores#').children();
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			if (child.isSet()) child.clear();
		}
	}
};

function ReceivedMessage(selector) {
	this.selector = selector;

	var record = selector.record();
	this.hash = record.child('#hash#').integerValue();
	this.received = record.child('#received#').integerValue();

	this.data = selector.child('#data#').record();
	this.sender = cn.accountFromRecord(this.data.child('#senders#').firstChild());
	this.content = this.data.child('#content#');

	// Returns true if the message is from the indicated peer.
	this.isFromPeer = function(peer) {
		if (! this.sender) return false;
		for (var n = 0; n < peer.accounts.length; n++)
			if (cn.equalHashes(this.sender.hash, peer.accounts[n].hash)) return true;
		return false;
	};

	// Returns true if the message is from the indicated identity.
	this.isFromIdentity = function(identity) {
		if (! this.sender) return false;
		for (var n = 0; n < identity.messagingAccounts.length; n++)
			if (cn.equalHashes(this.sender.hash, identity.messagingAccounts[n].hash)) return true;
		return false;
	};
}
