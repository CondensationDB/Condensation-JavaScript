// *** Hash ***

// Creates a hash object from a Uint8Array representing 32 bytes.
// Uint8Array [byteLength == 32] ---> new
function Hash(bytes) {
	// --> String [length == 64]
	this.hex = function() { return cn.hexFromBytes(bytes); };

	// --> String [length == 11]
	this.shortHex = function() { return cn.hexFromBytes(cn.slice(bytes, 0, 4)) + '...'; }

	// Uint8Array [byteLength == 32]
	this.bytes = bytes;
}

// Creates a hash for the given byte array.
// (Uint8Array ---> Hash?) | (null ---> null)
cn.hashFromBytes = function(bytes) {
	return bytes == null || bytes.byteLength != 32 ? null : new Hash(bytes);
};

// Creates a hash from a hex string. The hex string must contains exactly 64 hex digits, but may contain additional white space at the beginning or at the end. If the string is invalid, null is returned.
// String ---> Hash?
cn.hashFromHex = function(hashHex) {
	return cn.hashFromBytes(cn.bytesFromHex(hashHex));
};

// Calculates the SHA256 sum of the bytes and returns a hash.
// Uint8Array ---> Hash
cn.hashForBytes = function(bytes) {
	var sha256 = new SHA256();
	sha256.update(bytes);
	return new Hash(sha256.finish());
};

// Compares two hashes.
// Hash?, Hash? ---> Boolean
cn.equalHashes = function(a, b) {
	if (a == b) return true;
	if (a == null || b == null) return false;
	return cn.equalBytes(a.bytes, b.bytes);
};
