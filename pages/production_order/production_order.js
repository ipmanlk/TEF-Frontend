const tempData = {
	validationInfo: null,
	selectedEntry: null,
	permission: null,
	selectedCustomer: null,
};

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
	// get regexes for validation and store on window tempData
	const response = await Request.send("/api/regexes", "GET", {
		data: { module: "PRODUCTION_ORDER" },
	});

	tempData.validationInfo = response.data;

	FormUtil.enableRealtimeValidation(tempData.validationInfo);

	await loadFormDropdowns();
	registerEventListeners();

	// create an array from permission string
	const permission = permissionStr.split("").map((p) => parseInt(p));
	tempData.permission = permission;
	if (permission[0] == 0) {
		$("#btnTopAddEntry").hide();
	}

	// load main table
	const dataBuilderFunction = (responseData) => {
		// parse response data and return in data table friendly format
		return responseData.map((entry) => {
			const productionOrderStatusName = entry.productionOrderStatus.name;

			// disable edit button when order is deleted, rejected or confirmed
			const deleteBtnStatus = ["Deleted", "Rejected", "Confirmed"].includes(
				productionOrderStatusName
			)
				? "disabled"
				: "";

			// disable edit button when order is rejected or confirmed
			const editBtnStatus = ["Rejected", "Confirmed"].includes(
				productionOrderStatusName
			)
				? "disabled"
				: "";

			const deleteBtnHTML = `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')" ${deleteBtnStatus}><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`;

			const editBtnHTML = `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')" ${editBtnStatus}><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`;

			return {
				Code: entry.code,
				"Required Date": entry.requiredDate,
				Status: productionOrderStatusName,
				View: `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
				Edit: editBtnHTML,
				Delete: deleteBtnHTML,
			};
		});
	};
	window.mainTable = new DataTable(
		"mainTableHolder",
		"/api/production_orders",
		permission,
		dataBuilderFunction,
		"Production Orders List"
	);
}

const loadFormDropdowns = async () => {
	// define needed attributes
	let productPackages, productionOrderStatuses;

	// get data from the api for each dropbox
	response = await Request.send("/api/product_packages?data[limit]=0", "GET");
	productPackages = response.data;

	response = await Request.send(
		"/api/general?data[table]=production_order_status",
		"GET"
	);
	productionOrderStatuses = response.data;

	// clean existing options and append new data
	$("#productPackageId").empty();
	$("#productionOrderStatusId").empty();

	productPackages.forEach((pkg) => {
		$("#productPackageId").append(
			`<option value="${pkg.id}">${pkg.name} (${pkg.code})</option>`
		);
	});

	productionOrderStatuses.forEach((st) => {
		$("#productionOrderStatusId").append(
			`<option value="${st.id}">${st.name}</option>`
		);
	});

	// init bootstrap-select
	$("#productPackageId").selectpicker();
};

// event listeners for form inputs and buttons
const registerEventListeners = () => {
	// prevent default form submission event
	$("form").on("submit", (e) => e.preventDefault());

	// event listeners for buttons
	$("#btnAddToproductPackageTable").on("click", addToProductPackageTable);
	$(".btnFmReset").on("click", resetForm);
	$(".btnFmUpdate").on("click", updateEntry);
	$(".btnFmAdd").on("click", addEntry);
	$(".btnFmDelete").on("click", () => deleteEntry());
	$(".btnFmPrint").on("click", printEntry);
	$("#btnTopAddEntry").on("click", showNewEntryModal);
};

/*-------------------------------------------------------------------------------------------------------
                                Entry Related Requests (POST, PUT, DELETE, PRINT)
-------------------------------------------------------------------------------------------------------*/
const addEntry = async () => {
	const { status, data } = validateForm();

	if (!status) {
		mainWindow.showOutputModal(
			"Sorry!. Please fix these problems first.",
			data
		);
		return;
	}

	// send post reqeust to save data
	const response = await Request.send("/api/production_orders", "POST", {
		data: data,
	});

	// show output modal based on response
	if (response.status) {
		$("#modalMainForm").modal("hide");
		reloadModule();
		mainWindow.showOutputToast("Success!", response.msg);
		mainWindow.showOutputModal(
			"Production Order Created!.",
			`<h4>Code: ${response.data.code}</h4>`
		);
	}
};

const loadEntry = async (id) => {
	resetForm();

	// get entry data from db and show in the form
	const response = await Request.send("/api/production_orders", "GET", {
		data: { id: id },
	});
	const entry = response.data;

	// fill form inputs
	Object.keys(entry).forEach((key) => {
		$(`#${key}`).val(entry[key]);
	});

	// select dropdowns
	FormUtil.selectDropdownOptionByValue(
		"productionOrderStatusId",
		entry.productionOrderStatus.id
	);

	// fill mini table
	$("#productPackageTable tbody").empty();

	entry.productionOrderProductPackages.forEach((pkg) => {
		addRowToProductPackageTable({
			productPackageId: pkg.productPackageId,
			productPackageName: `${pkg.productPackage.name} (${pkg.productPackage.code})`,
			requestedQty: pkg.qty,
		});
	});

	// save globally
	tempData.selectedEntry = entry;
};

const updateEntry = async () => {
	const { status, data } = validateForm();

	// set entry id
	data["id"] = tempData.selectedEntry.id;

	if (!status) {
		mainWindow.showOutputModal(
			"Sorry!. Please fix these problems first.",
			data
		);
		return;
	}

	// send post reqeust to save data
	const response = await Request.send("/api/production_orders", "PUT", {
		data: data,
	});

	// show output modal based on response
	if (response.status) {
		$("#modalMainForm").modal("hide");
		reloadModule();
		mainWindow.showOutputToast("Success!", response.msg);
	}
};

const deleteEntry = async (id = tempData.selectedEntry.id) => {
	// get confirmation
	const confirmation = await mainWindow.showConfirmModal(
		"Confirmation",
		"Do you really need to delete this entry?"
	);
	if (!confirmation) return;

	// send post reqeust to save data
	const response = await Request.send(
		`/api/production_orders?data[id]=${id}`,
		"DELETE"
	);

	// show output modal based on response
	if (response.status) {
		$("#modalMainForm").modal("hide");
		reloadModule();
		mainWindow.showOutputToast("Success!", response.msg);
	}
};

const printEntry = () => {
	printProductionOrder(tempData.selectedEntry);
};

/*-------------------------------------------------------------------------------------------------------
                                          Main Form
-------------------------------------------------------------------------------------------------------*/
const getFormData = () => {
	// data from basic input fields
	const data = {};

	// add element valeus to data obj
	tempData.validationInfo.forEach((vi) => {
		try {
			let attributeValue = $(`#${vi.attribute}`).val();
			if (attributeValue.trim() == "") attributeValue = null;
			data[vi.attribute] = attributeValue;
		} catch (e) {
			console.log(vi.attribute);
		}
	});

	// get data from product pkg table
	const productionOrderProductPackages = [];
	$("#productPackageTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const tdProductPkgId = $(tds[1])
			.children()
			.first()
			.data("product-package-id");
		const tdRequestedQty = $(tds[2]).children().first().data("requested-qty");

		productionOrderProductPackages.push({
			productPackageId: tdProductPkgId,
			qty: tdRequestedQty,
		});
	});

	// add product pkg details to data
	data["productionOrderProductPackages"] = productionOrderProductPackages;

	return data;
};

