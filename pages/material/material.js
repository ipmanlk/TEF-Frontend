/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
	// get regexes for validation and store on window tempData
	const response = await Request.send("/api/regexes", "GET", {
		data: { module: "MATERIAL" },
	});

	const validationInfo = response.data;

	// create an array from permission string
	const permission = permissionStr.split("").map((p) => parseInt(p));

	if (permission[0] == 0) {
		$("#btnTopAddEntry").hide();
	}

	// load main table
	const dataBuilderFunction = (responseData) => {
		// parse resposne data and return in data table frendly format
		return responseData.map((entry) => {
			return {
				Code: entry.code,
				Name: entry.name,
				Type: entry.materialType.name,
				"Current Unit Price": entry.unitPrice,
				Status: entry.materialStatus.name,
				View: `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
				Edit: `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
				Delete: `${
					entry.materialStatus.name == "Deleted"
						? '<button style="display:none">Delete</button>'
						: `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`
				}`,
			};
		});
	};

	window.mainTable = new DataTable(
		"mainTableHolder",
		"/api/materials",
		permission,
		dataBuilderFunction,
		"Material List"
	);

	// load main from
	window.mainForm = new Form(
		"mainForm",
		"Material Details",
		permission,
		validationInfo,
		[
			{ id: "materialTypeId", route: "/api/general?data[table]=material_type" },
			{ id: "riskCategoryId", route: "/api/general?data[table]=risk_category" },
			{ id: "unitTypeId", route: "/api/general?data[table]=unit_type" },
			{
				id: "materialStatusId",
				route: "/api/general?data[table]=material_status",
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

	$("#btnTopSupplierMaterial").click(() => {
		mainWindow.showViewModal("/?page=supplier_material", "50vh");
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

	// format decimal inputs automatically
	$("#unitPrice").on("blur", (e) => {
		const value = e.target.value;
		if (!isNaN(value) && value.trim() != "") {
			e.target.value = parseFloat(value).toFixed(2);
			$(e.target).trigger("keyup");
		}
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

const showNewEntryModal = () => {
	mainForm.reset();
	$("#mainForm #code").val("Code will be displayed after adding.");
	// set date of adding
	$("#mainForm #addedDate").val(new Date().today());

	// set created employee number
	const employeeNumber = mainWindow.tempData.profile.employee.number;
	const employeeCallingName = mainWindow.tempData.profile.employee.callingName;
	$("#mainForm #createdEmployee").val(
		`${employeeCallingName} (${employeeNumber})`
	);

	$("#modalMainFormTitle").text("Add New Material");
	$("#modalMainForm").modal("show");
};

const showEditEntryModal = async (id, readOnly = false) => {
	// get entry data from db and show in the form
	const response = await Request.send("/api/materials", "GET", {
		data: { id: id },
	});
	const entry = response.data;

	mainForm.loadEntry(entry);

	if (readOnly) {
		mainForm.enableReadOnly();
		$("#modalMainFormTitle").text("View Material");
	} else {
		mainForm.disableReadOnly();
		$("#modalMainFormTitle").text("Edit Material");
	}

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
	const response = await Request.send("/api/materials", "POST", { data: data });

	// show output modal based on response
	if (response.status) {
		reloadModule();
		$("#modalMainForm").modal("hide");
		mainWindow.showOutputToast("Success!", response.msg);
		mainWindow.showOutputModal(
			"New Material Added!",
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
	const response = await Request.send("/api/materials", "PUT", {
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
const deleteEntry = async (id) => {
	const confirmation = await mainWindow.showConfirmModal(
		"Confirmation",
		"Do you really need to delete this entry?"
	);

	if (confirmation) {
		const response = await Request.send("/api/materials", "DELETE", {
			data: { id: id },
		});
		if (response.status) {
			reloadModule();
			$("#modalMainForm").modal("hide");
			mainWindow.showOutputToast("Success!", response.msg);
		}
	}
};
