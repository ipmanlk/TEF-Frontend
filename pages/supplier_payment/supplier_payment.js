const tempData = {
	validationInfo: null,
	selectedEntry: null,
	permission: null,
};

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
	// get regexes for validation and store on window tempData
	const response = await Request.send("/api/regexes", "GET", {
		data: { module: "SUPPLIER_PAYMENT" },
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
		// parse resposne data and return in data table frendly format
		return responseData.map((entry) => {
			return {
				Number: entry.pnumber,
				"GRN Code": entry.grn.grncode,
				"Payment Method": entry.supplierPaymentMethod.name,
				"Pay Amount": entry.payAmount,
				Date: entry.addedDate,
				Status: entry.supplierPaymentStatus.name,
				View: `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
				Edit: `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
				Delete: `${
					entry.supplierPaymentStatus.name == "Deleted"
						? '<button style="display:none">Delete</button>'
						: `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`
				}`,
			};
		});
	};
	window.mainTable = new DataTable(
		"mainTableHolder",
		"/api/supplier_payments",
		permission,
		dataBuilderFunction,
		"GRNs List"
	);
}

const loadFormDropdowns = async () => {
	// define needed attributes
	let response, suppliers, supplierPaymentStatuses, paymentMethods;

	// get data from the api for each dropbox
	response = await Request.send("/api/suppliers?data[limit]=0", "GET");
	suppliers = response.data;

	response = await Request.send(
		"/api/general?data[table]=supplier_payment_status",
		"GET"
	);
	supplierPaymentStatuses = response.data;

	response = await Request.send(
		"/api/general?data[table]=supplier_payment_method",
		"GET"
	);
	paymentMethods = response.data;

	// clean existing options and append new data
	$("#supplierId").empty();
	$("#supplierPaymentStatusId").empty();
	$("#supplierPaymentMethodId").empty();

	suppliers.forEach((sup) => {
		// show company name for companies and person name for individuals
		let name = sup.companyName ? sup.companyName : sup.personName;
		$("#supplierId").append(
			`<option data-tokens="${sup.code} - ${name}" value="${sup.id}">${name} (${sup.code})</option>`
		);
	});

	paymentMethods.forEach((pm) => {
		$("#supplierPaymentMethodId").append(
			`<option value="${pm.id}">${pm.name}</option>`
		);
	});

	supplierPaymentStatuses.forEach((sps) => {
		$("#supplierPaymentStatusId").append(
			`<option value="${sps.id}">${sps.name}</option>`
		);
	});

	// select default value as completed
	FormUtil.selectDropdownOptionByText("supplierPaymentStatusId", "Completed");

	// init bootstrap-select
	$("#supplierId").selectpicker();
	$("#grnId").selectpicker();
};

// event listeners for form inputs and buttons
const registerEventListeners = () => {
	// prevent default form submission event
	$("form").on("submit", (e) => e.preventDefault());

	// event listeners for buttons
	$(".btnFmReset").on("click", resetForm);
	$(".btnFmUpdate").on("click", updateEntry);
	$(".btnFmAdd").on("click", addEntry);
	$(".btnFmDelete").on("click", () => deleteEntry());
	$(".btnFmPrint").on("click", printEntry);
	$("#btnTopAddEntry").on("click", showNewEntryModal);

	// event listeners for bootstrap-select componnets
	$("#supplierId").on("changed.bs.select", function (e) {
		showSupplierGrns(e.target.value);
	});

	$("#grnId").on("changed.bs.select", function (e) {
		showGrnAndSupplierInfo(e.target.value);
	});

	// update balance
	$("#payAmount").on("change keyup", () => {
		showBalance();
	});

	// payment method show hide
	$("#supplierPaymentMethodId").on("change", () => {
		const method = $("#supplierPaymentMethodId option:selected").text();
		showPaymentMethod(method);
	});

	// format decimal inputs automatically
	$("#payAmount").on("blur", (e) => {
		const value = e.target.value;
		if (!isNaN(value) && value.trim() != "") {
			e.target.value = parseFloat(value).toFixed(2);
			$(e.target).trigger("keyup");
		}
	});
};

