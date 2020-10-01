const tempData = {
  validationInfo: null,
  selectedEntry: null,
  permission: null,
  selectedPurchaseOrder: null,
};

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {

  // get regexes for validation and store on window tempData
  const response = await Request.send("/api/regexes", "GET", {
    data: { module: "GRN" }
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
        "Code": entry.grncode,
        "PO Code": entry.purchaseOrder.pocode,
        "Invoice No": entry.invoiceNo,
        "Net Total": entry.netTotal,
        "Received": entry.receivedDate,
        "Status": entry.grnStatus.name,
        "View": `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
        "Edit": `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
        "Delete": `${entry.grnStatus.name == "Deleted" ? "" : `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`}`
      }
    });
  }
  window.mainTable = new DataTable("mainTableHolder", "/api/grns", permission, dataBuilderFunction, "GRNs List");
}

const loadFormDropdowns = async () => {
  // define needed attributes
  let response, suppliers, grnStatuses, unitTypes;

  // get data from the api for each dropbox
  response = await Request.send("/api/suppliers?data[limit]=0", "GET");
  suppliers = response.data;

  response = await Request.send("/api/general?data[table]=grn_status", "GET");
  grnStatuses = response.data;

  response = await Request.send("/api/general?data[table]=unit_type", "GET");
  unitTypes = response.data;

  // clean existing options and append new data
  $("#supplierId").empty();
  $("#purchaseOrderStatusId").empty();
  $("#unitTypeId").empty();


  suppliers.forEach(sup => {
    // show company name for companies and person name for individuals
    let name = sup.companyName ? sup.companyName : sup.personName;
    $("#supplierId").append(`<option data-tokens="${sup.code} - ${name}" value="${sup.id}">${name} (${sup.code})</option>`);
  });

  grnStatuses.forEach(gs => {
    $("#grnStatusId").append(`<option value="${gs.id}">${gs.name}</option>`);
  });

  unitTypes.forEach(ut => {
    $("#unitTypeId").append(`<option value="${ut.id}">${ut.name}</option>`);
  });

  // init bootstrap-select
  $("#supplierId").selectpicker();
  $("#materialId").selectpicker();
  $("#purchaseOrderId").selectpicker();
}

// event listeners for form inputs and buttons
const registerEventListeners = () => {
  // prevent default form submission event
  $("form").on("submit", e => e.preventDefault());

  // event listeners for buttons
  $("#btnAddToMaterialTable").on("click", addToMaterialTable);
  $(".btnFmReset").on("click", resetForm);
  $(".btnFmUpdate").on("click", updateEntry);
  $(".btnFmAdd").on("click", addEntry);
  $(".btnFmDelete").on("click", () => deleteEntry());
  $(".btnFmPrint").on("click", printEntry);
  $("#btnTopAddEntry").on("click", showNewEntryModal);

  // event listeners for bootstrap-select componnets
  $("#supplierId").on('changed.bs.select', function (e) {
    showSupplierPurchaseOrders(e.target.value);
  });

  $("#purchaseOrderId").on('changed.bs.select', function (e) {
    $("#materialTable tbody").empty();
    showPurchaseOrderMaterials(e.target.value);
  });

  $("#materialId").on('changed.bs.select', function (e) {
    showPurchaseOrderMaterialInfo(e.target.value);
  });

  // calculate line total on add to material list 
  $("#purchasePrice, #receivedQty").on("keyup change", function () {
    const purchasePrice = $("#purchasePrice").val().trim();
    const qty = $("#receivedQty").val().trim();

    if (!isNaN(purchasePrice && !isNaN(qty))) {
      $("#lineTotal").val(parseFloat(purchasePrice * qty).toFixed(2));
    } else {
      $("#lineTotal").val(parseFloat("0.00").toFixed(2));
    }
  });

  // calculate net total when grand total or discounted radio has changed
  $("#grandTotal, #discountRatio").on("keyup change", function () {
    const grandTotal = $("#grandTotal").val();
    let discountRatio = $("#discountRatio").val();

    if (!isNaN(grandTotal && !isNaN(discountRatio))) {
      // calcualte net total
      const netTotal = grandTotal - (grandTotal * (discountRatio / 100));

      // show net total
      $("#netTotal").val(netTotal.toFixed(2));

    } else {
      $("#netTotal").val(parseFloat("0.00").toFixed(2));
    }
  });
}

/*-------------------------------------------------------------------------------------------------------
                           Functions for Multi-Select Dropdowns
-------------------------------------------------------------------------------------------------------*/

