// *** Data tree item ***
// An item is a temporary structure. Do not keep references to it, but use selectors to access data.

// TODO: Broom has disappeared.

// DataTree, Selector --> new
function Item(dataTree, selector) {
	this.dataTree = dataTree;
	this.selector = selector;

	// Listeners
	this.branchListeners = null;
	this.valueListeners = null;

	// Notification
	this.notifyFlags = 0;
	this.notifyChild = null;
	this.notifySibling = null;

	// Tree
	// Except for the root item, all items must have a parent, and must be linked in parent.firstChild.
	// countChildren must reflect the number of items links through firstChild.
	this.parent = null;
	this.countChildren = 0;
	this.firstChild = null;
	this.prevSibling = null;
	this.nextSibling = null;

	// List from which the newest broom was loaded
	// broom	broomList
	// no		no			This item has no broom. The broom from the parent item is used.
	// yes		no			Invalid state.
	// yes		changed		A broom has been set locally, but not saved yet.
	// yes		yes			A broom has been loaded from a list, or saved to a list.
	// no		yes			Invalid state.
	this.broomList = null;
	this.prevInBroomList = null;
	this.nextInBroomList = null;

	// List from which the newest revision of the data was loaded
	// revision	valueList
	// no		no			This item does not have a value.
	// yes		no			Invalid state.
	// yes		changes		The value has been changed locally, but not saved yet.
	// yes		yes			The value has been loaded from a list, or saved to a list.
	// no		yes			Invalid state.
	this.valueList = null;
	this.prevInValueList = null;
	this.nextInValueList = null;

	// Value (record with revision), record.children.length == 0 means no value
	// revision	value
	// no		no			This item does not have a value, and has never had a value since the T_broom. This is the default state of an item. This state is never saved to disk, and the item may be pruned from the tree.
	// yes		no			This item currently does not have a value, but might have had a value in the past. The value was deleted at T_revision.
	// yes		yes			This item currently has a value. It was last modified at T_revision.
	// no		yes			Invalid state.
	this.revision = 0;
	this.record = new cn.Record();

	// Broom, provided either by a local change, or a list
	this.broom = 0;

	// Effective broom, precalculated as max(broom, parent.effectiveBroom).
	// revision must either be bigger than effectiveBroom, or 0.
	this.effectiveBroom = 0;

	// Used temporarily when compiling the list of items to save
	this.saveItem = null;

	// Root items
	if (this.selector.parent == null) {
		this.parent = null;
		this.effectiveBroom = 0;
		return;
	}

	// Any other item
	this.parent = this.dataTree.getOrCreate(this.selector.parent);
	this.effectiveBroom = this.parent.effectiveBroom;

	// Add this item to the tree
	this.nextSibling = this.parent.firstChild;
	if (this.nextSibling != null) this.nextSibling.prevSibling = this;
	this.parent.firstChild = this;
	this.parent.countChildren += 1;

	// Mark it for pruning
	this.notify(this.notifyPrune);
}

// Notification

Item.prototype.notifyValueParent = 1;
Item.prototype.notifyValueItem = 2;
Item.prototype.notifyValue = Item.prototype.notifyValueItem | Item.prototype.notifyValueParent;
Item.prototype.notifyPrune = 4;
Item.prototype.notifyParentMask = Item.prototype.notifyValueParent | Item.prototype.notifyPrune;

Item.prototype.notify = function(notifyFlags) {
	if ((this.notifyFlags & notifyFlags) == notifyFlags) return;

	if (this.notifyFlags == 0) {
		this.dataTree.scheduleNotifier();

		if (parent) {
			this.notifySibling = this.parent.notifyChild;
			this.parent.notifyChild = this;
		}
	}

	this.notifyFlags |= notifyFlags;
	if (this.parent) this.parent.notify(notifyFlags & notifyParentMask);
};

// Item tree

