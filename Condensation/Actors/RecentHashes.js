// *** Recently seen hashes ***
// This is used in various places to avoid processing the same hash twice.

function RecentHashes() {
	var generation = 1;
	var byHashHex = {};

	this.has = function(hash) {
		return byHashHex[hash.hex()] ? true : false
	};

	this.remember = function(hash) {
		var hashHex = hash.hex();
		var found = byHashHex[hashHex] ? true : false;
		byHashHex[hashHex] = generation;
		return found;
	};

	this.shrink = function(keep) {
		// Start a new generation
		generation += 1;

		// Delete entries that have not been seen for 8 generations
		var threshold = generation - (keep || 8);
		for (var hashHex in byHashHex)
			if (byHashHex[hashHex] < threshold)
				delete byHashHex[hashHex];
	};
}
