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

	// catch promise rejections
	$(window).on("unhandledrejection", (event) => {
		console.error(
			"Unhandled rejection (promise: ",
			event.promise,
			", reason: ",
			event.reason,
			")."
		);
	});
}
