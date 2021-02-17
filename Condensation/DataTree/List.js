// *** List of a data tree ***

// Reference, Uint --> List
function List(reference, size) {
	this.reference = reference;
	this.size = size;
	this.countInUse = 0;

	// Ring of items that have the broom from this list
	this.nextInBroomList = this;
	this.prevInBroomList = this;

	// Ring of items that have the value from this list
	this.nextInValueList = this;
	this.prevInValueList = this;

	// Used temporarily when compiling the list of items to save
	this.saveSelected = false;
}

function ChangesList() {
	this.size = 0;
	this.countInUse = 0;

	// Ring of items that have the broom from this list
	this.nextInBroomList = this;
	this.prevInBroomList = this;

	// Ring of items that have the value from this list
	this.nextInValueList = this;
	this.prevInValueList = this;
}
