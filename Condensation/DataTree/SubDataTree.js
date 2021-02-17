// *** A data tree stored on a selector of another data tree ***
// Sub data trees are useful for data that needs to be shared with other people. A sub data tree can conveniently and efficiently be sent to other people. If they have a previous version of the tree already, they will download the changes only (i.e. the lists that have been rewritten).

// Selector --> new
cn.SubDataTree = function(parentSelector) {
	var subDataTree = this;
	subDataTree.dataTree = new DataTree(parentSelector.dataTree.identity);

	function listSelector(reference) {
		return parentSelector.child(cn.slice(reference.hash.bytes, 0, 16));
	}

	// Attaches the sub data tree to its parent data tree. Changes are read and merged automatically until you call "detach".
	subDataTree.attach = function() {
		parentSelector.trackBranch(onBranchChanged);
		onBranchChanged();
	};

	// Detaches the sub data tree from the parent data tree, Changes are not merged any more. Unless you keep a reference to it, the SubDataTree will be garbage collected.
	subDataTree.detach = function() {
		parentSelector.untrackBranch(onBranchChanged);
	};

	function onBranchChanged() {
		// Note that we must merge them all at the same time, since only the combination of all lists represents a consistent state.
		var mergeOperation = new subDataTree.dataTree.MergeOperation();
		var children = parentSelector.children();
		for (var i = 0; i < children.length; i++)
			mergeOperation.addList(children[i].referenceValue(), null);
		mergeOperation.commit(cn.ignore);
	}

	// Merges external lists to this SubDataTree.
	// TODO: This method should take a store and copy the external lists onto our store before merging them here.
	subDataTree.mergeExternalLists = function(references) {
		for (var i = 0; i < references.length; i++)
			listSelector(references[i]).setReference(references[i]);
	};

	// Saves this SubDataTree.
	subDataTree.save = function() { return subDataTree.dataTree.save(); };

	subDataTree.dataTree.savingDone = function(activeLists, newList, obsoleteLists, mergedHashes, revision) {
		if (obsoleteLists.length == 0 && newList == null) return;

		// Remove obsolete lists
		for (var i = 0; i < obsoleteLists.length; i++)
			listSelector(obsoleteLists[i].reference).merge(revision, new cn.Record());

		// Update all active lists
		for (var i = 0; i < activeLists.length; i++) {
			var reference = activeLists[i].reference;
			var record = new cn.Record();
			record.addReference(reference);
			listSelector(reference).merge(revision, record);
		}

		// Submit all merged hashes
		for (var i = 0; i < mergedHashes.length; i++)
			parentSelector.addMergedHash(mergedHashes[i]);
	};

	//subDataTree.dataTree.savingFailed = function(error) {};
}
