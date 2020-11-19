const tempData = {
	validationInfo: null,
	selectedEntry: null,
	permission: null,
	selectedQuotation: null,
};

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
	// get regexes for validation and store on window tempData
	const response = await Request.send("/api/regexes", "GET", {
		data: { module: "PURCHASE_ORDER" },
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
				Code: entry.pocode,
				"Quotation No.": entry.quotation.qnumber,
				"Required Date": entry.requiredDate,
				Total: entry.totalPrice,
				Status: entry.purchaseOrderStatus.name,
				View: `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
				Edit: `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
				Delete: `${
					entry.purchaseOrderStatus.name == "Deleted"
						? ""
						: `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`
				}`,
			};
		});
	};
	window.mainTable = new DataTable(
		"mainTableHolder",
		"/api/purchase_orders",
		permission,
		dataBuilderFunction,
		"Purchase Orders List"
	);
}

const loadFormDropdowns = async () => {
	// define needed attributes
	let response, suppliers, purchaseOrderStatuses, unitTypes;

	// get data from the api for each dropbox
	response = await Request.send("/api/suppliers?data[limit]=0", "GET");
	suppliers = response.data;

	response = await Request.send(
		"/api/general?data[table]=purchase_order_status",
		"GET"
	);
	purchaseOrderStatuses = response.data;

	response = await Request.send("/api/general?data[table]=unit_type", "GET");
	unitTypes = response.data;

	// clean existing options and append new data
	$("#supplierId").empty();
	$("#purchaseOrderStatusId").empty();
	$("#unitTypeId").empty();

	suppliers.forEach((sup) => {
		// show company name for companies and person name for individuals
		let name = sup.companyName ? sup.companyName : sup.personName;
		$("#supplierId").append(
			`<option data-tokens="${sup.code} - ${name}" value="${sup.id}">${name} (${sup.code})</option>`
		);
	});

	purchaseOrderStatuses.forEach((pos) => {
		$("#purchaseOrderStatusId").append(
			`<option value="${pos.id}">${pos.name}</option>`
		);
	});

	unitTypes.forEach((ut) => {
		$("#unitTypeId").append(`<option value="${ut.id}">${ut.name}</option>`);
	});

	// init bootstrap-select
	$("#supplierId").selectpicker();
	$("#materialId").selectpicker();
	$("#quotationId").selectpicker();
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
		showSupplierQuotations(e.target.value);
	});

	$("#quotationId").on("changed.bs.select", function (e) {
		$("#materialTable tbody").empty();
		showQuotationMaterials(e.target.value);
	});

	$("#materialId").on("changed.bs.select", function (e) {
		showQuotationMaterialInfo(e.target.value);
	});

	// calculate line total on add to material list
	$("#purchasePrice, #qty").on("keyup change", function () {
		const purchasePrice = $("#purchasePrice").val().trim();
		const qty = $("#qty").val().trim();

		if (!isNaN(purchasePrice) && !isNaN(qty)) {
			$("#lineTotal").val(parseFloat(purchasePrice * qty).toFixed(2));
		} else {
			$("#lineTotal").val("0.00");
		}
	});

	// format decimal inputs automatically
	$("#qty").on("blur", (e) => {
		const value = e.target.value;
		if (!isNaN(value)) {
			e.target.value = parseFloat(value).toFixed(2);
			$(e.target).trigger("keyup");
		}
	});
};

/*-------------------------------------------------------------------------------------------------------
                           Functions for Multi-Select Dropdowns
-------------------------------------------------------------------------------------------------------*/

// this function will run when supplierId select box is changed
const showSupplierQuotations = async (
	supplierId,
	quotationStatusName = "Active"
) => {
	// load supplier quotation requests
	const response = await Request.send("/api/supplier_quotations", "GET", {
		data: {
			supplierId: supplierId,
			quotationStatusName: quotationStatusName,
		},
	});

	// if request failed
	if (!response.status) return;

	const quotations = response.data;

	// update select picker options
	$("#quotationId").first().empty();

	quotations.forEach((q) => {
		$("#quotationId")
			.first()
			.append(
				`<option data-tokens="${q.qnumber}" value="${q.id}">${q.qnumber}</option>`
			);
	});

	// refresh plugin
	$("#quotationId").selectpicker("refresh");
	$("#quotationId").selectpicker("render");
};

