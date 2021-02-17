// TODO: This has been replaced by Transfer(keyPair: KeyPair, hashes: Array[Hash], source: Store, destination: Store, done: Done), and KeyPair.transfer(...).

// cn.HTTPStore, Identity, cn.CommitPool, Hash --> Done
cn.putTree = function(store, identity, commitPool, tree) {
	var done = {}
	done.onDone = cn.ignore;	// Array[HashAndObject] -->
	done.onFailed = cn.ignore;	// -->

	var uploads = {};
	var hasError = false;

	var included = [];
	for (var hashHex in commitPool.objects)
		included.push(commitPool.objects[hashHex]);

	var taskGroup = new cn.TaskGroup();
	put(tree, taskGroup);
	taskGroup.then(function() {
		if (hasError) return;
		done.onDone(included);
	});

	// Hash, cn.TaskGroup -->
	function put(hash, taskGroup) {
		if (hasError) return;
		if (hash == null) return;

		// Get the item
		var hashAndObject = commitPool.objects[hash.hex()];
		if (hashAndObject == null) return;

		// Add the taskGroup to an existing upload
		var upload = uploads[hash.hex()];
		if (upload != null) {
			upload.addTaskGroup(taskGroup);
			return;
		}

		// Create a new upload
		var newUpload = new Upload(hashAndObject);
		uploads[hashAndObject.hash.hex()] = newUpload;
		newUpload.addTaskGroup(taskGroup);
		newUpload.upload();
	}

	function fail() {
		if (hasError) return;
		hasError = true;
		done.onFailed();
	}

	// cn.HashAndObject --> new
	function Upload(hashAndObject) {
		// All task groups waiting for this item to be uploads
		var taskGroups = [];
		var done = false;

		// cn.TaskGroup -->
		this.addTaskGroup = function(taskGroup) {
			if (done) return;
			taskGroups.push(taskGroup);
			taskGroup.await();
		}

		this.upload = function() {
			// Upload all children
			var childTaskGroup = new cn.TaskGroup();
			for (var i = 0; i < hashAndObject.object.hashesCount; i++)
				put(hashAndObject.object.hashAtIndex(i), childTaskGroup);
			childTaskGroup.then(onTaskGroupDone);
		}

		function onTaskGroupDone() {
			// Upload this object
			if (hasError) return;
			var putDone = store.put(hashAndObject.hash, hashAndObject.object, identity, onPutDone, onPutFailed);

			putDone.onDone = function() {
				done = true;
				for (var i = 0; i < taskGroups.length; i++)
					taskGroups[i].done();
				taskGroups = [];
			};

			putDone.onFailed = function(error) {
				done = true;
				fail();
			};
		}
	}

	return done;
}