Item.prototype.pruneIfPossible = function() {
	// Don't remove items with children
	if (this.firstChild) return;

	// Don't remove if the item has notifications or listeners
	if (this.notifyFlags) return;
	if (this.valueListeners.count() > 0) return;
	if (this.branchListeners.count() > 0) return;

	// Don't remove if the item a value or a broom
	if (this.revision > 0) return;
	if (this.broom > 0) return;

	// Don't remove the root item
	if (! this.parent) return;

	// Remove this from the tree
	if (this.prevSibling == null) this.parent.firstChild = this.nextSibling;
	else this.prevSibling.nextSibling = this.nextSibling;
	if (this.nextSibling != null) this.nextSibling.prevSibling = this.prevSibling;
	this.nextSibling = null;
	this.prevSibling = null;
	this.parent.countChildren -= 1;

	// Remove this from the datatree hash
	this.dataTree.remove(this.selector);
}

// Low-level list change

Item.prototype.setValueList = function(list) {
	this.removeValueList();
	this.valueList = list;
	this.nextInValueList = list.nextInValueList;
	this.prevInValueList = list;
	this.nextInValueList.prevInValueList = this;
	this.prevInValueList.nextInValueList = this;
	this.valueList.countInUse += 1;
}

Item.prototype.removeValueList = function() {
	if (this.valueList == null) return;
	this.nextInValueList.prevInValueList = this.prevInValueList;
	this.prevInValueList.nextInValueList = this.nextInValueList;
	this.prevInValueList = null;
	this.nextInValueList = null;
	this.valueList.countInUse -= 1;
	this.valueList = null;
}

Item.prototype.setBroomList = function(list) {
	this.removeBroomList();
	this.broomList = list;
	this.nextInBroomList = list.nextInBroomList;
	this.prevInBroomList = list;
	this.nextInBroomList.prevInBroomList = this;
	this.prevInBroomList.nextInBroomList = this;
	this.broomList.countInUse += 1;
}

Item.prototype.removeBroomList = function() {
	if (this.broomList == null) return;
	this.nextInBroomList.prevInBroomList = this.prevInBroomList;
	this.prevInBroomList.nextInBroomList = this.nextInBroomList;
	this.prevInBroomList = null;
	this.nextInBroomList = null;
	this.broomList.countInUse -= 1;
	this.broomList = null;
}

// Merge a value

// List, Int, cn.Record --> Boolean
Item.prototype.mergeValue = function(list, revision, record) {
	if (revision <= 0) return;
	if (revision < this.revision) return;
	if (revision < this.effectiveBroom) return;
	if (revision == this.revision && list.size < this.valueList.size) return;

	this.record = record;
	this.setValueList(list);

	if (revision == this.revision) return true;
	this.revision = revision;
	this.notify(this.notifyValue);
	//this.check();
	this.dataTree.onDataChanged();
	return true;
};

Item.prototype.forget = function() {
	if (this.revision <= 0) return;
	this.revision = 0;
	this.record = new Record();
	this.removeValueList();
	this.notify(this.notifyValue | this.notifyPrune);
	//this.check();
	this.dataTree.onDataChanged();
}

// Move a broom

// Uint64 --> Boolean
Item.prototype.moveBroom = function(broom) {
	if (broom <= this.effectiveBroom) return false;
	this.recursivelyMoveBroom(broom);
	this.broom = broom;
	this.setBroomList(this.dataTree.changes);
	this.dataTree.onDataChanged();
	//this.check();
	return true;
};

// Uint64 -->
Item.prototype.recursivelyMoveBroom = function(broom) {
	if (broom < this.effectiveBroom) return;
	this.effectiveBroom = broom;
	this.broom = 0;
	this.removeBroomList();

	if (this.revision < broom) {
		if (this.record.children.length) {
			this.revision = broom;
			this.setValueList(this.dataTree.changes);
		} else {
			this.revision = 0;
			this.removeValueList();
			this.notify(this.notifyPrune);
		}
		this.valueChanged();
	}

	//this.check();

	// Check all children
	for (var child = this.firstChild; child != null; child = child.nextSibling)
		child.recursivelyMoveBroom(broom);
};

