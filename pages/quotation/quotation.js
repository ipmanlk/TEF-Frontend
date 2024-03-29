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
		data: { module: "QUOTATION" },
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
				Number: entry.qnumber,
				"Request Num.": entry.quotationRequest.qrnumber,
				"Valid From": entry.validFrom,
				"Valid To": entry.validTo,
				Status: entry.quotationStatus.name,
				View: `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
				Edit: `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
				Delete: `${
					entry.quotationStatus.name == "Deleted"
						? '<button style="display:none">Delete</button>'
						: `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`
				}`,
			};
		});
	};

	window.mainTable = new DataTable(
		"mainTableHolder",
		"/api/quotations",
		permission,
		dataBuilderFunction,
		"Quatations List"
	);
}

const loadFormDropdowns = async () => {
	// define needed attributes
	let response, suppliers, quotationStatus, unitTypes;

	// get data from the api for each dropbox
	response = await Request.send("/api/suppliers?data[limit]=0", "GET");
	suppliers = response.data;

	response = await Request.send(
		"/api/general?data[table]=quotation_status",
		"GET"
	);
	quotationStatus = response.data;

	response = await Request.send("/api/general?data[table]=unit_type", "GET");
	unitTypes = response.data;

	// clean existing options and append new data
	$("#supplierId").empty();
	$("#quotationStatusId").empty();
	$("#unitTypeId").empty();

	suppliers.forEach((sup) => {
		// show company name for companies and person name for individuals
		let name = sup.companyName ? sup.companyName : sup.personName;
		$("#supplierId").append(
			`<option data-tokens="${sup.code} - ${name}" value="${sup.id}">${name} (${sup.code})</option>`
		);
	});

	quotationStatus.forEach((qs) => {
		$("#quotationStatusId").append(
			`<option value="${qs.id}">${qs.name}</option>`
		);
	});

	unitTypes.forEach((ut) => {
		$("#unitTypeId").append(`<option value="${ut.id}">${ut.name}</option>`);
	});

	// init bootstrap-select
	$("#supplierId").selectpicker();
	$("#materialId").selectpicker();
	$("#quotationRequestId").selectpicker();
};

// event listeners for form inputs and buttons
const registerEventListeners = () => {
	// prevent default form submission event
	$("form").on("submit", (e) => e.preventDefault());

	// event listeners for buttons
	$("#btnAddToMaterialTable").on("click", addToMaterialTable);
	$(".btnFmReset").on("click", resetForm);
	$(".btnFmUpdate").on("click", updateEntry);
	$(".btnFmAdd").on("click", addEntry);
	$(".btnFmDelete").on("click", () => deleteEntry());
	$(".btnFmPrint").on("click", printEntry);
	$("#btnTopAddEntry").on("click", showNewEntryModal);

	// event listeners for bootstrap-select componnets
	$("#supplierId").on("changed.bs.select", function (e) {
		showSupplierQuotationRequests(e.target.value);
	});

	$("#quotationRequestId").on("changed.bs.select", function (e) {
		$("#materialTable tbody").empty();
		showQuotationRequestMaterials(e.target.value);
	});

	// set approrpiate limit for the "valid to" date input
	$("#mainForm #validFrom, #mainForm #validTo").on("keyup change", function () {
		const validFrom = $("#mainForm #validFrom");
		const validTo = $("#mainForm #validTo");
		if (validFrom.val() == "") return;
		validTo.attr("min", new Date(validFrom.val()).addDays(1).formatForInput());
	});

	// format decimal inputs automatically
	$("#purchasePrice, #availableQty, #minimumRequestQty").on("blur", (e) => {
		const value = e.target.value;
		if (!isNaN(value) && value.trim() != "") {
			e.target.value = parseFloat(value).toFixed(2);
			$(e.target).trigger("keyup");
		}
	});
};

