// *** A data tree not attached to the private box ***

// TODO: This is more of a example about how to subclass a DataTree rather than an actual useful implementation.
// TODO: This should take a KeyPair, not an identity.

// Identity --> new
cn.DetachedDataTree = function(identity) {
	var detachedDataTree = this;
	detachedDataTree.dataTree = new DataTree(identity);
	detachedDataTree.savedReferences = [];
	detachedDataTree.mergedHashes = {};

	// Merges external lists.
	// TODO: this should return a done object so that the called knows whether/when the operation succeeded
	detachedDataTree.mergeExternalLists = function(references, store) {
		var mergeOperation = new detachedDataTree.dataTree.MergeOperation();
		for (var i = 0; i < references.length; i++)
			mergeOperation.addList(references[i], store);
		mergeOperation.commit();
	};

	// Saves this DetachedDataTree.
	detachedDataTree.save = function() { detachedDataTree.dataTree.save(); };

	detachedDataTree.dataTree.savingDone = function(activeLists, newList, obsoleteLists, mergedHashes, revision) {
		// There are no changes
		if (newList == null && obsoleteLists.length == 0 && mergedHashes.length == 0) return;

		// Compile the active lists
		this.savedReferences = [];
		for (var i = 0; i < activeLists.length; i++)
			this.savedReferences.push(activeLists[i].reference);

		// Add the merged hashes
		for (var i = 0; mergedHashes.length; i++) {
			var hash = mergedHashes[i];
			this.mergedHashes[hash.hex()] = hash;
		}
	};

	detachedDataTree.dataTree.savingFailed = function(error) {};
}