// Merge a broom (e.g. from an existing list)

// List, broom -->
Item.prototype.mergeBroom = function(list, broom) {
	if (broom <= 0) return;
	if (broom < this.effectiveBroom) return;
	if (broom == this.broom) {
		if (list.size < this.broomList.size) return;
		this.setBroomList(list);
		return;
	}

	this.recursivelySetBroom(broom);
	this.broom = broom;
	this.setBroomList(list);
	this.dataTree.onDataChanged();
	return true;
};

Item.prototype.recursivelySetBroom = function(broom) {
	if (broom <= this.effectiveBroom) return;
	this.effectiveBroom = broom;
	this.broom = 0;
	this.removeBroomList();

	if (this.revision < broom) {
		this.revision = 0;
		this.record = new cn.Record();
		this.removeValueList();
		this.notify(this.notifyValue | this.notifyPrune);
	}

	// Check all children
	for (var child = this.firstChild; child != null; child = child.nextSibling)
		child.recursivelySetBroom(broom);
};

// Saving

Item.prototype.createSaveItem = function(saveItems) {
	if (this.saveItem) return this.saveItem;
	var record = this.parent ? this.parent.createSaveItem(saveItems).record.add(this.selector.label) : new cn.Record('#root#');
	record.add(cn.emptyBytes);
	this.saveItem = new SaveItem(this, record);
	saveItems.push(this.saveItem);
	return this.saveItem;
};

// General

// --> String
Item.prototype.toString = function() {
	var text = cn.hexFromBytes(this.selector.label);
	if (this.broom > 0) text += ' B' + this.broom;
	if (this.revision > 0) text += ' +' + (this.revision - this.effectiveBroom);
	text += ' [' + this.record.children.length + ']';
	return text;
}

// String -->
Item.prototype.log = function(prefix) {
	console.log('DataTree.Log', prefix + toString());
	var childPrefix = prefix + '  ';
	for (var child = this.firstChild; child != null; child = child.nextSibling)
		child.log(childPrefix);
}

Item.prototype.check = function() {
	var self = this;
	//console.log('|  broom ' + this.broom + '=>' + this.effectiveBroom + ' rev ' + (this.revision > 0 ? '+' + (this.revision - this.effectiveBroom) : '-') + ' sel ' + this.selector);
	if (! this.dataTree.get(this.selector))
		console.log('|	NOT IN HASH TABLE ' + toString());

	// Tree

	if (this.nextSibling != null && this.nextSibling.prevSibling != this)
		console.log('|	nextSibling ' + toString());

	if (this.prevSibling != null && this.prevSibling.nextSibling != this)
		console.log('|	prevSibling ' + toString());

	if (! isChild())
		console.log('|	NOT CHILD OF PARENT ' + toString());

	for (var child = this.firstChild; child != null; child = child.nextSibling)
		if (child.parent != this)
			console.log('|	CUCKOO CHILD ' + toString());

	// Broom

	if (parent != null && parent.effectiveBroom > this.effectiveBroom)
		console.log('|	BROOM < PARENT BROOM ' + toString());

	if (this.effectiveBroom < this.broom)
		console.log('|	EFFECTIVE BROOM ' + toString());

	if (this.broomList != null && this.broom == 0)
		console.log('|	LIST, BUT NO BROOM ' + toString());

	// Value

	var hasRevision = this.revision > 0;
	if (hasRevision && this.revision < this.effectiveBroom)
		console.log('|	REVISION < BROOM ' + toString());

	if (! hasRevision && this.valueList != null)
		console.log('|	LIST, BUT NO REVISION ' + toString());

	if (! hasRevision && this.record.children.length)
		console.log('|	HAS VALUES, BUT NO REVISION ' + toString());

	// --> Boolean
	function isChild() {
		if (self.parent == null) return true;
		for (var sibling = self.parent.firstChild; sibling != null; sibling = sibling.nextSibling)
			if (self == sibling) return true;
		return false;
	}
}