// this function will run when supplierId select box is changed
const showSupplierGrns = async (supplierId, grnStatusName = "Pending") => {
	// load supplier grns
	const response = await Request.send("/api/supplier_grns", "GET", {
		data: {
			supplierId: supplierId,
			grnStatusName: grnStatusName,
		},
	});

	// if request failed
	if (!response.status) return;

	const grns = response.data;

	// update select picker options
	$("#grnId").first().empty();

	grns.forEach((grn) => {
		$("#grnId")
			.first()
			.append(
				`<option data-tokens="${grn.grncode}" value="${grn.id}">${grn.grncode}</option>`
			);
	});

	// refresh plugin
	$("#grnId").selectpicker("refresh");
	$("#grnId").selectpicker("render");
};

// show grn total net amount and suppllier total amount with arreas
const showGrnAndSupplierInfo = async (grnId) => {
	const response = await Request.send("/api/grns", "GET", {
		data: {
			id: grnId,
		},
	});

	// if request failed
	if (!response.status) return;

	// show grn net total
	const grn = response.data;
	const supplier = grn.purchaseOrder.quotation.quotationRequest.supplier;
	const grnNetTotal = parseFloat(grn.netTotal);
	const supplierArreas = parseFloat(supplier.arrears);
	const grnPayedAmount = parseFloat(grn.payedAmount);
	// show totals
	$("#grnPayedAmount").val(grnPayedAmount.toFixed(2));
	$("#grnNetTotal").val(grnNetTotal.toFixed(2));
	$("#supTotalAmount").val(supplierArreas.toFixed(2));
	$("#grnBalance").val((grnNetTotal - grnPayedAmount).toFixed(2));

	// show supplier arrears info
	$("#existingArrears").val(supplier.arrears);
	$("#maxArrears").val(supplier.maxArrears);
};

// calcualte balance from supplier total and pay amount
const showBalance = () => {
	const supplierTotal = parseFloat($("#supTotalAmount").val());
	const payAmount = parseFloat($("#payAmount").val());

	if (!isNaN(supplierTotal) && !isNaN(payAmount)) {
		let balance = supplierTotal - payAmount;
		if (balance < 0) balance = 0;
		$("#balance").val(balance.toFixed(2));
	} else {
		$("#balance").val("0.00");
	}
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
	const response = await Request.send("/api/supplier_payments", "POST", {
		data: data,
	});

	// show output modal based on response
	if (response.status) {
		$("#modalMainForm").modal("hide");
		reloadModule();
		mainWindow.showOutputToast("Success!", response.msg);
		mainWindow.showOutputModal(
			"Supplier payment added!.",
			`<h4>Payment Number: ${response.data.pnumber}</h4>`
		);
	}
};

