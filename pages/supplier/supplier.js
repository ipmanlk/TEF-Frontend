class SupplierForm extends Form {
	// overwrrite register additional event listners from method
	loadAddons() {
		// hide company info initially
		$(`#${this.formId} .company_info`).hide();

		// when supplier type select is changed, show hide components
		$(`#${this.formId} #supplierTypeId`).on("change", (e) => {
			// 1 = individual
			// 2 = company
			const val = e.target.value;
			this.updateFormUI(val);
		});
	}

	// overwrrite load entry
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

		// show hide customer type components
		const supplierTypeId = $(`#${this.formId} #supplierTypeId`).val();
		this.updateFormUI(supplierTypeId);
	}

	updateFormUI(supplierTypeId) {
		if (supplierTypeId == 1) {
			$(`#${this.formId} .company_info`).fadeOut();

			// reset company name value
			$(`#${this.formId} #companyName`).val("");
			$(`#${this.formId} #companyMobile`).val("");
			$(`#${this.formId} #companyRegNumber`).val("");

			$(`#${this.formId} label[for=personName]`).text("Supplier Name: ");
			$(`#${this.formId} label[for=personMobile]`).text(
				"Supplier Contact Number: "
			);
			$(`#${this.formId} label[for=nic]`).text("Supplier NIC: ");
			$(`#${this.formId} label[for=email]`).text("Supplier E-Mail: ");
			$(`#${this.formId} #lblEmailRequired`).hide();

			// update validation info
			this.setValidationAttributesOptional([
				"companyName",
				"companyMobile",
				"companyRegNumber",
				"email",
			]);
		} else {
			$(`#${this.formId} .company_info`).fadeIn();
			$(`#${this.formId} label[for=personName]`).text("Contact Person Name: ");
			$(`#${this.formId} label[for=personMobile]`).text(
				"Contact Person Mobile: "
			);
			$(`#${this.formId} label[for=nic]`).text("Contact Person NIC: ");
			$(`#${this.formId} label[for=email]`).text("Company E-Mail: ");
			$(`#${this.formId} #lblEmailRequired`).show();

			// update validation info
			this.setValidationAttributesRequired([
				"companyName",
				"companyMobile",
				"companyRegNumber",
				"email",
			]);
		}
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

		// when supplier type select is changed, show hide components
		$(`#${this.formId} #supplierTypeId`).on("change", (e) => {
			// 1 = individual
			// 2 = company
			const val = e.target.value;
			this.updateFormUI(val);
		});
	}
}

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
	// get regexes for validation and store on window tempData
	const response = await Request.send("/api/regexes", "GET", {
		data: { module: "SUPPLIER" },
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
				Company: entry.companyName,
				Person: entry.personName,
				Mobile: entry.personMobile,
				Status: entry.supplierStatus.name,
				View: `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
				Edit: `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
				Delete: `${
					entry.supplierStatus.name == "Deleted"
						? ""
						: `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`
				}`,
			};
		});
	};

	window.mainTable = new DataTable(
		"mainTableHolder",
		"/api/suppliers",
		permission,
		dataBuilderFunction,
		"Supplier List"
	);

	// load main form
	window.mainForm = new SupplierForm(
		"mainForm",
		"Supplier Details",
		permission,
		validationInfo,
		[
			{
				id: "supplierStatusId",
				route: "/api/general?data[table]=supplier_status",
				statusField: true,
			},
			{ id: "supplierTypeId", route: "/api/general?data[table]=supplier_type" },
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

	$("#btnTopSupplierMaterial").click(() => {
		mainWindow.showViewModal("/?page=supplier_material", "50vh");
	});

	// set initial form fields to individual type
	mainForm.updateFormUI(1);

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
	const response = await Request.send("/api/suppliers", "GET", {
		data: { id: id },
	});
	const entry = response.data;

	mainForm.loadEntry(entry);

	if (readOnly) {
		mainForm.enableReadOnly();
		$("#modalMainFormTitle").text("View Supplier");
	} else {
		mainForm.disableReadOnly();
		$("#modalMainFormTitle").text("Edit Supplier");
	}

	$("#modalMainForm").modal("show");
};

const showNewEntryModal = () => {
	mainForm.reset();

	// change supplier code field text
	$("#mainForm #code").val("Supplier code will be displayed after adding.");

	// set created employee number
	$("#mainForm #createdEmployeeNumber").val(
		mainWindow.tempData.profile.employee.number
	);

	// set date of assignment
	$("#mainForm #addedDate").val(new Date().today());

	$("#modalMainFormTitle").text("Add New Supplier");
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
	const response = await Request.send("/api/suppliers", "POST", { data: data });

	// show output modal based on response
	if (response.status) {
		reloadModule();
		$("#modalMainForm").modal("hide");
		mainWindow.showOutputToast("Success!", response.msg);
		mainWindow.showOutputModal(
			"New Supplier Added!",
			`<h4>Supplier Code: ${response.data.code}</h4>`
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
	const response = await Request.send("/api/suppliers", "PUT", {
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
		const response = await Request.send("/api/suppliers", "DELETE", {
			data: { id: id },
		});
		if (response.status) {
			reloadModule();
			$("#modalMainForm").modal("hide");
			mainWindow.showOutputToast("Success!", response.msg);
		}
	}
};
