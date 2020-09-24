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

  template = template.replace(/#{grncode}/g, selectedEntry.grncode);
  template = template.replace(/#{addedDate}/g, selectedEntry.addedDate);
  template = template.replace(/#{receivedDate}/g, selectedEntry.receivedDate);
  template = template.replace(/#{supplierCompanyName}/g, supplier.companyName);
  template = template.replace(/#{supplierAddress}/g, supplier.address);
  template = template.replace(/#{supplierCompanyMobile}/g, supplier.companyMobile);
  template = template.replace(/#{supplierEmail}/g, supplier.email);
  template = template.replace(/#{materialRows}/g, materialRows);
  template = template.replace(/#{description}/g, selectedEntry.description.trim() == "" ? "None" : selectedEntry.description);

  template = template.replace(/#{grandTotal}/g, selectedEntry.grandTotal);
  template = template.replace(/#{discountRatio}/g, selectedEntry.discountRatio);
  template = template.replace(/#{netTotal}/g, selectedEntry.netTotal);

  const win = window.open("", "Print", "width=1000,height=600");
  win.document.write(template);
  setTimeout(() => win.print(), 1000);
}