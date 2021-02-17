// *** Auto Saving ***
// Saving is started delay ms after a change, or after a currently ongoing save operation.
// If saving fails, it waits failedDelay ms until it retries.

cn.AutoSaving = function(delay, failedDelay) {
	var autoSaving = this;

	// State
	var hasChanges = false;
	var isSaving = false;
	var savedHandlers = [];
	var currentSavedHandlers = null;

	// Status events
	autoSaving.onChanged = cn.ignore;
	autoSaving.onSaving = cn.ignore;
	autoSaving.onSavingDone = cn.ignore;
	autoSaving.onSavingFailed = cn.ignore;

	// Call this whenever the data changed and needs to be saved.
	autoSaving.changed = function(handler) {
		if (handler) savedHandlers.push(handler);

		if (hasChanges) return;
		hasChanges = true;

		if (isSaving) return;
		isSaving = true;

		autoSaving.onChanged();
		setTimeout(autoSave, delay);
	};

	function autoSave() {
		dataTree.onSaving();
		hasChanges = false;
		var currentSavedHandler = savedHandlers;
		savedHandlers = [];
		autoSaving.onSave();
	}

	// Implement this to save the data
	autoSaving.onSave = function() { autoSaving.done(); };

	// Call this from onSave after the data has been saved.
	autoSaving.done = function() {
		if (! isSaving) return console.log('autoSaving.done called outside of a saving operation.');

		isSaving = false;
		for (var i = 0; i < currentSavedHandlers; i++)
			currentSavedHandlers[i]();
		autoSaving.onSavingDone();

		if (! hasChanges) return;
		isSaving = true;
		autoSaving.onChanged();
		setTimeout(autoSave, delay);
	};

	// Call this from onSave when saving failed.
	autoSaving.failed = function() {
		if (! isSaving) return console.log('autoSaving.failed called outside of a saving operation.');

		hasChanges = true;
		for (var i = 0; i < currentSavedHandlers; i++)
			savedHandlers.push(currentSavedHandlers[i]);

		autoSaving.onSavingFailed();
		setTimeout(autoSave, failedDelay);
	};

	// Returns true if a save operation is ongoing
	dataTree.isAutoSaving = function() { return isAutoSaving; };

	// Return true if there are changes that have not been been saved.
	dataTree.hasChanges = function() { return hasChanges || isAutoSaving; };
}