const validateForm = () => {
	// store error msgs
	let errors = "";

	// ignored inputs for form validation
	const ignoredAttributes = ["productPackageId", "requestedQty"];

	// validate regular inputs
	tempData.validationInfo.forEach((vi) => {
		if (ignoredAttributes.includes(vi.attribute)) return;

		// validate each field
		try {
			FormUtil.validateElementValue(vi);
		} catch (e) {
			console.log(vi);
		}
		// get element values
		const value = $(`#${vi.attribute}`).val();
		// regex
		const regex = new RegExp(vi.regex);
		// ignore empty optional values
		if (vi.optional && (value == null || value.trim() == "")) return;

		if (!regex.test(value)) {
			errors += `${vi.error}<br/>`;
		}
	});

	// validate mini table
	const formData = getFormData();

	if (formData.productionOrderProductPackages.length == 0) {
		errors += "Please select at least one product package!. <br>";
	}

	// check for duplicates & invalid values in the material list
	let foundDuplicates = false;
	let containsInvalidValues = false;

	const ids = [];
	$("#materialTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const tdProductPackageId = $(tds[1])
			.children()
			.first()
			.data("product-package-id");
		if (ids.includes[tdProductPackageId]) {
			foundDuplicates = true;
		}

		ids.push(tdProductPackageId);

		const tdRequestedQty = $(tds[2]).children().first().data("requested-qty");

		// check if list contains invalid values
		const regex = /^[\d]{1,9}$/;
		if (!regex.test(tdRequestedQty)) {
			containsInvalidValues = true;
		}
	});

	if (foundDuplicates) {
		errors += "Please remove duplicates from product packages list!. <br>";
	}

	if (containsInvalidValues) {
		errors +=
			"There are invalid data in the product packages list!. Please check again. <br>";
	}

	if (errors == "") {
		return {
			status: true,
			data: formData,
		};
	}

	return {
		status: false,
		data: errors,
	};
};

