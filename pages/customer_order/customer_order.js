const tempData = {
  validationInfo: null,
  selectedEntry: null,
  permission: null,
  selectedQuotation: null
};

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {

  // get regexes for validation and store on window tempData
  const response = await Request.send("/api/regexes", "GET", {
    data: { module: "CUSTOMER_ORDER" }
  });

  tempData.validationInfo = response.data;

  FormUtil.enableRealtimeValidation(tempData.validationInfo);

  await loadFormDropdowns();
  registerEventListeners();

  // create an array from permission string
  const permission = permissionStr.split("").map((p) => parseInt(p));
  tempData.permission = permission;
  if (permission[0] == 0) {
    $("#btnTopAddEntry").hide();
  }

  // load main table
  const dataBuilderFunction = (responseData) => {
    // parse resposne data and return in data table frendly format
    return responseData.map(entry => {
      return {
        "Code": entry.cocode,
        "Customer Num.": entry.customer.number,
        "Required Date": entry.requiredDate,
        "Net Total": entry.netTotal,
        "Status": entry.customerOrderStatus.name,
        "View": `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
        "Edit": `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
        "Delete": `${entry.customerOrderStatus.name == "Deleted" ? "" : `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`}`
      }
    });
  }
  window.mainTable = new DataTable("mainTableHolder", "/api/customer_orders", permission, dataBuilderFunction, "Customer Orders List");
}

const loadFormDropdowns = async () => {
  // define needed attributes
  let response, customers, productPackages, customerOrderStatuses;

  // get data from the api for each dropbox
  response = await Request.send("/api/customers?data[limit]=0", "GET");
  customers = response.data;

  response = await Request.send("/api/product_packages?data[limit]=0", "GET");
  productPackages = response.data;

  response = await Request.send("/api/general?data[table]=customer_order_status", "GET");
  customerOrderStatuses = response.data;

  // clean existing options and append new data
  $("#customerId").empty();
  $("#productPackageId").empty();
  $("#customerOrderStatusId").empty();


  customers.forEach(cus => {
    // show company name for companies and person name for individuals
    let name = cus.companyName ? cus.companyName : cus.customerName;
    $("#customerId").append(`<option data-tokens="${cus.number} - ${name}" value="${cus.id}">${name} (${cus.number})</option>`);
  });

  productPackages.forEach(pp => {
    $("#productPackageId").append(`<option data-tokens="${pp.code} - ${pp.name}" value="${pp.id}">${pp.name} (${pp.code})</option>`);
  });

  customerOrderStatuses.forEach(cos => {
    $("#customerOrderStatusId").append(`<option value="${cos.id}">${cos.name}</option>`);
  });

  // init bootstrap-select
  $("#customerId").selectpicker();
  $("#productPackageId").selectpicker();
}

// event listeners for form inputs and buttons
const registerEventListeners = () => {
  // prevent default form submission event
  $("form").on("submit", e => e.preventDefault());

  // event listeners for buttons
  $("#btnaddToProductPackageTable").on("click", addToProductPackageTable);
  $(".btnFmReset").on("click", resetForm);
  $(".btnFmUpdate").on("click", updateEntry);
  $(".btnFmAdd").on("click", addEntry);
  $(".btnFmDelete").on("click", () => deleteEntry());
  $(".btnFmPrint").on("click", printEntry);
  $("#btnTopAddEntry").on("click", showNewEntryModal);

  // event listeners for bootstrap-select componnets
  $("#productPackageId").on('changed.bs.select', function (e) {
    showProductPackageInfo(e.target.value);
  });

  // calculate line total on add to material list 
  $("#productPackageQty").on("keyup change", function () {
    const salePrice = $("#productPackageSalePrice").val().trim();
    const qty = $("#productPackageQty").val().trim();

    if (!isNaN(salePrice) && !isNaN(qty)) {
      $("#lineTotal").val(parseFloat(salePrice * qty).toFixed(2));
    } else {
      $("#lineTotal").val("0.00");
    }
  });

  // calculate grand totbal with discount
  $("#grandTotal, #discountRatio").on("keyup change", function () {
    const grandTotal = $("#grandTotal").val();
    let discountRatio = $("#discountRatio").val();

    if (!isNaN(grandTotal) && !isNaN(discountRatio)) {
      // calcualte net total
      const netTotal = grandTotal - (grandTotal * (discountRatio / 100));

      // show net total
      $("#netTotal").val(netTotal.toFixed(2));

    } else {
      $("#netTotal").val("0.00");
    }
  });

  // add new customer
  $("#btnAddNewCustomer").click(() => {
    showAddCustomerModal().then(async () => {
      // refresh the customer list when new customer is added
      const response = await Request.send("/api/customers?data[limit]=0", "GET");
      const customers = response.data;

      // update select picker options
      $("#customerId").first().empty();

      customers.forEach(cus => {
        // show company name for companies and person name for individuals
        let name = cus.companyName ? cus.companyName : cus.customerName;
        $("#customerId").append(`<option data-tokens="${cus.number} - ${name}" value="${cus.id}">${name} (${cus.number})</option>`);
      });

      // refresh plugin
      $("#customerId").selectpicker("refresh");
      $("#customerId").selectpicker("render");
    })
  });

}

