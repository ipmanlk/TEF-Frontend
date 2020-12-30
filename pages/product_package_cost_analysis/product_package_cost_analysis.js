/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
	await loadFormDropdowns();
	registerEventListeners();

	// create an array from permission string
	const permission = permissionStr.split("").map((p) => parseInt(p));

	if (permission[2] == 0) {
		$(".btnFmUpdate").hide();
	}

	// // get regexes for validation and store on window tempData
	// const response = await Request.send("/api/regexes", "GET", {
	// 	data: { module: "MATERIAL_ANALYSIS" },
	// });

	// FormUtil.enableRealtimeValidation(response.data);
}

const loadFormDropdowns = async () => {
	// define needed attributes
	let product_packages;

	// get data from the api for each dropbox
	let response;
	response = await Request.send("/api/product_packages?data[limit]=0", "GET");
	product_packages = response.data;

	// clean existing options and append new data
	$("#productPackageId").empty();

	product_packages.forEach((pro) => {
		$("#productPackageId").append(
			`<option data-tokens="${pro.code} - ${pro.name}" value="${pro.id}">${pro.name} (${pro.code})</option>`
		);
	});

	// init bootstrap-select
	$("#productPackageId").selectpicker();

	// select initial value
	$("#productPackageId").selectpicker("val", product_packages[0].id);
	// showMaterials(products[0].id);
};

// event listeners for form inputs
const registerEventListeners = () => {
	$("#btnAddSalePriceTable").on("click", (e) => {
		e.preventDefault();
		addToSalesPriceTable();
	});

	$(".btnFmReset").on("click", (e) => {
		e.preventDefault();
		$("#salesPriceTable tbody").empty();
		$("input").val("");
	});

	$(".btnFmUpdate").on("click", (e) => {
		e.preventDefault();
		updateEntry();
	});

	$("#productPackageId").on(
		"changed.bs.select",
		function (e, clickedIndex, isSelected, previousValue) {
			const selectedProductId = e.target.value;
			showMaterials(selectedProductId);
		}
	);

	// format decimal inputs automatically
	$("#salesPrice").on("blur", (e) => {
		const value = e.target.value;
		if (!isNaN(value) && value.trim() != "") {
			e.target.value = parseFloat(value).toFixed(2);
			$(e.target).trigger("keyup");
		}
	});
};

// update entry in the database
const updateEntry = async () => {
	const productMaterials = getMaterialTableData();
	const productId = $("#productId").val();

	// check values are invalid
	if (productId.trim() == "") {
		mainWindow.showOutputModal("Sorry", "Please select a product first!.");
		return;
	}

	const data = {
		productId,
		productMaterials,
	};

	// send put reqeust to update data
	const response = await Request.send("/api/material_analysis", "PUT", {
		data: data,
	});

	// show output modal based on response
	if (response.status) {
		mainWindow.showOutputToast("Success!", response.msg);
	}
};

/*-------------------------------------------------------------------------------------------------------
                                      Sales Price Table
-------------------------------------------------------------------------------------------------------*/
const addToSalesPriceTable = () => {
	const productPackageId = $("#productPackageId").val();
	const salePrice = $("#salePrice").val().trim();
	const validFrom = $("#validFrom").val();
	const validTo = $("#validTo").val();

	// check values are invalid
	if (productPackageId.trim() == "") {
		mainWindow.showOutputModal(
			"Sorry",
			"Please select a product package first!."
		);
		return;
	}

	if (
		salePrice == "" ||
		isNaN(salePrice) ||
		!/^[\d]{1,7}\.[\d]{2}$/.test(salePrice)
	) {
		mainWindow.showOutputModal(
			"Sorry.",
			"Please enter a valid sale price first!."
		);
		return;
	}

	if (validFrom.trim() == "" || validTo.trim() == "") {
		mainWindow.showOutputModal(
			"Sorry.",
			"Please enter a valid from and to dates first!."
		);
		return;
	}

	const validFromDate = new Date(validFrom);
	const validToDate = new Date(validTo);

	if (validFromDate >= validToDate) {
		mainWindow.showOutputModal(
			"Sorry.",
			"Valid from date must be a previous date to valid to."
		);
		return;
	}

	// check for duplicates
	let dateConflict = false;
	$("#salePriceTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const tableFromDate = new Date($(tds[1]).data("valid-from"));
		const tableToDate = new Date($(tds[2]).data("valid-to"));

		if (
			(validFromDate >= tableFromDate && validFromDate <= tableToDate) ||
			(validToDate <= tableToDate && validToDate >= tableFromDate)
		) {
			dateConflict = true;
		}
	});

	if (dateConflict) {
		mainWindow.showOutputModal(
			"Sorry.",
			"There is already a record associated with given dates. Please check your valid from and to dates again."
		);
		return;
	}

	$("#salePriceTable tbody").append(`
				<tr>
					<td></td>
					<td data-valid-from="${validFrom}">${validFrom}</td>
					<td data-valid-to="${validTo}">${validTo}</td>
					<td data-sale-price="${salePrice}">${salePrice}</td>
					<td>
						<button onClick="removeFromSalePriceTable(this)" class="btn btn-success btn-xs">Delete</button>
					</td>
          <td>
            <button onClick="removeFromSalePriceTable(this)" class="btn btn-danger btn-xs">Delete</button>
          </td>
        </tr>
		`);

	updateSalesPriceTableIndex();
};

const updateSalesPriceTableIndex = () => {
	// update table index
	$("#salePriceTable tbody tr").each((i, tr) => {
		$(tr)
			.children("td")
			.first()
			.text(i + 1);
	});
};

const removeFromSalePriceTable = (button) => {
	$(button).parent().parent().remove();
	updateSalesPriceTableIndex();
};

// // build an object from material table data
// const getMaterialTableData = () => {
// 	const data = [];
// 	$("#materialTable tbody tr").each((i, tr) => {
// 		const tds = $(tr).children("td");
// 		const tdMaterialId = $(tds[0]).data("material-id");
// 		const tdAmount = $(tds[1]).data("amount");
// 		const tdUnitTypeId = $(tds[2]).data("unit-type-id");

// 		data.push({
// 			materialId: tdMaterialId,
// 			amount: tdAmount,
// 			unitTypeId: tdUnitTypeId,
// 		});
// 	});

// 	return data;
// };

// const showMaterials = async (productId) => {
// 	const response = await Request.send(
// 		`/api/material_analysis?data[productId]=${productId}`,
// 		"GET"
// 	);
// 	if (!response.status) return;

// 	// append to product maaterial table
// 	$("#materialTable tbody").empty();

// 	response.data.forEach((pm) => {
// 		const materialId = pm.material.id;
// 		const materialName = `${pm.material.name} (${pm.material.code})`;
// 		const unitTypeId = pm.unitType.id;
// 		const unitTypeName = pm.unitType.name;
// 		const amount = pm.amount;
// 		$("#materialTable tbody").append(`
//     <tr>
//         <td data-material-id="${materialId}">${materialName}</td>
//         <td data-amount="${amount}">${amount}</td>
//         <td data-unit-type-id="${unitTypeId}">${unitTypeName}</td>
//         <td>
//             <button onClick="removeFromMaterialTable(this)" class="btn btn-danger btn-xs">Delete</button>
//         </td>
//     </tr>
//   `);
// 	});
// };
