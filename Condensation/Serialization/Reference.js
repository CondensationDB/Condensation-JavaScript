// *** Reference to an encrypted object ***

cn.Reference = function(hash, key) {
	this.hash = hash;
	this.key = key;
};

// Encrypts or decrypts a reference using a shared secret (32 bytes).
cn.Reference.prototype.sharedSecretCrypt = function(sharedSecret) {
	var mask = cn.aes.kdf(sharedSecret, this.hash.bytes, 1);
	for (var i = 0; i < 32; i++) mask[i] ^= this.key[i];
	return new cn.Reference(this.hash, mask);
};