// show customer view in an iframe
const showAddCustomerModal = () => {
  return new Promise((resolve, reject) => {
    $("#modalAddCustomerIframe").attr("src", "/pages/customer/customer.html");
    $("#modalAddCustomerIframe").css("min-height", "100vh");
    // $("#modalAddCustomerIframe").css("min-width", height);
    $("#modalAddCustomerIframe").on("load", () => {
      document.getElementById("modalAddCustomerIframe").contentWindow.mainWindow = mainWindow;
      document.getElementById("modalAddCustomerIframe").contentWindow.loadModule(mainWindow.tempData.privileges["CUSTOMER"]);
    });
    $("#modalAddCustomer").modal();
    $("#modalAddCustomer").off("hidden.bs.modal");
    $("#modalAddCustomer").on("hidden.bs.modal", function (e) {
      resolve();
    });
  });
}


/*-------------------------------------------------------------------------------------------------------
                           Functions for Multi-Select Dropdowns
-------------------------------------------------------------------------------------------------------*/

const showProductPackageInfo = async (productPackageId) => {
  const response = await Request.send(`/api/product_packages?data[id]=${productPackageId}`, "GET");
  const productPackage = response.data;
  $("#productPackageSalePrice").val(productPackage.salePrice);
}

/*-------------------------------------------------------------------------------------------------------
                                Entry Related Requests (POST, PUT, DELETE, PRINT)
-------------------------------------------------------------------------------------------------------*/
const addEntry = async () => {
  const { status, data } = validateForm();

  if (!status) {
    mainWindow.showOutputModal("Sorry!. Please fix these problems first.", data);
    return;
  }

  // send post reqeust to save data
  const response = await Request.send("/api/customer_orders", "POST", { data: data });

  // show output modal based on response
  if (response.status) {
    $("#modalMainForm").modal("hide");
    reloadModule();
    mainWindow.showOutputToast("Success!", response.msg);
    mainWindow.showOutputModal("Purchase order created!.", `<h4>Purchase Order Code: ${response.data.pocode}</h4>`);
  }
}

const loadEntry = async (id) => {
  resetForm();

  // get entry data from db and show in the form
  const response = await Request.send("/api/customer_orders", "GET", { data: { id: id } });
  const entry = response.data;

  // fill form inputs
  $("#cocode").val(entry.cocode);
  $("#addedDate").val(entry.addedDate);
  $("#requiredDate").val(entry.requiredDate);
  $("#grandTotal").val(entry.grandTotal);
  $("#discountRatio").val(entry.discountRatio);
  $("#netTotal").val(entry.netTotal);
  $("#description").val(entry.description);
  $("#createdEmployee").val(entry.createdEmployee);

  // select proper customer
  $("#customerId").val(entry.customer.id)
  $("#customerId").selectpicker("render");

  // add to product packages table
  $("#productPackageTable tbody").empty();

  entry.customerOrderProductPackages.forEach(pkg => {
    addRowToProductPackageTable({
      productPackageId: pkg.productPackage.id,
      productPackageName: `${pkg.productPackage.name} (${pkg.productPackage.code})`,
      productPackageQty: pkg.qty,
      lineTotal: pkg.lineTotal,
      productPackageSalePrice: pkg.productPackage.salePrice
    });
  });

  // save globally
  tempData.selectedEntry = entry;

  // hide from deleted button when deleted
  if ($("#mainForm #purchaseOrderStatusId option:selected").text() == "Deleted") {
    $(".btnFmDelete").hide();
  }
}

const updateEntry = async () => {
  const { status, data } = validateForm();

  // set entry id
  data["id"] = tempData.selectedEntry.id;

  if (!status) {
    mainWindow.showOutputModal("Sorry!. Please fix these problems first.", data);
    return;
  }

  // send post reqeust to save data
  const response = await Request.send("/api/customer_orders", "PUT", { data: data });

  // show output modal based on response
  if (response.status) {
    $("#modalMainForm").modal("hide");
    reloadModule();
    mainWindow.showOutputToast("Success!", response.msg);
  }
}


