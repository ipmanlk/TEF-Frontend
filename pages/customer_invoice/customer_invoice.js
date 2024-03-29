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
		data: { module: "CUSTOMER_INVOICE" },
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
				Code: entry.code,
				"Net Total": entry.netTotal,
				"Payed Amount": entry.payedAmount,
				Method: entry.customerPaymentMethod.name,
				Status: entry.customerInvoiceStatus.name,
				View: `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
				Edit: `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
				Delete: `${
					entry.customerInvoiceStatus.name == "Deleted"
						? '<button style="display:none">Delete</button>'
						: `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`
				}`,
			};
		});
	};
	window.mainTable = new DataTable(
		"mainTableHolder",
		"/api/customer_invoices",
		permission,
		dataBuilderFunction,
		"Purchase Orders List"
	);

	// if customer invoice id is provided in url
	const urlParams = new URLSearchParams(window.location.search);
	const show = urlParams.get("show");
	if (show) {
		showEditEntryModal(show, true);
	}
}

const loadFormDropdowns = async () => {
	// define needed attributes
	let customers,
		productPackages,
		paymentMethods,
		invoiceStatuses,
		customerTypes;

	// get data from the api for each dropbox
	response = await Request.send("/api/customers?data[limit]=0", "GET");
	customers = response.data;

	response = await Request.send("/api/product_packages?data[limit]=0", "GET");
	productPackages = response.data;

	response = await Request.send(
		"/api/general?data[table]=customer_payment_method",
		"GET"
	);
	paymentMethods = response.data;

	response = await Request.send(
		"/api/general?data[table]=customer_invoice_status",
		"GET"
	);
	invoiceStatuses = response.data;

	response = await Request.send(
		"/api/general?data[table]=customer_invoice_customer_type",
		"GET"
	);
	customerTypes = response.data;

	// clean existing options and append new data
	$("#customerId").empty();
	$("#productPackageId").empty();
	$("#customerPaymentMethodId").empty();
	$("#customerInvoiceStatusId").empty();
	$("#customerInvoiceCustomerTypeId").empty();

	customers.forEach((cus) => {
		let name = !cus.companyName ? cus.customerName : cus.companyName;
		$("#customerId").append(
			`<option value="${cus.id}">${name} (${cus.number})</option>`
		);
	});

	productPackages.forEach((pkg) => {
		$("#productPackageId").append(
			`<option value="${pkg.id}">${pkg.name} (${pkg.code})</option>`
		);
	});

	paymentMethods.forEach((pm) => {
		$("#customerPaymentMethodId").append(
			`<option value="${pm.id}">${pm.name}</option>`
		);
	});

	invoiceStatuses.forEach((st) => {
		$("#customerInvoiceStatusId").append(
			`<option value="${st.id}">${st.name}</option>`
		);
	});

	customerTypes.forEach((ct) => {
		$("#customerInvoiceCustomerTypeId").append(
			`<option value="${ct.id}">${ct.name}</option>`
		);
	});

	// init bootstrap-select
	$("#customerId").selectpicker();
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

	// event listeners for bootstrap-select componnets
	$("#productPackageId").on("changed.bs.select", function (e) {
		showProductPackageInfo(e.target.value);
	});

	$("#customerId").on("changed.bs.select", function (e) {
		showCustomerOrdersAndInfo(e.target.value);
	});

	$("#customerOrderId").on("changed.bs.select", function (e) {
		$("#productPackageTable tbody").empty();
		showCustomerOrderInfo(e.target.value);
	});

	$("#customerInvoiceCustomerTypeId").on("change", function (e) {
		const customerType = $(
			"#customerInvoiceCustomerTypeId option:selected"
		).text();
		showCustomerInfo(customerType);
	});

	// calculate line total
	$("#requestedQty, #deliveredQty").on("keyup change", function () {
		const salePrice = $("#salePrice").val().trim();
		const deliveredQty = $("#deliveredQty").val().trim();

		if (!isNaN(salePrice) && !isNaN(deliveredQty)) {
			$("#lineTotal").val(parseFloat(salePrice * deliveredQty).toFixed(2));
		} else {
			$("#lineTotal").val("0.00");
		}
	});

	// calculate net total when grand total or discounted radio has changed
	$("#grandTotal, #discountRatio").on("keyup change", function () {
		const grandTotal = $("#grandTotal").val();
		let discountRatio = $("#discountRatio").val();
		let customerBalance = 0;

		if (tempData.selectedCustomer) {
			customerBalance = tempData.selectedCustomer.toBePaid || 0;
		}

		if (!isNaN(grandTotal) && !isNaN(discountRatio)) {
			// calcualte net total
			const netTotal = grandTotal - grandTotal * (discountRatio / 100);
			const customerTotal = netTotal + parseFloat(customerBalance);
			// show net total
			$("#netTotal").val(netTotal.toFixed(2));
			$("#cusTotalAmount").val(customerTotal.toFixed(2));
		} else {
			$("#netTotal").val("0.00");
		}
	});

	// payed amount
	$("#payedAmount").on("keyup change", function () {
		const customerTotal = parseFloat($("#cusTotalAmount").val());
		const payedAmount = parseFloat($("#payedAmount").val());

		if (!isNaN(payedAmount) && !isNaN(customerTotal)) {
			// calculate balance
			let balance;

			if (payedAmount >= customerTotal) {
				balance = 0;
			} else {
				balance = customerTotal - payedAmount;
			}
			// show balance
			$("#balance").val(balance.toFixed(2));
		} else {
			$("#balance").val("0.00");
		}
	});

	// payment method show hide
	$("#customerPaymentMethodId").on("change", () => {
		const method = $("#customerPaymentMethodId option:selected").text();
		showPaymentMethod(method);
	});

	// make delivered amount equal to request amount when requested amount is changing
	$("#requestedQty").on("keyup change", function (e) {
		$("#deliveredQty").val(e.target.value);
	});

	// format decimal inputs automatically
	$("#discountRatio, #payedAmount").on("blur", (e) => {
		const value = e.target.value;
		if (!isNaN(value) && value.trim() != "") {
			e.target.value = parseFloat(value).toFixed(2);
			$(e.target).trigger("keyup");
		}
	});
};

