const tempData = {
  validationInfo: null,
  selectedEntry: null,
  permission: null,
  quotationRequestMaterials: [],
  unitTypes: []
};

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {

  // get regexes for validation and store on window tempData
  const response = await Request.send("/api/regexes", "GET", {
    data: { module: "QUOTATION_REQUEST" }
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
        "Number": entry.qrnumber,
        "Supplier": entry.supplier.companyName ? entry.supplier.companyName : entry.supplier.personName,
        "Added Date": entry.addedDate,
        "Due Date": entry.dueDate,
        "Status": entry.quotationRequestStatus.name,
        "View": `<button class="btn btn-success btn-sm" onclick="showEditEntryModal('${entry.id}', true)"><i class="glyphicon glyphicon-eye-open" aria-hidden="true"></i> View</button>`,
        "Edit": `<button class="btn btn-warning btn-sm" onclick="showEditEntryModal('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Edit</button>`,
        "Delete": `${entry.quotationRequestStatus.name == "Deleted" ? "" : `<button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry.id}')"><i class="glyphicon glyphicon-edit" aria-hidden="true"></i> Delete</button>`}`
      }
    });
  }

  window.mainTable = new DataTable("mainTableHolder", "/api/quotation_requests", permission, dataBuilderFunction, "Quatation Request List");
}

const loadFormDropdowns = async () => {
  // define needed attributes
  let response, suppliers, quotationRequestStatuses, unitTypes;

  // get data from the api for each dropbox
  response = await Request.send("/api/suppliers?data[limit]=0", "GET");
  suppliers = response.data;

  response = await Request.send("/api/general?data[table]=quotation_request_status", "GET");
  quotationRequestStatuses = response.data;

  response = await Request.send("/api/general?data[table]=unit_type", "GET");
  unitTypes = response.data;

  // clean existing options and append new data
  $("#supplierId").empty();
  $("#quotationRequestStatusId").empty();
  $("#unitTypeId").empty();


  suppliers.forEach(sup => {
    // show company name for companies and person name for individuals
    let name = sup.companyName ? sup.companyName : sup.personName;
    $("#supplierId").append(`<option data-tokens="${sup.code} - ${name}" value="${sup.id}">${name} (${sup.code})</option>`);
  });

  quotationRequestStatuses.forEach(qs => {
    $("#quotationRequestStatusId").append(`<option value="${qs.id}">${qs.name}</option>`);
  });

  unitTypes.forEach(ut => {
    $("#unitTypeId").append(`<option value="${ut.id}">${ut.name}</option>`);
  });

  // save globally
  tempData.unitTypes = unitTypes;

  // init bootstrap-select
  $("#supplierId").selectpicker();
  $("#materialId").selectpicker();

  // load initial values
  if (suppliers[0]) {
    await showSupplierQuotationRequests(suppliers[0].id);
    await showQuotationRequestMaterials($("#qrnumber").val());
  } else {
    // pass -1 to clear select (combo) boxes
    await showSupplierQuotationRequests(-1);
    await showQuotationRequestMaterials(-1);
  }
}

// event listeners for form inputs and buttons
const registerEventListeners = () => {
  $("#btnAddToMaterialTable").on("click", (e) => {
    e.preventDefault();
    addToMaterialTable();
  });

  $(".btnFmReset").on("click", (e) => {
    e.preventDefault();
    resetForm();
  });

  $(".btnFmUpdate").on("click", (e) => {
    e.preventDefault();
    updateEntry();
  });

  $(".btnFmAdd").on("click", (e) => {
    e.preventDefault();
    addEntry();
  });

  $(".btnFmDelete").on("click", (e) => {
    e.preventDefault();
    deleteEntry();
  });

  $(".btnFmPrint").on("click", (e) => {
    e.preventDefault();
    printEntry();
  });

  $("#btnTopAddEntry").on("click", (e) => {
    e.preventDefault();
    showNewEntryModal();
  });

  $("#supplierId").on('changed.bs.select', function (e, clickedIndex, isSelected, previousValue) {
    const selectedSupplierId = e.target.value;
    showSupplierQuotationRequests(selectedSupplierId);
  });

  $("#qrnumber").on('changed.bs.select', function (e, clickedIndex, isSelected, previousValue) {
    const selectedQuotationId = e.target.value;
    showQuotationRequestMaterials(selectedQuotationId);
  });
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
  const response = await Request.send("/api/quotation_requests", "POST", { data: data });

  // show output modal based on response
  if (response.status) {
    $("#modalMainForm").modal("hide");
    reloadModule();
    mainWindow.showOutputToast("Success!", response.msg);
    mainWindow.showOutputModal("Quatation request created!.", `<h4>Request Number: ${response.data.qrnumber}</h4>`);
  }
}

