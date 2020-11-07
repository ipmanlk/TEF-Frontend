const printProductionOrder = async (selectedEntry) => {
	let productPackageRows = "";
	selectedEntry.productionOrderProductPackages.forEach((pkg, index) => {
		productPackageRows += `
      <tr>
        <td>${index + 1}</td>
        <td>${pkg.productPackage.name} (${pkg.productPackage.code})</td>
        <td>${pkg.qty}</td>
      </tr>
    `;
	});

	// load template
	const respone = await fetch("./print_template/production_order_print.html");
	let template = await respone.text();

	const placeholderValues = {
		code: selectedEntry.code,
		addedDate: selectedEntry.addedDate,
		requiredDate: selectedEntry.requiredDate,
		description: selectedEntry.description,
		productPackageRows: productPackageRows,
	};

	// fix description
	if (
		!placeholderValues.description ||
		placeholderValues.description.trim() == ""
	) {
		placeholderValues.description = "None";
	}

	Object.keys(placeholderValues).forEach((key) => {
		template = template.replace(
			new RegExp(`#{${key}}`, "g"),
			placeholderValues[key]
		);
	});

	const win = window.open("", "Print", "width=1000,height=600");
	win.document.write(template);

	setTimeout(() => win.print(), 1000);
};
