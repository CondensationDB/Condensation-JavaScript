// Hash, Object ---> new
function HashAndObject(hash, object) {
	this.hash = hash;
	this.object = object;
}

// HashAndObject ---> Boolean
HashAndObject.prototype.equals = function(that) {
	return cn.equalHashes(this.hash, that.hash);
};

// Compares two hashes.
// HashAndObject?, HashAndObject? ---> Boolean
cn.equalHashAndObjects = function(a, b) {
	if (a == b) return true;
	if (a == null || b == null) return false;
	return cn.equalHashes(a.hash, b.hash);
};
