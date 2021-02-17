keyPair.rsaPrivateKey = rsaPrivateKey;

	keyPair.storageAccounts = {};
	keyPair.messagingAccounts = {};


	// *** Accounts



	// Merges account information that applies to storage and messaging.
	// cn.Account, Integer, AccountType --> Boolean
	keyPair.mergeAccount = function(account, revision, type) {
		var hasChanges = keyPair.mergeStorageAccount(account, revision, type);
		hasChanges |= keyPair.mergeMessagingAccount(account, revision, type);
		return hasChanges;
	};

	// Merges information about a storage account.
	// cn.Account, Integer, AccountType --> Boolean
	keyPair.mergeStorageAccount = function(account, revision, type) {
		var keyPairAccount = keyPair.storageAccounts[account.url];
		if (! keyPairAccount) {
			keyPairAccount = new IdentityAccount(account);
			keyPair.storageAccounts[account.url] = keyPairAccount;
		}

		if (revision < keyPairAccount.revision) return false;
		keyPairAccount.revision = revision;
		keyPairAccount.type = type;
		containsCache = null;
		return true;
	};

	// Merges information about a messaging account.
	// cn.Account, Integer, AccountType --> Boolean
	keyPair.mergeMessagingAccount = function(account, revision, type) {
		var keyPairAccount = keyPair.messagingAccounts[account.url];
		if (! keyPairAccount) {
			keyPairAccount = new IdentityAccount(account);
			keyPair.messagingAccounts[account.url] = keyPairAccount;
		}

		if (revision < keyPairAccount.revision) return false;
		keyPairAccount.revision = revision;
		keyPairAccount.type = type;
		containsCache = null;
		return true;
	};

	// Cache for keyPair.contains()
	var containsCache = null;

	// Returns true if the account belongs to this keyPair.
	// Hash --> Boolean
	keyPair.contains = function(accountHash) {
		if (! containsCache) {
			containsCache = {};
			for (var url in keyPair.storageAccounts) {
				var keyPairAccount = keyPair.storageAccounts[url];
				if (! keyPairAccount.isActiveOrIdle()) continue;
				containsCache[keyPairAccount.account.hash.hex()] = true;
			}

			for (var url in keyPair.messagingAccounts) {
				var keyPairAccount = keyPair.messagingAccounts[url];
				if (! keyPairAccount.isActiveOrIdle()) continue;
				containsCache[keyPairAccount.account.hash.hex()] = true;
			}
		}

		return containsCache[accountHash.hex()] || false;
	};

	// Returns a list of stores from which to retrieve private data objects.
	keyPair.retrieveStores = function() {
		var stores = [];
		for (var i = 0; i < keyPair.storageAccounts.length; i++) {
			var keyPairAccount = keyPair.storageAccounts[i];
			if (! keyPairAccount.isActive()) continue;
			stores.push(keyPairAccount.store);
		}
		return stores;
	};

	// Returns a store that can be used for saving private data. Note that a different store may be returned each time the function is called.
	// To save data, call this function once, and use that store to upload all private data objects.
	// --> Store
	keyPair.saveStore = function() {
		var candidate = null;
		for (var url in keyPair.storageAccounts) {
			var keyPairAccount = keyPair.storageAccounts[url];
			if (! keyPairAccount.isNative) continue;
			if (! keyPairAccount.isActive()) continue;
			if (candidate != null && candidate.revision >= keyPairAccount.revision) continue;
			candidate = keyPairAccount;
		}

		return candidate == null ? null : candidate.account.store;
	};

	// Returns a store that can be used for sending messages. Note that a different store may be returned each time the function is called.
	// To send a message, call this function once, and use that store to upload all objects related to the message.
	// --> Store
	keyPair.sendStore = function() {
		var candidate = null;
		for (var url in keyPair.messagingAccounts) {
			var keyPairAccount = keyPair.messagingAccounts[url];
			if (! keyPairAccount.isNative) continue;
			if (! keyPairAccount.isActive()) continue;
			if (candidate != null && candidate.revision >= keyPairAccount.revision) continue;
			candidate = keyPairAccount;
		}

		return candidate == null ? null : candidate.account.store;
	};

	// Returns a snapshot of the current storage accounts.
	keyPair.storageAccountsSnapshot = function() {
		var list = [];
		for (var url in keyPair.storageAccounts)
			list.push(keyPair.storageAccounts[url]);
		return list;
	};

	// Returns a snapshot of the current messaging accounts.
	keyPair.messagingAccountsSnapshot = function() {
		var list = [];
		for (var url in keyPair.messagingAccounts)
			list.push(keyPair.messagingAccounts[url]);
		return list;
	};