const loadEntry = async (id) => {
  // get entry data from db and show in the form
  const response = await Request.send("/api/quotation_requests", "GET", { data: { id: id } });
  const entry = response.data;

  // fill form inputs
  $("#qrnumber").val(entry.qrnumber);
  $("#addedDate").val(entry.addedDate);
  $("#dueDate").val(entry.dueDate);
  $("#description").val(entry.description);
  $("#createdEmployee").val(entry.createdEmployee);

  // select dropdowns
  FormUtil.selectDropdownOptionByValue("quotationRequestStatusId", entry.quotationRequestStatus.id);

  // select multi select dropdown values
  $("#supplierId").selectpicker("val", entry.supplier.id);

  // load material table
  entry.quotationRequestMaterials.forEach(qrm => {
    $("#materialTable tbody").append(`
    <tr>
        <td></td>
        <td data-material-id="${qrm.material.id}">${qrm.material.name} (${qrm.material.code})</td>
        <td><input type="checkbox" value="" class="chkRequested" ${qrm.requested ? "checked" : ""}></td>
        <td><input type="checkbox" value="" class="chkAccepted" ${qrm.accepted ? "checked" : ""}></td>
        <td><input type="checkbox" value="" class="chkReceived" ${qrm.received ? "checked" : ""}></td>
        <td>
            <button onClick="removeFromMaterialTable(this)" class="btn btn-danger btn-xs">Delete</button>
        </td>
    </tr>
    `);
  });

  // update index values
  updateMaterialTableIndex();

  // save globally
  tempData.selectedEntry = entry;

  // hide from deleted button when deleted
  if ($("#mainForm #quotationRequestStatusId option:selected").text() == "Deleted") {
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
  const response = await Request.send("/api/quotation_requests", "PUT", { data: data });

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
  const response = await Request.send(`/api/quotation_requests?data[id]=${id}`, "DELETE");

  // show output modal based on response
  if (response.status) {
    $("#modalMainForm").modal("hide");
    reloadModule();
    mainWindow.showOutputToast("Success!", response.msg);
  }
}

const printEntry = () => {
  printQuotationRequest(tempData.selectedEntry);
}

/*-------------------------------------------------------------------------------------------------------
                                          Main Form
-------------------------------------------------------------------------------------------------------*/
const getFormData = () => {
  // data from basic input fields
  const data = {
    "qrnumber": $("#qrnumber").val(),
    "addedDate": $("#addedDate").val(),
    "dueDate": $("#dueDate").val(),
    "supplierId": $("#supplierId").val(),
    "description": $("#description").val(),
    "quotationRequestStatusId": $("#quotationRequestStatusId").val()
  }

  // get data from materials table
  const requestMaterials = [];
  $("#materialTable tbody tr").each((i, tr) => {
    const tds = $(tr).children("td");
    const tdMaterialId = $(tds[1]).data("material-id");
    const requested = $(tds[2]).children().first().is(":checked") ? 1 : 0;
    const accepted = $(tds[3]).children().first().is(":checked") ? 1 : 0;
    const received = $(tds[4]).children().first().is(":checked") ? 1 : 0;
    requestMaterials.push({
      materialId: tdMaterialId,
      requested,
      received,
      accepted
    });
  });

  // add request mateirals to data
  data["requestMaterials"] = requestMaterials;

  return data;
}

const validateForm = () => {
  // store error msgs
  let errors = "";

  // validate regular inputs
  tempData.validationInfo.forEach(vi => {
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
  const requestMaterials = formData.requestMaterials;

  if (requestMaterials.length == 0) {
    errors += "Please select at least one material!.";
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
  $("#dueDate").val("");
  $("#description").val("");
  $("#materialId").selectpicker('deselectAll');
  $("#materialId").selectpicker('refresh');
  $("#supplierId").selectpicker('deselectAll');
  $("#supplierId").selectpicker('refresh');
  $("#materialTable tbody").empty();
  $("#mainForm *").removeClass("has-error has-success");
  $("#mainForm .form-control-feedback").remove();
}

/*-------------------------------------------------------------------------------------------------------
                                       Supplier Quotation Reqeusts
-------------------------------------------------------------------------------------------------------*/
const showSupplierQuotationRequests = async (supplierId) => {
  let quotationRequests;

  // suppler id -1 means just clear existing values
  if (supplierId !== -1) {
    const response = await Request.send(`/api/supplier_quotation_requests?data[supplierId]=${supplierId}`, "GET");
    if (!response.status) return;
    quotationRequests = response.data;
  } else {
    quotationRequests = [];
  }

  // destroy and clear select picker
  $("#qrnumber").selectpicker("destroy");
  $("#qrnumber").empty();

  quotationRequests.forEach(qr => {
    $("#qrnumber").append(`<option data-tokens="${qr.qrnumber}" value="${qr.id}">${qr.qrnumber}</option>`);
  });

  // init selectpicker again
  $("#qrnumber").selectpicker();

  // load initial data for materials
  if (quotationRequests[0]) {
    showQuotationRequestMaterials(quotationRequests[0].id);
  } else {
    showQuotationRequestMaterials(-1);
  }

  // set event listener again after destroying
  $("#qrnumber").on('changed.bs.select', function (e, clickedIndex, isSelected, previousValue) {
    const selectedQuotationId = e.target.value;
    showQuotationRequestMaterials(selectedQuotationId);
  });
}

const showQuotationRequestMaterials = async (quotationRequestId) => {
  let quotationRequestMaterials;

  if (quotationRequestId !== -1) {
    // get relevent quotation request
    const response = await Request.send(`/api/quotation_requests?data[id]=${quotationRequestId}`, "GET");
    if (!response.status) return;
    quotationRequestMaterials = response.data.quotationRequestMaterials;
  } else {
    quotationRequestMaterials = [];
  }

  // save globally
  tempData.quotationRequestMaterials = quotationRequestMaterials;

  // empty values
  $("#materialId").selectpicker("destroy");
  $("#materialId").empty();

  // show quotation request materials
  quotationRequestMaterials.forEach(qrm => {
    const mat = qrm.material;
    $("#materialId").append(`<option data-tokens="${mat.code} - ${mat.name}" value="${mat.id}">${mat.name} (${mat.code})</option>`);
  });

  // init selectpicker again 
  $("#materialId").selectpicker();
}

/*-------------------------------------------------------------------------------------------------------
                                           Material Table
-------------------------------------------------------------------------------------------------------*/

const addToMaterialTable = () => {
  const materialId = $("#materialId").val();
  const supplierId = $("#supplierId").val();
  const availableQty = $("#availableQty").val();
  const minimumRequestQty = $("#minimumRequestQty").val();
  const unitTypeId = $("#unitTypeId").val();
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

  if (purchasePrice.trim() == "" || !/^[\d]{1,7}\.[\d]{2}$/.test(minimumRequestQty)) {
    mainWindow.showOutputModal("Sorry", "Please provice a valid purchase price!.");
    return;
  }

  if (availableQty.trim() == "" || !/^[\d]{1,7}\.[\d]{2}$/.test(availableQty)) {
    mainWindow.showOutputModal("Sorry", "Please provice a valid available quantity!.");
    return;
  }

  if (minimumRequestQty.trim() == "" || !/^[\d]{1,7}\.[\d]{2}$/.test(minimumRequestQty)) {
    mainWindow.showOutputModal("Sorry", "Please provice a valid minimum request quantity!.");
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
    const tdMaterialId = $(tds[1]).children().children().first().val();
    if (materialId == tdMaterialId) {
      isDuplicate = true;
    }
  });

  if (isDuplicate) {
    mainWindow.showOutputModal(
      "Sorry",
      "This material is already in the request materials list!."
    );
    return;
  }

  // add row to table
  let materialSelectOptions = "";
  tempData.quotationRequestMaterials.forEach(qrm => {
    const mat = qrm.material;
    materialSelectOptions += `
    <option data-tokens="${mat.code} - ${mat.name}" value="${mat.id}" ${mat.id == materialId ? "selected" : ""}>${mat.name} (${mat.code})</option>
    `;
  });

  let unitTypeSelectOptions = "";
  tempData.unitTypes.forEach(ut => {
    unitTypeSelectOptions += `
      <option value="${ut.id}" ${ut.id == unitTypeId ? "selected" : ""}>${ut.name}</option>
    `;
  });

  $("#materialTable tbody").append(`
  <tr>
      <td></td>
      <td>
        <select class="form-control selectpicker" data-live-search="true" value="${materialId}">
          ${materialSelectOptions}
        </select>
      </td>
      <td>
        <input class="form-control" type="text" value="20.00">
      </td>
      <td>
        <input class="form-control" type="text" value="20.00">
      </td>
      <td>
        <input class="form-control" type="text" value="20.00">
      </td>
      <td>
        <select class="form-control selectpicker" data-live-search="true" value="${unitTypeId}">
          ${unitTypeSelectOptions}
        </select>
      </td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="removeFromMaterialTable(this)">
          <i class="glyphicon glyphicon-edit" aria-hidden="true"></i> 
            Delete
        </button>
      </td>
  </tr>
  `);

  // init select pickers
  $("#materialTable tbody tr td .selectpicker").selectpicker();

  updateMaterialTableIndex();
}

// updates index column of the mateiral table
const updateMaterialTableIndex = () => {
  $("#materialTable tbody tr").each((index, tr) => {
    const indexTd = $(tr).children().first();
    indexTd.html(index + 1);
  });
}

const removeFromMaterialTable = (button) => {
  $(button).parent().parent().remove();

  updateMaterialTableIndex();
}


/*-------------------------------------------------------------------------------------------------------
                                            Modals
-------------------------------------------------------------------------------------------------------*/

const showNewEntryModal = () => {
  // reset form values
  resetForm();

  FormUtil.setButtionsVisibility("mainForm", tempData.permission, "add");

  // set created employee number
  const employeeNumber = mainWindow.tempData.profile.employee.number;
  const employeeFullName = mainWindow.tempData.profile.employee.fullName;
  $("#mainForm #createdEmployee").val(`${employeeNumber} (${employeeFullName})`);
  // set modal title
  $("#modalMainFormTitle").text("Create new quotation request");
  // set date of adding
  $("#mainForm #addedDate").val(new Date().today());
  // empty qrnumber
  $("#mainForm #qrnumber").val("Request number will be displayed after adding.");
  // show modal
  $("#modalMainForm").modal("show");
}

const showEditEntryModal = (id, readOnly = false) => {
  resetForm();
  loadEntry(id);
  $("#modalMainFormTitle").text("Edit Material");
  $("#modalMainForm").modal("show");

  if (readOnly) {
    FormUtil.enableReadOnly("mainForm");
    FormUtil.setButtionsVisibility("mainForm", tempData.permission, "view");
  } else {
    FormUtil.disableReadOnly("mainForm");
    FormUtil.setButtionsVisibility("mainForm", tempData.permission, "edit");
  }
}

