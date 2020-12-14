const tempData = {
	selectedEntry: null,
	selectedEntryMaterials: null,
};

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
	await loadFormDropdowns();
	registerEventListeners();

	// load main table
	const dataBuilderFunction = (responseData) => {
		// parse resposne data and return in data table frendly format
		return responseData.map((entry) => {
			return {
				Code: entry.code,
				"Required Date": entry.requiredDate,
				Status: entry.productionOrderStatus.name,
				View: `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
			};
		});
	};
	window.mainTable = new DataTable(
		"mainTableHolder",
		"/api/production_orders",
		[1, 1, 1, 1],
		dataBuilderFunction,
		"Production Orders List"
	);

	// if production order id is provided in url
	const urlParams = new URLSearchParams(window.location.search);
	const show = urlParams.get("show");
	if (show) {
		showEditEntryModal(show, true);
	}
}

const loadFormDropdowns = async () => {
	// define needed attributes
	let productionOrderStatuses;

	response = await Request.send(
		"/api/general?data[table]=production_order_status",
		"GET"
	);
	productionOrderStatuses = response.data;

	// clean existing options and append new data
	$("#productionOrderStatusId").empty();

	productionOrderStatuses.forEach((st) => {
		$("#productionOrderStatusId").append(
			`<option value="${st.id}">${st.name}</option>`
		);
	});
};

// event listeners for form inputs and buttons
const registerEventListeners = () => {
	// prevent default form submission event
	$("form").on("submit", (e) => e.preventDefault());

	// event listeners for buttons
	$(".btnFmConfirm").on("click", confirmOrder);
	$(".btnFmReject").on("click", rejectOrder);
	// $(".btnFmAdd").on("click", addEntry);
	// $(".btnFmDelete").on("click", () => deleteEntry());
	$(".btnFmPrint").on("click", printEntry);
	// $("#btnTopAddEntry").on("click", showNewEntryModal);
};

const printEntry = () => {
	printProductionOrder(tempData.selectedEntry);
};

/*-------------------------------------------------------------------------------------------------------
                                Check required materials
-------------------------------------------------------------------------------------------------------*/
const calculateRequiredMaterials = async () => {
	// selected entry has products and required qty
	const productPackages = tempData.selectedEntry.productionOrderProductPackages;

	// store required material id and qty
	const requiredMaterialAmounts = {};

	for (let p of productPackages) {
		// get required materials for the product from material analysis and multiply
		let response = await Request.send("/api/material_analysis", "GET", {
			data: {
				productId: p.productPackageId,
			},
		});

		response.data.forEach((d) => {
			const materialId = d.material.id;
			const materialAmount = parseFloat(d.amount) * parseFloat(p.qty);

			if (requiredMaterialAmounts[materialId]) {
				requiredMaterialAmounts[materialId] += materialAmount;
			} else {
				requiredMaterialAmounts[materialId] = materialAmount;
			}
		});
	}

	return requiredMaterialAmounts;
};

const checkMaterialInventory = async () => {
	const requiredMaterialAmounts = await calculateRequiredMaterials();

	const response = await Request.send(
		"/api/material_inventory?data[limit]=0",
		"GET"
	);

	const materialInventory = {};

	response.data.forEach((i) => {
		materialInventory[i.id] = {
			id: i.id,
			availableQty: parseFloat(i.availableQty),
			code: i.material.code,
			name: i.material.name,
			unitType: i.material.unitType,
		};
	});

	const allMaterials = [];
	const lowMaterials = [];

	// check materials
	Object.keys(requiredMaterialAmounts).forEach((k) => {
		const requiredAmount = requiredMaterialAmounts[k];
		const availableAmount = materialInventory[k].availableQty;
		const material = materialInventory[k];

		if (requiredAmount > availableAmount) {
			lowMaterials.push({
				id: material.id,
				code: material.code,
				name: material.name,
				requiredAmount: requiredAmount,
				availableAmount: availableAmount,
				unitType: material.unitType,
			});
		}

		allMaterials.push({
			id: material.id,
			code: material.code,
			name: material.name,
			requiredAmount: requiredAmount,
			availableAmount: availableAmount,
			unitType: material.unitType,
		});
	});

	// save all required materials globally
	tempData.selectedEntryMaterials = allMaterials;

	// return status false when there are low materials
	return {
		status: lowMaterials.length == 0,
		lowMaterials: lowMaterials,
		allMaterials: allMaterials,
	};
};

/*-------------------------------------------------------------------------------------------------------
                                Entry Related Requests (POST, PUT, DELETE, PRINT)
-------------------------------------------------------------------------------------------------------*/
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

const confirmOrder = async () => {
	const data = {};

	// set entry id
	data["id"] = tempData.selectedEntry.id;
	data["statusName"] = "Confirmed";
	data["confirmedDate"] = $("#confirmedDate").val();
	data["materials"] = tempData.selectedEntryMaterials;

	// send post reqeust to save data
	const response = await Request.send("/api/production_orders_confirm", "PUT", {
		data: data,
	});

	// show output modal based on response
	if (response.status) {
		$("#modalMainForm").modal("hide");
		reloadModule();
		mainWindow.showOutputToast("Success!", response.msg);
	}
};

const rejectOrder = async () => {
	const data = {};

	// set entry id
	data["id"] = tempData.selectedEntry.id;
	data["statusName"] = "Rejected";
	data["confirmedDate"] = $("#confirmedDate").val();

	// send post reqeust to save data
	const response = await Request.send("/api/production_orders_confirm", "PUT", {
		data: data,
	});

	// show output modal based on response
	if (response.status) {
		$("#modalMainForm").modal("hide");
		reloadModule();
		mainWindow.showOutputToast("Success!", response.msg);
	}
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

const reloadModule = () => {
	resetForm();
	mainTable.reload();
};

const resetForm = () => {
	// empty input fields
	$("#mainForm input").val("");

	// empty mini table
	$("#productPackageTable tbody").empty();

	// remove other classes used for feedbacks
	$("#mainForm *").removeClass("has-error has-success");
	$("#mainForm .form-control-feedback").remove();

	// disable form read only mode if activated
	FormUtil.disableReadOnly("mainForm");
};

/*-------------------------------------------------------------------------------------------------------
                                           Product pkg Table
-------------------------------------------------------------------------------------------------------*/

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

/*-------------------------------------------------------------------------------------------------------
                                            Modals
-------------------------------------------------------------------------------------------------------*/

const showEditEntryModal = (id, readOnly = false) => {
	loadEntry(id).then(async () => {
		$("#modalMainFormTitle").text("View Production Order");

		// set confirmed employee number
		const employeeNumber = mainWindow.tempData.profile.employee.number;
		const employeeCallingName =
			mainWindow.tempData.profile.employee.callingName;
		$("#mainForm #confirmedEmployee").val(
			`${employeeCallingName} (${employeeNumber})`
		);

		// set confirmed date
		$("#mainForm #confirmedDate").val(new Date().today());

		const inventoryStatus = await checkMaterialInventory();

		if (inventoryStatus.status) {
			// production order can be confirmed
			$("#lowMaterialPanel").hide();
			// show confirm button
			$(".btnFmConfirm").show();

			// enable confirm button
			$(".btnFmConfirm").attr("disabled", false);
		} else {
			// production order can't be confirmed, show low material list
			$("#lowMaterialListTable tbody").empty();

			inventoryStatus.lowMaterials.forEach((mat, index) => {
				$("#lowMaterialListTable tbody").append(`
				<tr>
					<td>${index + 1}</td>
					<td>${mat.name} (${mat.code})</td>
					<td>${parseFloat(mat.availableAmount).toFixed(2)}</td>
					<td>${parseFloat(mat.requiredAmount).toFixed(2)}</td>
					<td>${mat.unitType.name}</td>
				</tr>
				`);
			});

			$("#lowMaterialPanel").show();

			// disable confirm button
			$(".btnFmConfirm").attr("disabled", true);
		}

		// show material summery
		$("#materialListTable tbody").empty();

		inventoryStatus.allMaterials.forEach((mat, index) => {
			$("#materialListTable tbody").append(`
			<tr>
				<td>${index + 1}</td>
				<td>${mat.name} (${mat.code})</td>
				<td>${parseFloat(mat.availableAmount).toFixed(2)}</td>
				<td>${parseFloat(mat.requiredAmount).toFixed(2)}</td>
				<td>${mat.unitType.name}</td>
			</tr>
			`);
		});

		const productionOrderStatusName =
			tempData.selectedEntry.productionOrderStatus.name;

		if (
			["Confirmed", "Rejected", "Deleted"].includes(productionOrderStatusName)
		) {
			$(".btnFmConfirm").hide();
			$(".btnFmReject").hide();
		}

		if (productionOrderStatusName == "Pending") {
			$(".btnFmConfirm").show();
			$(".btnFmReject").show();
		}

		$("#modalMainForm").modal("show");
	});
};