// this function will run when supplierId select box is changed
const showSupplierPurchaseOrders = async (supplierId, purchaseOrderStatusName = "Active") => {
  // load supplier quotation requests
  const response = await Request.send("/api/supplier_purchase_orders", "GET", {
    data: {
      supplierId: supplierId,
      purchaseOrderStatusName: purchaseOrderStatusName
    }
  });

  // if request failed
  if (!response.status) return;

  const purchaseOrders = response.data;

  // update select picker options
  $("#purchaseOrderId").first().empty();

  purchaseOrders.forEach(po => {
    $("#purchaseOrderId").first().append(`<option data-tokens="${po.pocode}" value="${po.id}">${po.pocode}</option>`);
  });

  // refresh plugin
  $("#purchaseOrderId").selectpicker("refresh");
  $("#purchaseOrderId").selectpicker("render");
}

const showPurchaseOrderMaterials = async (quotationId) => {

  // get relevent quotation request
  const response = await Request.send(`/api/purchase_orders?data[id]=${quotationId}`, "GET");

  // when request failed
  if (!response.status) return;

  // save globally for later use
  tempData.selectedPurchaseOrder = response.data;

  const purchaseOrderMaterials = response.data.purchaseOrderMaterials;

  // empty values
  $("#materialId").first().empty();

  // show quotation materials
  purchaseOrderMaterials.forEach(pom => {
    const mat = pom.material;
    $("#materialId").first().append(`<option data-tokens="${mat.code} - ${mat.name}" value="${mat.id}">${mat.name} (${mat.code})</option>`);
  });

  // refresh select picker
  $("#materialId").selectpicker("refresh");
  $("#materialId").selectpicker("render");
}

const showPurchaseOrderMaterialInfo = (materialId) => {
  const material = tempData.selectedPurchaseOrder.purchaseOrderMaterials.find(mat => mat.materialId == materialId);

  // fill details
  $("#purchasePrice").val(material.purchasePrice);
  $("#receivedQty").val(material.qty);
  $("#lineTotal").val(material.lineTotal);
  FormUtil.selectDropdownOptionByValue("unitTypeId", material.unitTypeId);
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
  const response = await Request.send("/api/grns", "POST", { data: data });

  // show output modal based on response
  if (response.status) {
    $("#modalMainForm").modal("hide");
    reloadModule();
    mainWindow.showOutputToast("Success!", response.msg);
    mainWindow.showOutputModal("GRN added!.", `<h4>GRN Code: ${response.data.grncode}</h4>`);
  }
}

