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
			showProductPackageInfo(selectedProductId);
		}
	);

	// format decimal inputs automatically
	$("#salesPrice, #profitRatio").on("blur", (e) => {
		const value = e.target.value;
		if (!isNaN(value) && value.trim() != "") {
			e.target.value = parseFloat(value).toFixed(2);
			$(e.target).trigger("keyup");
		}
	});

	// calculate sales price
	$("#profitRatio").on("change keyup", (e) => {
		const profitRatioValue = e.target.value;
		const totalCostValue = $("#totalCost").val();

		if (
			isNaN(profitRatioValue) ||
			profitRatioValue.trim() == "" ||
			isNaN(totalCostValue) ||
			totalCostValue.trim() == ""
		)
			return;

		const profitRatio = parseFloat(e.target.value);
		const totalCost = parseFloat(totalCostValue);

		const salePrice = totalCost + totalCost * (profitRatio / 100);

		$("#salePrice").val(salePrice.toFixed(2));
	});
};

const showProductPackageInfo = async (productPackageId) => {
	// get product details
	let response = await Request.send("/api/product_packages", "GET", {
		data: { id: productPackageId },
	});

	const productPackage = response.data;
	const productionCost = parseFloat(productPackage.productionCost);

	// show production cost
	$("#productionCost").val(productPackage.productionCost);

	/** calculate material cost **/

	// get materials needed for a single product
	response = await Request.send("/api/material_analysis", "GET", {
		data: {
			productId: productPackage.productId,
		},
	});

	let singlePieceMaterialCost = 0;

	response.data.forEach((d) => {
		singlePieceMaterialCost +=
			parseFloat(d.amount) * parseFloat(d.material.unitPrice);
	});

	const productPackageMaterialCost =
		singlePieceMaterialCost * parseFloat(productPackage.pieces);

	$("#materialCost").val(productPackageMaterialCost.toFixed(2));

	$("#totalCost").val((productionCost + productPackageMaterialCost).toFixed(2));
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
	const profitRatio = $("#profitRatio").val();
	const salePrice = $("#salePrice").val().trim();
	const validFrom = $("#validFrom").val();
	const validTo = $("#validTo").val();
	const addedDate = moment().format("YYYY-MM-DD");

	const productionCost = $("#productionCost").val();
	const materialCost = $("#materialCost").val();
	const totalCost = $("#totalCost").val();

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

	if (
		profitRatio == "" ||
		isNaN(profitRatio) ||
		!/^[\d]{1,7}\.[\d]{2}$/.test(profitRatio)
	) {
		mainWindow.showOutputModal(
			"Sorry.",
			"Please enter a valid profit ratio first!."
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
		const tableFromDate = new Date($(tds[7]).data("valid-from"));
		const tableToDate = new Date($(tds[8]).data("valid-to"));

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

	addRowToSalesPriceTable({
		productPackageId,
		productionCost,
		materialCost,
		totalCost,
		profitRatio,
		salePrice,
		validFrom,
		validTo,
		addedDate,
	});
};

const addRowToSalesPriceTable = (data) => {
	const {
		productPackageId,
		productionCost,
		materialCost,
		totalCost,
		profitRatio,
		salePrice,
		validFrom,
		validTo,
		addedDate,
	} = data;

	$("#salePriceTable tbody").append(`
	<tr>
		<td></td>
		<td style="display:none" data-product-package-id="${productPackageId}"></td>
		<td data-production-cost="${productionCost}">${productionCost}</td>
		<td data-material-cost="${materialCost}">${materialCost}</td>
		<td data-total-cost="${totalCost}">${totalCost}</td>
		<td data-profit-ratio="${profitRatio}">${profitRatio}</td>
		<td data-sale-price="${salePrice}">${salePrice}</td>
		<td data-valid-from="${validFrom}">${validFrom}</td>
		<td data-valid-to="${validTo}">${validTo}</td>
		<td data-added-date="${addedDate}">${addedDate}</td>
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

const getSalePriceTableData = () => {
	const data = [];
	$("#salePriceTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const productPackageId = $(tds[1]).data("product-package-id");
		const productionCost = $(tds[2]).data("production-cost");
		const materialCost = $(tds[3]).data("material-cost");
		const totalCost = $(tds[4]).data("total-cost");
		const profitRatio = $(tds[5]).data("profit-ratio");
		const salePrice = $(tds[6]).data("sale-price");
		const validFrom = $(tds[7]).data("valid-from");
		const validTo = $(tds[8]).data("valid-to");
		const addedDate = $(tds[9]).data("added-date");

		data.push({
			productPackageId,
			validFrom,
			validTo,
			productionCost,
			materialCost,
			totalCost,
			profitRatio,
			salePrice,
			addedDate,
		});
	});

	return data;
};

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
