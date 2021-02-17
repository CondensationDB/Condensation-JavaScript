// *** A peer ***
// A peer is a user or service that acts as one unit. It includes one or more peer accounts, belonging to one or more actors.
// Each peer publishes a card, on which it mentions all its accounts. When reloading a peer, all cards are reloaded, and the newest card is kept.

// TODO: This is now called ActorGroup.

// Function[Account, Hash, Record] --> new
cn.Peer = function(onPeerMergeCard) {
	var peer = this;

	// Accounts
	var peerAccountsByUrl = {};

	// Cache
	var cachedMainPeerAccount = null;
	var cachedHashes = null;
	var cachedActiveAccounts = null

	var recentHashes = new RecentHashes();	// Recently requested hashes on the public box.

	INCLUDE PeerAccount.js

	// Number, Array[Account] -->
	peer.mergeAccounts = function(revision, accounts) {
		if (revision <= peer.revision) return;
		peer.revision = revision;
		peer.accounts = accounts;
	};

	peer.peerAccounts = function() {
		var accounts = [];
		for (var url in peerAccountsByUrl)
			accounts.push(peerAccountsByUrl[url]);
		return accounts;
	};

	// cn.Account -->
	peer.peerAccount = function(account) {
		return peerAccountsByUrl[account.url];
	};

	// Returns the newest active or idle peer account.
	peer.mainPeerAccount = function() {
		if (cachedMainPeerAccount) return cachedMainPeerAccount;

		for (var url in peerAccountsByUrl) {
			var peerAccount = peerAccountsByUrl[url];
			if (cachedMainPeerAccount && cachedMainPeerAccount.revision >= peerAccount.revision) continue;
			cachedMainPeerAccount = peerAccount;
		}

		return cachedMainPeerAccount;
	};

	// Returns the newest active or idle account. This account can be used to rediscover the peer.
	peer.mainAccount = function() {
		var mainPeerAccount = peer.mainPeerAccount();
		return mainPeerAccount ? mainPeerAccount.account : null;
	};

	// Recipient interface
	peer.recipientActiveAccounts = function() {
		if (cachedActiveAccounts) return cachedActiveAccounts;

		var peerAccounts = peer.peerAccounts();
		peerAccounts.sort(compareRevision);

		cachedActiveAccounts = [];
		for (var i = 0; i < peerAccounts; i++)
			 if (peerAccounts[i].isActive())
				cachedActiveAccounts.push(peerAccounts[i].account);

		return cachedActiveAccounts;
	};

	peer.recipientEntrustedAccounts = function() {
		var entrustedAccounts = [];
		for (var url in peerAccountsByUrl) {
			var peerAccount = peerAccountsByUrl[url]
			if (peerAccount.isEntrusted())
				accounts.push(peerAccount.account);
		}

		return entrustedAccounts;
	};

	function compareRevision(a, b) {
		return a.revision < b.revision ? 1 : a.revision > b.revision ? -1 : 0;
	}

	// Returns true if the account belongs to this peer.
	// Note that multiple (different) peers may claim that the account belongs to them. In practice, an account usually belongs to one peer.
	// cn.Account --> Boolean
	peer.contains = function(account) {
		if (! cachedHashes) {
			cachedHashes = {};
			for (var url in peerAccountsByUrl) {
				var peerAccount = peerAccountsByUrl[url]
				if (peerAccount.isActiveOrIdle())
					cachedHashes[peerAccount.hash.hex()] = true;
			}
		}

		return cachedHashes[account.hash.hex()] || false;
	};

	// Returns true if the account is entrusted by this peer.
	// cn.Account --> Boolean
	peer.entrusts = function(account) {
		for (var url in peerAccountsByUrl) {
			var peerAccount = peerAccountsByUrl[url];
			if (peerAccount.isEntrusted() && cn.equalHashes(account.hash, peerAccount.account.hash)) return true;
		}
		return false;
	};

	// Merges an account.
	// cn.Account, Int, AccountType -> Boolean
	peer.mergeAccount = function(account, revision, type) {
		var peerAccount = peerAccountsByUrl[account.url];
		if (! peerAccount) {
			peerAccount = new PeerAccount(account);
			peerAccountsByUrl[account.url] = peerAccount;
		}

		if (revision <= peerAccount.revision) return false;
		peerAccount.revision = revision;
		peerAccount.type = type;
		cachedMainPeerAccount = null;
		cachedActiveAccounts = null;
		cachedHashes = null;
		return true;
	}

	// Merges a new card, and immediately notifies the delegate.
	// Account, cn.Hash, cn.Record --> Boolean
	function mergeCard(cardAccount, cardHash, card) {
		// Check if this card mentions at least one of our active or idle accounts
		var accountsRecord = card.child(BC.accounts);
		var idleAccountsRecord = card.child(BC.idle_accounts);
		if (!intersectsAccounts(accountsRecord, idleAccountsRecord)) return false;

		// Merge the account lists
		for (var is = 0; is < accountsRecord.children.length; is++) {
			var storeRecord = accountsRecord.children[is];
			var storeUrl = storeRecord.asText();
			if (storeUrl == '') continue;
			var store = cn.storeFromUrl(storeUrl);
			for (var it = 0; it < storeRecord.children.length; it++) {
				var typeRecord = storeRecord.children[it];
				var type = cn.accountTypeFromBytes(typeRecord.bytes);
				if (! type) continue;
				for (var ic = 0; ic < typeRecord.children.length; ic++) {
					var child = typeRecord.children[ic];
					if (! child.hash) continue;
					var revision = child.asUnsigned();
					mergeAccount(new Account(store, child.hash), revision, type);
				}
			}
		}

		// Notify the delegate
		if (onPeerMergeCard) onPeerMergeCard(cardAccount, cardHash, card);
		return true;
	}

	// cn.Record, cn.Record --> Boolean
	function intersectsAccounts(accountsRecord, idleAccountsRecord) {
		for (var is = 0; is < accountsRecord.children.length; is++) {
			var storeRecord = accountsRecord.children[is];
			for (var it = 0; it < storeRecord.children.length; it++) {
				var typeRecord = storeRecord.children[it];
				var type = cn.accountTypeFromBytes(typeRecord.bytes);
				if (! type) continue;
				if (type != cn.AccountTypes.ACTIVE && type != cn.AccountTypes.IDLE) continue;
				for (var ic = 0; ic < typeRecord.children.length; ic++) {
					var child = typeRecord.children[ic];
					if (! child.hash) continue;
					if (contains(child.hash)) return true;
				}
			}
		}

		return false;
	}

	// Reloads the public information of this peer.
	// cn.PublicCardsSnapshot? --> Done
	peer.update = function(snapshot) {
		var done = {};
		done.onDone = cn.ignore;

		// Prepare
		if (! snapshot) snapshot = new cn.PublicCardsSnapshot();
		var seenAccounts = {};

		// Check all accounts until we are stable, i.e. all seen accounts have been checked
		processUnseenAccounts();

		tasks.then(function() {
			recentHashes.shrink();
			done.onDone();
		});

		return done;

		function processUnseenAccounts() {
			// Check all known accounts
			for (var url in peerAccountsByUrl) {
				var peerAccount = peerAccountsByUrl[url];
				if (! peerAccount.isActive()) continue;
				if (seenAccounts[url]) return;
				seenAccounts[url] = true;
				processAccount(peerAccount.account);
			}
		}

		function processAccount(account) {
			// Check the cache
			var cachedEntries = snapshot.boxEntriesByAccountUrl[account.url];
			if (cachedEntries) {
				processEntries(cachedEntries);
				return;
			}

			// List the public box
			var list = account.store.list(account.hash, 'public');

			list.onDone = function(boxEntries) {
				snapshot.boxEntriesByAccountUrl[account.url] = boxEntries;
				processEntries(boxEntries);
			};

			list.onFailed = function() {
				snapshot.boxEntriesByAccountUrl[account.url] = [];
			};

			function processEntries(boxEntries) {
				for (var i = 0; i < boxEntries.length; i++) processEntry(boxEntries[i]);
			}

			function processEntry(boxEntry) {
				// Check the cache
				var hashHex = boxEntry.hash.hex();
				var cardWithHash = snapshot.cardsByEnvelopeHash[hashHex];
				if (cardWithHash != null) {
					if (cardWithHash.card != null) setTimeout(mergeCached, 0);
					return;
				}

				function mergeCached() {
					if (mergeCard(account, cardWithHash.hash, cardWithHash.card)) processUnseenAccounts();
					else delete seenAccounts[account.url];
				}

				// Open the envelope (but ignore the store URL)
				var open = cn.openPublicEnvelope(boxEntry.hash, account.store);

				open.onDone = function(contentHash, sender, envelope) {
					// Check if the public information was stored by the account holder
					if (! cn.equalHashes(sender.hash, account.hash)) return failed();

					// Read the object
					var get = account.store.get(contentHash);

					get.onDone = function(bytes) {
						// Merge, and check again if necessary
						var card = cn.recordFromObject(cn.objectFromBytes(bytes));
						if (! card) return failed();

						snapshot.cardsByEnvelopeHash[hashHex] = {hash: contentHash, card: card};
						if (mergeCard(account, contentHash, card)) processUnseenAccounts();
						else delete seenAccounts[account.url];
					};

					get.onNotFound = function() {
						console.log('Public card ' + contentHash.hex() + ' not found.');
						failed();
					};

					get.onFailed = function() {
						console.log('Reading public card failed: ' + error);
						failed();
					};
				}

				open.onFailed = function(error) {
					console.log('Opening public envelope failed: ' + error);
					failed();
				};

				function failed() {
					snapshot.cardsByEnvelopeHash[hashHex] = {hash: null, card: null};
				}
			}
		}
	}
};

// cn.Account --> cn.Peer
cn.peerForAccount = function(account) {
	var peer = new cn.Peer();
	peer.mergeAccount(account, 0, cn.AccountTypes.ACTIVE);
	return peer;
};
