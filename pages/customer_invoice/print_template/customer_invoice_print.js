const printInvoice = async (selectedEntry) => {
	let productPackageRows = "";
	selectedEntry.customerInvoiceProductPackages.forEach((pkg, index) => {
		productPackageRows += `
      <tr>
        <td>${index + 1}</td>
        <td>${pkg.productPackage.name} (${pkg.productPackage.code})</td>
        <td>${pkg.salePrice}</td>
        <td>${pkg.deliveredQty}</td>
        <td>${pkg.lineTotal}</td>
      </tr>
    `;
	});

	// load template
	const respone = await fetch("./print_template/customer_invoice_print.html");
	let template = await respone.text();

	const placeholderValues = {
		code: selectedEntry.code,
		addedDate: selectedEntry.addedDate,
		customerName: selectedEntry.customerName,
		customerMobile: selectedEntry.customerMobile,
		grandTotal: selectedEntry.grandTotal,
		discountRatio: selectedEntry.discountRatio,
		netTotal: selectedEntry.netTotal,
		customerTotal: selectedEntry.cusTotalAmount,
		payedAmount: selectedEntry.payedAmount,
		balance: selectedEntry.balance,
		description: selectedEntry.description,
		customerPaymentMethod: selectedEntry.customerPaymentMethod.name,
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
