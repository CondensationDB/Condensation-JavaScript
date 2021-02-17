// *** Data tree selector ***
// Selectors provide access to the items of a data tree. The root selector is dataTree.root.

// DataTree, Selector?, Uint8Array --> new
function Selector(dataTree, parent, label) {
	this.dataTree = dataTree;
	this.parent = parent;
	this.label = label;
	this.id = parent ? parent.id + '/' + cn.hexFromBytes(label) : 'ROOT';
}

// Returns a selector for a single child.
// --> String
Selector.prototype.labelAsText = function() {
	return cn.textFromBytes(this.label);
};

// Returns a selector for a single child.
// Uint8Array --> Selector
Selector.prototype.child = function(label) {
	return new Selector(this.dataTree, this, label);
};

// Returns a selector for a single child.
// String --> Selector
Selector.prototype.childWithText = function(label) {
	return new Selector(this.dataTree, this, cn.bytesFromText(label));
};

// Returns a selector for each known child.
// --> Array[Selector]
Selector.prototype.children = function() {
	var children = [];
	var item = this.dataTree.get(this);
	if (item == null) return children;
	for (var child = item.firstChild; child != null; child = child.nextSibling)
		children.push(child.selector);
	return children;
};

// Subscribe for value changes
Selector.prototype.trackValue = function(listener) {
	var item = this.dataTree.getOrCreate(this);
	if (! item.valueListeners) item.valueListeners = [];
	item.valueListeners.push(listener);
};

Selector.prototype.untrackValue = function(listener) {
	var item = this.dataTree.get(this);
	if (! item) return;
	if (! item.valueListeners) return;
	var index = item.valueListeners.indexOf(listener);
	if (index < 0) return;
	item.valueListeners.splice(index, 1);
	if (item.valueListeners.length) return;
	item.valueListeners = null;
	item.notify(item.notifyPrune);
};

// Subscribe for changes in this node, or any descendants
Selector.prototype.trackBranch = function(listener) {
	var item = this.dataTree.getOrCreate(this);
	if (! item.branchListeners) item.branchListeners = [];
	item.branchListeners.push(listener);
};

Selector.prototype.untrackBranch = function(listener) {
	var item = this.dataTree.get(this);
	if (! item) return;
	if (! item.branchListeners) return;
	var index = item.branchListeners.indexOf(listener);
	if (index < 0) return;
	item.branchListeners.splice(index, 1);
	if (item.branchListeners.length) return;
	item.branchListeners = null;
	item.notify(item.notifyPrune);
};

// Value

// Returns the revision.
// --> Number
Selector.prototype.revision = function() {
	var item = this.dataTree.get(this);
	return item ? item.revision : 0;
};

// Returns whether a value is set.
// --> Boolean
Selector.prototype.isSet = function() {
	var item = this.dataTree.get(this);
	return item && item.record.children.length ? true : false;
}

// Returns the value (record) of the node. The record remains owned by the node. Do not make any changes.
// --> cn.Record
Selector.prototype.record = function() {
	var item = this.dataTree.get(this);
	return item ? item.record : new cn.Record();
};

// Sets a new value. After calling this, the record is owned by the node and must not be modified or reused elsewhere.
// cn.Record -->
Selector.prototype.update = function(value) {
	var item = this.dataTree.getOrCreate(this);
	item.mergeValue(this.dataTree.changes, Math.max(new Date().getTime(), item.revision + 1), value);
};

// Sets a new value in case the revision is newer. After calling this, the record is owned by the node and must not be modified or reused elsewhere.
// Int, cn.Record -->
Selector.prototype.merge = function(revision, value) {
	var item = this.dataTree.getOrCreate(this);
	item.mergeValue(this.dataTree.changes, revision, value);
};

// Clears the value.
// -->
Selector.prototype.clear = function() {
	this.update(new cn.Record());
};

// Clears the value in the past, e.g. with a revision just bigger than the current revision.
// -->
Selector.prototype.clearInThePast = function() {
	if (this.isSet()) this.merge(this.revision() + 1, new cn.Record());
};

// Forgets the value.
Selector.prototype.forget = function() {
	var item = this.dataTree.get(this);
	if (! item) return;
	item.forget();
}

// Broom

// Returns the broom set at this node.
// --> Number
Selector.prototype.broom = function() {
	var item = this.dataTree.get(this);
	return item ? item.broom : 0;
};

// Moves the broom to a specific value.
// Number --> Boolean
Selector.prototype.moveBroom = function(broom) {
	var item = this.dataTree.get(this);
	if (item == null) return false;
	if (! item.moveBroom(broom)) return false;
	return true;
};

// Moves the broom to the head of the window, unless it is within the window already.
// Number, Number --> Boolean
Selector.prototype.moveBroomIntoWindow = function(from, to) {
	var item = this.dataTree.get(this);
	if (item == null) return false;
	if (item.effectiveBroom > from) return false;
	if (! item.moveBroom(to)) return false;
	return true;
};

// *** Convenience methods (simple interface)

// --> Record
Selector.prototype.firstValue = function() {
	var item = this.dataTree.get(this);
	return item == null || item.record.children.length <= 0 ? new cn.Record() : item.record.firstChild();
};

Selector.prototype.bytesValue = function() { return this.firstValue().bytes; };
Selector.prototype.hashValue = function() { return this.firstValue().hash; };
Selector.prototype.textValue = function() { return this.firstValue().asText(); };
Selector.prototype.booleanValue = function() { return this.firstValue().asBoolean(); };
Selector.prototype.integerValue = function() { return this.firstValue().asInteger(); };
Selector.prototype.unsignedValue = function() { return this.firstValue().asUnsigned(); };
Selector.prototype.referenceValue = function() { return this.firstValue().asReference(); };

// Sets a new value unless the node has that value already.
// Uint8Array, Hash? -->
Selector.prototype.set = function(bytes, hash) {
	var item = this.dataTree.getOrCreate(this);

	var count = item.record.children.length;
	if (count == 0) {
		if (bytes.byteLength == 0 && hash == null) return;
	} else if (count == 1) {
		var valueRecord = item.record.firstChild();
		if (cn.equalBytes(valueRecord.bytes, bytes) && cn.equalHashes(valueRecord.hash, hash)) return;
	}

	var value = new cn.Record();
	value.add(bytes, hash);
	this.update(value);
};

Selector.prototype.setBytes = function(value, hash) { this.set(value, hash); };
Selector.prototype.setHash = function(hash) { this.set(cn.emptyBytes, hash); };
Selector.prototype.setText = function(value, hash) { this.set(cn.bytesFromText(value), hash); };
Selector.prototype.setBoolean = function(value, hash) { this.set(cn.bytesFromBoolean(value), hash); };
Selector.prototype.setInteger = function(value, hash) { this.set(cn.bytesFromInteger(value), hash); };
Selector.prototype.setUnsigned = function(value, hash) { this.set(cn.bytesFromUnsigned(value), hash); };
Selector.prototype.setReference = function(reference) { this.set(reference.key, reference.hash); };

// Tracking of merged hashes

// Hash -->
Selector.prototype.addMergedHash = function(hash) {
	this.dataTree.mergedHashes.add(hash);
}

// Comparison

// Selector, Selector --> Boolean
cn.equalSelectors = function(a, b) {
	return a.id == b.id;
}

// Selector, Selector --> ComparisonResult
cn.compareSelectors = function(a, b) {
	return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