const loadEntry = async (id) => {
  resetForm();

  // get entry data from db and show in the form
  const response = await Request.send("/api/grns", "GET", { data: { id: id } });
  const entry = response.data;

  // fill form inputs
  Object.keys(entry).forEach(key => {
    $(`#${key}`).val(entry[key]);
  });

  // select dropdowns
  FormUtil.selectDropdownOptionByValue("grnStatusId", entry.grnStatus.id);

  // select proper supplier
  $("#supplierId").val(entry.purchaseOrder.quotation.quotationRequest.supplier.id)
  $("#supplierId").selectpicker("render");

  // load supplier purchase orders
  await showSupplierPurchaseOrders(entry.purchaseOrder.quotation.quotationRequest.supplier.id, "");

  // select proper purchase order
  $("#purchaseOrderId").val(entry.purchaseOrder.id);
  $("#purchaseOrderId").selectpicker("render");

  // show purchase order materials
  await showPurchaseOrderMaterials(entry.purchaseOrder.id);

  // add to material table
  $("#materialTable tbody").empty();

  entry.grnMaterials.forEach(gm => {
    addRowToMaterialTable({
      materialId: gm.material.id,
      materialName: `${gm.material.name} (${gm.material.code})`,
      receivedQty: gm.receivedQty,
      purchasePrice: gm.purchasePrice,
      unitTypeId: gm.material.unitType.id,
      unitTypeName: gm.material.unitType.name,
      lineTotal: gm.lineTotal
    });
  });

  // save globally
  tempData.selectedEntry = entry;

  // hide from deleted button when deleted
  if ($("#mainForm #grnStatusId option:selected").text() == "Deleted") {
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
  const response = await Request.send("/api/grns", "PUT", { data: data });

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
  const response = await Request.send(`/api/grns?data[id]=${id}`, "DELETE");

  // show output modal based on response
  if (response.status) {
    $("#modalMainForm").modal("hide");
    reloadModule();
    mainWindow.showOutputToast("Success!", response.msg);
  }
}

const printEntry = () => {
  printGrn(tempData.selectedEntry);
}

/*-------------------------------------------------------------------------------------------------------
                                          Main Form
-------------------------------------------------------------------------------------------------------*/
const getFormData = () => {
  // data from basic input fields
  const data = {
    "purchaseOrderId": $("#purchaseOrderId").val(),
    "receivedDate": $("#receivedDate").val(),
    "addedDate": $("#addedDate").val(),
    "description": $("#description").val(),
    "grnStatusId": $("#grnStatusId").val(),
    "grandTotal": $("#grandTotal").val(),
    "discountRatio": $("#discountRatio").val(),
    "netTotal": $("#netTotal").val(),
    "invoiceNo": $("#invoiceNo").val()
  }

  // get data from materials table
  const grnMaterials = [];
  $("#materialTable tbody tr").each((i, tr) => {
    const tds = $(tr).children("td");
    const tdMaterialId = $(tds[1]).children().first().data("material-id");
    const tdPurchasePrice = $(tds[2]).children().first().val();
    const tdReceivedQty = $(tds[3]).children().first().val();
    const tdLineTotal = $(tds[4]).children().first().data("line-total");
    const tdUnitTypeId = $(tds[5]).children().first().data("unit-type-id");


    grnMaterials.push({
      materialId: tdMaterialId,
      purchasePrice: tdPurchasePrice,
      receivedQty: tdReceivedQty,
      lineTotal: tdLineTotal,
      unitTypeId: tdUnitTypeId
    });
  });

  // add materials to data object
  data["grnMaterials"] = grnMaterials;

  return data;
}

const validateForm = () => {

  // store error msgs
  let errors = "";

  // ignored inputs for form validation
  const ignoredAttributes = ["receivedQty", "purchasePrice", "materialId", "unitTypeId"];

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

  if (formData.grnMaterials.length == 0) {
    errors += "Please select at least one material!. <br>";
  }

  // check for duplicates & invalid values in the material list
  let foundDuplicates = false;
  let containsInvalidValues = false;

  const ids = [];
  $("#materialTable tbody tr").each((i, tr) => {
    const tds = $(tr).children("td");
    const tdMaterialId = $(tds[1]).children().first().data("material-id");
    if (ids.includes[tdMaterialId]) {
      foundDuplicates = true;
    }

    ids.push(tdMaterialId);

    const tdPurchasePrice = $(tds[2]).children().first().val();
    const tdReceivedQty = $(tds[3]).children().first().val();

    // check if list contains invalid values
    const regex = /^[\d]{1,9}\.[\d]{2}$/;
    if (!regex.test(tdPurchasePrice) || !regex.test(tdReceivedQty)) {
      containsInvalidValues = true;
    }
  });

  if (foundDuplicates) {
    errors += "Please remove duplicates from material list!. <br>";
  }

  if (containsInvalidValues) {
    errors += "There are invalid data in the material list!. Please check again. <br>";
  }

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
  $("#supplierId").val("");
  $("#supplierId").selectpicker('render');

  $("#purchaseOrderId").first().empty();
  $("#purchaseOrderId").selectpicker('refresh');
  $("#purchaseOrderId").selectpicker('render');

  $("#materialId").first().empty();
  $("#materialId").selectpicker('refresh');
  $("#materialId").selectpicker('render');

  // empty mini table
  $("#materialTable tbody").empty();

  // remove other classes used for feedbacks
  $("#mainForm *").removeClass("has-error has-success");
  $("#mainForm .form-control-feedback").remove();

  // disable form read only mode if activated
  FormUtil.disableReadOnly("mainForm");
}

/*-------------------------------------------------------------------------------------------------------
                                           Material Table
-------------------------------------------------------------------------------------------------------*/

const addToMaterialTable = () => {
  const materialId = $("#materialId").val();
  const materialName = $("#materialId option:selected").text();
  const supplierId = $("#supplierId").val();
  const receivedQty = $("#receivedQty").val();
  const lineTotal = $("#lineTotal").val();
  const unitTypeId = $("#unitTypeId").val();
  const unitTypeName = $("#unitTypeId option:selected").text();
  const purchasePrice = $("#purchasePrice").val();

  // check if required things are provided
  if (supplierId.trim() == "") {
    mainWindow.showOutputModal("Sorry", "Please select a supplier first!.");
    return;
  }

  if (materialId.trim() == "") {
    mainWindow.showOutputModal("Sorry", "Please select a material first!.");
    return;
  }

  if (purchasePrice.trim() == "" || !/^[\d]{1,7}\.[\d]{2}$/.test(purchasePrice)) {
    mainWindow.showOutputModal("Sorry", "Please provice a valid purchase price!.");
    return;
  }

  if (receivedQty.trim() == "" || !/^[\d]{1,7}\.[\d]{2}$/.test(receivedQty)) {
    mainWindow.showOutputModal("Sorry", "Please provice a valid quantity!.");
    return;
  }

  if (unitTypeId.trim() == "") {
    mainWindow.showOutputModal("Sorry", "Please select a valid unit type first!.");
    return;
  }

  // check for duplicates
  let isDuplicate = false;
  $("#materialTable tbody tr").each((i, tr) => {
    const tds = $(tr).children("td");
    const tdMaterialId = $(tds[1]).children().first().data("material-id");
    if (materialId == tdMaterialId) {
      isDuplicate = true;
    }
  });

  if (isDuplicate) {
    mainWindow.showOutputModal(
      "Sorry",
      "This material is already in the materials list!."
    );
    return;
  }

  addRowToMaterialTable({
    materialId, materialName, receivedQty, purchasePrice, unitTypeId, unitTypeName, lineTotal
  });
}

const addRowToMaterialTable = (row = {}) => {
  // row data
  const { materialId, materialName, receivedQty, purchasePrice, unitTypeId, unitTypeName, lineTotal } = row;
  $("#materialTable tbody").append(`
    <tr>
        <td></td>
        <td>
          <span data-material-id="${materialId}">${materialName}</span>
        </td>
        <td>
         <input class="form-control" type="text" value="${purchasePrice}">
        </td>
        <td>
          <input class="form-control" type="text" value="${receivedQty}">
        </td>
        <td>
          <span data-line-total="${lineTotal}">${lineTotal}</span>
        </td>
        <td>
          <span data-unit-type-id="${unitTypeId}">${unitTypeName}</span>
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="removeFromMaterialTable(this)">
            <i class="glyphicon glyphicon-edit" aria-hidden="true"></i> 
              Delete
          </button>
        </td>
    </tr>
    `);

  refreshMaterialTable();
}


// updates index column of the mateiral table and purchase order total
const refreshMaterialTable = () => {
  $("#materialTable tbody tr").each((index, tr) => {
    const indexTd = $(tr).children().first();
    indexTd.html(index + 1);
  });

  // update grn grand total as well
  let grandTotal = 0;
  $("#materialTable tbody tr").each((i, tr) => {
    const tds = $(tr).children("td");
    const tdLineTotal = $(tds[4]).children().first().data("line-total"); grandTotal += parseFloat(tdLineTotal);
  });

  // show grand total
  $("#grandTotal").val(grandTotal.toFixed(2));

  // re-register event listener for inputs

  // re-calculate mini table line total when a input has changed inside it
  $("#materialTable tbody input[type=text]").off();
  $("#materialTable tbody input[type=text]").on("keyup change", function () {
    const row = $(this).parent().parent();
    const tds = row.children();
    const tdPurchasePrice = $(tds[2]).children().first().val();
    const tdReceivedQty = $(tds[3]).children().first().val();
    const lineTotal = parseFloat(tdPurchasePrice) * parseFloat(tdReceivedQty);
    $(tds[4]).children().first().attr("data-line-total", lineTotal.toFixed(2));
    $(tds[4]).children().first().text(lineTotal.toFixed(2));
  });
}

const removeFromMaterialTable = (button) => {
  $(button).parent().parent().remove();

  refreshMaterialTable();
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
  $("#modalMainFormTitle").text("Add New GRN");
  // set date of adding
  $("#mainForm #addedDate").val(new Date().today());
  // empty pocode
  $("#mainForm #grncode").val("GRN code will be displayed after adding.");
  // set limits for receivedDate
  const receivedDate = $("#receivedDate");
  receivedDate.attr("min", new Date().removeDays(7).formatForInput());
  receivedDate.attr("max", new Date().addDays(1).formatForInput());
  // show modal
  $("#modalMainForm").modal("show");
}

const showEditEntryModal = (id, readOnly = false) => {
  loadEntry(id).then(() => {

    $("#modalMainFormTitle").text("Edit GRN");
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