// *** Actor list ***
// Manages a list of actors.

// Identity, Selector, Selector, cn.Record --> new
cn.ActorList = function(identity, actorsSelector, publicSelector, actorInformation) {
	var actorList = this;
	actorList.actorsSelector = actorsSelector;
	actorList.publicSelector = publicSelector;
	actorList.actorInformation = actorInformation;

	// Prepare the actor label
	var actorLabel = cn.slice(identity.hash.bytes, 0, 16);

	function actorsChanged() {
		// Start with a new account list
		identity.clearAccounts();

		// Add my own account on top (even if other actors are more recent)
		add(actorInformation);

		// Add all other actors in order of their revision
		var children = actorsSelector.children();
		children.sort(function(a, b) { return a.revision() - b.revision(); });
		for (var i = 0; i < children.length; i++)
			if (! cn.equalBytes(actorLabel, children[i].label))
				add(children[i].record());

		function add(record) {
			// Add the storage accounts of this actor
			var accounts = record.child('#storage accounts#').children;
			for (var n = 0; n < accounts.length; n++) {
				var account = cn.accountFromRecord(accounts[n]);
				if (! account) continue;
				identity.addStorageAccount(account);
			}

			// Add the messaging accounts of this actor
			var accounts = record.child('#messaging accounts#').children;
			for (var n = 0; n < accounts.length; n++) {
				var account = cn.accountFromRecord(accounts[n]);
				if (! account) continue;
				identity.addMessagingAccount(account);
			}

			// Add the entrusted accounts of this actor
			var entrustedAccounts = record.child('#entrusted accounts#').children;
			for (var n = 0; n < entrustedAccounts.length; n++) {
				var account = cn.accountFromRecord(accounts[n]);
				if (! account) continue;
				identity.addEntrustedAccount(account);
			}
		}

		//actorsSelector.dataTree.privateBox.read();	// TODO: reactivate this
		actorList.announce();
	}

	// Announce after a delay
	var announceScheduled = false;

	actorList.announce = function() {
		if (announceScheduled) return;
		announceScheduled = true;
		setTimeout(announce, 2000);
	}

	// Announce immediately
	actorList.announceNow = function(doneHandler) {
		announceScheduled = true;
		announce(doneHandler);
	};

	function announce(doneHandler) {
		if (! announceScheduled) return;
		announceScheduled = false;

		// Public information
		var card = new cn.Record();
		var children = publicSelector.children();
		for (var i = 0; i < children.length; i++)
			card.add(children[i].label).addRecords(children[i].record().children);

		// Announce
		identity.announce(card, done);

		function done(successful) {
			console.log(successful ? 'Identity announced on ' + successful + ' stores' : 'Failed to announce identity');
			if (doneHandler) doneHandler(successful);
		}
	}

	// Update the actor list and announce whenever necessary
	actorsSelector.trackBranch(actorsChanged);
	publicSelector.trackBranch(actorList.announce);

	// Update my actor information and announce
	actorsSelector.child(actorLabel).update(actorInformation);
	actorList.announce();

	// Associates with another actor (and his group)
	// The association is complete only if the other actor (or an actor of his group) associates with us.
	// cn.Record -->
	actorList.associate = function(actorInformation) {
		var hash = actorInformation.child('#accounts#').hashValue;
		if (! hash) return;
		var actorLabel = cn.slice(hash.bytes, 0, 16);
		actorsSelector.child(actorLabel).update(actorInformation);
	}

	// Dissociates ourselves
	// We keep using our own account, but others will ignore us after merging this transaction.
	// We don't need to announce again. Our public card will become obsolete when other actors update their own card.
	actorList.dissociate = function() {
		actorsSelector.child(actorLabel).clear();
	};
};

// String, Identity, String --> cn.Record
cn.simpleActorInformation = function(name, identity, storeUrl) {
	var actorInformation = new cn.Record();
	actorInformation.add('#accounts#').addText(storeUrl, identity.hash);
	actorInformation.add('#name#').addText(name);
	return actorInformation;
}
