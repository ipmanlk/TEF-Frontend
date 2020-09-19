const printQuotationRequest = async (selectedEntry) => {
  let materialRows = "";
  selectedEntry.quotationRequestMaterials.forEach((rm, index) => {
    materialRows += `
      <tr>
        <td>${index + 1}</td>
        <td>${rm.material.name}</td>
      </tr>
    `
  });

  // load template
  const respone = await fetch("./print_template/quotation_request_print.html");
  let template = await respone.text();

  // replace template values
  template = template.replace(/#{qrnumber}/g, selectedEntry.qrnumber);
  template = template.replace(/#{addedDate}/g, selectedEntry.addedDate);
  template = template.replace(/#{supplierCompanyName}/g, selectedEntry.supplier.companyName);
  template = template.replace(/#{supplierAddress}/g, selectedEntry.supplier.address);
  template = template.replace(/#{supplierCompanyMobile}/g, selectedEntry.supplier.companyMobile);
  template = template.replace(/#{supplierEmail}/g, selectedEntry.supplier.email);
  template = template.replace(/#{materialRows}/g, materialRows);
  template = template.replace(/#{description}/g, selectedEntry.description.trim() == "" ? "None" : selectedEntry.description);

  const win = window.open("", "Print", "width=1000,height=600");
  win.document.write(template);
  setTimeout(() => win.print(), 1000);
}