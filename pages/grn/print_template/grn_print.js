const printGrn = async (selectedEntry) => {
  let materialRows = "";
  selectedEntry.grnMaterials.forEach((m, index) => {
    materialRows += `
      <tr>
        <td>${index + 1}</td>
        <td>${m.material.name}</td>
        <td>${m.purchasePrice}</td>
        <td>${m.receivedQty}</td>
        <td>${m.lineTotal}</td>
      </tr>
    `
  });

  // load template
  const respone = await fetch("./print_template/grn_print.html");
  let template = await respone.text();

  // replace template values
  const supplier = selectedEntry.purchaseOrder.quotation.quotationRequest.supplier;
  console.log(supplier);
  const placeholderValues = {
    code: selectedEntry.grncode,
    supType: supplier.supplierType.name,
    addedDate: selectedEntry.addedDate,
    receivedDate: selectedEntry.receivedDate,
    supCompanyName: supplier.companyName,
    supCompanyMobile: supplier.companyMobile,
    supCompanyMail: supplier.email,
    supCompanyAddress: supplier.address,
    supCompanyPersonName: supplier.personName,
    supCompanyPersonMobile: supplier.personMobile,
    supName: supplier.personName,
    supMobile: supplier.personMobile,
    supMail: supplier.email,
    supAddress: supplier.address,
    materialRows: materialRows,
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
  let className = (placeholderValues.supCompanyName) ? ".individual" : ".company";
  let classes = win.document.querySelectorAll(className);
  for (let i = 0; i < classes.length; i++) {
    classes[i].style.display = "none";
  }

  setTimeout(() => win.print(), 1000);
}