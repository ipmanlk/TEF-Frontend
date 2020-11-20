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

	await loadFormDropdowns();
	registerEventListeners();

	// hide add button
	if (permission[0] == 0) {
		$("#btnTopAddEntry").hide();
	} else {
		$("#btnTopAddEntry").show();
	}
}

const registerEventListeners = () => {
	// prevent default form submission event
	$("form").on("submit", (e) => e.preventDefault());

	// event listeners for buttons
	$("#btnTopAddEntry").on("click", showNewEntryModal);
	$(".btnFmAdd").on("click", addEntry);
};

const loadFormDropdowns = async () => {
	// define needed attributes
	let productPackages;

	// get data from the api for each dropbox
	response = await Request.send("/api/product_packages?data[limit]=0", "GET");
	productPackages = response.data;

	// clean existing options and append new data
	$("#productPackageId").empty();

	productPackages.forEach((pkg) => {
		$("#productPackageId").append(
			`<option value="${pkg.id}">${pkg.name} (${pkg.code})</option>`
		);
	});

	// init bootstrap-select
	$("#productPackageId").selectpicker();
};

/*-------------------------------------------------------------------------------------------------------
                                            Modals
-------------------------------------------------------------------------------------------------------*/

const showNewEntryModal = () => {
	// reset form values
	// resetForm();
	FormUtil.disableReadOnly("mainForm");

	// set modal title
	$("#modalMainFormTitle").text("Add Product Packages");

	// show modal
	$("#modalMainForm").modal("show");
};

/*-------------------------------------------------------------------------------------------------------
                                Entry Related Requests (POST, PUT, DELETE, PRINT)
-------------------------------------------------------------------------------------------------------*/
const addEntry = async () => {
	const productPackageId = $("#productPackageId").val();
	const productPackageName = $("#productPackageId option:selected").text();
	const qty = $("#qty").val();

	if (isNaN(productPackageId) || isNaN(qty)) {
		mainWindow.showOutputModal(
			"Sorry!. Please fix these problems first.",
			"Please select a valid product package and qty first!."
		);
		return;
	}

	// confirm the action
	const confirm = window.confirm(
		`This will add ${qty} ${productPackageName} to the inventory. Do you want to continue?.`
	);

	if (!confirm) return;

	// send post reqeust to save data
	const response = await Request.send("/api/production_inventory", "POST", {
		data: {
			productPackageId,
			qty,
		},
	});

	// show output modal based on response
	if (response.status) {
		$("#modalMainForm").modal("hide");
		reloadModule();
		mainWindow.showOutputToast("Success!", response.msg);
		mainWindow.showOutputModal(
			"Success!.",
			"Product packages have been added!"
		);
	}
};

const resetForm = () => {
	$("#mainForm input").val("");

	// deselect select pickers
	$("#productPackageId").val("");
	$("#productPackageId").selectpicker("render");
};

const reloadModule = () => {
	resetForm();
	mainTable.reload();
};
