// *** Account ***

// cn.HTTPStore, Hash, Boolean? --> new
cn.Account = function(store, hash) {
	this.store = store;		// final
	this.hash = hash;		// final
	this.url = store.url + '/accounts/' + hash.hex();
}

// String, Store, Boolean? --> Account?
cn.accountFromUrl = function(text, defaultStore) {
	var result = text.match(/^\s*(.*?)\/accounts\/([0-9a-fA-F]{64,64})\/*\s*$/);
	if (result) {
		var hash = cn.hashFromHex(result[2]);
		if (! hash) return;
		return new cn.Account(cn.storeFromUrl(result[1]), hash);
	}

	if (! defaultStore) return;
	var hash = cn.hashFromHex(result[1]);
	if (! hash) return;
	return new cn.Account(defaultStore, hash);
}

// Record, Boolean? --> Account?
cn.accountFromRecord = function(record) {
	if (! record.hash) return;
	var store = cn.storeFromUrl(record.asText());
	return new cn.Account(store, record.hash);
}
