cn.AwaitCounter = function() {
	// The handler when we are done
	var awaitCounter = this;
	var doneHandler = null;

	// The amount of tasks we are waiting for
	var count = 0;

	// Expect one more. This must be called before then().
	awaitCounter.await = function() {
		if (count == 0 && doneHandler) throw new Error('TaskGroup.await() called after the "then" function has been executed.');
		count += 1;
		return taskGroup.done;
	};

	// Handle the completion of one task.
	awaitCounter.done = function() {
		count -= 1;
		if (count < 0)
			throw new Error('TaskGroup received too many done calls.');
		if (count == 0 && doneHandler) setTimeout(doneHandler, 0);
	};

	// Execute this as soon as all tasks are done.
	// Function -->
	awaitCounter.then = function(handler) {
		doneHandler = handler;
		if (count == 0) setTimeout(doneHandler, 0);
	};
}

// A handler to ignore a callback.
cn.ignore = function() {
	// console.log('Callback ignored.', arguments);
	// console.trace();
};