/*-------------------------------------------------------------------------------------------------------
                           Functions for Multi-Select Dropdowns
-------------------------------------------------------------------------------------------------------*/

// this function will run when supplierId select box is changed
const showProductPackageInfo = async (productPackageId) => {
	const response = await Request.send("/api/product_packages", "GET", {
		data: {
			id: productPackageId,
		},
	});

	// if request failed
	if (!response.status) return;

	const data = response.data;

	$("#salePrice").val(data.salePrice);
	$("#availableQty").val(data.availableQty);
};

const showCustomerOrdersAndInfo = async (customerId) => {
	// fill customer details
	let response = await Request.send("/api/customers", "GET", {
		data: {
			id: customerId,
		},
	});

	// if request failed
	if (!response.status) return;

	const customer = response.data;

	// // save globally
	// tempData.selectedCustomer = customer;
	$("#existingArrears").val(customer.toBePaid);
	$("#maxArrears").val(customer.maxToBePaid);

	// show customer orders
	response = await Request.send("/api/customer_orders", "GET", {
		data: {
			customerId: customerId,
			customerOrderStatusName: "Active",
		},
	});

	const customerOrders = response.data;

	// cross check each customer order with production inventory and filter out unfuilfiable ones
	const invResponse = await Request.send("/api/production_inventory", "GET");

	const productionInventory = invResponse.data;

	const filteredCustomerOrders = [];

	for (const co of customerOrders) {
		const coRes = await Request.send("/api/customer_orders", "GET", {
			data: { id: co.id },
		});
		const customerOrder = coRes.data;

		let fulfillable = true;
		for (const pkg of customerOrder.customerOrderProductPackages) {
			const inventoryEntry = productionInventory.find(
				(i) => i.productPackage.id == pkg.productPackage.id
			);

			if (inventoryEntry.availableQty < pkg.qty) {
				fulfillable = false;
			}
		}

		if (fulfillable) {
			filteredCustomerOrders.push(co);
		}
	}

	// update select picker options
	$("#customerOrderId").first().empty();

	filteredCustomerOrders.forEach((co) => {
		$("#customerOrderId")
			.first()
			.append(
				`<option data-tokens="${co.cocode}" value="${co.id}">${co.cocode}</option>`
			);
	});

	// refresh plugin
	$("#customerOrderId").selectpicker("refresh");
	$("#customerOrderId").selectpicker("render");
};

const showCustomerOrderInfo = async (customerOrderId) => {
	const response = await Request.send("/api/customer_orders", "GET", {
		data: {
			id: customerOrderId,
		},
	});

	// if request failed
	if (!response.status) return;

	const data = response.data;

	$("#grandTotal").val(data.grandTotal);
	$("#discountRatio").val(data.discountRatio);
	$("#discountRatio").trigger("change");
	$("#netTotal").val(data.netTotal);

	data.customerOrderProductPackages.forEach((pkg) => {
		addRowToProductPackageTable({
			productPackageId: pkg.productPackageId,
			productPackageName: `${pkg.productPackage.name} (${pkg.productPackage.code})`,
			salePrice: pkg.salePrice,
			requestedQty: pkg.qty,
			deliveredQty: pkg.qty,
			lineTotal: pkg.lineTotal,
		});
	});
};

