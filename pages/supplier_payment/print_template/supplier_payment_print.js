const printPaymentReceipt = async (selectedEntry) => {

  // load template
  const respone = await fetch("./print_template/supplier_payment_print.html");
  let template = await respone.text();

  // replace template values
  const supplier = selectedEntry.grn.purchaseOrder.quotation.quotationRequest.supplier;

  template = template.replace(/#{pnumber}/g, selectedEntry.pnumber);
  template = template.replace(/#{addedDate}/g, selectedEntry.addedDate);
  template = template.replace(/#{supplierCompanyName}/g, supplier.companyName);
  template = template.replace(/#{supplierAddress}/g, supplier.address);
  template = template.replace(/#{supplierCompanyMobile}/g, supplier.companyMobile);
  template = template.replace(/#{supplierEmail}/g, supplier.email);
  template = template.replace(/#{description}/g, (selectedEntry.description == null || selectedEntry.description.trim() == "") ? "None" : selectedEntry.description);
  template = template.replace(/#{grnCode}/g, selectedEntry.grn.grncode);
  template = template.replace(/#{grnNetTotal}/g, selectedEntry.grnNetTotal);
  template = template.replace(/#{supTotal}/g, selectedEntry.supTotalAmount);
  template = template.replace(/#{balance}/g, selectedEntry.balance);
  template = template.replace(/#{paymentMethodName}/g, selectedEntry.supplierPaymentMethod.name);

  const win = window.open("", "Print", "width=1000,height=600");
  win.document.write(template);
  setTimeout(() => win.print(), 1000);
}