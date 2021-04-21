const tempData = {
	selectedProductionOrder: null,
};

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

	$("#productionOrderId").on("changed.bs.select", function (e) {
		showProductionOrderProductPackages(e.target.value);
	});
};

const loadFormDropdowns = async () => {
	// define needed attributes
	let productionOrders;

	// get data from the api for each dropbox
	let response = await Request.send("/api/production_orders_by_status", "GET", {
		data: { productionOrderStatusName: "Confirmed" },
	});
	productionOrders = response.data;

	// clean existing options and append new data
	$("#productionOrderId").empty();

	productionOrders.forEach((po) => {
		$("#productionOrderId").append(
			`<option value="${po.id}">${po.code}</option>`
		);
	});

	// init bootstrap-select
	$("#productionOrderId").selectpicker();
};

const showProductionOrderProductPackages = async (productionOrderId) => {
	const response = await Request.send("/api/production_orders", "GET", {
		data: { id: productionOrderId },
	});

	const entry = response.data;

	// save globally
	tempData.selectedProductionOrder = entry;

	// fill mini table
	$("#productPackageTable tbody").empty();

	entry.productionOrderProductPackages.forEach((pkg, index) => {
		$("#productPackageTable tbody").append(`
    <tr>
        <td>${index + 1}</td>
        <td>
          <span data-product-package-id="${pkg.productPackageId}">
					${pkg.productPackage.name} (${pkg.productPackage.code})
					</span>
        </td>
        <td>
          <span data-requested-qty="${pkg.qty}">${pkg.qty}</span>
        </td>
    </tr>
    `);
	});
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
	const productionOrder = tempData.selectedProductionOrder;

	// confirm the action
	const confirm = window.confirm(
		`These product packages will be added to the inventory and production order ${productionOrder.code} will be marked as completed. Do you wish to continue?.`
	);

	if (!confirm) return;

	let response;
	// send post reqeust to save data
	response = await Request.send("/api/production_inventory", "POST", {
		data: {
			productionOrderId: productionOrder.id,
			productPackages: productionOrder.productionOrderProductPackages,
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
