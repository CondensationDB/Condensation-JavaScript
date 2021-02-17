// *** Private data stored as data tree in a private box ***

// TODO: auto saving is not part of the DataTree any more, but a separate functionality

// Identity, Int --> new
cn.PrivateData = function(identity, autoSaveDelay) {
	var privateData = this;
	var privateBoxReader = new identity.PrivateBoxReader(processPrivateBoxEntry);
	privateData.privateBoxReader = privateBoxReader;
	var dataTree = new DataTree(identity, autoSaveDelay);
	privateData.dataTree = dataTree;

	// The previously saved lists
	var currentReferences = {};

	// Reads all "private" boxes, and updates the data.
	privateData.read = function() {
		privateBoxReader.read();
	};

	function processPrivateBoxEntry(account, boxEntry) {
		// Open the envelope (but ignore the store URL)
		cn.openEnvelope(boxEntry.hash, account.store, identity, gotEnvelope);

		function gotEnvelope(envelope) {
			if (! envelope.contentReference) { console.log('PrivateData: unable to read ' + envelope.hash.hex(), envelope); return; }
			if (! envelope.isFromIdentity(identity)) { console.log('PrivateData: ' + envelope.hash.hex() + ' is not from us', envelope); return; }

			console.log('Merging ' + envelope.hash.shortHex());
			var retrieve = cn.retrieveAndDecryptRecord(reference, [envelope.store]);

			retrieve.onDone = function(record, object, store) {
				var mergeOperation = new dataTree.MergeOperation();
				var lists = record.child('#lists#');
				for (var i = 0; i < lists.children.length; i++)
					mergeOperation.addList(lists.children[i].asReference(), store);
				mergeOperation.addMergedHash(boxEntry.hash);
				mergeOperation.commit();
			};

			retrieve.onFailed = function() {
				console.log('Unable to retrieve content ' + envelope.hash.shortHex() + '.');
				// TODO: If the entry is not readable, don't do anything for now, but keep it there. We should add it to a list of unreadable items, and perhaps warn the user. onFailed may simply mean that the store is not available, and could be a temporary error. See also the comment in PrivateBoxReader regarding the RecentHashes problem.
			};
		}
	}

	// Saves the private data.
	privateData.save = function() {
		var done = {};
		done.onDone = cn.ignore;
		done.onFailed = cn.ignore;

		var save = dataTree.save();

		save.onDone = function() {
			var save = saveRoot();
			save.onDone = function() { done.onDone(); };
			save.onFailed = function() { done.onFailed(); };
		};

		save.onFailed = function() {
			done.onFailed();
		};

		return done;
	};

	dataTree.savingDone = function(activeLists, newList, obsoleteLists, mergedHashes, revision) {
		if (obsoleteLists.length == 0 && newList == null) return;

		// Create a record with all active lists
		var record = new cn.Record();
		record.add('#created#').addUnsigned(new Date().getTime());
		record.add('#client#').add(cn.versionBytes);
		var listsRecord = record.add('#lists#');
		for (var i = 0; i < activeReferences.length; i++)
			listsRecord.addReference(activeReferences[i]);

		// Submit the new object
		var aesKey = cn.randomBytes(32);
		var object = record.toEncryptedObject(aesKey);
		var hash = object.calculateHash();
		rootCommitPool.addObject(hash, object);

		// Submit the merged hashes
		for (var i = 0; i < mergedHashes.length; i++)
			rootCommitPool.addMergedHash(mergedHashes[i]);

		// Save the new reference
		rootReference = new cn.Reference(hash, aesKey);
	}

	// dataTree.savingFailed = function(error) { };

	function RootObject() {
		var activeReferences = null;
		var mergedHashes = new MergedHashes();

		this.save = function() {
		};
	}

	// Root object
	var rootCommitPool = new cn.CommitPool();
	var rootReference = null;
	var isSaving = false;

	function saveRoot() {
		var done = {};
		done.onDone = cn.ignore;
		done.onFailed = cn.ignore;

		// TODO: finish this
		// this should work correctly if multiple operations are running in parallel, some failing and some succeeding

		if (isSaving) return;
		if (! rootReference) return;

		var commitPool = rootCommitPool;
		var reference = rootReference;

		rootCommitPool = new cn.CommitPool();
		rootReference = null;
		isSaving = true;

		var save = identity.saveData(reference, commitPool);

		save.onDone = function(envelopeHash) {
			rootCommitPool.addMergedHash(envelopeHash);
			isSaving = false;
			saveRoot();
		};

		save.onFailed = function() {
			rootCommitPool.merge(commitPool);
			if (! rootReference) rootReference = reference;
			isSaving = false;
		};

		return done;
	};
}
