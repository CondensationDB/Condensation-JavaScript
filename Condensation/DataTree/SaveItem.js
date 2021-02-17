// *** Temporary structure used to save a data tree list ***

function SaveItem(item, record) {
	this.item = item;
	this.revision = 0;
	this.broom = 0;
	this.record = record;
}

SaveItem.prototype.addBroom = function() {
	this.broom = this.item.broom;
	this.record.firstChild().setUnsigned(this.broom);
};

SaveItem.prototype.addValue = function() {
	this.revision = this.item.revision;
	this.record.firstChild().addUnsigned(this.revision).addRecords(this.item.record.children);
};

SaveItem.prototype.merged = function(list) {
	if (this.broom && this.item.broom == this.broom) this.item.setBroomList(list);
	if (this.revision && this.item.revision == this.revision) this.item.setValueList(list);
};