const showQuotationMaterials = async (quotationId) => {
	// get relevent quotation request
	const response = await Request.send(
		`/api/quotations?data[id]=${quotationId}`,
		"GET"
	);

	// when request failed
	if (!response.status) return;

	// save globally for later use
	tempData.selectedQuotation = response.data;

	const quotationMaterials = response.data.quotationMaterials;

	// empty values
	$("#materialId").first().empty();

	// show quotation materials
	quotationMaterials.forEach((qm) => {
		const mat = qm.material;
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

const showQuotationMaterialInfo = (materialId) => {
	const quotationMaterials = tempData.selectedQuotation.quotationMaterials;
	const material = quotationMaterials.find(
		(mat) => mat.materialId == materialId
	);
	$("#purchasePrice").val(material.purchasePrice);
	$("#minimumRequestQty").val(material.minimumRequestQty);
	$("#availableQty").val(material.availableQty);
	FormUtil.selectDropdownOptionByValue("unitTypeId", material.unitTypeId);
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
	const response = await Request.send("/api/purchase_orders", "POST", {
		data: data,
	});

	// show output modal based on response
	if (response.status) {
		$("#modalMainForm").modal("hide");
		reloadModule();
		mainWindow.showOutputToast("Success!", response.msg);
		mainWindow.showOutputModal(
			"Purchase order created!.",
			`<h4>Purchase Order Code: ${response.data.pocode}</h4>`
		);
	}
};

const loadEntry = async (id) => {
	resetForm();

	// get entry data from db and show in the form
	const response = await Request.send("/api/purchase_orders", "GET", {
		data: { id: id },
	});
	const entry = response.data;

	// fill form inputs
	$("#pocode").val(entry.pocode);
	$("#addedDate").val(entry.addedDate);
	$("#requiredDate").val(entry.requiredDate);
	$("#totalPrice").val(entry.totalPrice);

	$("#description").val(entry.description);
	$("#createdEmployee").val(entry.createdEmployee);

	// select dropdowns
	FormUtil.selectDropdownOptionByValue(
		"purchaseOrderStatusId",
		entry.purchaseOrderStatus.id
	);

	// select proper supplier
	$("#supplierId").val(entry.quotation.quotationRequest.supplierId);
	$("#supplierId").selectpicker("render");

	// load supplier quotations
	await showSupplierQuotations(entry.quotation.quotationRequest.supplierId, "");

	// select proper quotation
	$("#quotationId").val(entry.quotation.id);
	$("#quotationId").selectpicker("render");

	// show quotation materials
	await showQuotationMaterials(entry.quotation.id);

	// add to material table
	$("#materialTable tbody").empty();

	entry.purchaseOrderMaterials.forEach((pom) => {
		addRowToMaterialTable({
			materialId: pom.material.id,
			materialName: `${pom.material.name} (${pom.material.code})`,
			qty: pom.qty,
			purchasePrice: pom.purchasePrice,
			unitTypeId: pom.material.unitType.id,
			unitTypeName: pom.material.unitType.name,
			lineTotal: pom.lineTotal,
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
	const response = await Request.send("/api/purchase_orders", "PUT", {
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
		`/api/purchase_orders?data[id]=${id}`,
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
	printPurchaseOrder(tempData.selectedEntry);
};

/*-------------------------------------------------------------------------------------------------------
                                          Main Form
-------------------------------------------------------------------------------------------------------*/
const getFormData = () => {
	// data from basic input fields
	const data = {
		supplierId: $("#supplierId").val(),
		quotationId: $("#quotationId").val(),
		requiredDate: $("#requiredDate").val(),
		addedDate: $("#addedDate").val(),
		description: $("#description").val(),
		purchaseOrderStatusId: $("#purchaseOrderStatusId").val(),
		totalPrice: $("#totalPrice").val(),
	};

	// get data from materials table
	const purchaseOrderMaterials = [];
	$("#materialTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const tdMaterialId = $(tds[1]).children().first().data("material-id");
		const tdPurchasePrice = $(tds[2]).children().first().data("purchase-price");
		const tdQty = $(tds[3]).children().first().data("qty");
		const tdLineTotal = $(tds[4]).children().first().data("line-total");
		const tdUnitTypeId = $(tds[5]).children().first().data("unit-type-id");

		purchaseOrderMaterials.push({
			materialId: tdMaterialId,
			purchasePrice: tdPurchasePrice,
			qty: tdQty,
			lineTotal: tdLineTotal,
			unitTypeId: tdUnitTypeId,
		});
	});

	// add purchase order mateirals to data
	data["purchaseOrderMaterials"] = purchaseOrderMaterials;

	return data;
};

const validateForm = () => {
	// store error msgs
	let errors = "";

	// ignored inputs for form validation
	const ignoredAttributes = [
		"qty",
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

	if (formData.purchaseOrderMaterials.length == 0) {
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

		const tdPurchasePrice = $(tds[2]).children().first().data("purchase-price");
		const tdQty = $(tds[3]).children().first().data("qty");

		// check if list contains invalid values
		const regex = /^[\d]{1,9}\.[\d]{2}$/;
		if (!regex.test(tdPurchasePrice) || !regex.test(tdQty)) {
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

	$("#quotationId").first().empty();
	$("#quotationId").selectpicker("refresh");
	$("#quotationId").selectpicker("render");

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
                                           Material Table
-------------------------------------------------------------------------------------------------------*/

const addToMaterialTable = () => {
	const materialId = $("#materialId").val();
	const materialName = $("#materialId option:selected").text();
	const supplierId = $("#supplierId").val();
	const qty = $("#qty").val();
	const lineTotal = $("#lineTotal").val();
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

	if (qty.trim() == "" || !/^[\d]{1,9}\.[\d]{2}$/.test(qty)) {
		mainWindow.showOutputModal("Sorry", "Please provice a valid quantity!.");
		return;
	}

	if (unitTypeId.trim() == "") {
		mainWindow.showOutputModal(
			"Sorry",
			"Please select a valid unit type first!."
		);
		return;
	}

	// check if qty is between min order amount and max order amount
	const minQty = parseFloat($("#minimumRequestQty").val());
	const maxQty = parseFloat($("#availableQty").val());

	if (qty < minQty || qty > maxQty) {
		mainWindow.showOutputModal(
			"Sorry",
			"Please enter a quantity between min. order qty and max. order qty."
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
			"This material is already in the materials list!."
		);
		return;
	}

	addRowToMaterialTable({
		materialId,
		materialName,
		qty,
		purchasePrice,
		unitTypeId,
		unitTypeName,
		lineTotal,
	});
};

const addRowToMaterialTable = (row = {}) => {
	// row data
	const {
		materialId,
		materialName,
		qty,
		purchasePrice,
		unitTypeId,
		unitTypeName,
		lineTotal,
	} = row;
	$("#materialTable tbody").append(`
    <tr>
        <td></td>
        <td>
          <span data-material-id="${materialId}">${materialName}</span>
        </td>
        <td>
          <span data-purchase-price="${purchasePrice}">${purchasePrice}</span>
        </td>
        <td>
          <span data-qty="${qty}">${qty}</span>
        </td>
        <td>
          <span data-line-total="${lineTotal}">${lineTotal}</span>
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

	refreshMaterialTable();
};

// updates index column of the mateiral table and purchase order total
const refreshMaterialTable = () => {
	$("#materialTable tbody tr").each((index, tr) => {
		const indexTd = $(tr).children().first();
		indexTd.html(index + 1);
	});

	// update purchase order total as well
	let totalPrice = 0;
	$("#materialTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const tdLineTotal = $(tds[4]).children().first().data("line-total");
		totalPrice += parseFloat(tdLineTotal);
	});

	// show total price
	$("#totalPrice").val(totalPrice.toFixed(2));
};

const removeFromMaterialTable = (button) => {
	$(button).parent().parent().remove();

	refreshMaterialTable();
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
	$("#modalMainFormTitle").text("Add New Purchase Order");
	// set date of adding
	$("#mainForm #addedDate").val(new Date().today());
	// empty pocode
	$("#mainForm #pocode").val(
		"Purchase order code will be displayed after adding."
	);
	// set limits for required date
	$("#requiredDate").attr("min", new Date().addDays(1).formatForInput());
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
			$("#modalMainFormTitle").text("View Purchase Order");
		} else {
			FormUtil.disableReadOnly("mainForm");
			FormUtil.setButtionsVisibility("mainForm", tempData.permission, "edit");
			$("#modalMainFormTitle").text("Edit Purchase Order");
			// hide from deleted button when deleted
			if (
				$("#mainForm #purchaseOrderStatusId option:selected").text() ==
				"Deleted"
			) {
				$(".btnFmDelete").hide();
			}
		}
	});
};