const reloadModule = () => {
	resetForm();
	mainTable.reload();
};

const resetForm = () => {
	// empty input fields
	$("#mainForm input").val("");

	// deselect select pickers
	$("#productPackageId").val("");
	$("#productPackageId").selectpicker("render");

	// empty mini table
	$("#productPackageTable tbody").empty();

	// remove other classes used for feedbacks
	$("#mainForm *").removeClass("has-error has-success");
	$("#mainForm .form-control-feedback").remove();

	// disable form read only mode if activated
	FormUtil.disableReadOnly("mainForm");
};

/*-------------------------------------------------------------------------------------------------------
                                           Material Table
-------------------------------------------------------------------------------------------------------*/

const addToProductPackageTable = () => {
	const productPackageId = $("#productPackageId").val();
	const productPackageName = $("#productPackageId option:selected").text();
	const requestedQty = $("#requestedQty").val();

	// check if required things are provided
	if (productPackageId.trim() == "") {
		mainWindow.showOutputModal(
			"Sorry",
			"Please select a product package first!."
		);
		return;
	}

	if (requestedQty.trim() == "" || !/^[\d]{1,5}$/.test(requestedQty)) {
		mainWindow.showOutputModal(
			"Sorry",
			"Please provide a valid requested qty!."
		);
		return;
	}

	// check for duplicates
	let isDuplicate = false;
	$("#productPackageTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const tdProductPackageId = $(tds[1])
			.children()
			.first()
			.data("product-package-id");
		if (productPackageId == tdProductPackageId) {
			isDuplicate = true;
		}
	});

	if (isDuplicate) {
		mainWindow.showOutputModal(
			"Sorry",
			"This product package is already in the product packages list!."
		);
		return;
	}

	addRowToProductPackageTable({
		productPackageId,
		productPackageName,
		requestedQty,
	});
};

const addRowToProductPackageTable = (row = {}) => {
	// row data
	const { productPackageId, productPackageName, requestedQty } = row;
	$("#productPackageTable tbody").append(`
    <tr>
        <td></td>
        <td>
          <span data-product-package-id="${productPackageId}">${productPackageName}</span>
        </td>
        <td>
          <span data-requested-qty="${requestedQty}">${requestedQty}</span>
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="removeFromProductPkgTable(this)">
            <i class="glyphicon glyphicon-edit" aria-hidden="true"></i> 
              Delete
          </button>
        </td>
    </tr>
    `);

	// remove existing event listeners on inputs inside tbody
	$("#productPackageTable tbody input").off();

	// and add new
	$("#productPackageTable tbody input").on(
		"keyup change",
		refreshProductPackageTable
	);

	refreshProductPackageTable();
};

// updates index column
const refreshProductPackageTable = () => {
	$("#productPackageTable tbody tr").each((index, tr) => {
		// update index
		const tds = $(tr).children();
		const indexTd = $(tds[0]);
		indexTd.html(index + 1);
	});
};

const removeFromProductPkgTable = (button) => {
	$(button).parent().parent().remove();

	refreshProductPackageTable();
};

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

	FormUtil.selectDropdownOptionByValue("productionOrderStatusId", 1);
	$("#productionOrderStatusId").attr("disabled", true);
};

const showEditEntryModal = (id, readOnly = false) => {
	$("#productionOrderStatusId").attr("disabled", false);

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