const deleteEntry = async (id = tempData.selectedEntry.id) => {
  // get confirmation
  const confirmation = await mainWindow.showConfirmModal("Confirmation", "Do you really need to delete this entry?");
  if (!confirmation) return;

  // send post reqeust to save data
  const response = await Request.send(`/api/customer_orders?data[id]=${id}`, "DELETE");

  // show output modal based on response
  if (response.status) {
    $("#modalMainForm").modal("hide");
    reloadModule();
    mainWindow.showOutputToast("Success!", response.msg);
  }
}

const printEntry = async () => {
  // load full customer info
  const response = await Request.send(`/api/customers?data[id]=${tempData.selectedEntry.customer.id}`, "GET");
  tempData.selectedEntry["customer"] = response.data;
  printCustomerOrder(tempData.selectedEntry);
}

/*-------------------------------------------------------------------------------------------------------
                                          Main Form
-------------------------------------------------------------------------------------------------------*/
const getFormData = () => {
  // data from basic input fields
  const data = {};

  // add element valeus to data obj
  tempData.validationInfo.forEach(vi => {
    let attributeValue = $(`#${vi.attribute}`).val();
    if (attributeValue.trim() == "") attributeValue = null;
    data[vi.attribute] = attributeValue;
  });

  // get data from product packages table
  const customerOrderProductPackages = [];
  $("#productPackageTable tbody tr").each((i, tr) => {
    const tds = $(tr).children("td");
    const tdProductPackageId = $(tds[1]).children().first().data("product-package-id");
    const tdProductPackageSalePrice = $(tds[2]).children().first().data("product-package-sale-price");
    const tdProductPackageQty = $(tds[3]).children().first().data("product-package-qty");
    const tdLineTotal = $(tds[4]).children().first().data("line-total");


    customerOrderProductPackages.push({
      productPackageId: tdProductPackageId,
      salePrice: tdProductPackageSalePrice,
      qty: tdProductPackageQty,
      lineTotal: tdLineTotal,
    });
  });

  // add purchase order mateirals to data
  data["customerOrderProductPackages"] = customerOrderProductPackages;

  return data;
}

const validateForm = () => {

  // store error msgs
  let errors = "";

  // ignored inputs for form validation
  const ignoredAttributes = ["productPackageId", "productPackageSalePrice", "productPackageQty", "lineTotal"];

  // validate regular inputs
  tempData.validationInfo.forEach(vi => {

    if (ignoredAttributes.includes(vi.attribute)) return;

    // validate each field
    FormUtil.validateElementValue(vi);
    // get element values
    const value = $(`#${vi.attribute}`).val();
    // regex
    const regex = new RegExp(vi.regex);
    // ignore empty optional values
    if (vi.optional && value.trim() == "") return;

    if (!regex.test(value)) {
      errors += `${vi.error}<br/>`
    }
  });

  // validate mini table
  const formData = getFormData();

  if (formData.customerOrderProductPackages.length == 0) {
    errors += "Please select at least one product package!. <br>";
  }

  // // check for duplicates & invalid values in the material list
  // let foundDuplicates = false;
  // let containsInvalidValues = false;

  // const ids = [];
  // $("#productPackageTable tbody tr").each((i, tr) => {
  //   const tds = $(tr).children("td");
  //   const tdMaterialId = $(tds[1]).children().first().data("material-id");
  //   if (ids.includes[tdMaterialId]) {
  //     foundDuplicates = true;
  //   }

  //   ids.push(tdMaterialId);

  //   const tdPurchasePrice = $(tds[2]).children().first().data("purchase-price");
  //   const tdQty = $(tds[3]).children().first().data("qty");

  //   // check if list contains invalid values
  //   const regex = /^[\d]{1,9}\.[\d]{2}$/;
  //   if (!regex.test(tdPurchasePrice) || !regex.test(tdQty)) {
  //     containsInvalidValues = true;
  //   }
  // });

  // if (foundDuplicates) {
  //   errors += "Please remove duplicates from material list!. <br>";
  // }

  // if (containsInvalidValues) {
  //   errors += "There are invalid data in the material list!. Please check again. <br>";
  // }

  if (errors == "") {
    return {
      status: true,
      data: formData
    }
  }

  return {
    status: false,
    data: errors
  }
}

const reloadModule = () => {
  resetForm();
  mainTable.reload();
}

const resetForm = () => {
  // empty input fields
  $("#mainForm input").val("");

  // deselect select pickers
  $("#customerId").val("");
  $("#customerId").selectpicker('render');

  $("#productPackageId").val("");
  $("#productPackageId").selectpicker('render');

  // empty mini table
  $("#productPackageTable tbody").empty();

  // remove other classes used for feedbacks
  $("#mainForm *").removeClass("has-error has-success");
  $("#mainForm .form-control-feedback").remove();

  // disable form read only mode if activated
  FormUtil.disableReadOnly("mainForm");
}

