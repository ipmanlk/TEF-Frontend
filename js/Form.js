class Form {
	constructor(
		formId,
		formTitle,
		permission,
		validationInfoObject = {},
		dropdownInfoArray = [],
		actionBinderObject = {}
	) {
		this.formId = formId;
		this.formTitle = formTitle;
		this.dropdownIds = [];
		this.dropdownInfoArray = dropdownInfoArray;
		this.selectedEntry = undefined;
		this.permission = permission;
		this.validationInfoObject = validationInfoObject;

		// provide freedback when user interact with form elements
		validationInfoObject.forEach((vi) => {
			$(`#${formId} #${vi.attribute}`).on("keyup change", () => {
				this.validateElementValue(vi);
			});
		});

		// load form dropdowns
		dropdownInfoArray.forEach((di) => {
			// get dropdown data using get request
			Request.send(di.route, "GET").then((res) => {
				// remove current html inside each dropbdorpdownox
				$(`#${this.formId} #${di.id}`).empty();

				// add each entry to relavent dorpdown
				res.data.forEach((entry) => {
					$(`#${this.formId} #${di.id}`).append(
						`<option value="${entry.id}">${entry.name}</option>`
					);
				});

				// save dorpdown id for later use
				this.dropdownIds.push(di.id);
			});
		});

		// check permissions
		if (permission[0] == 0) {
			$(`#${formId} .btnFmAdd`).hide();
		}

		if (permission[2] == 0) {
			$(`#${formId} .btnFmUpdate`).hide();
		}

		if (permission[3] == 0) {
			$(`#${formId} .btnFmDelete`).hide();
		}

		// set event listeners
		// events: form
		$(`#${formId}`).on("submit", (e) => e.preventDefault());

		// events: buttons
		$(`#${formId} .btnFmAdd`).on("click", () => {
			actionBinderObject.addEntry.call(this);
		});

		$(`#${formId} .btnFmUpdate`).on("click", () => {
			actionBinderObject.updateEntry.call(this);
		});

		$(`#${formId} .btnFmDelete`).on("click", () => {
			actionBinderObject.deleteEntry.call(this, this.selectedEntry.id);
		});

		$(`#${formId} .btnFmReset`).on("click", () => {
			this.reset.call(this);
		});

		$(`#${formId} .btnFmPrint`).on("click", () => {
			this.print.call(this);
		});

		this.loadAddons();
	}

	loadAddons() {}

	validateElementValue(elementValidationInfo) {
		// create selector name for ui element id
		const selector = `#${this.formId} #${elementValidationInfo.attribute}`;

		// get value of element id
		const value = $(selector).val();

		// create RegExp object from regex string
		const regex = new RegExp(elementValidationInfo.regex);

		// if value is optional and not set, ignore
		if (elementValidationInfo.optional && value.trim() == "") {
			$(selector).parent().removeClass("has-error has-success");
			$(selector).parent().children("span").remove();
			return true;
		}

		// check form values with each regex
		if (!regex.test(value)) {
			$(selector).parent().removeClass("has-success");
			$(selector).parent().addClass("has-error");
			$(selector).parent().children("span").remove();
			$(selector)
				.parent()
				.append(
					`<span class="glyphicon glyphicon-remove form-control-feedback"></span>`
				);
			return false;
		} else {
			$(selector).parent().removeClass("has-error");
			$(selector).parent().addClass("has-success");
			$(selector).parent().children("span").remove();
			$(selector)
				.parent()
				.append(
					`<span class="glyphicon glyphicon-ok form-control-feedback"></span>`
				);
			return true;
		}
	}

	print() {
		let table = `<table class="table table-striped">
      <tr><td colspan="2"><h3>${this.formTitle}</h3></tr>`;
		$(`#${this.formId} label`).each((i, el) => {
			// ignore hidden elements
			if ($(el).parent().is(":hidden")) return;

			let type;
			let label, data;

			const firstChild = $(el);
			let secondChild = $(el).next();

			// fix for required input labels
			if (
				secondChild.prop("nodeName") == "SPAN" &&
				secondChild.text().trim() == "*"
			) {
				secondChild = $(el).next().next();
			}

			if (secondChild.prop("nodeName") == "INPUT") {
				type = "text";
				label = firstChild.text();
				data = secondChild.val();
			}

			if ($(secondChild).prop("nodeName") == "SELECT") {
				type = "text";
				label = firstChild.text();
				data = $(`#${secondChild.attr("id")} option:selected`).text();
			}

			if ($(secondChild).prop("nodeName") == "IMG") {
				type = "image";
				label = firstChild.text();
				data = `<img src="${secondChild.attr("src")}" width="100px"></img>`;
			}

			if (!type) return;

			// fix for empty data items
			if (data.trim() == "") data = "Not Provided";

			table += `<tr>
                      <td style="width:30%">${label.replace("*", "")}</td>
                      <td>${data}</td>
                  <tr>`;
		});

		table += "</table>";

		// create new window and print the table
		const stylesheet =
			"http://localhost:3000/lib/bootstrap/css/bootstrap.min.css";
		const win = window.open("", "Print", "width=1000,height=600");
		win.document.write(
			`<html><head><link rel="stylesheet" href="${stylesheet}"></head><body>${table}</body></html>`
		);
		setTimeout(() => {
			win.document.close();
			win.print();
			win.close();
		}, 500);
	}

	reset() {
		$(`#${this.formId}`).trigger("reset");
		$(`#${this.formId} .form-group`).removeClass("has-error has-success");
		$(`#${this.formId} .form-group`)
			.children(".form-control-feedback")
			.remove();
		$(`#${this.formId} .photo-input`).attr("src", "../../img/placeholder.png");
		this.selectedEntry = undefined;

		this.setButtionsVisibility("add");

		this.disableReadOnly();
	}

	enableReadOnly() {
		$(`#${this.formId} .form-group`).removeClass("has-error has-success");
		$(`#${this.formId} .form-group`)
			.children(".form-control-feedback")
			.remove();
		$(`#${this.formId} .form-group`).addClass("read-only no-outline");
		this.setButtionsVisibility("view");
	}

	disableReadOnly() {
		console.log("readonly disabled");
		$(`#${this.formId} .form-group`).removeClass("read-only no-outline");
	}

	// load entry from database to the form
	loadEntry(entry) {
		this.reset();
		this.selectedEntry = entry;

		// load entry values to form
		Object.keys(entry).forEach((key) => {
			// ignore dropdown values
			if (this.dropdownIds.indexOf(key) !== -1) return;

			// set value in the form input
			$(`#${this.formId} #${key}`).val(entry[key]);
		});

		// select dropdown values
		this.dropdownIds.forEach((dropdownId) => {
			this.selectDropdownOptionByValue(dropdownId, entry[dropdownId]);
		});

		this.setButtionsVisibility("edit");

		// show, hide delete buttion based on status field
		const statusFields = this.dropdownInfoArray.filter((di) => di.statusField);

		if (statusFields.length == 1) {
			const dropdownId = statusFields[0].id;
			if (
				$(`#${this.formId} #${dropdownId} option:selected`).text() == "Deleted"
			) {
				this.hideElement(".btnFmDelete");
			}
		}
	}

	// show suitable buttions for view / edit / add
	setButtionsVisibility(action) {
		switch (action) {
			case "view":
				this.hideElement(".btnFmAdd");
				this.hideElement(".btnFmUpdate");
				this.hideElement(".btnFmDelete");
				this.hideElement(".btnFmReset");
				this.showElement(".btnFmPrint");
				break;

			case "edit":
				this.hideElement(".btnFmAdd");
				this.hideElement(".btnFmPrint");
				if (this.permission[2] !== 0) this.showElement(".btnFmUpdate");
				if (this.permission[3] !== 0) this.showElement(".btnFmDelete");
				this.showElement(".btnFmReset");
				break;

			case "add":
				this.hideElement(".btnFmUpdate");
				this.hideElement(".btnFmDelete");
				this.hideElement(".btnFmPrint");
				if (this.permission[0] !== 0) this.showElement(".btnFmAdd");
				this.showElement(".btnFmReset");
				break;
		}
	}

	// hide an element placed within the form
	hideElement(selector) {
		$(`#${this.formId} ${selector}`).hide();
	}

	// show an element placed within the form
	showElement(selector) {
		$(`#${this.formId} ${selector}`).show();
	}

	// check if form is valid. returns an object with status & data
	async validateForm() {
		let errors = "";
		const entry = {};

		// Loop through validation info items (vi) and check it's value using regexes
		for (let vi of this.validationInfoObject) {
			// element id is equal to database attribute name
			const elementId = vi.attribute;

			// validation status of the form
			let isValid = false;

			// get jquery object for element with current id
			const element = $(`#${this.formId} #${elementId}`);

			// handle file uploads (base64)
			if (element.attr("type") == "file") {
				// when file is selected
				if (element.prop("files")[0]) {
					try {
						entry[elementId] = await MiscUtil.getBase64FromFile(
							element.prop("files")[0]
						);
						isValid = this.validateElementValue(vi);
					} catch (error) {
						console.log("Base64 from file error", error);
					}

					// if file is not set, check if selected entry (editing entry) has one
				} else if (
					this.selectedEntry !== undefined &&
					this.selectedEntry[elementId]
				) {
					entry[elementId] = false; // set false to mark it as not changed
					isValid = true;
				} else {
					isValid = this.validateElementValue(vi);
				}
			} else {
				isValid = this.validateElementValue(vi);
			}

			// check for errors and add to entry object
			if (!isValid) {
				errors += `${vi.error}<br/>`;
			} else {
				// ignore if input is a file (base64 is already set above)
				if (element.attr("type") == "file") continue;

				try {
					// set values for entry object
					if (Array.isArray(element.val())) {
						// multiselect value is an array
						entry[elementId] = element.val();
					} else {
						entry[elementId] =
							element.val().trim() == "" ? null : element.val();
					}
				} catch (e) {
					console.log(`Element Id: ${elementId}`, e);
				}
			}
		}

		// if there aren't any errors
		if (errors == "") {
			return {
				status: true,
				data: entry,
			};
		}

		// if there are errors
		return {
			status: false,
			data: errors,
		};
	}

	// check if form data has changed compared to selected entry. returns a boolean
	async hasDataChanged() {
		const { status, data } = await this.validateForm();

		// if there are errors
		if (!status) {
			throw `Validate form returned errors! ${data}`;
		}

		// new entry object
		let newEntryObj = data;
		const selectedEntry = this.selectedEntry;

		// check if any of the data in entry has changed
		let dataHasChanged = false;

		for (let key in newEntryObj) {
			const isFileInput = $(`#${this.formId} #${key}`).attr("type") == "file";

			// when file hasn't changed
			if (
				isFileInput &&
				newEntryObj[key] == false &&
				this.selectedEntry[key] !== false
			) {
				console.log("File hasn't changed: ", key);
				continue;
			}

			// compare selected entry and edited entry values
			try {
				// if selected entry has null values, change them to empty strings
				selectedEntry[key] =
					selectedEntry[key] == null ? "" : selectedEntry[key];
				// if new entry obj has null values, change them to empty strings
				newEntryObj[key] = newEntryObj[key] == null ? "" : newEntryObj[key];
				// compare values in objects
				if (newEntryObj[key] !== selectedEntry[key].toString()) {
					dataHasChanged = true;
				}
			} catch (error) {
				console.log("Compare error!. Key: ", key);
			}
		}

		return dataHasChanged;
	}

	// select an option in a dropdown using value
	selectDropdownOptionByValue(dropdownId, optionValue) {
		$(`#${this.formId} #${dropdownId}`)
			.children("option")
			.each(function () {
				$(this).removeAttr("selected");

				// get the value of current option element
				const currentValue = $(this).attr("value");

				// check if current value is equal to given value
				if (currentValue == optionValue) {
					$(this).attr("selected", "selected");
				}
			});
	}

	// select an option in a dropdown using text
	selectDropdownOptionByText(dropdownId, optionText) {
		$(`#${this.formId} #${dropdownId}`)
			.children("option")
			.each(function () {
				$(this).removeAttr("selected");

				// get the text of current option element
				const currentText = $(this).text();

				// check if current text is equal to given text
				if (currentText == optionText) {
					$(this).attr("selected", "selected");
				}
			});
	}

	// set attributes in validation info object as required
	setValidationAttributesRequired(attributues = []) {
		this.validationInfoObject.forEach((vi) => {
			if (attributues.includes(vi.attribute)) {
				delete vi.optional;
			}
		});

		this.updateFormInputEventListeners();
	}

	// set attributes in validation info object as optional
	setValidationAttributesOptional(attributues = []) {
		this.validationInfoObject.forEach((vi) => {
			if (attributues.includes(vi.attribute)) {
				vi["optional"] = true;
			}
		});

		this.updateFormInputEventListeners();
	}

	// update form input event listeners
	updateFormInputEventListeners() {
		this.validationInfoObject.forEach((vi) => {
			// remove existing listeners
			$(`#${this.formId} #${vi.attribute}`).off();
			// add new listener
			$(`#${this.formId} #${vi.attribute}`).on("keyup change", () => {
				this.validateElementValue(vi);
			});
		});
	}
}