const showCustomerInfo = (customerType) => {
	switch (customerType) {
		case "Registered Customer":
			$("#customerInfo").show();
			break;
		case "Unregistered Customer":
			$("#customerInfo").hide();
			break;
	}
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
                                Entry Related Requests (POST, PUT, DELETE, PRINT)
-------------------------------------------------------------------------------------------------------*/
const addEntry = async () => {
	const { status, data } = validateForm();

	if (!status) {
		mainWindow.showOutputModal("Sorry!", data);
		return;
	}

	// send post reqeust to save data
	const response = await Request.send("/api/customer_invoices", "POST", {
		data: data,
	});

	// show output modal based on response
	if (response.status) {
		$("#modalMainForm").modal("hide");
		reloadModule();
		mainWindow.showOutputToast("Success!", response.msg);
		mainWindow.showOutputModal(
			"Customer Invoice Created!.",
			`<h4>Invoice Code: ${response.data.code}</h4>`
		);
	}
};

const loadEntry = async (id) => {
	resetForm();

	// get entry data from db and show in the form
	const response = await Request.send("/api/customer_invoices", "GET", {
		data: { id: id },
	});
	const entry = response.data;

	// show proper customer type info
	showCustomerInfo(entry.customerInvoiceCustomerType.name);

	// show proper payment method
	showPaymentMethod(entry.customerPaymentMethod.name);

	// fill form inputs
	Object.keys(entry).forEach((key) => {
		$(`#${key}`).val(entry[key]);
	});

	// select multi select dropdown values if there is a customer
	if (entry.customer) {
		$("#customerId").selectpicker("val", entry.customer.id);
		await showCustomerOrdersAndInfo(entry.customer.id);
	}

	if (entry.customerOrder) {
		$("#customerOrderId").selectpicker("val", entry.customerOrder.id);
	}

	// select dropdowns
	FormUtil.selectDropdownOptionByValue(
		"customerInvoiceStatusId",
		entry.customerInvoiceStatus.id
	);

	FormUtil.selectDropdownOptionByValue(
		"customerPaymentMethodId",
		entry.customerPaymentMethod.id
	);

	FormUtil.selectDropdownOptionByValue(
		"customerInvoiceCustomerTypeId",
		entry.customerInvoiceCustomerType.id
	);

	// fill mini table
	$("#productPackageTable tbody").empty();

	entry.customerInvoiceProductPackages.forEach((pkg) => {
		addRowToProductPackageTable({
			productPackageId: pkg.productPackageId,
			productPackageName: `${pkg.productPackage.name} (${pkg.productPackage.code})`,
			salePrice: pkg.salePrice,
			requestedQty: pkg.requestedQty,
			deliveredQty: pkg.deliveredQty,
			lineTotal: pkg.lineTotal,
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
	const response = await Request.send("/api/customer_invoices", "PUT", {
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
		`/api/customer_invoices?data[id]=${id}`,
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
	printInvoice(tempData.selectedEntry);
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
	const productPackages = [];
	$("#productPackageTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const tdProductPkgId = $(tds[1])
			.children()
			.first()
			.data("product-package-id");
		const tdSalePrice = $(tds[2]).children().first().data("sale-price");
		const tdRequestedQty = $(tds[3]).children().first().data("requested-qty");
		const tdDeliveredQty = $(tds[4]).children().first().val();
		const tdLineTotal = $(tds[5]).children().first().data("line-total");

		productPackages.push({
			productPackageId: tdProductPkgId,
			salePrice: tdSalePrice,
			requestedQty: tdRequestedQty,
			deliveredQty: tdDeliveredQty,
			lineTotal: tdLineTotal,
		});
	});

	// add product pkg details to data
	data["productPackages"] = productPackages;

	return data;
};

const validateForm = () => {
	// store error msgs
	let errors = "";

	// ignored inputs for form validation
	const ignoredAttributes = [
		"productPackageId",
		"salePrice",
		"requestedQty",
		"deliveredQty",
		"lineTotal",
	];

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

	if (formData.productPackages.length == 0) {
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

		const tdRequestedQty = $(tds[3]).children().first().data("requested-qty");
		const tdDeliveredQty = $(tds[4]).children().first().val();

		// check if list contains invalid values
		const regex = /^[\d]{1,9}$/;
		if (!regex.test(tdRequestedQty) || !regex.test(tdDeliveredQty)) {
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

	// if customer is unregistered and there is balance
	const customerType = $(
		"#customerInvoiceCustomerTypeId option:selected"
	).text();
	const customerBalance = parseFloat($("#balance").val()) || 0;
	if (customerType == "Unregistered Customer" && customerBalance > 0) {
		errors += "Unregistered customers must make the full payment!. <br>";
	}

	// if customer type is registered check balance is greater than allowed arrears
	const maxArrears = parseFloat($("#maxArrears").val()) || 0;
	if (customerType == "Registered Customer" && maxArrears < customerBalance) {
		errors += "Total arrears can't exceed the maximum allowed amount!. <br>";
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
	$("#customerId").val("");
	$("#customerId").selectpicker("render");

	$("#productPackageId").val("");
	$("#productPackageId").selectpicker("render");

	$("#customerOrderId").first().empty();
	$("#customerOrderId").selectpicker("refresh");
	$("#customerOrderId").selectpicker("render");

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
	const salePrice = $("#salePrice").val();
	const requestedQty = $("#requestedQty").val();
	const deliveredQty = $("#deliveredQty").val();
	const lineTotal = $("#lineTotal").val();
	const availableQty = $("#availableQty").val();

	// check if required things are provided
	if (productPackageId.trim() == "") {
		mainWindow.showOutputModal(
			"Sorry",
			"Please select a product package first!."
		);
		return;
	}

	if (salePrice.trim() == "" || !/^[\d]{1,9}\.[\d]{2}$/.test(salePrice)) {
		mainWindow.showOutputModal("Sorry", "Please provide a valid sale price!.");
		return;
	}

	if (requestedQty.trim() == "" || !/^[\d]{1,5}$/.test(requestedQty)) {
		mainWindow.showOutputModal(
			"Sorry",
			"Please provide a valid requested qty!."
		);
		return;
	}

	if (deliveredQty.trim() == "" || !/^[\d]{1,5}$/.test(deliveredQty)) {
		mainWindow.showOutputModal(
			"Sorry",
			"Please provide a valid delivered qty!."
		);
		return;
	}

	// check if available qty
	if (parseFloat(availableQty) < parseFloat(deliveredQty)) {
		mainWindow.showOutputModal(
			"Sorry",
			"Delivered quantity is higher than the available quantity!."
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
		salePrice,
		requestedQty,
		deliveredQty,
		lineTotal,
	});
};

const addRowToProductPackageTable = (row = {}) => {
	// row data
	const {
		productPackageId,
		productPackageName,
		salePrice,
		requestedQty,
		deliveredQty,
		lineTotal,
	} = row;
	$("#productPackageTable tbody").append(`
    <tr>
        <td></td>
        <td>
          <span data-product-package-id="${productPackageId}">${productPackageName}</span>
        </td>
        <td>
          <span data-sale-price="${salePrice}">${salePrice}</span>
        </td>
        <td>
          <span data-requested-qty="${requestedQty}">${requestedQty}</span>
        </td>
        <td>
          <input class="form-control" type="text" value="${deliveredQty}"/>
        </td>
        <td>
          <span data-line-total="${lineTotal}">${lineTotal}</span>
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

// updates index column of product pkg and other data
const refreshProductPackageTable = () => {
	$("#productPackageTable tbody tr").each((index, tr) => {
		// update index
		const tds = $(tr).children();
		const indexTd = $(tds[0]);
		indexTd.html(index + 1);
		// update line total
		const salePrice = parseFloat(
			$(tds[2]).children().first().data("sale-price")
		);
		const deliveredQty = parseFloat($(tds[4]).children().first().val());

		if (!isNaN(salePrice) && !isNaN(deliveredQty)) {
			const lineTotal = salePrice * deliveredQty;
			$(tds[5]).html(
				`<span data-line-total="${lineTotal.toFixed(2)}">${lineTotal.toFixed(
					2
				)}</span>`
			);
		}
	});

	// update grand total
	let grandTotal = 0;
	$("#productPackageTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const tdLineTotal = $(tds[5]).children().first().data("line-total");
		grandTotal += parseFloat(tdLineTotal);
	});

	// show total price
	$("#grandTotal").val(grandTotal.toFixed(2));
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
	$("#modalMainFormTitle").text("Create New Invoice");
	// set date of adding
	$("#mainForm #addedDate").val(new Date().today());
	// empty code
	$("#mainForm #code").val("Invoice code will be displayed after adding.");
	// show modal
	$("#modalMainForm").modal("show");
};

const showEditEntryModal = (id, readOnly = false) => {
	loadEntry(id).then(() => {
		$("#modalMainForm").modal("show");

		if (readOnly) {
			FormUtil.enableReadOnly("mainForm");
			FormUtil.setButtionsVisibility("mainForm", tempData.permission, "view");
			$("#modalMainFormTitle").text("View Invoice");
		} else {
			FormUtil.disableReadOnly("mainForm");
			FormUtil.setButtionsVisibility("mainForm", tempData.permission, "edit");
			$("#modalMainFormTitle").text("Edit Invoice");
			// hide form deleted button when deleted
			if (tempData.selectedEntry.customerInvoiceStatus.name == "Deleted") {
				$(".btnFmDelete").hide();
			}
		}
	});
};
