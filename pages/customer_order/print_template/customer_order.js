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
  template = template.replace(/#{pocode}/g, selectedEntry.pocode);
  template = template.replace(/#{addedDate}/g, selectedEntry.addedDate);
  template = template.replace(/#{requiredDate}/g, selectedEntry.requiredDate);
  template = template.replace(/#{supplierCompanyName}/g, selectedEntry.quotation.quotationRequest.supplier.companyName);
  template = template.replace(/#{supplierAddress}/g, selectedEntry.quotation.quotationRequest.supplier.address);
  template = template.replace(/#{supplierCompanyMobile}/g, selectedEntry.quotation.quotationRequest.supplier.companyMobile);
  template = template.replace(/#{supplierEmail}/g, selectedEntry.quotation.quotationRequest.supplier.email);
  template = template.replace(/#{materialRows}/g, materialRows);
  template = template.replace(/#{description}/g, selectedEntry.description.trim() == "" ? "None" : selectedEntry.description);

  const win = window.open("", "Print", "width=1000,height=600");
  win.document.write(template);
  setTimeout(() => win.print(), 1000);
}