/*-------------------------------------------------------------------------------------------------------
                                           Material Table
-------------------------------------------------------------------------------------------------------*/

const addToProductPackageTable = () => {
  const productPackageId = $("#productPackageId").val();
  const productPackageName = $("#productPackageId option:selected").text();
  const productPackageQty = $("#productPackageQty").val();
  const lineTotal = $("#lineTotal").val();
  const productPackageSalePrice = $("#productPackageSalePrice").val();

  // check if required things are provided
  if (productPackageId.trim() == "") {
    mainWindow.showOutputModal("Sorry", "Please select a product package first!.");
    return;
  }

  if (productPackageQty.trim() == "" || !/^[\d]+$/.test(productPackageQty)) {
    mainWindow.showOutputModal("Sorry", "Please provice a valid product package quantity!.");
    return;
  }


  // check for duplicates
  let isDuplicate = false;
  $("#productPackageTable tbody tr").each((i, tr) => {
    const tds = $(tr).children("td");
    const tdProductPackageId = $(tds[1]).children().first().data("product-package-id");
    if (productPackageId == tdProductPackageId) {
      isDuplicate = true;
    }
  });

  if (isDuplicate) {
    mainWindow.showOutputModal(
      "Sorry",
      "This product package is already in the product package list!."
    );
    return;
  }

  addRowToProductPackageTable({
    productPackageId, productPackageName, productPackageQty, lineTotal, productPackageSalePrice
  });
}

const addRowToProductPackageTable = (row = {}) => {
  // row data
  const { productPackageId, productPackageName, productPackageQty, lineTotal, productPackageSalePrice } = row;
  $("#productPackageTable tbody").append(`
    <tr>
        <td></td>
        <td>
          <span data-product-package-id="${productPackageId}">${productPackageName}</span>
        </td>
        <td>
          <span data-product-package-sale-price="${productPackageSalePrice}">${productPackageSalePrice}</span>
        </td>
        <td>
          <span data-product-package-qty="${productPackageQty}">${productPackageQty}</span>
        </td>
        <td>
          <span data-line-total="${lineTotal}">${lineTotal}</span>
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="removeFromProductPackageTable(this)">
            <i class="glyphicon glyphicon-edit" aria-hidden="true"></i> 
              Delete
          </button>
        </td>
    </tr>
    `);

  refreshProductPackageTable();
}


// updates index column of the mateiral table and purchase order total
const refreshProductPackageTable = () => {
  $("#productPackageTable tbody tr").each((index, tr) => {
    const indexTd = $(tr).children().first();
    indexTd.html(index + 1);
  });

  // update grand total as well
  let grandTotal = 0;
  $("#productPackageTable tbody tr").each((i, tr) => {
    const tds = $(tr).children("td");
    const tdLineTotal = $(tds[4]).children().first().data("line-total"); grandTotal += parseFloat(tdLineTotal);
  });

  // show total price
  $("#grandTotal").val(grandTotal.toFixed(2));
}

const removeFromProductPackageTable = (button) => {
  $(button).parent().parent().remove();

  refreshProductPackageTable();
}


/*-------------------------------------------------------------------------------------------------------
                                            Modals
-------------------------------------------------------------------------------------------------------*/

const showNewEntryModal = () => {
  // reset form values
  resetForm();
  FormUtil.disableReadOnly("mainForm");

  FormUtil.setButtionsVisibility("mainForm", tempData.permission, "add");

  // set created employee number
  const employeeNumber = mainWindow.tempData.profile.employee.number;
  const employeeCallingName = mainWindow.tempData.profile.employee.callingName;
  $("#mainForm #createdEmployee").val(`${employeeCallingName} (${employeeNumber})`);
  // set modal title
  $("#modalMainFormTitle").text("Add New Customer Order");
  // set date of adding
  $("#mainForm #addedDate").val(new Date().today());
  // empty pocode
  $("#mainForm #cocode").val("Order code will be displayed after adding.");
  // set limits for required date
  $("#requiredDate").attr("min", new Date().addDays(1).formatForInput());
  // show modal
  $("#modalMainForm").modal("show");
}

const showEditEntryModal = (id, readOnly = false) => {
  loadEntry(id).then(() => {

    $("#modalMainFormTitle").text("Edit Customer Order");
    $("#modalMainForm").modal("show");

    if (readOnly) {
      FormUtil.enableReadOnly("mainForm");
      FormUtil.setButtionsVisibility("mainForm", tempData.permission, "view");
      $("#mainForm *").removeClass("has-error has-success");
      $("#mainForm .form-control-feedback").remove();
    } else {
      FormUtil.disableReadOnly("mainForm");
      FormUtil.setButtionsVisibility("mainForm", tempData.permission, "edit");
    }
  });
}