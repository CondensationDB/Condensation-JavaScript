// cn.Record, cn.CommitPool -->
identity.announceCard = function(record, commitPool) {
	var done = this;
	done.onReady = cn.ignore;			// envelopeHash: Hash, cardHash: Hash -->
	done.onPutDone = cn.ignore;			// account: Account -->
	done.onPutFailed = cn.ignore;		// account: Account -->
	done.onModifyDone = cn.ignore;		// account: Account -->
	done.onModifyFailed = cn.ignore;	// account: Account -->
	done.onDone = cn.ignore;			// succeededAccounts: Array[IdentityAccount], failedAccounts: Array[IdentityAccount], boxEntry: BoxEntry -->
	var allAccounts = new cn.TaskGroup();

	// Add all messaging accounts
	var messagingAccounts = identity.messagingAccountsSnapshot();
	messagingAccounts.sort(compareRevision);

	function compareRevision(a, b) {
		return a.revision < b.revision ? 1 : a.revision > b.revision ? -1 : 0;
	}

	var accountsRecord = record.add('#accounts#');
	var currentStoreUrl = "";
	var currentStoreRecord = null;
	var currentType = null;
	var currentTypeRecord = null;
	for (var i = 0; i < messagingAccounts.length; i++) {
		var messagingAccount = messagingAccounts[i];

		if (currentStoreRecord == null || messagingAccount.account.store.url != currentStoreUrl) {
			currentStoreUrl = messagingAccount.account.store.url;
			currentStoreRecord = accountsRecord.add(currentStoreUrl);
			currentTypeRecord = null;
		}

		if (currentTypeRecord == null || currentType != messagingAccount.type) {
			currentType = messagingAccount.type;
			currentTypeRecord = currentStoreRecord.add(currentType.asBytes);
		}

		currentTypeRecord.addUnsigned(messagingAccount.revision, messagingAccount.account.hash);
	}

	// Add the public key
	commitPool.addObject(identity.publicKey.hash, identity.publicKey.object);

	// Prepare the public card
	var cardObject = record.toObject();
	var cardHash = cardObject.calculateHash();
	commitPool.addObject(cardHash, cardObject);

	// Prepare the public envelope
	var envelope = new cn.Record();
	envelope.add('#content#').add(cardHash);
	envelope.add('#signatures#').add(identity.sign(cardHash), identity.publicKey.hash);
	var envelopeObject = envelope.toObject();
	var envelopeHash = envelopeObject.calculateHash();
	commitPool.addObject(envelopeHash, envelopeObject);
	done.onReady(envelopeHash, cardHash);

	// Announce on all active native accounts
	var doneUrls = {};
	var boxAddition = new BoxAddition(identity.publicKey.hash, 'public', new BoxEntry(envelopeHash));
	var storageAccounts = identity.storageAccountsSnapshot();
	for (var i = 0; i < storageAccounts.length; i++)
		announceOnAccount(storageAccounts[i]);
	for (var i = 0; messagingAccounts.length; i++)
		announceOnAccount(messagingAccounts[i]);

	allAccounts.then(this);

	function announceOnAccount(identityAccount) {
		if (! identityAccount.isNative) return;
		if (! identityAccount.isActive()) return;

		var account = identityAccount.account;
		if (doneUrls[identityAccount.account.url]) return;
		doneUrls[identityAccount.account.url] = 1;
		allAccounts.await();

		// Prepare
		var preparation = new cn.TaskGroup();
		var removals = [];
		var hasError = false;

		// Upload the objects
		preparation.await();
		var putTree = new cn.PutTree(account.store, identity, commitPool, boxAddition.boxEntry.hash);

		putTree.onDone = function(putObjects) {
			done.onPutDone(account);
			preparation.done();
		};

		putTree.onFailed = function() {
			done.onPutFailed(account);
			failed();
		};

		// List the public box
		preparation.await();
		var list = account.store.list(identity.publicKey.hash, 'public');

		list.onDone = function(boxEntries) {
			for (var i = 0; i < boxEntries.length; i++)
				removals.push(new BoxRemoval(identity.publicKey.hash, 'public', boxEntries[i].hash));
			preparation.done();
		};

		list.onFailed = function(error) {
			// Ignore errors, in the worst case, we are going to have multiple entries in the public box
			preparation.done();
		};

		preparation.then(function() {
			if (hasError) return;

			// Modify the public box
			var modify = account.store.modify([boxAddition], removals, identity);

			modify.onDone = function() {
				done.onModifyDone(account);
				succeeded.push(account);
				allAccounts.done();
			}

			modify.onFailed = function(error) {
				done.onModifyFailed(account);
				failed();
			}
		});

		function failed() {
			hasError = true;
			failed.push(account);
			allAccounts.done();
		}
	}
};

