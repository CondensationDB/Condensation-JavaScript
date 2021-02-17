// *** Condensation store via HTTP or HTTPS ***
// "internalUrl" is used to access the store, while "url" denotes the original store URL. These are often the same, but the store resolver may modify the original URL to replace http by https for instance.

// TODO: These functions should take a KeyPair, not an Identity.
// TODO: There is no internal URL any more. More precisely, the url disappears, and the internalUrl becomes the url. Stores do not carry a name (in the form of a URL) any more. If this is desired, the application has to label its stores.

// String, String --> new
cn.HTTPStore = function(url, internalUrl) {
	var store = this;
	store.url = url;
	store.internalUrl = internalUrl;

	// Extract the base path used in the signature
	var hostAndPath =
		internalUrl.substr(0, 7) == 'http://' ? internalUrl.substr(7) :
		internalUrl.substr(0, 8) == 'https://' ? internalUrl.substr(8) : internalUrl;

	// The object store uses:
	// + browser cache, because HTTP requests will be cached automatically (the server adds corresponding HTTP fields)
	// - local storage, because it is limited in size to 5 MB approximately, and we have more important stuff to store there
	// - filesystem API: not yet, because it is only supported by Chrome for now (as of 2013)

	// Retrieves an object from the store. May call onProgress(done, total) with the downloaded bytes and the total bytes (if available) several times. Calls onDone(bytes) with the retrieved bytes upon success, onNotFound() if the object does not exist, or onFailed(httpResponseCode) upon failure. If httpResponseCode is undefined, an error occurred before a response code was received.
	// Hash --> Done
	store.get = function(hash) {
		// Prepare the done handler
		var done = {};
		done.onProgress = cn.ignore;		// done: Uint, total: Uint -->
		done.onDone = cn.ignore;			// bytes: UintArray -->
		done.onNotFound = cn.ignore;		// -->
		done.onFailed = cn.ignore;			// httpResponseCode: Uint? -->

		// Prepare a request
		var request = new XMLHttpRequest();

		// Monitor progress
		request.onprogress = function(event) { done.onProgress(event.loaded, event.total); };

		// Handle completion
		request.onload = function(event) {
			if (request.status == 200 || request.status == 204) done.onDone(new Uint8Array(request.response));
			else if (request.status == 404) done.onNotFound();
			else done.onFailed(request.status);
		};

		request.onabort = function(event) { done.onFailed(request.status); };
		request.onerror = function(event) { done.onFailed(request.status); };

		// Send the request
		request.open('GET', internalUrl + '/objects/' + hash.hex(), true);
		request.responseType = 'arraybuffer';
		request.send();
		return done;
	};

	// Sends an object to the store. May call onProgress(done, total) with the uploaded bytes and the total bytes several times. Calls onDone() upon success, or onFailed(httpResponseCode) if an error occurred. httpResponseCode is 1 if no connection could be established, or if no response code was received.
	// Hash, CondensationObject, Identity --> Done
	store.put = function(hash, object, identity) {
		// Prepare the done handler
		var done = {};
		done.onProgress = cn.ignore;	// Uint, Uint -->
		done.onDone = cn.ignore;		// -->
		done.onFailed = cn.ignore;		// Uint? -->

		// Create a request
		var request = new XMLHttpRequest();

		// Monitor progress
		if (request.upload) {
			request.upload.onprogress = function(event) {
				var uploaded = event.position || event.loaded;
				var total = event.totalSize || event.total;
				done.onProgress(uploaded, total);
			};
		}

		// Handle completion
		request.onload = function(event) {
			if (request.status == 200 || request.status == 204) done.onDone();
			else done.onFailed(request.status);
		};

		request.onerror = function(event) { done.onFailed(request.status); };
		request.onabort = function(event) { done.onFailed(request.status); };

		// Signature (disabled, since it's quite expensive to sign each object put request, we only sign modify requests for now)
		//var signedDate = new Date().toISOString();
		//var hashToSign = cn.hashForBytes(cn.bytesFromText(signedDate + '\0PUT\0' + hostAndPath));
		//var signature = identity.signHash(hashToSign);

		// Send
		request.open('PUT', internalUrl + '/objects/' + hash.hex(), true);
		//request.setRequestHeader('Condensation-Date', signedDate);
		//request.setRequestHeader('Condensation-Identity', identity.hash.hex());
		//request.setRequestHeader('Condensation-Signature', cn.hexFromBytes(signature));
		request.setRequestHeader('Content-Type', 'application/condensation-object');
		request.send(new Blob([object.header, object.data], {type: 'application/condensation-object'}));
		return done;
	};

	// Books an object on the store. Calls onDone() upon success, onNotFound() if the object does not exist on the store, or onFailed(httpResponseCode) if an error occurred. httpResponseCode is 1 if no connection could be established, or if no response code was received.
	// Hash, CondensationObject, Identity --> Done
	store.book = function(hash, object, identity) {
		// Prepare the done handler
		var done = {};
		done.onDone = cn.ignore;		// -->
		done.onNotFound = cn.ignore;	// -->
		done.onFailed = cn.ignore;		// Uint? -->

		// Create a request
		var request = new XMLHttpRequest();

		// Handle completion
		request.onload = function(event) {
			if (request.status == 200 || request.status == 204) done.onDone();
			if (request.status == 404) done.onFailed();
			else done.onFailed(request.status);
		};

		request.onerror = function(event) { done.onFailed(request.status); };
		request.onabort = function(event) { done.onFailed(request.status); };

		// Signature (disabled, since it's quite expensive to sign each object post request, we only sign modify requests for now)
		//var signedDate = new Date().toISOString();
		//var hashToSign = cn.hashForBytes(cn.bytesFromText(signedDate + '\0POST\0' + hostAndPath));
		//var signature = identity.signHash(hashToSign);

		// Send
		request.open('POST', internalUrl + '/objects/' + hash.hex(), true);
		//request.setRequestHeader('Condensation-Date', signedDate);
		//request.setRequestHeader('Condensation-Identity', identity.hash.hex());
		//request.setRequestHeader('Condensation-Signature', cn.hexFromBytes(signature));
		request.send();
		return done;
	};

	// Lists the specified box. If the call is successful, onDone(boxEntries) is called. The list of box entries may be empty. If there is a server error, onDone(null, httpReponseCode) is called with the HTTP response returned by the server.
	// Hash, String --> Done
	store.list = function(accountHash, boxLabel) {
		// Prepare the done handler
		var done = {};
		done.onDone = cn.ignore;			// boxEntries: Array[cn.BoxEntry] -->
		done.onFailed = cn.ignore;			// httpResponseCode: Uint? -->

		// Create a request
		var request = new XMLHttpRequest();

		// Handle completion
		request.onload = function(event) {
			if (request.status != 200 && request.status != 204) return done.onFailed(request.status);

			var boxEntries = [];
			var lines = request.responseText.split(/[\n\r]+/);
			for (var i = 0; i < lines.length; i++) {
				var boxEntry = cn.boxEntryFromObjectUrl(lines[i]);
				if (boxEntry) boxEntries.push(boxEntry);
			}
			done.onDone(boxEntries);
		};

		// Handle errors
		request.onabort = function(event) { done.onFailed(request.status); };
		request.onerror = function(event) { done.onFailed(request.status); };

		// Send
		request.open('GET', internalUrl + '/accounts/' + accountHash.hex() + '/' + boxLabel, true);
		request.send();
		return done;
	};

	// Modifies new object URLs on the specified box, and request removal of hashes. Upon success, onDone() is called. If an error occurred, onDone(httpReponseCode) is called.
	// Array[BoxAddition], Array[BoxRemoval], Identity -->
	store.modify = function(additions, removals, identity) {
		// Prepare the done handler
		var done = {};
		done.onDone = cn.ignore;			// boxEntries: Array[cn.BoxEntry] -->
		done.onFailed = cn.ignore;			// httpResponseCode: Uint? -->

		// Create a request
		var request = new XMLHttpRequest();
		request.onload = function(event) {
			if (request.status == 200 || request.status == 204) done.onDone();
			else done.onFailed(request.status);
		};

		request.onabort = function(event) { done.onFailed(request.status); };
		request.onerror = function(event) { done.onFailed(request.status); };

		// Compile the operations
		var operations = '';
		var lastAccountHash = null;
		var lastBoxLabel = '';
		var lastBoxEntry = '';
		var lastHash = null;

		for (var i = 0; i < additions.length; i++) {
			var item = additions[i];
			operations += '+';
			if (lastAccountHash == null || ! cn.equalHashes(lastAccountHash, item.accountHash)) operations += item.accountHash.hex();
			operations += '/';
			if (lastBoxLabel != item.boxLabel) operations += item.boxLabel;
			operations += '/';
			var boxEntry = item.boxEntry.url();
			if (lastBoxEntry != boxEntry) operations += boxEntry;
			operations += '\n';
			lastAccountHash = item.accountHash;
			lastBoxLabel = item.boxLabel;
			lastBoxEntry = boxEntry;
			lastHash = item.boxEntry.hash;
		}

		for (var i = 0; i < removals.length; i++) {
			var item = removals[i];
			operations += '-';
			if (lastAccountHash == null || ! cn.equalHashes(lastAccountHash, item.accountHash)) operations += item.accountHash.hex();
			operations += '/';
			if (lastBoxLabel != item.boxLabel) operations += item.boxLabel;
			operations += '/';
			if (! cn.equalHashes(lastHash, item.hash)) operations += item.hash.hex();
			operations += '\n';
			lastAccountHash = item.accountHash;
			lastBoxLabel = item.boxLabel;
			lastBoxEntry = '';
			lastHash = item.hash;
		}

		// Signature
		var signedDate = new Date().toISOString();
		var hashToSign = cn.hashForBytes(cn.bytesFromText(signedDate + '\0POST\0' + hostAndPath + '\0' + operations));
		var signature = identity.signHash(hashToSign);

		// Send the operations
		request.open('POST', internalUrl + '/accounts', true);
		request.setRequestHeader('Condensation-Date', signedDate);
		request.setRequestHeader('Condensation-Identity', identity.hash.hex());
		request.setRequestHeader('Condensation-Signature', cn.hexFromBytes(signature));
		request.setRequestHeader('Content-Type', 'application/condensation-box-modifications');
		request.send(operations);
		return done;
	};
};
