// *** Data tree ***

// TODO: DataTree now takes a KeyPair and a Store, not an Identity any more. (Identity in the present form has disappeared, in favor of an Actor.)

// This class is optimized for rather small data sets, i.e. up to a few 1000 entries. It reads and deserializes all data into memory, and notifies listeners upon change. With more elements, it would be preferable to deserialize on demand.
// Identity, Long --> new
function DataTree(identity_) {
	var dataTree = this;

	// Configuration
	this.identity = identity_;
	this.root = new Selector(this, null, cn.emptyBytes);

	// State
	var itemsBySelector = {};
	var lists = [];
	this.changes = new ChangesList();
	var mergeLists = {};
	this.mergedHashes = new MergedHashes();
	//var recentLists = new RecentHashes();

	// Selector --> Item?
	this.get = function(selector) {
		return itemsBySelector[selector.id];
	};

	// Selector --> Item
	this.getOrCreate = function(selector) {
		// Return an existing item
		var item = itemsBySelector[selector.id];
		if (item != null) return item;

		// Create a new item
		var newItem = new Item(dataTree, selector);
		itemsBySelector[selector.id] = newItem;
		return newItem;
	};

	this.rootItem = function() {
		return dataTree.getOrCreate(dataTree.root);
	};

	this.remove = function(selector) {
		delete itemsBySelector[selector.id];
	};

	// *** Merging

	dataTree.MergeOperation = function() {
		var listReaders = [];
		var mergedHashes = [];
		var readyToMerge = new cn.TaskGroup();

		this.addList = function(reference, store) {
			if (reference == null) return;

			var mergeList = prepareMergeList(reference);
			if (! mergeList) return;

			readyToMerge.await();
			mergeList.taskGroups.add(readyToMerge);
			listReaders.push(mergeList);
		}

		function addMergedHash(hash) {
			mergedHashes.push(hash);
		}

		function commit() {
			readyToMerge.then(function() {
				if (listReaders.length == 0 && mergedHashes.length == 0) return;
				for (var i = 0; i < listReaders.length; i++) if (listReaders[i].hasError) return;
				for (var i = 0; i < listReaders.length; i++) listReaders[i].merge();
				for (var i = 0; i < mergedHashes.length; i++) dataTree.mergedHashes.add(mergedHashes[i]);
			});
		}
	};

	// cn.Reference --> ?
	function prepareMergeList(reference) {
		// Check if we have this list already
		for (var i = 0; i < lists.length; i++)
			if (cn.equalHashes(lists[i].reference.hash, reference.hash)) return;

		// Return the currently loading merge list, if any
		var hashHex = reference.hash.hex();
		var existingMergeList = mergeLists[hashHex];
		if (existingMergeList != null) return existingMergeList;

		// Create a new merge list
		return mergeLists[hashHex] = new MergeList(reference);
	}

	function MergeList(reference) {
		var taskGroups = [];
		var hasError = false;
		var list = null;
		var record = null;
		var hashHex = reference.hash.hex();
		var retrieve = cn.retrieveAndDecrypt(reference, dataTree.identity.retrieveStores());

		retrieve.onDone = function(object, store) {
			record = cn.recordFromObject(object);
			list = new List(reference, object.byteLength());
			readyToMerge();
		};

		retrieve.onFailed = function() {
			hasError = true;
			readyToMerge();
		};

		function readyToMerge() {
			for (var i = 0; i < taskGroups.length; i++)
				taskGroups[i].done();
		}

		this.merge = function() {
			// If we are not among the merge lists any more, we have been merged
			if (!dataTree.mergeLists[hashHex]) return;
			delete dataTree.mergeLists[hashHex];

			// Add the list
			dataTree.lists.push(list);

			// Merge the items
			mergeNode(dataTree.root, record.child('#root#'));
		}

		function mergeNode(selector, record) {
			// Prepare
			var count = record.children.length;
			if (count < 1) return;
			var item = dataTree.getOrCreate(selector);

			// Merge broom
			var broomRecord = record.firstChild();
			item.mergeBroom(list, broomRecord.asUnsigned());

			// Merge value
			var valueRecord = broomRecord.firstChild();
			item.mergeValue(list, valueRecord.asUnsigned(), valueRecord);

			// Iteratively merge children
			for (var i = 1; i < count; i++) {
				var child = record.children[i];
				mergeNode(list, selector.child(child.bytes), child);
			}
		}
	}

	// *** Change management

	// This is called whenever the data changed.
	dataTree.onDataChanged = cn.ignore;	// -->

	// *** Saving

	dataTree.save = function() {
		var done = {};
		done.onDone = cn.ignore;	// -->
		done.onFailed = cn.ignore;	// error: String -->

		var saveStore = dataTree.identity.saveStore();

		// We are including everything up to now
		var revision = new Date().getTime();
		var mergedHashes = dataTree.mergedHashes.snapshot();

		// Mark all lists as not selected
		for (var i = 0; i < lists.length; i++)
			lists[i].saveSelected = false;

		// If there are no changes to save, just remove unused lists
		var changes = 0;
		var saveItems = [];
		includeList(dataTree.changes);
		if (changes == 0) return saveUsedLists(false);

		// Include all lists smaller than 2*size
		while (true) {
			// Select more lists
			var hasMoreChanges = false;
			var threshold = changes * 2;
			//console.log('integrating lists', threshold);
			for (var i = 0; i < lists.length; i++) {
				var list = lists[i];
				if (list.saveSelected) continue;
				if (list.countInUse >= threshold) continue;
				list.saveSelected = true;
				includeList(list);
				hasMoreChanges = true;
			}

			// We may have reached stability
			if (! hasMoreChanges) break;
		}

		// Add all selected items
		function includeList(list) {
			changes += list.countInUse;
			for (var item = list.nextInBroomList; item != list; item = item.nextInBroomList)
				item.createSaveItem(saveItems).addBroom();
			for (var item = list.nextInValueList; item != list; item = item.nextInValueList)
				item.createSaveItem(saveItems).addValue();
		}

		// Serialize, encrypt, and upload the list
		var record = new cn.Record();
		record.add('#created#').addUnsigned(revision);
		record.add('#client#').add(cn.versionBytes);
		record.addRecord(dataTree.rootItem().createSaveItem(saveItems).record);
		var create = record.createEncryptedObject();

		// Detach the save items from the items
		for (var i = 0; i < saveItems.length; i++)
			saveItems[i].item.saveItem = null;

		create.onDone = function(reference, object) {
			// Create the new list
			var newList = new List(reference, object.byteLength());

			// Upload the object
			var put = saveStore.put(reference.hash, object, dataTree.identity);

			put.onDone = function() {
				// Set this list on all saved items (unless a newer list has been set in the meantime)
				for (var i = 0; i < saveItems.length; i++)
					saveItems[i].merged(newList);

				// Wrap up
				lists.push(newList);
				wrapUp(newList);
			};

			put.onFailed = function(error) {
				dataTree.onSavingFailed(error);
				done.onFailed(error);
			};
		};

		function wrapUp(newList) {
			// Remove obsolete lists
			var activeLists = [];
			var obsoleteLists = [];
			for (var i = 0; i < lists.length; i++) {
				var list = lists[i];
				if (list.countInUse == 0) obsoleteLists.push(list);
				else activeLists.push(list);
			}
			lists = activeLists;

			// Remove the merged hashes
			dataTree.mergedHashes.remove(mergedHashes);

			// Wrap up
			dataTree.onSavingDone(activeLists, newList, obsoleteLists, mergedHashes, revision);
			done.onDone();
		}

		return done;
	}

	// *** Notification

	var notificationScheduled = false;

	this.scheduleNotifier = function() {
		if (notificationScheduled) return;
		notificationScheduled = true;
		setTimeout(notify, 100);
	};

	function notify() {
		notificationScheduled = false;

		// Create a snapshot of all changes, and reset the changes at the same time
		var items = [];
		var subTreeEnd = [];
		var notifyFlags = [];
		var w = 0;
		addItem(dataTree.rootItem());

		function addItem(item) {
			var index = w;
			items[index] = item;
			notifyFlags[index] = item.notifyFlags;
			item.notifyFlags = 0;
			w += 1;

			var current = item.notifyChild;
			item.notifyChild = null;
			while (current) {
				addItem(current);
				var next = current.notifySibling;
				current.notifySibling = null;
				current = next;
			}

			subTreeEnd[index] = w;
		}

		// Notify
		while (w > 0) {
			w -= 1;
			var item = items[w];

			if (item.branchListeners && notifyFlags[w] & item.notifyValueParent)
				for (var i = 0; i < item.branchListeners.length; i++)
					item.branchListeners[i](iterator);

			if (item.valueListeners && notifyFlags[w] & item.notifyValueItem)
				for (var i = 0; i < item.valueListeners.length; i++)
					item.valueListeners[i]();

			if (notifyFlags[w] & item.notifyPrune)
				item.pruneIfPossible();
		}

		// Calls the handler once for each selector with a modified value.
		function iterator(handler) {
			var end = subTreeEnd[w];
			for (var i = w; i < end; i++)
				if (notifyFlags[i] & item.notifyValueItem)
					if (handler(items[i].selector)) return;
		}
	}

	// Subclasses should implement these functions
	dataTree.savingDone = cn.ignore;		// activeLists: Array[List], newList: List, obsoleteLists: Array[List], mergedHashes: Array[Hash], revision: Int52 -->
	dataTree.savingFailed = cn.ignore;		// error: String -->

	function log() {
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
		dataTree.getOrCreate(dataTree.root).log("|");
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
	}

	this.checkStructure = function() {
		console.log('========================================================================');
		console.log('Items by selector hash table');

		for (var i = 0; i < lists.length; i++) lists[i].temp_count = 0;

		for (var selectorHex in itemsBySelector) {
			var item = itemsBySelector[selectorHex];
			console.log(selectorHex, item.valueList, item.revision, item.broomList, item.broom);
			if (item.valueList) item.valueList.temp_count += 1;
			if (item.broomList) item.broomList.temp_count += 1;
		}

		console.log('Lists');
		for (var i = 0; i < lists.length; i++) {
			console.log(lists[i].temp_count, lists[i].countInUse);
			if (lists[i].temp_count != lists[i].countInUse)
				console.log('WRONG USE COUNT', lists[i]);
		}

		console.log('========================================================================');
	}
}
