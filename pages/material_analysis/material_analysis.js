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

	// get regexes for validation and store on window tempData
	const response = await Request.send("/api/regexes", "GET", {
		data: { module: "MATERIAL_ANALYSIS" },
	});

	FormUtil.enableRealtimeValidation(response.data);
}

const loadFormDropdowns = async () => {
	// define needed attributes
	let products, materials, unitTypes;

	// get data from the api for each dropbox
	let response;
	response = await Request.send("/api/products?data[limit]=0", "GET");
	products = response.data;

	response = await Request.send("/api/materials?data[limit]=0", "GET");
	materials = response.data;

	response = await Request.send("/api/general?data[table]=unit_type", "GET");
	unitTypes = response.data;

	// clean existing options and append new data
	$("#productId").empty();
	$("#materialId").empty();
	$("#unitTypeId").empty();

	products.forEach((pro) => {
		$("#productId").append(
			`<option data-tokens="${pro.code} - ${pro.name}" value="${pro.id}">${pro.name} (${pro.code})</option>`
		);
	});

	materials.forEach((mat) => {
		$("#materialId").append(
			`<option data-tokens="${mat.code} - ${mat.name}" value="${mat.id}">${mat.name} (${mat.code})</option>`
		);
	});

	unitTypes.forEach((ut) => {
		$("#unitTypeId").append(
			`<option data-tokens="${ut.name}" value="${ut.id}">${ut.name}</option>`
		);
	});

	// init bootstrap-select
	$("#productId").selectpicker();
	$("#materialId").selectpicker();

	// select initial value
	$("#productId").selectpicker("val", products[0].id);
	showMaterials(products[0].id);
};

// event listeners for form inputs
const registerEventListeners = () => {
	$("#btnAddToMaterialTable").on("click", (e) => {
		e.preventDefault();
		addToMaterialTable();
	});

	$(".btnFmReset").on("click", (e) => {
		e.preventDefault();
		$("#materialTable tbody").empty();
		$("#amount").val("");
	});

	$(".btnFmUpdate").on("click", (e) => {
		e.preventDefault();
		updateEntry();
	});

	$("#productId").on("changed.bs.select", function (
		e,
		clickedIndex,
		isSelected,
		previousValue
	) {
		const selectedProductId = e.target.value;
		showMaterials(selectedProductId);
	});

	// format decimal inputs automatically
	$("#amount").on("blur", (e) => {
		const value = e.target.value;
		if (!isNaN(value)) {
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
                                        Materials List Table
-------------------------------------------------------------------------------------------------------*/
const addToMaterialTable = () => {
	const materialId = $("#materialId").val();
	const productId = $("#productId").val();
	const materialName = $("#materialId option:selected").text();
	const amount = $("#amount").val();
	const unitTypeId = $("#unitTypeId").val();
	const unitTypeName = $("#unitTypeId option:selected").text();

	// check values are invalid
	if (productId.trim() == "") {
		mainWindow.showOutputModal("Sorry", "Please select a product first!.");
		return;
	}

	if (materialId.trim() == "") {
		mainWindow.showOutputModal("Sorry", "Please select a material first!.");
		return;
	}

	if (unitTypeId.trim() == "") {
		mainWindow.showOutputModal(
			"Sorry.",
			"Please select a valid unit type first!."
		);
		return;
	}

	if (
		amount.trim() == "" ||
		isNaN(amount) ||
		!/^[\d]{1,7}\.[\d]{2}$/.test(amount)
	) {
		mainWindow.showOutputModal("Sorry.", "Please enter a valid amount first!.");
		return;
	}

	// check for duplicates
	let isDuplicate = false;
	$("#materialTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const tdMaterialId = $(tds[0]).data("material-id");
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

	$("#materialTable tbody").append(`
        <tr>
            <td data-material-id="${materialId}">${materialName}</td>
            <td data-amount="${amount}">${amount}</td>
            <td data-unit-type-id="${unitTypeId}">${unitTypeName}</td>
            <td>
                <button onClick="removeFromMaterialTable(this)" class="btn btn-danger btn-xs">Delete</button>
            </td>
        </tr>
    `);
};

const removeFromMaterialTable = (button) => {
	$(button).parent().parent().remove();
};

// build an object from material table data
const getMaterialTableData = () => {
	const data = [];
	$("#materialTable tbody tr").each((i, tr) => {
		const tds = $(tr).children("td");
		const tdMaterialId = $(tds[0]).data("material-id");
		const tdAmount = $(tds[1]).data("amount");
		const tdUnitTypeId = $(tds[2]).data("unit-type-id");

		data.push({
			materialId: tdMaterialId,
			amount: tdAmount,
			unitTypeId: tdUnitTypeId,
		});
	});

	return data;
};

const showMaterials = async (productId) => {
	const response = await Request.send(
		`/api/material_analysis?data[productId]=${productId}`,
		"GET"
	);
	if (!response.status) return;

	// append to product maaterial table
	$("#materialTable tbody").empty();

	response.data.forEach((pm) => {
		const materialId = pm.material.id;
		const materialName = `${pm.material.name} (${pm.material.code})`;
		const unitTypeId = pm.unitType.id;
		const unitTypeName = pm.unitType.name;
		const amount = pm.amount;
		$("#materialTable tbody").append(`
    <tr>
        <td data-material-id="${materialId}">${materialName}</td>
        <td data-amount="${amount}">${amount}</td>
        <td data-unit-type-id="${unitTypeId}">${unitTypeName}</td>
        <td>
            <button onClick="removeFromMaterialTable(this)" class="btn btn-danger btn-xs">Delete</button>
        </td>
    </tr>
  `);
	});
};