const loadEntry = async (id) => {
	resetForm();

	// get entry data from db and show in the form
	const response = await Request.send("/api/supplier_payments", "GET", {
		data: { id: id },
	});
	const entry = response.data;

	// select dropdowns
	FormUtil.selectDropdownOptionByValue(
		"supplierPaymentStatusId",
		entry.supplierPaymentStatus.id
	);

	FormUtil.selectDropdownOptionByValue(
		"supplierPaymentMethodId",
		entry.supplierPaymentMethod.id
	);

	// show proper payment method fields
	showPaymentMethod(entry.supplierPaymentMethod.name);

	// fill form inputs
	entry["grnPayedAmount"] = entry.grn.payedAmount;

	Object.keys(entry).forEach((key) => {
		$(`#${key}`).val(entry[key]);
	});

	const supplier = entry.grn.purchaseOrder.quotation.quotationRequest.supplier;

	// select proper supplier
	$("#supplierId").val(supplier.id);
	$("#supplierId").selectpicker("render");

	// select proper grn
	await showSupplierGrns(supplier.id, "");

	// select proper grn
	$("#grnId").val(entry.grnId);
	$("#grnId").selectpicker("render");

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
	const response = await Request.send("/api/supplier_payments", "PUT", {
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
		`/api/supplier_payments?data[id]=${id}`,
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
	printPaymentReceipt(tempData.selectedEntry);
};

/*-------------------------------------------------------------------------------------------------------
                                          Main Form
-------------------------------------------------------------------------------------------------------*/
const getFormData = () => {
	// holder for form values
	const data = {};

	// add element valeus to data obj
	tempData.validationInfo.forEach((vi) => {
		let attributeValue = $(`#${vi.attribute}`).val();
		if (attributeValue.trim() == "") attributeValue = null;
		data[vi.attribute] = attributeValue;
	});

	return data;
};

const validateForm = () => {
	// store error msgs
	let errors = "";

	// validate regular inputs
	tempData.validationInfo.forEach((vi) => {
		// validate each field
		FormUtil.validateElementValue(vi);
		// get element values
		const value = $(`#${vi.attribute}`).val();
		// regex
		const regex = new RegExp(vi.regex);
		// ignore empty optional values
		if (vi.optional && value.trim() == "") return;

		if (!regex.test(value)) {
			errors += `${vi.error}<br/>`;
		}
	});

	// check if pay amout is greater than actual grn amount
	const payAmount = parseFloat($("#payAmount").val());
	const grnPayedAmount = parseFloat($("#grnPayedAmount").val());
	const grnNetTotal = parseFloat($("#grnNetTotal").val());

	if (payAmount > grnNetTotal - grnPayedAmount) {
		errors += "GRN pay amount can't exceed the GRN net total!.";
	}

	// total balance left to pay (arrears)
	const supplierBalance = parseFloat($("#balance").val()) || 0;

	//  check balance is greater than allowed arrears
	const maxArrears = parseFloat($("#maxArrears").val()) || 0;
	if (maxArrears < supplierBalance) {
		errors += "Total arrears can't exceed the maximum allowed amount!. <br>";
	}

	if (errors == "") {
		// get form data
		const formData = getFormData();

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
	$("#supplierId").val("");
	$("#supplierId").selectpicker("render");

	$("#grnId").first().empty();
	$("#grnId").selectpicker("refresh");
	$("#grnId").selectpicker("render");

	// remove other classes used for feedbacks
	$("#mainForm *").removeClass("has-error has-success");
	$("#mainForm .form-control-feedback").remove();

	// disable form read only mode if activated
	FormUtil.disableReadOnly("mainForm");
};

/*-------------------------------------------------------------------------------------------------------
                                       Payment Method
-------------------------------------------------------------------------------------------------------*/
const showPaymentMethod = (paymentMethod) => {
	// empty inputs inside payment panels
	$("#panelPaymentCheque input").val("");
	$("#panelPaymentBank input").val("");
	$("#panelPaymentCheque *").removeClass("has-error has-success");
	$("#panelPaymentCheque .form-control-feedback").remove();
	$("#panelPaymentBank *").removeClass("has-error has-success");
	$("#panelPaymentBank .form-control-feedback").remove();

	switch (paymentMethod) {
		case "Cash":
			$("#panelPaymentCheque").hide();
			$("#panelPaymentBank").hide();
			break;
		case "Cheque":
			$("#panelPaymentCheque").fadeIn();
			$("#panelPaymentBank").hide();
			break;
		case "Bank Transfer":
			$("#panelPaymentCheque").hide();
			$("#panelPaymentBank").fadeIn();
			break;
	}
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
	$("#modalMainFormTitle").text("Add New Supplier Payment");
	// set date of adding
	$("#mainForm #addedDate").val(new Date().today());
	// empty pocode
	$("#mainForm #pnumber").val("Payment number will be displayed after adding.");
	// show modal
	$("#modalMainForm").modal("show");
};

const showEditEntryModal = (id, readOnly = false) => {
	loadEntry(id).then(() => {
		$("#modalMainForm").modal("show");

		if (readOnly) {
			FormUtil.enableReadOnly("mainForm");
			FormUtil.setButtionsVisibility("mainForm", tempData.permission, "view");
			$("#mainForm *").removeClass("has-error has-success");
			$("#mainForm .form-control-feedback").remove();
			$("#modalMainFormTitle").text("View Supplier Payment");
		} else {
			FormUtil.disableReadOnly("mainForm");
			FormUtil.setButtionsVisibility("mainForm", tempData.permission, "edit");
			$("#modalMainFormTitle").text("Edit Supplier Payment");
			// hide from deleted button when deleted
			if (
				$("#mainForm #supplierPaymentStatusId option:selected").text() ==
				"Deleted"
			) {
				$(".btnFmDelete").hide();
			}
		}
	});
};
