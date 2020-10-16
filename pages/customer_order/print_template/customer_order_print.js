const printCustomerOrder = async (selectedEntry) => {
  let productPkgRows = "";

  selectedEntry.customerOrderProductPackages.forEach((pkg, index) => {
    productPkgRows += `
      <tr>
        <td>${index + 1}</td>
        <td>${pkg.productPackage.name} (${pkg.productPackage.code})</td>
        <td>${pkg.productPackage.salePrice}</td>
        <td>${pkg.qty}</td>
        <td>${pkg.lineTotal}</td>
      </tr>
    `
  });

  // load template
  const respone = await fetch("./print_template/customer_order_print.html");
  let template = await respone.text();

  const placeholderValues = {
    code: selectedEntry.cocode,
    addedDate: selectedEntry.addedDate,
    requiredDate: selectedEntry.requiredDate,
    cusNumber: selectedEntry.customer.number,
    companyName: selectedEntry.customer.companyName,
    companyMobile: selectedEntry.customer.companyMobile,
    companyMail: selectedEntry.customer.email,
    companyContactPersonName: selectedEntry.customer.customerName,
    companyContactPersonMobile: selectedEntry.customer.customerMobile,
    customerName: selectedEntry.customer.customerName,
    customerMobile: selectedEntry.customer.customerMobile,
    customerEmail: selectedEntry.customer.email,
    productPkgRows: productPkgRows,
    grandTotal: selectedEntry.grandTotal,
    discountRatio: selectedEntry.discountRatio,
    netTotal: selectedEntry.netTotal,
    description: selectedEntry.description
  }

  // fix description
  if (!placeholderValues.description || placeholderValues.description.trim() == "") {
    placeholderValues.description = "None";
  }

  Object.keys(placeholderValues).forEach(key => {
    template = template.replace(new RegExp(`#{${key}}`, "g"), placeholderValues[key]);
  });


  const win = window.open("", "Print", "width=1000,height=600");
  win.document.write(template);

  // get proper class name to hide
  let className = (placeholderValues.companyName) ? ".individual" : ".company";
  let classes = win.document.querySelectorAll(className);
  for (let i = 0; i < classes.length; i++) {
    classes[i].style.display = "none";
  }

  setTimeout(() => win.print(), 1000);
}