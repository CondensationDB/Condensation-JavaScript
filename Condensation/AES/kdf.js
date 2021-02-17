// Derives a key from a another key, using an IV and a number of iterations.
// The original key may be generated from a passphrase, e.g. cn.hashForBytes(passphraseBytes).bytes.
this.kdf = function(key, iv, iterations) {
	var aes = new AES256(key);
	var derivedKey = new Uint8Array(32);
	derivedKey.set(iv);
	var derivedPart0 = new Uint8Array(derivedKey.buffer, 0, 16);
	var derivedPart1 = new Uint8Array(derivedKey.buffer, 16, 16);
	for (var n = 0; n < iterations; n++) { aes.encryptInplace(derivedPart0); aes.encryptInplace(derivedPart1); }
	return derivedKey;
};
