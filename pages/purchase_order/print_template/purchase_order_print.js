const printPurchaseOrder = async (selectedEntry) => {
  let materialRows = "";
  selectedEntry.purchaseOrderMaterials.forEach((pom, index) => {
    materialRows += `
      <tr>
        <td>${index + 1}</td>
        <td>${pom.material.name}</td>
        <td>${pom.purchasePrice}</td>
        <td>${pom.qty}</td>
        <td>${pom.lineTotal}</td>
      </tr>
    `
  });

  // load template
  const respone = await fetch("./print_template/purchase_order_print.html");
  let template = await respone.text();


  // replace template values
  const supplier = selectedEntry.quotation.quotationRequest.supplier;

  const placeholderValues = {
    pocode: selectedEntry.pocode,
    supCode: supplier.code,
    supType: supplier.supplierType.name,
    addedDate: selectedEntry.addedDate,
    requiredDate: selectedEntry.requiredDate,
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
  let className = (placeholderValues.supType == "Company") ? ".individual" : ".company";
  let classes = win.document.querySelectorAll(className);
  for (let i = 0; i < classes.length; i++) {
    classes[i].style.display = "none";
  }

  setTimeout(() => win.print(), 1000);
}