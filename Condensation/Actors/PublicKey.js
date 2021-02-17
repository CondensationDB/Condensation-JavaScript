// *** Public key ***

function PublicKey(object, rsaPublicKey) {
	this.object = object;
	this.hash = object.calculateHash();
	//this.bytes = object.toBytes();	// deprecated
	this.encrypt = function(message) { return rsaPublicKey.encrypt(message); }
	this.verifyHash = function(hash, signature) { return rsaPublicKey.verify(hash.bytes, signature) };
};

cn.publicKeyFromObject = function(publicKeyObject) {
	var record = cn.recordFromObject(publicKeyObject);
	if (record == null) return;
	var e = record.child('#e#').bytesValue();
	if (e.length < 1) return;
	var n = record.child('#n#').bytesValue();
	if (n.length < 256) return;
	return new PublicKey(publicKeyObject, new rsa.PublicKey(rsa.fromBytes(e), rsa.fromBytes(n)));
};
