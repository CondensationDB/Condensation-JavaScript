function Listeners() {
	var listeners = [];

	this.count = function() { return listeners.length; };

	this.add = function(listener) {
		listeners.push(listener);
	};

	this.remove = function(listener) {
		var index = listeners.indexOf(listener);
		if (index >= 0) listeners.splice(index, 1);
	};

	this.notify = function(object) {
		for (var i = 0; i < listeners.length; i++) listeners[i](object);
	};
}
