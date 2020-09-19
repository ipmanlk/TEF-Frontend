const printQuotation = async (selectedEntry) => {
  let materialRows = "";
  selectedEntry.quotationMaterials.forEach((qm, index) => {
    materialRows += `
      <tr>
        <td>${index + 1}</td>
        <td>${qm.material.name}</td>
        <td>${qm.availableQty}</td>
        <td>${qm.minimumRequestQty}</td>
        <td>${qm.purchasePrice}</td>
      </tr>
    `
  });

  // load template
  const respone = await fetch("./print_template/quotation_print.html");
  let template = await respone.text();

  // replace template values
  template = template.replace(/#{qnumber}/g, selectedEntry.qnumber);
  template = template.replace(/#{addedDate}/g, selectedEntry.addedDate);
  template = template.replace(/#{supplierCompanyName}/g, selectedEntry.quotationRequest.supplier.companyName);
  template = template.replace(/#{supplierAddress}/g, selectedEntry.quotationRequest.supplier.address);
  template = template.replace(/#{supplierCompanyMobile}/g, selectedEntry.quotationRequest.supplier.companyMobile);
  template = template.replace(/#{supplierEmail}/g, selectedEntry.quotationRequest.supplier.email);
  template = template.replace(/#{materialRows}/g, materialRows);
  template = template.replace(/#{description}/g, selectedEntry.description.trim() == "" ? "None" : selectedEntry.description);

  const win = window.open("", "Print", "width=1000,height=600");
  win.document.write(template);
  setTimeout(() => win.print(), 1000);
}