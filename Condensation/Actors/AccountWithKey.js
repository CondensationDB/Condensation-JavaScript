// *** Account ***

// cn.HTTPStore, PublicKey --> new
cn.AccountWithKey = function(store, publicKey) {
	this.store = store;		// final
	this.publicKey = publicKey;		// final
	this.url = store.url + '/accounts/' + publicKey.hash.hex();	// final
}
