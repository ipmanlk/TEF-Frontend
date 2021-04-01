class Request {
	static send(path, method, data = {}) {
		// this promise will never reject to prevent unhandled promise rejections
		return new Promise((resolve, reject) => {
			// options for sending http requests
			const options = {
				type: method,
				contentType: "application/json; charset=utf-8",
				url: `http://localhost:3000${path}`,
				data: data,
				dataType: "json",
			};

			// send json strings on POST, PUT & DELETE requests
			if (method == "POST" || method == "PUT") {
				options.data = JSON.stringify(data);
			}

			// don't send a body for delete reqeusts
			if (method == "DELETE") {
				delete options["data"];
				options["url"] += `?${jQuery.param(data)}`;
			}

			// create a new request with options
			const req = $.ajax(options);

			// when request is complete
			req.done((res) => {
				// if response doesn't have a status propery, ignore it
				if (res.status == undefined) return;

				// if response status is true, resovle the promoise
				if (res.status) {
					resolve(res);
				} else {
					// log the response
					console.log(res);

					// show error modal when status of the response is false (only works within the mainiFrame)
					try {
						let outputMsg;

						// when error is happening due to a user input
						if (res.type == "input") {
							outputMsg = `${res.msg}`;
							mainWindow.showOutputModal("Error", outputMsg, "sm");

							// if error is a server error or something else
						} else {
							outputMsg = `
                ${res.msg}<br><br>
                <h4>Log:</h4>
                <div class="well">
                  Route: ${options.url} <br><br>
                  Response: ${JSON.stringify(res)}
                </div>`;

							mainWindow.showOutputModal("Error", outputMsg, "lg");
						}

						// check if this is an authentication error (when logged out)
						if (res.type == "auth") {
							window.location = "noauth.html";
						}
					} catch (e) {
						// when error modal fails to display outside of mainIframe
						console.log(e);
						window.alert(e);
					}

					// resolve the promise with false status
					resolve({ status: false });
				}
			});

			// if request failed to complete
			req.fail((jqXHR, textStatus) => {
				// if no json response is recived, ignore it
				if (jqXHR.responseJSON == undefined) return;

				// show error modal
				try {
					mainWindow.showOutputModal("Error", jqXHR.responseJSON.msg);

					// check if this is an authentication error (when logged out or session empty)
					if (jqXHR.responseJSON.type == "auth") {
						window.location = "noauth.html";
					}
				} catch (e) {
					// if no error msg is present to show, just show a generic error modal
					console.log(e);
					window.alert(
						"Error",
						`Unable to retrive data from the server: ${textStatus}`
					);
				}

				// resolve the promise with false status
				resolve({ status: false });
			});
		});
	}
}
