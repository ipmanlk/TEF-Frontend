const tempData = {
	selectedProduct: null,
};

class productPackageForm extends Form {
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
		$("#productionCost, #weight").on("blur", (e) => {
			const value = e.target.value;
			if (!isNaN(value) && value.trim() != "") {
				e.target.value = parseFloat(value).toFixed(2);
				$(e.target).trigger("keyup");
			}
		});

		// product dropdown listener
		// store currently selected product on tempData for weight calculation
		$("#productId").on("change", (e) => {
			Request.send("/api/products", "GET", {
				data: {
					id: e.target.value,
				},
			}).then((response) => {
				tempData.selectedProduct = response.data;
			});
		});

		// calculate weight and price
		$("#pieces").on("keyup change", (e) => {
			const selectedProduct = tempData.selectedProduct;
			const qty = parseFloat(e.target.value);
			const weight = qty * parseFloat(selectedProduct.weightActual);

			$("#weight").val(weight.toFixed(2));

			this.selectDropdownOptionByValue(
				"unitTypeId",
				selectedProduct.unitTypeId
			);
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

		// select product code
		$("#productId").selectpicker("val", entry.productId);

		this.setButtionsVisibility("edit");
	}
}

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
	// get regexes for validation and store on window tempData
	let response = await Request.send("/api/regexes", "GET", {
		data: { module: "PRODUCT_PACKAGE" },
	});

	const validationInfo = response.data;

	// create an array from permission string
	const permission = permissionStr.split("").map((p) => parseInt(p));

	// load main tbale
	const dataBuilderFunction = (responseData) => {
		// parse resposne data and return in data table frendly format
		return responseData.map((entry) => {
			return {
				Code: entry.code,
				Name: entry.name,
				"Production Cost": entry.productionCost,
				Pieces: entry.pieces,
				Type: entry.productPackageType.name,
				Status: entry.productPackageStatus.name,
				View: `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
				Edit: `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
				Delete: `${
					entry.productPackageStatus.name == "Deleted"
						? ""
						: `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`
				}`,
			};
		});
	};

	window.mainTable = new DataTable(
		"mainTableHolder",
		"/api/product_packages",
		permission,
		dataBuilderFunction,
		"Product Packages List"
	);

	// load main form
	window.mainForm = new productPackageForm(
		"mainForm",
		"Product Package Details",
		permission,
		validationInfo,
		[
			{
				id: "productPackageTypeId",
				route: "/api/general?data[table]=product_package_type",
			},
			{
				id: "productPackageStatusId",
				route: "/api/general?data[table]=product_package_status",
				statusField: true,
			},
			{ id: "unitTypeId", route: "/api/general?data[table]=unit_type" },
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

	// load product codes dropdown
	response = await Request.send("/api/products?data[limit]=0", "GET");
	const products = response.data;

	products.forEach((product) => {
		$("#productId").append(
			`<option data-tokens="${product.code} - ${product.name}" value="${product.id}">${product.code} - ${product.name}</option>`
		);
	});

	// init bootstrap-select
	$("#productId").selectpicker();

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
	const response = await Request.send("/api/product_packages", "GET", {
		data: { id: id },
	});
	const entry = response.data;

	mainForm.loadEntry(entry);

	if (readOnly) {
		mainForm.enableReadOnly();
		$("#modalMainFormTitle").text("View Product Package");
	} else {
		mainForm.disableReadOnly();
		$("#modalMainFormTitle").text("Edit Product Package");
	}

	$("#modalMainForm").modal("show");
};

const showNewEntryModal = () => {
	mainForm.reset();

	// change Product code field text
	$("#mainForm #code").val("Code will be displayed after adding.");

	// set date of assignment
	$("#mainForm #addedDate").val(new Date().today());

	$("#modalMainFormTitle").text("Add New Product Package");
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
	const response = await Request.send("/api/product_packages", "POST", {
		data: data,
	});

	// show output modal based on response
	if (response.status) {
		reloadModule();
		$("#modalMainForm").modal("hide");
		mainWindow.showOutputToast("Success!", response.msg);
		mainWindow.showOutputModal(
			"New Product Package Added!",
			`<h4>Code: ${response.data.code}</h4>`
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
	const response = await Request.send("/api/product_packages", "PUT", {
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
		const response = await Request.send("/api/product_packages", "DELETE", {
			data: { id: id },
		});
		if (response.status) {
			reloadModule();
			$("#modalMainForm").modal("hide");
			mainWindow.showOutputToast("Success!", response.msg);
		}
	}
};
