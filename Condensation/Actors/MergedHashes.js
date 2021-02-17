// *** List of merged hashes ***

function MergedHashes() {
	var byHex = {};

	this.add = function(hash) {
		byHex[hash.hex()] = hash;
	};

	this.contains = function(hash) {
		return byHex[hash.hex()] ? true : false;
	}

	this.snapshot = function() {
		var snapshot = [];
		for (var hashHex in byHex) snapshot.push(byHex[hashHex]);
		return snapshot;
	};

	this.remove = function(snapshot) {
		for (var i = 0; i < snapshot.length; i++) delete byHex[snapshot[i].hex()];
	};
}
