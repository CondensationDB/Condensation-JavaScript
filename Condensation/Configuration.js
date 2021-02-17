/*
this.loadOrCreatePrivateKey = function(doneHandler) {
	var privateKey = cn.privateKeyFromStorage(window.localStorage);
	if (privateKey == null) privateKey = cn.privateKeyFromStorage(window.sessionStorage);
	if (privateKey == null) return cn.createPrivateIdentity(doneHandler);
	doneHandler(privateKey);
};

this.createPrivateKey = function(doneHandler) {
	generateKeyAsync(doneKey);

	function doneKey(e, p, q) {
		var privateKey = new cn.PrivateKey(e, p, q);
		privateKey.writeToStorage(window.sessionStorage);
		doneHandler(privateKey);
	}
};

this.discardPrivateKey = function() {
	cn.deletePrivateKeyOnStorage(window.localStorage);
	cn.deletePrivateKeyOnStorage(window.sessionStorage);
};
*/
