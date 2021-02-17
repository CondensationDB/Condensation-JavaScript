cn.CommitPool = function() {
	this.objects = {};
	this.mergedHashes = {};

	// Adds a new object to the pool.
	// Hash, CondensationObject -->
	this.addObject = function(hash, object) {
		this.objects[hash.hex()] = new HashAndObject(hash, object);
	};

	// Adds a hash.
	// Hash -->
	this.addMergedHash = function(hash) {
		this.mergedHashes[hash.hex()] = hash;
	};

	// Add objects and merged hashes from another CommitPool (e.g. from an unsuccessful SaveData instance).
	// CommitPool -->
	this.merge = function(commitPool) {
		for (var hashHex in commitPool.objects)
			this.objects[hashHex] = commitPool.objects[hashHex];
		for (var hashHex in commitPool.mergedHashes)
			this.mergedHashes[hashHex] = commitPool.mergedHashes[hashHex];
	};
}
