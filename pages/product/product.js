class productForm extends Form {
	// overwrrite register additional event listners from method
	loadAddons() {
		$(`#${this.formId} #photo`).on("change", (e) => {
			let photo = e.target;
			if (photo.files && photo.files[0]) {
				$(`#${this.formId} #photoPreview`).attr(
					"src",
					URL.createObjectURL(photo.files[0])
				);
			}
		});

		// format decimal inputs automatically
		$("#cost, #price, #weightFiring, #weightActual").on("blur", (e) => {
			const value = e.target.value;
			if (!isNaN(value) && value.trim() != "") {
				e.target.value = parseFloat(value).toFixed(2);
				$(e.target).trigger("keyup");
			}
		});
	}

	// overwrrite load entry
	loadEntry(entry) {
		this.reset();
		this.selectedEntry = entry;

		// load entry values to form
		Object.keys(entry).forEach((key) => {
			// ignore file uploads
			if ($(`#${this.formId} #${key}`).attr("type") == "file") return;

			// ignore dropdown values
			if (this.dropdownIds.indexOf(key) !== -1) return;

			// set value in the form input
			$(`#${this.formId} #${key}`).val(entry[key]);
		});

		// select dropdown values
		this.dropdownIds.forEach((dropdownId) => {
			this.selectDropdownOptionByValue(dropdownId, entry[dropdownId]);
		});

		// set profile picture preview
		const imageURL = MiscUtil.getURLfromBuffer(entry.photo);

		$(`#${this.formId} #photoPreview`).attr("src", imageURL);

		this.setButtionsVisibility("edit");
	}
}

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
	// get regexes for validation and store on window tempData
	const response = await Request.send("/api/regexes", "GET", {
		data: { module: "PRODUCT" },
	});

	const validationInfo = response.data;

	// create an array from permission string
	const permission = permissionStr.split("").map((p) => parseInt(p));

	if (permission[0] == 0) {
		$("#btnTopAddEntry").hide();
	}

	// load main tbale
	const dataBuilderFunction = (responseData) => {
		// parse resposne data and return in data table frendly format
		return responseData.map((entry) => {
			return {
				Code: entry.code,
				Name: entry.name,
				Category: entry.category.name,
				Status: entry.productStatus.name,
				View: `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
				Edit: `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
				Delete: `${
					entry.productStatus.name == "Deleted"
						? '<button style="display:none">Delete</button>'
						: `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`
				}`,
			};
		});
	};

	window.mainTable = new DataTable(
		"mainTableHolder",
		"/api/products",
		permission,
		dataBuilderFunction,
		"Product List"
	);

	// load main form
	window.mainForm = new productForm(
		"mainForm",
		"Product Details",
		permission,
		validationInfo,
		[
			{ id: "categoryId", route: "/api/general?data[table]=product_category" },
			{ id: "riskCategoryId", route: "/api/general?data[table]=risk_category" },
			{ id: "unitTypeId", route: "/api/general?data[table]=unit_type" },
			{
				id: "productStatusId",
				route: "/api/general?data[table]=product_status",
				statusField: true,
			},
		],
		{
			addEntry: addEntry,
			deleteEntry: deleteEntry,
			updateEntry: updateEntry,
		}
	);

	// event listeners for top action buttons
	$("#btnTopAddEntry").on("click", () => {
		showNewEntryModal();
	});

	// catch promise rejections
	$(window).on("unhandledrejection", (event) => {
		console.error(
			"Unhandled rejection (promise: ",
			event.promise,
			", reason: ",
			event.reason,
			")."
		);
	});
}

// reload main table data and from after making a change
const reloadModule = () => {
	mainForm.reset();
	mainTable.reload();
};

/*-------------------------------------------------------------------------------------------------------
                                            Modals
-------------------------------------------------------------------------------------------------------*/

const showEditEntryModal = async (id, readOnly = false) => {
	// get entry data from db and show in the form
	let response = await Request.send("/api/products", "GET", {
		data: { id: id },
	});
	let entry = response.data;

	mainForm.loadEntry(entry);

	if (readOnly) {
		mainForm.enableReadOnly();
		$("#modalMainFormTitle").text("View Product");
	} else {
		mainForm.disableReadOnly();
		$("#modalMainFormTitle").text("Edit Product");
	}

	$("#modalMainForm").modal("show");

	// calculate cost
	const materials = response.data.materialAnalysis;
	let cost = 0;

	materials.forEach((m) => {
		const unitPrice = parseFloat(m.material.unitPrice);
		const amount = parseFloat(m.amount);
		cost += unitPrice * amount;
	});

	$("#cost").val(cost.toFixed(2));
};

const showNewEntryModal = () => {
	mainForm.reset();

	// change Product code field text
	$("#mainForm #code").val("Product code will be displayed after adding.");

	// set created employee number
	const employeeNumber = mainWindow.tempData.profile.employee.number;
	const employeeCallingName = mainWindow.tempData.profile.employee.callingName;
	$("#mainForm #createdEmployee").val(
		`${employeeCallingName} (${employeeNumber})`
	);

	// set date of assignment
	$("#mainForm #addedDate").val(new Date().today());

	$("#modalMainFormTitle").text("Add New Product");
	$("#modalMainForm").modal("show");
};

/*-------------------------------------------------------------------------------------------------------
                                            Operations
-------------------------------------------------------------------------------------------------------*/

// add new entry to the database
const addEntry = async () => {
	const { status, data } = await mainForm.validateForm();

	// if there are errors
	if (!status) {
		mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
		return;
	}

	// get response
	const response = await Request.send("/api/products", "POST", { data: data });

	// show output modal based on response
	if (response.status) {
		reloadModule();
		$("#modalMainForm").modal("hide");
		mainWindow.showOutputToast("Success!", response.msg);
		mainWindow.showOutputModal(
			"New Product Added!",
			`<h4>Product Code: ${response.data.code}</h4>`
		);
	}
};

// update entry in the database
const updateEntry = async () => {
	const { status, data } = await mainForm.validateForm();

	// if there are errors
	if (!status) {
		mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
		return;
	}

	const newEntryObj = data;
	const dataHasChanged = await mainForm.hasDataChanged();

	// if nothing has been modifed
	if (!dataHasChanged) {
		mainWindow.showOutputModal(
			"Sorry!.",
			"You haven't changed anything to update."
		);
		return;
	}

	// set id of the newEntry object
	newEntryObj.id = mainForm.selectedEntry.id;

	// send put reqeust to update data
	const response = await Request.send("/api/products", "PUT", {
		data: newEntryObj,
	});

	// show output modal based on response
	if (response.status) {
		reloadModule();
		$("#modalMainForm").modal("hide");
		mainWindow.showOutputToast("Success!", response.msg);
	}
};

// delete entry from the database
const deleteEntry = async (id = mainForm.selectedEntry.id) => {
	const confirmation = await mainWindow.showConfirmModal(
		"Confirmation",
		"Do you really need to delete this entry?"
	);

	if (confirmation) {
		const response = await Request.send("/api/products", "DELETE", {
			data: { id: id },
		});
		if (response.status) {
			reloadModule();
			$("#modalMainForm").modal("hide");
			mainWindow.showOutputToast("Success!", response.msg);
		}
	}
};