// this function will run when supplierId select box is changed
const showSupplierQuotationRequests = async (
	supplierId,
	quotationRequestStatusName = "Active"
) => {
	// load supplier quotation requests
	const response = await Request.send(
		"/api/supplier_quotation_requests",
		"GET",
		{
			data: {
				supplierId: supplierId,
				quotationRequestStatusName: quotationRequestStatusName,
			},
		}
	);

	// if request failed
	if (!response.status) return;

	const quotationRequests = response.data;

	// update select picker options
	$("#quotationRequestId").first().empty();

	quotationRequests.forEach((qr) => {
		$("#quotationRequestId")
			.first()
			.append(
				`<option data-tokens="${qr.qrnumber}" value="${qr.id}">${qr.qrnumber}</option>`
			);
	});

	// refresh plugin
	$("#quotationRequestId").selectpicker("refresh");
	$("#quotationRequestId").selectpicker("render");
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
	const response = await Request.send("/api/quotations", "POST", {
		data: data,
	});

	// show output modal based on response
	if (response.status) {
		$("#modalMainForm").modal("hide");
		reloadModule();
		mainWindow.showOutputToast("Success!", response.msg);
		mainWindow.showOutputModal(
			"Quatation request created!.",
			`<h4>Quotation Number: ${response.data.qnumber}</h4>`
		);
	}
};

