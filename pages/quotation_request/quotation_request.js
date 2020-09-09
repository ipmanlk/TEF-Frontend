/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
  await loadFormDropdowns();
  registerEventListeners();

  // create an array from permission string
  const permission = permissionStr.split("").map((p) => parseInt(p));

  if (permission[0] == 0) {
    $(".btnFmAdd").hide();
  }
  if (permission[2] == 0) {
    $(".btnFmUpdate").hide();
  }
  if (permission[3] == 0) {
    $(".btnFmDelete").hide();
  }

  // set created employee name and number
  const employeeNumber = mainWindow.tempData.profile.employee.number;
  const employeeFullName = mainWindow.tempData.profile.employee.fullName;
  $("#mainForm #createdEmployee").val(`${employeeFullName} (${employeeNumber})`);

  // set date of adding
  $("#mainForm #addedDate").val(new Date().today());
}

const loadFormDropdowns = async () => {
  // define needed attributes
  let response, suppliers;

  // get data from the api for each dropbox
  response = await Request.send("/api/suppliers?data[limit]=0", "GET");
  suppliers = response.data;

  // clean existing options and append new data
  $("#supplierId").empty();


  suppliers.forEach(sup => {
    // show company name for companies and person name for individuals
    let name = sup.companyName ? sup.companyName : sup.personName;
    $("#supplierId").append(`<option data-tokens="${sup.code} - ${name}" value="${sup.id}">${name} (${sup.code})</option>`);
  });

  // init bootstrap-select
  $("#supplierId").selectpicker();
  $("#materialId").selectpicker();

  // select initial value
  showSupplierMaterials(suppliers[0].id);
}

// event listeners for form inputs
const registerEventListeners = () => {
  $("#btnAddToMaterialTable").on("click", (e) => {
    e.preventDefault();
    addToMaterialTable();
  });

  $(".btnFmReset").on("click", (e) => {
    e.preventDefault();
    $("#materialTable tbody").empty();
    $("#amount").val("");
  });

  $(".btnFmUpdate").on("click", (e) => {
    e.preventDefault();
    updateEntry();
  });

  $("#supplierId").on('changed.bs.select', function (e, clickedIndex, isSelected, previousValue) {
    const selectedSupplierId = e.target.value;
    showSupplierMaterials(selectedSupplierId);
  });
}


/*-------------------------------------------------------------------------------------------------------
                                          Main Form
-------------------------------------------------------------------------------------------------------*/
const getFormData = () => {
  // data from basic input fields
  const data = {
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
    const tdMaterialId = $(tds[0]).data("material-id");
    const requested = $(tds[1]).children().first().is(":checked");
    const accepted = $(tds[2]).children().first().is(":checked");
    const received = $(tds[3]).children().first().is(":checked");
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

/*-------------------------------------------------------------------------------------------------------
                                            Supplier Materials
-------------------------------------------------------------------------------------------------------*/
const showSupplierMaterials = async (supplierId) => {
  const response = await Request.send(`/api/supplier_materials?data[supplierId]=${supplierId}`, "GET");
  if (!response.status) return;
  const supplierMaterials = response.data.materials;

  // destroy and clear select picker
  $("#materialId").selectpicker("destroy");
  $("#materialId").empty();

  supplierMaterials.forEach(mat => {
    $("#materialId").append(`<option data-tokens="${mat.code} - ${mat.name}" value="${mat.id}">${mat.name} (${mat.code})</option>`);
  });

  // init selectpicker again for materials
  $("#materialId").selectpicker();
}


/*-------------------------------------------------------------------------------------------------------
                                           Material Table
-------------------------------------------------------------------------------------------------------*/
const addToMaterialTable = () => {
  const materialId = $("#materialId").val();
  const supplierId = $("#supplierId").val();
  const materialName = $("#materialId option:selected").text();

  // check if required things are provided
  if (supplierId.trim() == "") {
    mainWindow.showOutputModal("Sorry", "Please select a supplier first!.");
    return;
  }

  if (materialId.trim() == "") {
    mainWindow.showOutputModal("Sorry", "Please select a material first!.");
    return;
  }

  // check for duplicates
  let isDuplicate = false;
  $("#materialTable tbody tr").each((i, tr) => {
    const tds = $(tr).children("td");
    const tdMaterialId = $(tds[0]).data("material-id");
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
  $("#materialTable tbody").append(`
  <tr>
      <td data-material-id="${materialId}">${materialName}</td>
      <td><input type="checkbox" value="" class="chkRequested"></td>
      <td><input type="checkbox" value="" class="chkAccepted"></td>
      <td><input type="checkbox" value="" class="chkReceived"></td>
      <td>
          <button onClick="removeFromMaterialTable(this)" class="btn btn-danger btn-xs">Delete</button>
      </td>
  </tr>
`);
}

const removeFromMaterialTable = (button) => {
  $(button).parent().parent().remove();
}