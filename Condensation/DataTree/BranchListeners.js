// *** Branch listeners ***

function BranchListeners() {
	this.listeners = [];
	this.changes = null;
}

BranchListeners.prototype.count = function() { return this.listeners.length; };

BranchListeners.prototype.add = function(listener) {
	this.listeners.push(listener);
};

BranchListeners.prototype.remove = function(listener) {
	var index = this.listeners.indexOf(listener);
	if (index >= 0) this.listeners.splice(index, 1);
};

BranchListeners.prototype.notify = function(selector) {
	var self = this;
	if (this.listeners.length < 1) return;
	if (! this.changes) { this.changes = {}; setTimeout(notify, 100); }
	this.changes[selector.id] = selector;

	// This is executed after the notification control flow (rather than during), so that listeners don't see an inconsistent data state.
	function notify() {
		var selectors = [];
		for (var id in self.changes) selectors.push(self.changes[id]);
		self.changes = null;
		for (var i = 0; i < self.listeners.length; i++) self.listeners[i](selectors);
	}
};