const loadEntry = async (id) => {
	resetForm();

	// get entry data from db and show in the form
	const response = await Request.send("/api/quotations", "GET", {
		data: { id: id },
	});
	const entry = response.data;

	// fill form inputs
	$("#qnumber").val(entry.qnumber);
	$("#addedDate").val(entry.addedDate);
	$("#validFrom").val(entry.validFrom);
	$("#validTo").val(entry.validTo);

	$("#description").val(entry.description);
	$("#createdEmployee").val(entry.createdEmployee);

	// select dropdowns
	FormUtil.selectDropdownOptionByValue(
		"quotationStatusId",
		entry.quotationStatus.id
	);

	// select proper supplier
	$("#supplierId").val(entry.quotationRequest.supplierId);
	$("#supplierId").selectpicker("render");

	// load supplier quotation requests
	await showSupplierQuotationRequests(entry.quotationRequest.supplierId, "");

	// select proper quotation request
	$("#quotationRequestId").val(entry.quotationRequest.id);
	$("#quotationRequestId").selectpicker("render");

	// show quotation request materials
	await showQuotationRequestMaterials(entry.quotationRequest.id);

	// add to material table
	$("#materialTable tbody").empty();

	entry.quotationMaterials.forEach((qm) => {
		addRowToMaterialTable({
			materialId: qm.materialId,
			materialName: `${qm.material.name} (${qm.material.code})`,
			availableQty: qm.availableQty,
			minimumRequestQty: qm.minimumRequestQty,
			purchasePrice: qm.purchasePrice,
			unitTypeId: qm.unitTypeId,
			unitTypeName: qm.material.unitType.name,
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
	const response = await Request.send("/api/quotations", "PUT", { data: data });

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
		`/api/quotations?data[id]=${id}`,
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
	printQuotation(tempData.selectedEntry);
};

/*-------------------------------------------------------------------------------------------------------
                                          Main Form
-------------------------------------------------------------------------------------------------------*/
const getFormData = () => {
	// data from basic input fields
	const data = {
		supplierId: $("#supplierId").val(),
		quotationRequestId: $("#quotationRequestId").val(),
		validFrom: $("#validFrom").val(),
		validTo: $("#validTo").val(),
		addedDate: $("#addedDate").val(),
		description: $("#description").val(),
		quotationStatusId: $("#quotationStatusId").val(),
	};

	// get data from materials table
	const quotationMaterials = [];
	$("#materialTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const tdMaterialId = $(tds[1]).children().first().data("material-id");
		const tdPurchasePrice = $(tds[2]).children().first().val();
		const tdAvailableQty = $(tds[3]).children().first().val();
		const tdMinimumRequestQty = $(tds[4]).children().first().val();
		const tdUnitTypeId = $(tds[5]).children().first().data("unit-type-id");

		quotationMaterials.push({
			materialId: tdMaterialId,
			purchasePrice: tdPurchasePrice,
			availableQty: tdAvailableQty,
			minimumRequestQty: tdMinimumRequestQty,
			unitTypeId: tdUnitTypeId,
		});
	});

	// add request mateirals to data
	data["quotationMaterials"] = quotationMaterials;

	return data;
};

const validateForm = () => {
	// store error msgs
	let errors = "";

	// ignored inputs for form validation
	const ignoredAttributes = [
		"availableQty",
		"minimumRequestQty",
		"purchasePrice",
		"materialId",
		"unitTypeId",
	];

	// validate regular inputs
	tempData.validationInfo.forEach((vi) => {
		if (ignoredAttributes.includes(vi.attribute)) return;

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

	// validate mini table
	const formData = getFormData();
	const quotationMaterials = formData.quotationMaterials;

	if (quotationMaterials.length == 0) {
		errors += "Please select at least one material!. <br>";
	}

	// check for duplicates & invalid values in the material list
	let foundDuplicates = false;
	let containsInvalidValues = false;

	const ids = [];
	$("#materialTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const tdMaterialId = $(tds[1]).children().first().data("material-id");
		if (ids.includes[tdMaterialId]) {
			foundDuplicates = true;
		}

		ids.push(tdMaterialId);

		const tdPurchasePrice = $(tds[2]).children().first().val();
		const tdAvailableQty = $(tds[3]).children().first().val();
		const tdMinimumRequestQty = $(tds[4]).children().first().val();

		// check if list contains invalid values
		const regex = /^[\d]{1,9}\.[\d]{2}$/;
		if (
			!regex.test(tdPurchasePrice) ||
			!regex.test(tdAvailableQty) ||
			!regex.test(tdMinimumRequestQty)
		) {
			containsInvalidValues = true;
		}
	});

	if (foundDuplicates) {
		errors += "Please remove duplicates from material list!. <br>";
	}

	if (containsInvalidValues) {
		errors +=
			"There are invalid data in the material list!. Please check again. <br>";
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
	$("#supplierId").val("");
	$("#supplierId").selectpicker("render");

	$("#quotationRequestId").first().empty();
	$("#quotationRequestId").selectpicker("refresh");
	$("#quotationRequestId").selectpicker("render");

	$("#materialId").first().empty();
	$("#materialId").selectpicker("refresh");
	$("#materialId").selectpicker("render");

	// empty mini table
	$("#materialTable tbody").empty();

	// remove other classes used for feedbacks
	$("#mainForm *").removeClass("has-error has-success");
	$("#mainForm .form-control-feedback").remove();

	// disable form read only mode if activated
	FormUtil.disableReadOnly("mainForm");
};

/*-------------------------------------------------------------------------------------------------------
                                       Supplier Quotation Reqeusts
-------------------------------------------------------------------------------------------------------*/
const showQuotationRequestMaterials = async (quotationRequestId) => {
	// get relevent quotation request
	const response = await Request.send(
		`/api/quotation_requests?data[id]=${quotationRequestId}`,
		"GET"
	);

	// when request failed
	if (!response.status) return;

	const quotationRequestMaterials = response.data.quotationRequestMaterials;

	// empty values
	$("#materialId").first().empty();

	// show quotation request materials
	quotationRequestMaterials.forEach((qrm) => {
		const mat = qrm.material;
		$("#materialId")
			.first()
			.append(
				`<option data-tokens="${mat.code} - ${mat.name}" value="${mat.id}">${mat.name} (${mat.code})</option>`
			);
	});

	// refresh select picker
	$("#materialId").selectpicker("refresh");
	$("#materialId").selectpicker("render");
};

/*-------------------------------------------------------------------------------------------------------
                                           Material Table
-------------------------------------------------------------------------------------------------------*/

const addToMaterialTable = () => {
	const materialId = $("#materialId").val();
	const materialName = $("#materialId option:selected").text();
	const supplierId = $("#supplierId").val();
	const availableQty = $("#availableQty").val();
	const minimumRequestQty = $("#minimumRequestQty").val();
	const unitTypeId = $("#unitTypeId").val();
	const unitTypeName = $("#unitTypeId option:selected").text();
	const purchasePrice = $("#purchasePrice").val();

	// check if required things are provided
	if (supplierId.trim() == "") {
		mainWindow.showOutputModal("Sorry", "Please select a supplier first!.");
		return;
	}

	if (materialId.trim() == "") {
		mainWindow.showOutputModal("Sorry", "Please select a material first!.");
		return;
	}

	if (
		purchasePrice.trim() == "" ||
		!/^[\d]{1,9}\.[\d]{2}$/.test(purchasePrice)
	) {
		mainWindow.showOutputModal(
			"Sorry",
			"Please provice a valid purchase price!."
		);
		return;
	}

	if (availableQty.trim() == "" || !/^[\d]{1,9}\.[\d]{2}$/.test(availableQty)) {
		mainWindow.showOutputModal(
			"Sorry",
			"Please provice a valid available quantity!."
		);
		return;
	}

	if (
		minimumRequestQty.trim() == "" ||
		!/^[\d]{1,9}\.[\d]{2}$/.test(minimumRequestQty)
	) {
		mainWindow.showOutputModal(
			"Sorry",
			"Please provice a valid minimum request quantity!."
		);
		return;
	}

	if (unitTypeId.trim() == "") {
		mainWindow.showOutputModal(
			"Sorry",
			"Please select a valid unit type first!."
		);
		return;
	}

	// check for duplicates
	let isDuplicate = false;
	$("#materialTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const tdMaterialId = $(tds[1]).children().first().data("material-id");
		if (materialId == tdMaterialId) {
			isDuplicate = true;
		}
	});

	if (isDuplicate) {
		mainWindow.showOutputModal(
			"Sorry",
			"This material is already in the request materials list!."
		);
		return;
	}

	addRowToMaterialTable({
		materialId,
		materialName,
		availableQty,
		minimumRequestQty,
		purchasePrice,
		unitTypeId,
		unitTypeName,
	});
};

const addRowToMaterialTable = (row = {}) => {
	// row data
	const {
		materialId,
		materialName,
		availableQty,
		minimumRequestQty,
		purchasePrice,
		unitTypeId,
		unitTypeName,
	} = row;
	$("#materialTable tbody").append(`
    <tr>
        <td></td>
        <td>
          <span data-material-id="${materialId}">${materialName}</span>
        </td>
        <td>
          <input class="form-control" type="text" value="${purchasePrice}">
        </td>
        <td>
          <input class="form-control" type="text" value="${availableQty}">
        </td>
        <td>
          <input class="form-control" type="text" value="${minimumRequestQty}">
        </td>
        <td>
          <span data-unit-type-id="${unitTypeId}">${unitTypeName}</span>
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="removeFromMaterialTable(this)">
            <i class="glyphicon glyphicon-edit" aria-hidden="true"></i> 
              Delete
          </button>
        </td>
    </tr>
    `);

	updateMaterialTableIndex();
};

// updates index column of the mateiral table
const updateMaterialTableIndex = () => {
	$("#materialTable tbody tr").each((index, tr) => {
		const indexTd = $(tr).children().first();
		indexTd.html(index + 1);
	});
};

const removeFromMaterialTable = (button) => {
	$(button).parent().parent().remove();

	updateMaterialTableIndex();
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
	$("#modalMainFormTitle").text("Add New Quotation");
	// set date of adding
	$("#mainForm #addedDate").val(new Date().today());

	// set limits for valid from and valid to
	const date = new Date();
	const validFrom = $("#mainForm #validFrom");
	const validTo = $("#mainForm #validTo");
	validFrom.attr("min", date.formatForInput());
	validTo.attr("min", date.formatForInput());

	// empty qrnumber
	$("#mainForm #qnumber").val(
		"Quotation number will be displayed after adding."
	);
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
			$("#modalMainFormTitle").text("View Quotation");
		} else {
			FormUtil.disableReadOnly("mainForm");
			FormUtil.setButtionsVisibility("mainForm", tempData.permission, "edit");
			$("#modalMainFormTitle").text("Edit Quotation");
			// hide from deleted button when deleted
			if (
				$("#mainForm #quotationStatusId option:selected").text() == "Deleted"
			) {
				$(".btnFmDelete").hide();
			}
		}
	});
};
