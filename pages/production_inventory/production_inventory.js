/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
	// create an array from permission string
	const permission = permissionStr.split("").map((p) => parseInt(p));

	// load main table
	const dataBuilderFunction = (responseData) => {
		// parse resposne data and return in data table frendly format
		return responseData.map((entry) => {
			return {
				Code: entry.productPackage.code,
				Name: entry.productPackage.name,
				"Qty. (All Time)": entry.qty,
				"Avaiable Qty.": entry.availableQty,
				Status: entry.productionInventoryStatus.name,
				Edit: `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
			};
		});
	};

	window.mainTable = new DataTable(
		"mainTableHolder",
		"/api/production_inventory",
		permission,
		dataBuilderFunction,
		"Production Inventory"
	);

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

/*-------------------------------------------------------------------------------------------------------
                                            Modals
-------------------------------------------------------------------------------------------------------*/

const showNewEntryModal = () => {
	// reset form values
	resetForm();
	FormUtil.disableReadOnly("mainForm");

	FormUtil.setButtionsVisibility("mainForm", tempData.permission, "add");

	// set created employee number
	const employeeNumber = mainWindow.tempData.profile.employee.number;
	const employeeCallingName = mainWindow.tempData.profile.employee.callingName;
	$("#mainForm #createdEmployee").val(
		`${employeeCallingName} (${employeeNumber})`
	);
	// set modal title
	$("#modalMainFormTitle").text("Add New Production Order");
	// set date of adding
	$("#mainForm #addedDate").val(new Date().today());
	// limit for required data
	const date = new Date();
	// const dueDate = $("#mainForm #requiredDate");
	$("#mainForm #requiredDate").attr("min", date.formatForInput());
	// dueDate.attr("max", date.addDays(30).formatForInput());

	// empty code
	$("#mainForm #code").val("Order code will be displayed after adding.");

	$("#confirmedInfo").hide();

	// show modal
	$("#modalMainForm").modal("show");
};

const showEditEntryModal = (id, readOnly = false) => {
	loadEntry(id).then(() => {
		$("#modalMainForm").modal("show");

		if (readOnly) {
			FormUtil.enableReadOnly("mainForm");
			FormUtil.setButtionsVisibility("mainForm", tempData.permission, "view");
			$("#modalMainFormTitle").text("View Production Order");
		} else {
			FormUtil.disableReadOnly("mainForm");
			FormUtil.setButtionsVisibility("mainForm", tempData.permission, "edit");
			$("#modalMainFormTitle").text("Edit Production Order");
			// hide form deleted button when deleted
			if (tempData.selectedEntry.productionOrderStatus.name == "Deleted") {
				$(".btnFmDelete").hide();
			}
		}

		// confirmed info
		if (
			tempData.selectedEntry.confirmedBy != null &&
			tempData.selectedEntry.confirmedDate != null
		) {
			$("#confirmedInfo").show();
		} else {
			$("#confirmedInfo").hide();
		}
	});
};
