// *** Value listeners ***

function ValueListeners() {
	this.listeners = [];
	this.notificationPending = false;
}

ValueListeners.prototype.count = function() { return this.listeners.length; };

ValueListeners.prototype.add = function(listener) {
	this.listeners.push(listener);
};

ValueListeners.prototype.remove = function(listener) {
	var index = this.listeners.indexOf(listener);
	if (index >= 0) this.listeners.splice(index, 1);
};

ValueListeners.prototype.notify = function() {
	var self = this;
	if (this.notificationPending) return false;
	this.notificationPending = true;
	setTimeout(notify, 100);
	return true;

	// This is executed after the notification control flow (rather than during), so that listeners don't see an inconsistent data state.
	function notify() {
		self.notificationPending = false;
		for (var i = 0; i < self.listeners.length; i++) self.listeners[i]();
	}
};
